import { eq, sql } from "drizzle-orm";
import { Expo, type ExpoPushMessage } from "expo-server-sdk";

import { db, pushNotificationDeliveries, users } from "@workspace/db";
import { logger } from "../lib/logger";

export const DEFAULT_NOTIFICATION_PREFS = {
  aiPickAlerts: true,
  arbitrageAlerts: true,
  liveArbAlerts: true,
  matchReminders: true,
  evAlerts: false,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
};

export type NotificationPrefs = typeof DEFAULT_NOTIFICATION_PREFS;

export const CATEGORY_PREF_MAP = {
  aiPick: "aiPickAlerts",
  arbitrage: "arbitrageAlerts",
  liveArb: "liveArbAlerts",
  matchReminder: "matchReminders",
  evAlert: "evAlerts",
} as const;

export type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  category: keyof typeof CATEGORY_PREF_MAP;
};

const expo = new Expo();
const deliveredEventKeys = new Map<string, number>();

export function parseNotificationPrefs(raw: unknown): NotificationPrefs {
  if (typeof raw === "string") {
    try {
      return parseNotificationPrefs(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_NOTIFICATION_PREFS };
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
  const candidate = raw as Record<string, unknown>;
  const booleans = ["aiPickAlerts", "arbitrageAlerts", "liveArbAlerts", "matchReminders", "evAlerts", "quietHoursEnabled"] as const;
  const result = { ...DEFAULT_NOTIFICATION_PREFS };
  for (const key of booleans) {
    if (typeof candidate[key] === "boolean") result[key] = candidate[key];
  }
  if (typeof candidate.quietHoursStart === "string" && /^\d{2}:\d{2}$/.test(candidate.quietHoursStart)) {
    result.quietHoursStart = candidate.quietHoursStart;
  }
  if (typeof candidate.quietHoursEnd === "string" && /^\d{2}:\d{2}$/.test(candidate.quietHoursEnd)) {
    result.quietHoursEnd = candidate.quietHoursEnd;
  }
  return result;
}

export function isInQuietHours(prefs: NotificationPrefs, timeZone: string | null): boolean {
  if (!prefs.quietHoursEnabled) return false;

  let hhmm: string;
  try {
    hhmm = new Intl.DateTimeFormat("en-GB", {
      timeZone: timeZone || "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date());
  } catch {
    hhmm = new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date());
  }

  if (prefs.quietHoursStart <= prefs.quietHoursEnd) {
    return hhmm >= prefs.quietHoursStart && hhmm < prefs.quietHoursEnd;
  }
  return hhmm >= prefs.quietHoursStart || hhmm < prefs.quietHoursEnd;
}

export async function sendPushToUser(
  userId: number,
  payload: NotificationPayload,
  eventKey?: string,
): Promise<boolean> {
  const [user] = await db
    .select({
      expoPushToken: users.expoPushToken,
      legacyPushToken: users.pushToken,
      notificationPreferences: users.notificationPreferences,
      legacyNotificationPrefs: users.notificationPrefs,
      notificationTimezone: users.notificationTimezone,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const pushToken = user?.expoPushToken ?? user?.legacyPushToken;
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) return false;

  const prefs = parseNotificationPrefs(user.notificationPreferences ?? user.legacyNotificationPrefs);
  if (!prefs[CATEGORY_PREF_MAP[payload.category]]) return false;
  if (isInQuietHours(prefs, user.notificationTimezone)) return false;

  const message: ExpoPushMessage = {
    to: pushToken,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    sound: "default",
    badge: 1,
    channelId: "prediq-alerts",
  };

  let deliveryId: string | null = null;
  if (eventKey) {
    const [delivery] = await db
      .insert(pushNotificationDeliveries)
      .values({ eventKey, userId })
      .onConflictDoNothing()
      .returning({ id: pushNotificationDeliveries.id });
    if (!delivery) return false;
    deliveryId = delivery.id;
  }

  try {
    const [ticket] = await expo.sendPushNotificationsAsync([message]);
    if (ticket?.status === "error") {
      logger.warn({ userId, error: ticket.message, details: ticket.details }, "Expo push notification rejected");
      if (ticket.details?.error === "DeviceNotRegistered") {
        await db.update(users).set({ expoPushToken: null }).where(eq(users.id, userId));
      }
      if (deliveryId) await db.delete(pushNotificationDeliveries).where(eq(pushNotificationDeliveries.id, deliveryId));
      return false;
    }
    if (deliveryId) {
      await db.update(pushNotificationDeliveries)
        .set({ status: "accepted", expoTicketId: ticket?.id ?? null })
        .where(eq(pushNotificationDeliveries.id, deliveryId));
    }
    await db
      .update(users)
      .set({ unreadNotificationCount: sql`${users.unreadNotificationCount} + 1` })
      .where(eq(users.id, userId));
    return true;
  } catch (error) {
    logger.warn({ err: error, userId }, "Expo push notification delivery failed");
    if (deliveryId) await db.delete(pushNotificationDeliveries).where(eq(pushNotificationDeliveries.id, deliveryId));
    return false;
  }
}

export async function broadcastPush(payload: NotificationPayload, eventKey?: string): Promise<number> {
  const recipients = await db
    .select({ id: users.id, expoPushToken: users.expoPushToken, legacyPushToken: users.pushToken })
    .from(users)
    .limit(5_000);

  let delivered = 0;
  const recipientsWithTokens = recipients.filter((recipient) => recipient.expoPushToken || recipient.legacyPushToken);
  for (let offset = 0; offset < recipientsWithTokens.length; offset += 100) {
    const results = await Promise.all(
      recipientsWithTokens.slice(offset, offset + 100).map((recipient) => sendPushToUser(recipient.id, payload, eventKey)),
    );
    delivered += results.filter(Boolean).length;
  }
  return delivered;
}

/**
 * Suppress repeated scheduler events in this running process. The key is only
 * recorded after a send reaches Expo, so a temporary provider failure can retry.
 */
export async function broadcastPushOnce(
  eventKey: string,
  payload: NotificationPayload,
  ttlMs = 12 * 60 * 60 * 1000,
): Promise<number> {
  const now = Date.now();
  const previous = deliveredEventKeys.get(eventKey);
  if (previous && now - previous < ttlMs) return 0;
  for (const [key, sentAt] of deliveredEventKeys) {
    if (now - sentAt >= ttlMs) deliveredEventKeys.delete(key);
  }

  const delivered = await broadcastPush(payload, eventKey);
  // This is an optimization only; the DB delivery claim above is authoritative.
  if (delivered > 0) deliveredEventKeys.set(eventKey, now);
  return delivered;
}