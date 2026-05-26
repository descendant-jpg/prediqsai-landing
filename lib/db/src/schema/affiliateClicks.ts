import { boolean, integer, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { affiliatePartners } from "./affiliatePartners";
import { users } from "./users";

export const affiliateClicks = pgTable("affiliate_clicks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  partnerId: text("partner_id").references(() => affiliatePartners.id, { onDelete: "set null" }),
  bookName: text("book_name"),
  affiliateUrl: text("affiliate_url"),
  source: text("source"),
  userRegion: text("user_region"),
  userCountry: text("user_country"),
  clickedAt: timestamp("clicked_at", { withTimezone: true }).defaultNow(),
  converted: boolean("converted").default(false),
  commissionEarned: real("commission_earned").default(0),
  commissionCurrency: text("commission_currency").default("USD"),
  paymentStatus: text("payment_status").default("pending"),
  notes: text("notes"),
});

export const insertAffiliateClickSchema = createInsertSchema(affiliateClicks).omit({
  id: true,
  clickedAt: true,
});

export type AffiliateClick = typeof affiliateClicks.$inferSelect;
export type InsertAffiliateClick = z.infer<typeof insertAffiliateClickSchema>;
