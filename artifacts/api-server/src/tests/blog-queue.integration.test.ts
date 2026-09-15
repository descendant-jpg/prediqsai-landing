import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { blogPosts, blogQueue, db, pool } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import express, { type Router } from "express";
import pino from "pino";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const CRON_SECRET = "blog-queue-integration-test-secret";
const testLogger = pino({ enabled: false });
const content = "Automated queue integration coverage. ".repeat(12).trim();

process.env.CRON_SECRET = CRON_SECRET;

let server: Server;
let baseUrl: string;
let createdQueueIds: string[] = [];
let createdPostIds: number[] = [];

async function claim(): Promise<{
  status: number;
  item: { id: string; topic: string; claimToken: string } | null;
}> {
  const response = await fetch(`${baseUrl}/internal/blog-queue/claim`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });

  const body = await response.json() as {
    item: { id: string; topic: string; claimToken: string } | null;
  };
  return { status: response.status, ...body };
}

async function publish(
  queueId: string,
  claimToken: string,
  title: string,
): Promise<Response> {
  return fetch(`${baseUrl}/internal/blog-queue/${queueId}/publish`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CRON_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      claimToken,
      title,
      content,
      excerpt: "A sufficiently descriptive excerpt for the generated blog post integration test.",
    }),
  });
}

beforeAll(async () => {
  const { rows } = await pool.query<{
    currentSchema: string;
    hasBlogQueueTable: boolean;
    hasBlogPostsTable: boolean;
  }>(`
    SELECT
      current_schema() AS "currentSchema",
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name = 'blog_queue'
      ) AS "hasBlogQueueTable",
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name = 'blog_posts'
      ) AS "hasBlogPostsTable"
  `);
  expect(process.env.DATABASE_SCHEMA).toBeDefined();
  expect(rows[0]).toMatchObject({
    currentSchema: process.env.DATABASE_SCHEMA,
    hasBlogQueueTable: true,
    hasBlogPostsTable: true,
  });

  const { default: blogQueueRouter } = await import("../routes/blog-queue") as {
    default: Router;
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.log = testLogger;
    next();
  });
  app.use(blogQueueRouter);

  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", (error?: Error) => error ? reject(error) : resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  if (createdPostIds.length > 0) {
    await db.delete(blogPosts).where(inArray(blogPosts.id, createdPostIds));
    createdPostIds = [];
  }
  if (createdQueueIds.length > 0) {
    await db.delete(blogQueue).where(inArray(blogQueue.id, createdQueueIds));
    createdQueueIds = [];
  }
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
  await pool.end();
});

describe("automated blog queue with PostgreSQL", () => {
  it("assigns different pending topics to concurrent claimers", async () => {
    const marker = crypto.randomUUID();
    const items = await db.insert(blogQueue).values([
      { topic: `Concurrent first topic ${marker}` },
      { topic: `Concurrent second topic ${marker}` },
    ]).returning({ id: blogQueue.id });
    createdQueueIds = items.map((item) => item.id);

    const [firstClaim, secondClaim] = await Promise.all([claim(), claim()]);

    expect(firstClaim).toMatchObject({ status: 200, item: expect.any(Object) });
    expect(secondClaim).toMatchObject({ status: 200, item: expect.any(Object) });
    expect(firstClaim.item).not.toBeNull();
    expect(secondClaim.item).not.toBeNull();
    expect(firstClaim.item!.id).not.toBe(secondClaim.item!.id);
    expect(firstClaim.item!.claimToken).not.toBe(secondClaim.item!.claimToken);

    const savedItems = await db.select({
      id: blogQueue.id,
      status: blogQueue.status,
      claimToken: blogQueue.claimToken,
      attempts: blogQueue.attempts,
    }).from(blogQueue).where(inArray(blogQueue.id, createdQueueIds));
    expect(savedItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: firstClaim.item!.id, status: "processing", attempts: 1 }),
      expect.objectContaining({ id: secondClaim.item!.id, status: "processing", attempts: 1 }),
    ]));
    expect(savedItems.every((item) => item.claimToken !== null)).toBe(true);
  });

  it("reclaims an expired processing lease with a new claim token", async () => {
    const oldToken = crypto.randomUUID();
    const [item] = await db.insert(blogQueue).values({
      topic: `Expired lease topic ${crypto.randomUUID()}`,
      status: "processing",
      claimToken: oldToken,
      claimedAt: new Date(Date.now() - 16 * 60 * 1000),
      attempts: 1,
    }).returning({ id: blogQueue.id });
    createdQueueIds = [item.id];

    const reclaimed = await claim();

    expect(reclaimed).toMatchObject({ status: 200, item: { id: item.id } });
    expect(reclaimed.item!.claimToken).not.toBe(oldToken);

    const [savedItem] = await db.select().from(blogQueue).where(eq(blogQueue.id, item.id));
    expect(savedItem).toMatchObject({ status: "processing", attempts: 2 });
    expect(savedItem.claimToken).toBe(reclaimed.item!.claimToken);
    expect(savedItem.claimedAt!.getTime()).toBeGreaterThan(Date.now() - 60_000);
  });

  it("rejects an old worker token after the item lease has been reclaimed", async () => {
    const oldToken = crypto.randomUUID();
    const [item] = await db.insert(blogQueue).values({
      topic: `Stale token topic ${crypto.randomUUID()}`,
      status: "processing",
      claimToken: oldToken,
      claimedAt: new Date(Date.now() - 16 * 60 * 1000),
    }).returning({ id: blogQueue.id });
    createdQueueIds = [item.id];

    const reclaimed = await claim();
    expect(reclaimed.item).toMatchObject({ id: item.id });
    const title = `Stale worker post ${crypto.randomUUID()}`;

    const response = await publish(item.id, oldToken, title);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Blog topic is no longer being processed",
    });
    const [savedItem] = await db.select().from(blogQueue).where(eq(blogQueue.id, item.id));
    expect(savedItem).toMatchObject({ status: "processing", claimToken: reclaimed.item!.claimToken });
    const posts = await db.select().from(blogPosts).where(eq(blogPosts.title, title));
    expect(posts).toHaveLength(0);
  });

  it("publishes the generated post and completes its queue item together", async () => {
    const [item] = await db.insert(blogQueue).values({
      topic: `Atomic publish topic ${crypto.randomUUID()}`,
    }).returning({ id: blogQueue.id });
    createdQueueIds = [item.id];
    const claimed = await claim();
    expect(claimed.item).toMatchObject({ id: item.id });
    const title = `Atomic publish post ${crypto.randomUUID()}`;

    const response = await publish(item.id, claimed.item!.claimToken, title);

    expect(response.status).toBe(201);
    const { post } = await response.json() as { post: { id: number; title: string } };
    createdPostIds = [post.id];
    expect(post).toMatchObject({ title });

    const [savedItem] = await db.select().from(blogQueue).where(eq(blogQueue.id, item.id));
    const [savedPost] = await db.select().from(blogPosts).where(eq(blogPosts.id, post.id));
    expect(savedItem).toMatchObject({
      status: "published",
      claimToken: null,
      claimedAt: null,
    });
    expect(savedPost).toMatchObject({
      id: post.id,
      title,
      content,
      publishedAt: expect.any(Date),
    });
  });
});