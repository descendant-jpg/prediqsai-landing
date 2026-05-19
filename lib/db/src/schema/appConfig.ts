import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const appConfig = pgTable("app_config", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertAppConfigSchema = createInsertSchema(appConfig);

export type AppConfig = typeof appConfig.$inferSelect;
export type InsertAppConfig = z.infer<typeof insertAppConfigSchema>;
