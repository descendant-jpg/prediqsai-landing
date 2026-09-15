import { integer, text, timestamp } from "drizzle-orm/pg-core";

import { table } from "./table";

/**
 * Pub/Sub redelivers Google Play real-time developer notifications until it
 * receives a successful response. Its stable message ID makes reconciliation
 * of a delivery exactly-once.
 */
export const googlePlayNotifications = table("google_play_notifications", {
  messageId: text("message_id").primaryKey(),
  purchaseToken: text("purchase_token").notNull(),
  notificationType: integer("notification_type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
