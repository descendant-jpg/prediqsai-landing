import { pgTable, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { affiliatePartners } from "./affiliatePartners";

export const affiliatePayouts = pgTable("affiliate_payouts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  partnerId: text("partner_id").references(() => affiliatePartners.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  currency: text("currency").default("USD"),
  paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow(),
  paymentMethod: text("payment_method"),
  reference: text("reference"),
  notes: text("notes"),
});

export const insertAffiliatePayoutSchema = createInsertSchema(affiliatePayouts).omit({
  id: true,
  paidAt: true,
});

export type AffiliatePayout = typeof affiliatePayouts.$inferSelect;
export type InsertAffiliatePayout = z.infer<typeof insertAffiliatePayoutSchema>;
