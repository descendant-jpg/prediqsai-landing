import { desc, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod/v4";

import { bankrollEntries, db, users } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { syncLeaderboardEntry } from "./leaderboard";

const router = Router();

router.get("/bankroll", requireAuth, async (req, res) => {
  const [[user], entries, [totals]] = await Promise.all([
    db
      .select({ bankroll: users.bankroll, dailyLossLimit: users.dailyLossLimit })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1),
    db
      .select()
      .from(bankrollEntries)
      .where(eq(bankrollEntries.userId, req.userId!))
      .orderBy(desc(bankrollEntries.createdAt))
      .limit(100),
    db
      .select({
        totalDeposits: sql<number>`coalesce(sum(case when ${bankrollEntries.type} = 'deposit' then ${bankrollEntries.amount} else 0 end), 0)::float`,
        totalWithdrawals: sql<number>`coalesce(sum(case when ${bankrollEntries.type} = 'withdrawal' then ${bankrollEntries.amount} else 0 end), 0)::float`,
        totalWon: sql<number>`coalesce(sum(case when ${bankrollEntries.type} = 'win' then ${bankrollEntries.amount} else 0 end), 0)::float`,
        totalLost: sql<number>`coalesce(sum(case when ${bankrollEntries.type} = 'loss' then ${bankrollEntries.amount} else 0 end), 0)::float`,
      })
      .from(bankrollEntries)
      .where(eq(bankrollEntries.userId, req.userId!)),
  ]);

  const currentBankroll = user?.bankroll ?? 1000;

  res.json({
    bankroll: currentBankroll,
    currentBankroll,
    totalDeposits: totals?.totalDeposits ?? 0,
    totalWithdrawals: totals?.totalWithdrawals ?? 0,
    totalWon: totals?.totalWon ?? 0,
    totalLost: totals?.totalLost ?? 0,
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

  const [fullUser] = await db
    .select({ username: users.username, leaderboardOptIn: users.leaderboardOptIn })
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);

  if (fullUser?.leaderboardOptIn) {
    syncLeaderboardEntry(req.userId!, fullUser.username).catch(() => {});
  }

  res.status(201).json({ entry, newBankroll });
});

export default router;
