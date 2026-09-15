import { index, integer, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { table } from "./table";

export const blogQueue = table("blog_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  topic: text("topic").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  claimToken: uuid("claim_token"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("blog_queue_next_item_idx").on(table.status, table.claimedAt, table.createdAt),
]);

export type BlogQueueItem = typeof blogQueue.$inferSelect;