import { and, count, desc, eq, isNotNull, lte, ne } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod/v4";

import { blogPosts, db } from "@workspace/db";
import { requireAdmin } from "../middleware/auth";

const router = Router();

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const latestSchema = z.object({
  limit: z.coerce.number().int().positive().max(20).default(3),
});

const createPostSchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().optional(),
  excerpt: z.string().trim().optional(),
  content: z.string().min(1),
  author: z.string().trim().min(1).optional(),
  publish: z.boolean().optional(),
});

const updatePostSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    slug: z.string().trim().min(1).optional(),
    excerpt: z.string().trim().nullable().optional(),
    content: z.string().min(1).optional(),
    author: z.string().trim().min(1).optional(),
    publish: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0);

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

async function uniqueSlug(value: string, excludeId?: number): Promise<string> {
  const base = slugify(value);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const conditions = [eq(blogPosts.slug, candidate)];
    if (excludeId !== undefined) conditions.push(ne(blogPosts.id, excludeId));
    const [existing] = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(and(...conditions))
      .limit(1);
    if (!existing) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

async function slugExists(slug: string, excludeId?: number): Promise<boolean> {
  const conditions = [eq(blogPosts.slug, slug)];
  if (excludeId !== undefined) conditions.push(ne(blogPosts.id, excludeId));
  const [existing] = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(and(...conditions))
    .limit(1);
  return Boolean(existing);
}

router.get("/blog/latest", async (req, res) => {
  const query = latestSchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query parameters", details: query.error.issues });
    return;
  }

  try {
    const posts = await db
      .select({
        title: blogPosts.title,
        slug: blogPosts.slug,
        excerpt: blogPosts.excerpt,
        publishedAt: blogPosts.publishedAt,
      })
      .from(blogPosts)
      .where(and(isNotNull(blogPosts.publishedAt), lte(blogPosts.publishedAt, new Date())))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(query.data.limit);
    res.json({ posts });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch latest blog posts");
    res.status(500).json({ error: "Failed to fetch blog posts" });
  }
});

router.get("/blog", async (req, res) => {
  const query = paginationSchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query parameters", details: query.error.issues });
    return;
  }

  try {
    const now = new Date();
    const published = and(isNotNull(blogPosts.publishedAt), lte(blogPosts.publishedAt, now));
    const [posts, [totalRow]] = await Promise.all([
      db
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          excerpt: blogPosts.excerpt,
          author: blogPosts.author,
          publishedAt: blogPosts.publishedAt,
          createdAt: blogPosts.createdAt,
          updatedAt: blogPosts.updatedAt,
        })
        .from(blogPosts)
        .where(published)
        .orderBy(desc(blogPosts.publishedAt))
        .limit(query.data.limit)
        .offset((query.data.page - 1) * query.data.limit),
      db.select({ value: count() }).from(blogPosts).where(published),
    ]);
    res.json({ posts, total: totalRow?.value ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch blog posts");
    res.status(500).json({ error: "Failed to fetch blog posts" });
  }
});

router.get("/blog/:slug", async (req, res) => {
  try {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.slug, req.params.slug),
          isNotNull(blogPosts.publishedAt),
          lte(blogPosts.publishedAt, new Date()),
        ),
      )
      .limit(1);
    if (!post) {
      res.status(404).json({ error: "Blog post not found" });
      return;
    }
    res.json(post);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch blog post");
    res.status(500).json({ error: "Failed to fetch blog post" });
  }
});

router.get("/admin/blog", requireAdmin, async (req, res) => {
  try {
    const posts = await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
    res.json({ posts });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch admin blog posts");
    res.status(500).json({ error: "Failed to fetch blog posts" });
  }
});

router.post("/admin/blog", requireAdmin, async (req, res) => {
  const body = createPostSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid blog post", details: body.error.issues });
    return;
  }

  try {
    const slug = body.data.slug
      ? slugify(body.data.slug)
      : await uniqueSlug(body.data.title);
    if (body.data.slug && (await slugExists(slug))) {
      res.status(409).json({ error: "A blog post with this slug already exists" });
      return;
    }

    const [post] = await db
      .insert(blogPosts)
      .values({
        title: body.data.title,
        slug,
        excerpt: body.data.excerpt,
        content: body.data.content,
        author: body.data.author,
        publishedAt: body.data.publish ? new Date() : null,
      })
      .returning();
    res.status(201).json(post);
  } catch (err) {
    req.log.error({ err }, "Failed to create blog post");
    res.status(500).json({ error: "Failed to create blog post" });
  }
});

router.put("/admin/blog/:id", requireAdmin, async (req, res) => {
  const id = z.coerce.number().int().positive().safeParse(req.params.id);
  const body = updatePostSchema.safeParse(req.body);
  if (!id.success || !body.success) {
    res.status(400).json({ error: "Invalid blog post update" });
    return;
  }

  try {
    const [existing] = await db
      .select({ publishedAt: blogPosts.publishedAt })
      .from(blogPosts)
      .where(eq(blogPosts.id, id.data))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Blog post not found" });
      return;
    }

    const updates: Partial<typeof blogPosts.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body.data.title !== undefined) updates.title = body.data.title;
    if (body.data.excerpt !== undefined) updates.excerpt = body.data.excerpt;
    if (body.data.content !== undefined) updates.content = body.data.content;
    if (body.data.author !== undefined) updates.author = body.data.author;
    if (body.data.slug !== undefined) {
      const slug = slugify(body.data.slug);
      if (await slugExists(slug, id.data)) {
        res.status(409).json({ error: "A blog post with this slug already exists" });
        return;
      }
      updates.slug = slug;
    }
    if (body.data.publish !== undefined) {
      updates.publishedAt = body.data.publish ? (existing.publishedAt ?? new Date()) : null;
    }

    const [post] = await db
      .update(blogPosts)
      .set(updates)
      .where(eq(blogPosts.id, id.data))
      .returning();
    res.json(post);
  } catch (err) {
    req.log.error({ err }, "Failed to update blog post");
    res.status(500).json({ error: "Failed to update blog post" });
  }
});

router.delete("/admin/blog/:id", requireAdmin, async (req, res) => {
  const id = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: "Invalid blog post id" });
    return;
  }

  try {
    const [post] = await db
      .delete(blogPosts)
      .where(eq(blogPosts.id, id.data))
      .returning({ id: blogPosts.id });
    if (!post) {
      res.status(404).json({ error: "Blog post not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete blog post");
    res.status(500).json({ error: "Failed to delete blog post" });
  }
});

export default router;