import { count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod/v4";

import { adminLogs, appConfig, db, users } from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ─── requireAdmin middleware ───────────────────────────────────────────────────

async function requireAdmin(
  req: Parameters<typeof requireAuth>[0],
  res: Parameters<typeof requireAuth>[1],
  next: Parameters<typeof requireAuth>[2],
): Promise<void> {
  requireAuth(req, res, async () => {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
    if (!user?.isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function writeLog(adminEmail: string, action: string, targetUserId: number | null, details: string) {
  await db.insert(adminLogs).values({
    adminEmail,
    action,
    targetUserId: targetUserId ?? undefined,
    details,
  });
}

function effectiveTier(u: typeof users.$inferSelect): string {
  if (u.manualTierOverride) return u.manualTierOverride;
  if (u.freeTrialUntil && new Date(u.freeTrialUntil) > new Date()) return "pro";
  return u.tier;
}

function safeUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    tier: u.tier,
    effectiveTier: effectiveTier(u),
    bankroll: u.bankroll,
    dailyLossLimit: u.dailyLossLimit,
    isAdmin: u.isAdmin,
    isBanned: u.isBanned,
    isSuspended: u.isSuspended,
    manualTierOverride: u.manualTierOverride,
    freeTrialUntil: u.freeTrialUntil,
    createdAt: u.createdAt,
    stripeCustomerId: u.stripeCustomerId,
    stripeSubscriptionId: u.stripeSubscriptionId,
  };
}

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [all, byTier, todayCount] = await Promise.all([
      db.select({ count: count() }).from(users),
      db
        .select({ tier: users.tier, count: count() })
        .from(users)
        .groupBy(users.tier),
      db
        .select({ count: count() })
        .from(users)
        .where(sql`date_trunc('day', ${users.createdAt}) = current_date`),
    ]);

    const tierMap: Record<string, number> = {};
    for (const row of byTier) tierMap[row.tier] = row.count;

    const [proOverrideCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.manualTierOverride, "pro"));
    const [eliteOverrideCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.manualTierOverride, "elite"));
    const [bannedCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.isBanned, true));
    const [suspendedCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.isSuspended, true));

    res.json({
      totalUsers: all[0]?.count ?? 0,
      todaySignups: todayCount[0]?.count ?? 0,
      tierBreakdown: {
        free: tierMap["free"] ?? 0,
        pro: (tierMap["pro"] ?? 0) + (proOverrideCount?.count ?? 0),
        elite: (tierMap["elite"] ?? 0) + (eliteOverrideCount?.count ?? 0),
      },
      banned: bannedCount?.count ?? 0,
      suspended: suspendedCount?.count ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Admin stats failed");
    res.status(500).json({ error: "Failed to load stats" });
  }
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : "";
    const filter = typeof req.query.filter === "string" ? req.query.filter : "all";
    const page = parseInt(String(req.query.page ?? "1"), 10);
    const limit = 30;
    const offset = (page - 1) * limit;

    let query = db.select().from(users).$dynamic();

    if (search) {
      query = query.where(or(ilike(users.email, `%${search}%`), ilike(users.username, `%${search}%`)));
    } else if (filter === "banned") {
      query = query.where(eq(users.isBanned, true));
    } else if (filter === "suspended") {
      query = query.where(eq(users.isSuspended, true));
    } else if (filter === "pro") {
      query = query.where(eq(users.tier, "pro"));
    } else if (filter === "elite") {
      query = query.where(eq(users.tier, "elite"));
    } else if (filter === "free") {
      query = query.where(eq(users.tier, "free"));
    }

    const rows = await query.orderBy(desc(users.createdAt)).limit(limit).offset(offset);
    res.json({ users: rows.map(safeUser), page, limit });
  } catch (err) {
    req.log.error({ err }, "Admin list users failed");
    res.status(500).json({ error: "Failed to list users" });
  }
});

// ─── GET /api/admin/users/:id ─────────────────────────────────────────────────

router.get("/admin/users/:id", requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(safeUser(user));
});

// ─── PUT /api/admin/users/:id ─────────────────────────────────────────────────

const updateUserSchema = z.object({
  isBanned: z.boolean().optional(),
  isSuspended: z.boolean().optional(),
  manualTierOverride: z.string().nullable().optional(),
  freeTrialDays: z.number().int().min(0).max(365).optional(),
  tier: z.enum(["free", "pro", "elite"]).optional(),
  bankroll: z.number().min(0).optional(),
});

router.put("/admin/users/:id", requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = updateUserSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [adminUser] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);

  const patch: Partial<typeof users.$inferInsert> = {};
  const actions: string[] = [];

  if (body.data.isBanned !== undefined) {
    patch.isBanned = body.data.isBanned;
    actions.push(body.data.isBanned ? "banned" : "unbanned");
  }
  if (body.data.isSuspended !== undefined) {
    patch.isSuspended = body.data.isSuspended;
    actions.push(body.data.isSuspended ? "suspended" : "unsuspended");
  }
  if (body.data.manualTierOverride !== undefined) {
    patch.manualTierOverride = body.data.manualTierOverride;
    actions.push(`tier_override=${body.data.manualTierOverride ?? "none"}`);
  }
  if (body.data.tier !== undefined) {
    patch.tier = body.data.tier;
    actions.push(`tier_set=${body.data.tier}`);
  }
  if (body.data.bankroll !== undefined) {
    patch.bankroll = body.data.bankroll;
    actions.push(`bankroll_set=${body.data.bankroll}`);
  }
  if (body.data.freeTrialDays !== undefined) {
    if (body.data.freeTrialDays === 0) {
      patch.freeTrialUntil = null;
      actions.push("free_trial_removed");
    } else {
      const until = new Date();
      until.setDate(until.getDate() + body.data.freeTrialDays);
      patch.freeTrialUntil = until;
      actions.push(`free_trial=${body.data.freeTrialDays}d`);
    }
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const [updated] = await db.update(users).set(patch).where(eq(users.id, id)).returning();

  await writeLog(
    adminUser?.email ?? "unknown",
    actions.join(", "),
    id,
    JSON.stringify(patch),
  );

  res.json(safeUser(updated));
});

// ─── GET /api/admin/config ────────────────────────────────────────────────────

router.get("/admin/config", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(appConfig);
  const config: Record<string, string> = {};
  for (const r of rows) config[r.key] = r.value ?? "";
  res.json(config);
});

// ─── PUT /api/admin/config/:key ───────────────────────────────────────────────

router.put("/admin/config/:key", requireAdmin, async (req, res) => {
  const configKey = String(req.params.key);
  const { value } = z.object({ value: z.string() }).parse(req.body);

  const [adminUser] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);

  await db
    .insert(appConfig)
    .values({ key: configKey, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appConfig.key, set: { value, updatedAt: new Date() } });

  await writeLog(adminUser?.email ?? "unknown", `config_update`, null, `${configKey}=${value}`);

  res.json({ key: configKey, value });
});

// ─── GET /api/admin/logs ──────────────────────────────────────────────────────

router.get("/admin/logs", requireAdmin, async (req, res) => {
  try {
    const page = parseInt(String(req.query.page ?? "1"), 10);
    const limit = 50;
    const offset = (page - 1) * limit;

    const logs = await db
      .select()
      .from(adminLogs)
      .orderBy(desc(adminLogs.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ logs, page, limit });
  } catch (err) {
    req.log.error({ err }, "Admin logs failed");
    res.status(500).json({ error: "Failed to load logs" });
  }
});

// ─── POST /api/admin/set-admin ────────────────────────────────────────────────
// One-time endpoint to bootstrap the first admin from ADMIN_EMAIL env

router.post("/admin/set-admin", async (req, res) => {
  const { password } = z.object({ password: z.string() }).parse(req.body);
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminPassword || !adminEmail) {
    res.status(503).json({ error: "ADMIN_EMAIL/ADMIN_PASSWORD not configured" });
    return;
  }
  if (password !== adminPassword) {
    res.status(403).json({ error: "Wrong password" });
    return;
  }

  const [updated] = await db
    .update(users)
    .set({ isAdmin: true })
    .where(eq(users.email, adminEmail))
    .returning();

  if (!updated) {
    res.status(404).json({ error: `No user found with email: ${adminEmail}` });
    return;
  }

  res.json({ ok: true, email: updated.email });
});

// ─── POST /api/admin/verify-password ─────────────────────────────────────────
// Used by the 7-tap secret access from settings screen

router.post("/admin/verify-password", async (req, res) => {
  const { password } = z.object({ password: z.string() }).parse(req.body);
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    res.status(503).json({ error: "Admin not configured" });
    return;
  }
  res.json({ ok: password === adminPassword });
});

export default router;
