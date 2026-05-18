import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod/v4";

import { bankrollEntries, db, users } from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/bankroll", requireAuth, async (req, res) => {
  const [user] = await db
    .select({ bankroll: users.bankroll, dailyLossLimit: users.dailyLossLimit })
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);

  const entries = await db
    .select()
    .from(bankrollEntries)
    .where(eq(bankrollEntries.userId, req.userId!))
    .orderBy(desc(bankrollEntries.createdAt))
    .limit(100);

  res.json({
    bankroll: user?.bankroll ?? 1000,
    dailyLossLimit: user?.dailyLossLimit ?? 200,
    entries,
  });
});

const addEntrySchema = z.object({
  type: z.enum(["deposit", "withdrawal", "win", "loss"]),
  amount: z.number().positive(),
  description: z.string().optional(),
});

router.post("/bankroll/entry", requireAuth, async (req, res) => {
  const body = addEntrySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [entry] = await db
    .insert(bankrollEntries)
    .values({ ...body.data, userId: req.userId! })
    .returning();

  const [user] = await db
    .select({ bankroll: users.bankroll })
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);

  const delta =
    body.data.type === "deposit" || body.data.type === "win"
      ? body.data.amount
      : -body.data.amount;

  const newBankroll = Math.max(0, (user?.bankroll ?? 0) + delta);
  await db.update(users).set({ bankroll: newBankroll }).where(eq(users.id, req.userId!));

  res.status(201).json({ entry, newBankroll });
});

export default router;
