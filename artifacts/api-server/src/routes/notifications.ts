import { and, eq, ne } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod/v4";

import { db, users } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import {
  DEFAULT_NOTIFICATION_PREFS,
  parseNotificationPrefs,
} from "../services/notification-service";

const router = Router();

// ─── Register / update push token ──────────────────────────────────────────────

const registerTokenSchema = z.object({
  pushToken: z.string().min(1),
  timeZone: z.string().min(1).max(100).refine((value) => {
    try {
      Intl.DateTimeFormat("en-US", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "timeZone must be a valid IANA timezone").optional(),
}).strict();

router.post("/notifications/register-token", requireAuth, async (req, res) => {
  const body = registerTokenSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "pushToken is required" });
    return;
  }
  await db.transaction(async (tx) => {
    await tx.update(users).set({ expoPushToken: null })
      .where(and(eq(users.expoPushToken, body.data.pushToken), ne(users.id, req.userId!)));
    await tx.update(users).set({
      expoPushToken: body.data.pushToken,
      notificationTimezone: body.data.timeZone ?? null,
    }).where(eq(users.id, req.userId!));
  });
  res.json({ ok: true });
});

router.post("/notifications/unregister-token", requireAuth, async (req, res) => {
  const body = z.object({ pushToken: z.string().min(1) }).strict().safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "pushToken is required" });
    return;
  }
  await db.update(users).set({ expoPushToken: null })
    .where(and(eq(users.id, req.userId!), eq(users.expoPushToken, body.data.pushToken)));
  res.json({ ok: true });
});

// ─── Get / update notification prefs ───────────────────────────────────────────

router.get("/notifications/prefs", requireAuth, async (req, res) => {
  const [user] = await db.select({
    notificationPreferences: users.notificationPreferences,
    legacyNotificationPrefs: users.notificationPrefs,
  }).from(users).where(eq(users.id, req.userId!)).limit(1);
  res.json(parseNotificationPrefs(user?.notificationPreferences ?? user?.legacyNotificationPrefs));
});

const prefsSchema = z.object({
  aiPickAlerts:      z.boolean().optional(),
  arbitrageAlerts:   z.boolean().optional(),
  liveArbAlerts:     z.boolean().optional(),
  matchReminders:    z.boolean().optional(),
  evAlerts:          z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart:   z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursEnd:     z.string().regex(/^\d{2}:\d{2}$/).optional(),
}).strict();

router.put("/notifications/prefs", requireAuth, async (req, res) => {
  const body = prefsSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid prefs" });
    return;
  }
  const [user] = await db.select({
    notificationPreferences: users.notificationPreferences,
    legacyNotificationPrefs: users.notificationPrefs,
  }).from(users).where(eq(users.id, req.userId!)).limit(1);
  const existing = parseNotificationPrefs(user?.notificationPreferences ?? user?.legacyNotificationPrefs);
  const merged   = { ...existing, ...body.data };
  await db.update(users).set({ notificationPreferences: merged }).where(eq(users.id, req.userId!));
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

export default router;
