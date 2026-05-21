import { boolean, integer, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leaderboard = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  displayName: text("display_name").notNull(),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  winRate: real("win_rate").notNull().default(0),
  roi: real("roi").notNull().default(0),
  totalPicks: integer("total_picks").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  badge: text("badge"),
  isVerified: boolean("is_verified").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertLeaderboardSchema = createInsertSchema(leaderboard).omit({ id: true });
export type LeaderboardEntry = typeof leaderboard.$inferSelect;
export type InsertLeaderboardEntry = z.infer<typeof insertLeaderboardSchema>;
