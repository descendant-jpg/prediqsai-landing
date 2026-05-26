import { boolean, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const affiliatePartners = pgTable("affiliate_partners", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  bookName: text("book_name").notNull(),
  logo: text("logo"),
  affiliateUrl: text("affiliate_url").notNull(),
  bonusText: text("bonus_text"),
  commissionType: text("commission_type"),
  commissionAmount: real("commission_amount"),
  commissionCurrency: text("commission_currency").default("USD"),
  minPayout: real("min_payout").default(0),
  paymentSchedule: text("payment_schedule").default("monthly"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  regions: text("regions").array().default(["GLOBAL"]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertAffiliatePartnerSchema = createInsertSchema(affiliatePartners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AffiliatePartner = typeof affiliatePartners.$inferSelect;
export type InsertAffiliatePartner = z.infer<typeof insertAffiliatePartnerSchema>;
