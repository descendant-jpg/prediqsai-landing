import { integer, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { table } from "./table";
import { users } from "./users";

/**
 * One row is claimed before an event is sent to a user. The unique key makes
 * scheduler retries and overlapping API processes safe without altering the
 * separate admin notification history.
 */
export const pushNotificationDeliveries = table("push_notification_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventKey: text("event_key").notNull(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  expoTicketId: text("expo_ticket_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("push_notification_deliveries_event_user_unique").on(table.eventKey, table.userId),
]);

export const insertPushNotificationDeliverySchema = createInsertSchema(pushNotificationDeliveries)
  .omit({ id: true, createdAt: true });
export type PushNotificationDelivery = typeof pushNotificationDeliveries.$inferSelect;
export type InsertPushNotificationDelivery = z.infer<typeof insertPushNotificationDeliverySchema>;