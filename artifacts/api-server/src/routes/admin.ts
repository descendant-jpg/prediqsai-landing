import { and, count, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod/v4";

import { adminLogs, appConfig, bankrollEntries, db, errorLogs, notificationHistory, predictions, users } from "@workspace/db";
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
    if (!user?.isAdmin && user?.id !== 1) {
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
  if (u.freeTrialUntil && new Date(u.freeTrialUntil) > new Date()) return "premium";
  return u.tier === "pro" || u.tier === "elite" ? "premium" : u.tier;
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
    iapPlatform: u.iapPlatform,
    iapTransactionId: u.iapTransactionId,
    iapExpiresAt: u.iapExpiresAt,
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

    const [premiumOverrideCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.manualTierOverride, "premium"));
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
        premium: (tierMap["premium"] ?? 0) + (tierMap["pro"] ?? 0) + (tierMap["elite"] ?? 0) + (premiumOverrideCount?.count ?? 0),
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
    } else if (filter === "premium") {
      query = query.where(eq(users.tier, "premium"));
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
  tier: z.enum(["free", "premium"]).optional(),
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

// ─── API Key helpers ──────────────────────────────────────────────────────────

async function getConfigValue(key: string): Promise<string | null> {
  const [row] = await db.select().from(appConfig).where(eq(appConfig.key, key)).limit(1);
  return row?.value ?? process.env[key] ?? null;
}

function maskKey(value: string | null): string {
  if (!value) return "";
  if (value.length <= 8) return "••••••••";
  return "••••••" + value.slice(-4);
}

const API_KEYS_META: { name: string; label: string; category: string }[] = [
  { name: "ANTHROPIC_API_KEY",   label: "Anthropic Claude AI",  category: "AI" },
  { name: "API_SPORTS_KEY",      label: "API-Sports",           category: "Sports" },
  { name: "ODDS_API_KEY",        label: "The Odds API",         category: "Betting" },
  { name: "NEWS_API_KEY",        label: "News API",             category: "Content" },
  { name: "WEATHER_API_KEY",     label: "Weather API",          category: "Data" },
  { name: "ONESIGNAL_APP_ID",    label: "OneSignal App ID",     category: "Push" },
  { name: "ONESIGNAL_API_KEY",   label: "OneSignal API Key",    category: "Push" },
  { name: "RESEND_API_KEY",      label: "Resend Email",         category: "Email" },
  { name: "GOOGLE_ANALYTICS_ID", label: "Google Analytics",     category: "Analytics" },
  { name: "EXCHANGE_RATE_API_KEY", label: "Exchange Rate API",  category: "Finance" },
];

async function testOneKey(
  keyName: string,
  value: string,
): Promise<{ ok: boolean; responseTime: number; message: string; metadata?: Record<string, unknown> }> {
  const start = Date.now();
  try {
    switch (keyName) {
      case "ANTHROPIC_API_KEY": {
        const r = await fetch("https://api.anthropic.com/v1/models", {
          headers: { "x-api-key": value, "anthropic-version": "2023-06-01" },
        });
        const ms = Date.now() - start;
        if (r.ok) {
          const d = await r.json() as { data?: unknown[] };
          return { ok: true, responseTime: ms, message: "Anthropic working", metadata: { models: d.data?.length ?? 0 } };
        }
        return { ok: false, responseTime: ms, message: `HTTP ${r.status}` };
      }
      case "API_SPORTS_KEY": {
        const r = await fetch("https://v3.football.api-sports.io/status", {
          headers: { "x-apisports-key": value },
        });
        const ms = Date.now() - start;
        if (r.ok) {
          const d = await r.json() as { response?: { requests?: { current?: number; limit_day?: number } } };
          const req = d.response?.requests;
          return { ok: true, responseTime: ms, message: "API-Sports working", metadata: { callsToday: req?.current, limitDay: req?.limit_day } };
        }
        return { ok: false, responseTime: ms, message: `HTTP ${r.status}` };
      }
      case "ODDS_API_KEY": {
        const r = await fetch(`https://api.the-odds-api.com/v4/sports?apiKey=${value}`);
        const ms = Date.now() - start;
        if (r.ok) {
          const remaining = r.headers.get("x-requests-remaining");
          const used = r.headers.get("x-requests-used");
          return { ok: true, responseTime: ms, message: "Odds API working", metadata: { remaining: remaining ? parseInt(remaining) : null, used: used ? parseInt(used) : null } };
        }
        return { ok: false, responseTime: ms, message: `HTTP ${r.status}` };
      }
      case "NEWS_API_KEY": {
        const r = await fetch(`https://newsapi.org/v2/top-headlines?country=us&pageSize=1&apiKey=${value}`);
        const ms = Date.now() - start;
        if (r.ok) {
          const d = await r.json() as { totalResults?: number };
          return { ok: true, responseTime: ms, message: "News API working", metadata: { totalResults: d.totalResults } };
        }
        return { ok: false, responseTime: ms, message: `HTTP ${r.status}` };
      }
      case "WEATHER_API_KEY": {
        const r = await fetch(`https://api.weatherapi.com/v1/current.json?key=${value}&q=London`);
        const ms = Date.now() - start;
        if (r.ok) return { ok: true, responseTime: ms, message: "Weather API working" };
        return { ok: false, responseTime: ms, message: `HTTP ${r.status}` };
      }
      case "ONESIGNAL_APP_ID": {
        const ms = Date.now() - start;
        const valid = value.length > 10 && value.includes("-");
        return { ok: valid, responseTime: ms, message: valid ? "App ID format valid" : "Invalid format" };
      }
      case "ONESIGNAL_API_KEY": {
        const ms = Date.now() - start;
        const valid = value.length > 20;
        return { ok: valid, responseTime: ms, message: valid ? "Key format valid" : "Key too short" };
      }
      case "RESEND_API_KEY": {
        const r = await fetch("https://api.resend.com/domains", {
          headers: { Authorization: `Bearer ${value}` },
        });
        const ms = Date.now() - start;
        if (r.ok) {
          const d = await r.json() as { data?: unknown[] };
          return { ok: true, responseTime: ms, message: "Resend working", metadata: { domains: d.data?.length ?? 0 } };
        }
        return { ok: false, responseTime: ms, message: `HTTP ${r.status}` };
      }
      case "GOOGLE_ANALYTICS_ID": {
        const ms = Date.now() - start;
        const valid = /^G-[A-Z0-9]+$/.test(value);
        return { ok: valid, responseTime: ms, message: valid ? "Valid GA4 ID" : "Expected format: G-XXXXXXXX" };
      }
      case "EXCHANGE_RATE_API_KEY": {
        const r = await fetch(`https://v6.exchangerate-api.com/v6/${value}/latest/USD`);
        const ms = Date.now() - start;
        if (r.ok) {
          const d = await r.json() as { result?: string };
          return { ok: d.result === "success", responseTime: ms, message: "Exchange Rate API working" };
        }
        return { ok: false, responseTime: ms, message: `HTTP ${r.status}` };
      }
      default:
        return { ok: false, responseTime: Date.now() - start, message: "Unknown key" };
    }
  } catch (err) {
    return { ok: false, responseTime: Date.now() - start, message: err instanceof Error ? err.message : "Test failed" };
  }
}

// ─── GET /api/admin/api-keys ──────────────────────────────────────────────────

router.get("/admin/api-keys", requireAdmin, async (_req, res) => {
  const allRows = await db.select().from(appConfig);
  const dbMap: Record<string, typeof allRows[0]> = {};
  for (const r of allRows) dbMap[r.key] = r;

  const statuses = API_KEYS_META.map((k) => {
    const dbRow = dbMap[k.name];
    const envVal = process.env[k.name];
    const value = dbRow?.value ?? envVal ?? null;
    return {
      name: k.name,
      label: k.label,
      category: k.category,
      configured: Boolean(value),
      masked: maskKey(value),
      source: dbRow?.value ? "database" : (envVal ? "env" : "none"),
      updatedAt: dbRow?.updatedAt ?? null,
    };
  });
  res.json(statuses);
});

// ─── POST /api/admin/api-keys/test ───────────────────────────────────────────

router.post("/admin/api-keys/test", requireAdmin, async (req, res) => {
  const { keyName } = z.object({ keyName: z.string() }).parse(req.body);
  const value = await getConfigValue(keyName);
  if (!value) {
    res.json({ keyName, ok: false, responseTime: 0, message: "Not configured" });
    return;
  }
  const result = await testOneKey(keyName, value);
  res.json({ ...result, keyName });
});

// ─── POST /api/admin/api-keys/test-all ───────────────────────────────────────

router.post("/admin/api-keys/test-all", requireAdmin, async (req, res) => {
  const results = await Promise.all(
    API_KEYS_META.map(async ({ name }) => {
      const value = await getConfigValue(name);
      if (!value) return { keyName: name, ok: false, responseTime: 0, message: "Not configured" };
      const result = await testOneKey(name, value);
      return { ...result, keyName: name };
    }),
  );
  res.json(results);
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

// ─── GET /api/admin/predictions ───────────────────────────────────────────────

router.get("/admin/predictions", requireAdmin, async (req, res) => {
  const { sport, result, page = "1" } = req.query as Record<string, string>;
  const limit = 30;
  const offset = (parseInt(page) - 1) * limit;

  const rows = await db
    .select()
    .from(predictions)
    .where(
      and(
        sport && sport !== "all" ? eq(predictions.sport, sport) : undefined,
        result === "win" ? eq(sql`predictions.result`, "win") : undefined,
        result === "loss" ? eq(sql`predictions.result`, "loss") : undefined,
        result === "push" ? eq(sql`predictions.result`, "push") : undefined,
        result === "pending" ? sql`predictions.result IS NULL` : undefined,
      ),
    )
    .orderBy(desc(predictions.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ predictions: rows, page: parseInt(page), limit });
});

// ─── PUT /api/admin/predictions/:id/result ────────────────────────────────────

router.put("/admin/predictions/:id/result", requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id ?? ""), 10);
  const { result } = z.object({ result: z.enum(["win", "loss", "push"]).nullable() }).parse(req.body);

  const [updated] = await db
    .update(predictions)
    .set({ result })
    .where(eq(predictions.id, id))
    .returning();

  await db.insert(adminLogs).values({ action: "prediction_result_set", details: JSON.stringify({ id, result }), adminEmail: "admin" });
  res.json(updated);
});

// ─── DELETE /api/admin/predictions/:id ───────────────────────────────────────

router.delete("/admin/predictions/:id", requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id ?? ""), 10);
  await db.delete(predictions).where(eq(predictions.id, id));
  await db.insert(adminLogs).values({ action: "prediction_deleted", details: JSON.stringify({ id }), adminEmail: "admin" });
  res.json({ ok: true });
});

// ─── GET /api/admin/notifications ─────────────────────────────────────────────

router.get("/admin/notifications", requireAdmin, async (_req, res) => {
  const rows = await db
    .select()
    .from(notificationHistory)
    .orderBy(desc(notificationHistory.createdAt))
    .limit(50);
  res.json(rows);
});

// ─── POST /api/admin/notifications/send ──────────────────────────────────────

router.post("/admin/notifications/send", requireAdmin, async (req, res) => {
  const body = z.object({
    title: z.string().min(1).max(100),
    message: z.string().min(1).max(500),
    target: z.string(), // 'all' | 'free' | 'pro' | 'elite' | 'user:123' | 'country:NG'
    linkTo: z.string().optional(),
  }).parse(req.body);

  const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
  const oneSignalKey = process.env.ONESIGNAL_API_KEY;

  let recipientCount = 0;
  let oneSignalResult: unknown = null;

  if (oneSignalAppId && oneSignalKey) {
    // Build OneSignal filters
    const filters: unknown[] = [];
    if (body.target === "all") {
      // No filters — send to all
    } else if (body.target.startsWith("user:")) {
      const userId = body.target.split(":")[1];
      filters.push({ field: "tag", key: "user_id", relation: "=", value: userId });
    } else if (["free", "premium"].includes(body.target)) {
      filters.push({ field: "tag", key: "tier", relation: "=", value: body.target });
    } else if (body.target.startsWith("country:")) {
      const country = body.target.split(":")[1];
      filters.push({ field: "country", relation: "=", value: country });
    }

    try {
      const r = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${oneSignalKey}` },
        body: JSON.stringify({
          app_id: oneSignalAppId,
          headings: { en: body.title },
          contents: { en: body.message },
          ...(filters.length > 0 ? { filters } : { included_segments: ["All"] }),
          ...(body.linkTo ? { data: { linkTo: body.linkTo } } : {}),
        }),
      });
      oneSignalResult = await r.json();
      recipientCount = (oneSignalResult as { recipients?: number })?.recipients ?? 0;
    } catch (err) {
      req.log.warn({ err }, "OneSignal send failed");
    }
  }

  const [saved] = await db.insert(notificationHistory).values({
    title: body.title,
    message: body.message,
    target: body.target,
    linkTo: body.linkTo,
    recipientCount,
    sentByAdminId: req.userId,
  }).returning();

  await db.insert(adminLogs).values({
    action: "notification_sent",
    details: JSON.stringify({ title: body.title, target: body.target, recipientCount }),
    adminEmail: "admin",
  });

  res.json({ ok: true, notification: saved, oneSignalResult });
});

// ─── GET /api/admin/revenue ───────────────────────────────────────────────────

router.get("/admin/revenue", requireAdmin, async (_req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [allUsers] = await db.select({ total: count() }).from(users);
  const tierCounts = await db
    .select({ tier: users.tier, count: count() })
    .from(users)
    .groupBy(users.tier);
  const [newToday] = await db.select({ count: count() }).from(users).where(gte(users.createdAt, today));
  const [newWeek] = await db.select({ count: count() }).from(users).where(gte(users.createdAt, sevenDaysAgo));
  const [newMonth] = await db.select({ count: count() }).from(users).where(gte(users.createdAt, thirtyDaysAgo));

  const deposits = await db
    .select({ total: sql<number>`sum(amount)`, count: count() })
    .from(bankrollEntries)
    .where(eq(bankrollEntries.type, "deposit"));

  const recentDeposits = await db
    .select({ total: sql<number>`sum(amount)`, count: count() })
    .from(bankrollEntries)
    .where(and(eq(bankrollEntries.type, "deposit"), gte(bankrollEntries.createdAt, thirtyDaysAgo)));

  const PREMIUM_PRICE = 9.99;
  const premiumCount =
    (tierCounts.find((t) => t.tier === "premium")?.count ?? 0) +
    (tierCounts.find((t) => t.tier === "pro")?.count ?? 0) +
    (tierCounts.find((t) => t.tier === "elite")?.count ?? 0);
  const freeCount = tierCounts.find((t) => t.tier === "free")?.count ?? 0;
  const mrr = premiumCount * PREMIUM_PRICE;

  res.json({
    totalUsers: allUsers?.total ?? 0,
    newToday: newToday?.count ?? 0,
    newWeek: newWeek?.count ?? 0,
    newMonth: newMonth?.count ?? 0,
    tierBreakdown: { free: freeCount, premium: premiumCount },
    mrr: parseFloat(mrr.toFixed(2)),
    arr: parseFloat((mrr * 12).toFixed(2)),
    totalDeposits: parseFloat((deposits[0]?.total ?? 0).toFixed(2)),
    depositCount: deposits[0]?.count ?? 0,
    recentDeposits: parseFloat((recentDeposits[0]?.total ?? 0).toFixed(2)),
    conversionRate: (allUsers?.total ?? 0) > 0
      ? parseFloat(((premiumCount / (allUsers?.total ?? 1)) * 100).toFixed(1))
      : 0,
    prices: { premium: PREMIUM_PRICE },
  });
});

// ─── GET /api/admin/errors ────────────────────────────────────────────────────

router.get("/admin/errors", requireAdmin, async (req, res) => {
  const { filter = "all", page = "1" } = req.query as Record<string, string>;
  const limit = 30;
  const offset = (parseInt(page) - 1) * limit;

  const rows = await db
    .select()
    .from(errorLogs)
    .where(
      filter === "resolved" ? eq(errorLogs.resolved, true) :
      filter === "unresolved" ? eq(errorLogs.resolved, false) : undefined,
    )
    .orderBy(desc(errorLogs.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ errors: rows, page: parseInt(page), limit });
});

// ─── POST /api/admin/errors ───────────────────────────────────────────────────
// Called from client to log frontend errors

router.post("/admin/errors", async (req, res) => {
  const body = z.object({
    errorType: z.string(),
    message: z.string(),
    screen: z.string().optional(),
    device: z.string().optional(),
    os: z.string().optional(),
    stackTrace: z.string().optional(),
  }).parse(req.body);

  const [saved] = await db.insert(errorLogs).values({
    ...body,
    userId: (req as { userId?: number }).userId ?? null,
  }).returning();

  res.status(201).json(saved);
});

// ─── PUT /api/admin/errors/:id/resolve ───────────────────────────────────────

router.put("/admin/errors/:id/resolve", requireAdmin, async (req, res) => {
  const id = String(req.params.id ?? "");
  const [updated] = await db
    .update(errorLogs)
    .set({ resolved: true, resolvedAt: new Date(), resolvedByAdminId: req.userId })
    .where(sql`${errorLogs.id} = ${id}`)
    .returning();
  res.json(updated);
});

// ─── DELETE /api/admin/users/:id ─────────────────────────────────────────────

router.delete("/admin/users/:id", requireAdmin, async (req, res) => {
  const userId = parseInt(String(req.params.id ?? ""), 10);
  const [deleted] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!deleted) { res.status(404).json({ error: "User not found" }); return; }

  await db.delete(users).where(eq(users.id, userId));
  await db.insert(adminLogs).values({ action: "user_deleted", targetUserId: userId, details: JSON.stringify({ email: deleted.email }), adminEmail: "admin" });
  res.json({ ok: true });
});

// ─── PUT /api/admin/users/:id/toggle-admin ────────────────────────────────────

router.put("/admin/users/:id/toggle-admin", requireAdmin, async (req, res) => {
  const userId = parseInt(String(req.params.id ?? ""), 10);
  const { isAdmin } = z.object({ isAdmin: z.boolean() }).parse(req.body);
  const [updated] = await db.update(users).set({ isAdmin }).where(eq(users.id, userId)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  await db.insert(adminLogs).values({ action: isAdmin ? "admin_granted" : "admin_revoked", targetUserId: userId, adminEmail: "admin" });
  res.json(updated);
});

// ─── POST /api/admin/users/:id/notify ────────────────────────────────────────

router.post("/admin/users/:id/notify", requireAdmin, async (req, res) => {
  const userId = parseInt(String(req.params.id ?? ""), 10);
  const { title, message } = z.object({ title: z.string().min(1), message: z.string().min(1) }).parse(req.body);

  const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
  const oneSignalKey = process.env.ONESIGNAL_API_KEY;
  let oneSignalResult: unknown = null;

  if (oneSignalAppId && oneSignalKey) {
    try {
      const r = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${oneSignalKey}` },
        body: JSON.stringify({
          app_id: oneSignalAppId,
          headings: { en: title },
          contents: { en: message },
          filters: [{ field: "tag", key: "user_id", relation: "=", value: String(userId) }],
        }),
      });
      oneSignalResult = await r.json();
    } catch (err) {
      req.log.warn({ err }, "OneSignal personal notify failed");
    }
  }

  const [saved] = await db.insert(notificationHistory).values({
    title, message, target: `user:${userId}`, recipientCount: 1, sentByAdminId: req.userId,
  }).returning();

  res.json({ ok: true, notification: saved, oneSignalResult });
});

// ─── GET /api/admin/worldcup ──────────────────────────────────────────────────

router.get("/admin/worldcup", requireAdmin, async (_req, res) => {
  const rows = await db
    .select()
    .from(predictions)
    .where(eq(predictions.sport, "Soccer"))
    .orderBy(desc(predictions.matchDate))
    .limit(100);

  const [totalCount] = await db.select({ count: count() }).from(predictions).where(eq(predictions.sport, "Soccer"));
  res.json({ matches: rows, total: totalCount?.count ?? 0 });
});

export default router;
