import { text, timestamp } from "drizzle-orm/pg-core";

import { table } from "./table";

/**
 * Apple retries notifications until it receives a successful response. Recording
 * its stable notification UUID makes each entitlement change exactly-once.
 */
export const appStoreServerNotifications = table("app_store_server_notifications", {
  notificationUuid: text("notification_uuid").primaryKey(),
  originalTransactionId: text("original_transaction_id").notNull(),
  transactionId: text("transaction_id").notNull(),
  notificationType: text("notification_type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
});