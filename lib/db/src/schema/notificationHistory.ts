import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notificationHistory = pgTable("notification_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  target: text("target").notNull(),
  linkTo: text("link_to"),
  recipientCount: integer("recipient_count").default(0),
  sentByAdminId: integer("sent_by_admin_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertNotificationHistorySchema = createInsertSchema(notificationHistory).omit({ id: true, createdAt: true });
export type DbNotificationHistory = typeof notificationHistory.$inferSelect;
export type InsertNotificationHistory = z.infer<typeof insertNotificationHistorySchema>;
