import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod/v4";

import { db, users } from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router = Router();

function publicUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    tier: u.tier,
    bankroll: u.bankroll,
    dailyLossLimit: u.dailyLossLimit,
  };
}

router.get("/user/me", requireAuth, async (req, res) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(publicUser(user));
});

const updateSchema = z.object({
  username: z.string().min(2).max(50).optional(),
  dailyLossLimit: z.number().positive().optional(),
  bankroll: z.number().min(0).optional(),
});

router.put("/user/me", requireAuth, async (req, res) => {
  const body = updateSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [updated] = await db
    .update(users)
    .set(body.data)
    .where(eq(users.id, req.userId!))
    .returning();

  res.json(publicUser(updated));
});

export default router;
