import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const errorLogs = pgTable("error_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  errorType: text("error_type").notNull(),
  message: text("message").notNull(),
  screen: text("screen"),
  userId: integer("user_id"),
  device: text("device"),
  os: text("os"),
  stackTrace: text("stack_trace"),
  resolved: boolean("resolved").default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedByAdminId: integer("resolved_by_admin_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertErrorLogSchema = createInsertSchema(errorLogs).omit({ id: true, createdAt: true });
export type DbErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = z.infer<typeof insertErrorLogSchema>;
