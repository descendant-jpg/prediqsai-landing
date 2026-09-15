import { sql } from "drizzle-orm";
import { index, integer, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

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
  // Case-insensitive topic uniqueness so the AI Editor cannot enqueue
  // duplicates, even across concurrent runs or API replicas.
  uniqueIndex("blog_queue_topic_lower_uidx").on(sql`lower(${table.topic})`),
]);

export type BlogQueueItem = typeof blogQueue.$inferSelect;