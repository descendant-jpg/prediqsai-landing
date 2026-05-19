import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adminLogs = pgTable("admin_logs", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  adminEmail: text("admin_email"),
  action: text("action"),
  targetUserId: integer("target_user_id"),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertAdminLogSchema = createInsertSchema(adminLogs).omit({
  id: true,
  createdAt: true,
});

export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = z.infer<typeof insertAdminLogSchema>;
