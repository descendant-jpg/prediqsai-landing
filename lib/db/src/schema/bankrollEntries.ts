import { integer, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { users } from "./users";

export const bankrollEntries = pgTable("bankroll_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertBankrollEntrySchema = createInsertSchema(bankrollEntries).omit({
  id: true,
  createdAt: true,
});

export type BankrollEntry = typeof bankrollEntries.$inferSelect;
export type InsertBankrollEntry = z.infer<typeof insertBankrollEntrySchema>;
