import { and, eq, or, sql } from "drizzle-orm";
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod/v4";

import { blogPosts, blogQueue, db } from "@workspace/db";
import { requireAdmin } from "../middleware/auth";

const router = Router();

const topicsSchema = z.object({
  topics: z.array(z.string().trim().min(3).max(300)).min(1).max(100),
});

const publishSchema = z.object({
  claimToken: z.string().uuid(),
  title: z.string().trim().min(10).max(180),
  content: z.string().trim().min(300),
  excerpt: z.string().trim().min(40).max(320).optional(),
});
const queueIdSchema = z.string().uuid();
const failSchema = z.object({ claimToken: z.string().uuid() });
const CLAIM_LEASE_MS = 15 * 60 * 1000;

function slugify(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "post"
  );
}

function hasCronSecret(authorization: string | undefined): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && authorization === `Bearer ${secret}`);
}

function requireCronSecret(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!hasCronSecret(req.headers.authorization)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.post("/admin/blog-queue", requireAdmin, async (req, res) => {
  const body = topicsSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Topics must be an array of 3–300 character strings.", details: body.error.issues });
    return;
  }
  const topics = [...new Set(body.data.topics.map((topic) => topic.trim()))];
  try {
    const items = await db.insert(blogQueue).values(topics.map((topic) => ({ topic }))).returning();
    res.status(201).json({ items });
  } catch (err) {
    req.log.error({ err }, "Failed to enqueue blog topics");
    res.status(500).json({ error: "Failed to enqueue blog topics" });
  }
});

router.post("/internal/blog-queue/claim", requireCronSecret, async (req, res) => {
  try {
    const claimToken = crypto.randomUUID();
    const staleBefore = new Date(Date.now() - CLAIM_LEASE_MS);
    const [item] = await db
      .update(blogQueue)
      .set({
        status: "processing",
        claimToken,
        claimedAt: new Date(),
        attempts: sql`${blogQueue.attempts} + 1`,
        updatedAt: new Date(),
      })
      .where(
        eq(
          blogQueue.id,
          sql`(
            select ${blogQueue.id}
            from ${blogQueue}
            where ${blogQueue.status} = 'pending'
              or (${blogQueue.status} = 'processing' and ${blogQueue.claimedAt} < ${staleBefore})
            order by ${blogQueue.createdAt} asc
            for update skip locked
            limit 1
          )`,
        ),
      )
      .returning({ id: blogQueue.id, topic: blogQueue.topic, claimToken: blogQueue.claimToken });
    res.json({ item: item ?? null });
  } catch (err) {
    req.log.error({ err }, "Failed to claim blog topic");
    res.status(500).json({ error: "Failed to claim blog topic" });
  }
});

router.post("/internal/blog-queue/:id/publish", requireCronSecret, async (req, res) => {
  const queueId = queueIdSchema.safeParse(req.params.id);
  const body = publishSchema.safeParse(req.body);
  if (!queueId.success || !body.success) {
    res.status(400).json({
      error: "Invalid generated blog post",
      ...(body.success ? {} : { details: body.error.issues }),
    });
    return;
  }
  try {
    const post = await db.transaction(async (tx) => {
      const [queueItem] = await tx
        .select({ id: blogQueue.id })
        .from(blogQueue)
        .where(and(
          eq(blogQueue.id, queueId.data),
          eq(blogQueue.status, "processing"),
          eq(blogQueue.claimToken, body.data.claimToken),
        ))
        .for("update")
        .limit(1);
      if (!queueItem) return null;
      const slug = `${slugify(body.data.title)}-${queueItem.id.slice(0, 8)}`;
      const [created] = await tx
        .insert(blogPosts)
        .values({
          title: body.data.title,
          slug,
          excerpt: body.data.excerpt,
          content: body.data.content,
          author: "PrediQs AI",
          publishedAt: new Date(),
        })
        .returning();
      await tx
        .update(blogQueue)
        .set({ status: "published", claimToken: null, claimedAt: null, updatedAt: new Date() })
        .where(and(
          eq(blogQueue.id, queueItem.id),
          eq(blogQueue.status, "processing"),
          eq(blogQueue.claimToken, body.data.claimToken),
        ));
      return created;
    });
    if (!post) {
      res.status(409).json({ error: "Blog topic is no longer being processed" });
      return;
    }
    res.status(201).json({ post });
  } catch (err) {
    req.log.error({ err }, "Failed to publish generated blog post");
    res.status(500).json({ error: "Failed to publish generated blog post" });
  }
});

router.post("/internal/blog-queue/:id/fail", requireCronSecret, async (req, res) => {
  const queueId = queueIdSchema.safeParse(req.params.id);
  const body = failSchema.safeParse(req.body);
  if (!queueId.success || !body.success) {
    res.status(400).json({ error: "Invalid blog queue item" });
    return;
  }
  try {
    await db
      .update(blogQueue)
      .set({ status: "failed", claimToken: null, claimedAt: null, updatedAt: new Date() })
      .where(and(
        eq(blogQueue.id, queueId.data),
        eq(blogQueue.status, "processing"),
        eq(blogQueue.claimToken, body.data.claimToken),
      ));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to mark blog topic as failed");
    res.status(500).json({ error: "Failed to mark blog topic as failed" });
  }
});

export default router;