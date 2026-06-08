import { eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod/v4";

import { db, users } from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ─── Default prefs ─────────────────────────────────────────────────────────────

export const DEFAULT_NOTIFICATION_PREFS = {
  aiPickAlerts:      true,
  arbitrageAlerts:   true,
  liveArbAlerts:     true,
  matchReminders:    true,
  evAlerts:          false,
  quietHoursEnabled: false,
  quietHoursStart:   "22:00",
  quietHoursEnd:     "08:00",
};

export type NotificationPrefs = typeof DEFAULT_NOTIFICATION_PREFS;

function parsePrefs(raw: string | null): NotificationPrefs {
  if (!raw) return DEFAULT_NOTIFICATION_PREFS;
  try {
    return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

function isInQuietHours(prefs: NotificationPrefs): boolean {
  if (!prefs.quietHoursEnabled) return false;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const start = prefs.quietHoursStart;
  const end   = prefs.quietHoursEnd;
  if (start <= end) return hhmm >= start && hhmm < end;
  return hhmm >= start || hhmm < end;
}

// ─── Register / update push token ──────────────────────────────────────────────

const registerTokenSchema = z.object({
  pushToken: z.string().min(1),
});

router.post("/notifications/register-token", requireAuth, async (req, res) => {
  const body = registerTokenSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "pushToken is required" });
    return;
  }
  await db.update(users).set({ pushToken: body.data.pushToken }).where(eq(users.id, req.userId!));
  res.json({ ok: true });
});

// ─── Get / update notification prefs ───────────────────────────────────────────

router.get("/notifications/prefs", requireAuth, async (req, res) => {
  const [user] = await db.select({ notificationPrefs: users.notificationPrefs }).from(users).where(eq(users.id, req.userId!)).limit(1);
  res.json(parsePrefs(user?.notificationPrefs ?? null));
});

const prefsSchema = z.object({
  aiPickAlerts:      z.boolean().optional(),
  arbitrageAlerts:   z.boolean().optional(),
  liveArbAlerts:     z.boolean().optional(),
  matchReminders:    z.boolean().optional(),
  evAlerts:          z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart:   z.string().optional(),
  quietHoursEnd:     z.string().optional(),
});

router.put("/notifications/prefs", requireAuth, async (req, res) => {
  const body = prefsSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid prefs" });
    return;
  }
  const [user] = await db.select({ notificationPrefs: users.notificationPrefs }).from(users).where(eq(users.id, req.userId!)).limit(1);
  const existing = parsePrefs(user?.notificationPrefs ?? null);
  const merged   = { ...existing, ...body.data };
  await db.update(users).set({ notificationPrefs: JSON.stringify(merged) }).where(eq(users.id, req.userId!));
  res.json(merged);
});

// ─── Unread badge count ─────────────────────────────────────────────────────────

router.get("/notifications/unread-count", requireAuth, async (req, res) => {
  const [user] = await db.select({ unreadNotificationCount: users.unreadNotificationCount }).from(users).where(eq(users.id, req.userId!)).limit(1);
  res.json({ count: user?.unreadNotificationCount ?? 0 });
});

router.post("/notifications/mark-read", requireAuth, async (req, res) => {
  await db.update(users).set({ unreadNotificationCount: 0 }).where(eq(users.id, req.userId!));
  res.json({ ok: true });
});

// ─── Send notification (internal — used by server-side triggers) ────────────────

export type NotificationPayload = {
  title:    string;
  body:     string;
  data?:    Record<string, unknown>;
  category: keyof typeof CATEGORY_PREF_MAP;
};

const CATEGORY_PREF_MAP = {
  aiPick:      "aiPickAlerts",
  arbitrage:   "arbitrageAlerts",
  liveArb:     "liveArbAlerts",
  matchReminder: "matchReminders",
  evAlert:     "evAlerts",
} as const;

export async function sendPushToUser(userId: number, payload: NotificationPayload): Promise<void> {
  const [user] = await db
    .select({ pushToken: users.pushToken, notificationPrefs: users.notificationPrefs })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.pushToken) return;

  const prefs = parsePrefs(user.notificationPrefs ?? null);
  const prefKey = CATEGORY_PREF_MAP[payload.category];
  if (!prefs[prefKey]) return;
  if (isInQuietHours(prefs)) return;

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to:    user.pushToken,
        title: payload.title,
        body:  payload.body,
        data:  payload.data ?? {},
        sound: "default",
        badge: 1,
      }),
    });
    await db
      .update(users)
      .set({ unreadNotificationCount: sql`${users.unreadNotificationCount} + 1` })
      .where(eq(users.id, userId));
  } catch {
    // Non-fatal — don't let notification failure crash callers
  }
}

// ─── Broadcast to all users with a token (admin use) ───────────────────────────

export async function broadcastPush(payload: Omit<NotificationPayload, "category">): Promise<number> {
  const allUsers = await db
    .select({ id: users.id, pushToken: users.pushToken, notificationPrefs: users.notificationPrefs })
    .from(users)
    .limit(5000);

  const tokens = allUsers
    .filter((u) => !!u.pushToken)
    .map((u) => u.pushToken as string);

  if (tokens.length === 0) return 0;

  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += 100) chunks.push(tokens.slice(i, i + 100));

  for (const chunk of chunks) {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(
        chunk.map((to) => ({ to, title: payload.title, body: payload.body, data: payload.data ?? {}, sound: "default" })),
      ),
    });
  }
  return tokens.length;
}

export default router;
