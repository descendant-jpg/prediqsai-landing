import { boolean, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  username: text("username").notNull(),
  tier: text("tier").notNull().default("free"),
  bankroll: real("bankroll").notNull().default(1000),
  dailyLossLimit: real("daily_loss_limit").notNull().default(200),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  iapTransactionId: text("iap_transaction_id"),
  iapPlatform: text("iap_platform"),
  iapExpiresAt: timestamp("iap_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  isAdmin: boolean("is_admin").default(false),
  isBanned: boolean("is_banned").default(false),
  isSuspended: boolean("is_suspended").default(false),
  manualTierOverride: text("manual_tier_override"),
  freeTrialUntil: timestamp("free_trial_until", { withTimezone: true }),
  riskProfile: text("risk_profile").notNull().default("balanced"),
  leaderboardOptIn: boolean("leaderboard_opt_in").notNull().default(false),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  passwordHash: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  iapTransactionId: true,
  iapPlatform: true,
  iapExpiresAt: true,
  isAdmin: true,
  isBanned: true,
  isSuspended: true,
  manualTierOverride: true,
  freeTrialUntil: true,
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
