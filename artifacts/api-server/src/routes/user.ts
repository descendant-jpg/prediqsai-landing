import { desc, eq, gte } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod/v4";

import { bankrollEntries, db, predictions, users } from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router = Router();

function normalizeTier(raw: string): string {
  return (raw === "pro" || raw === "elite") ? "premium" : raw;
}

function publicUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    tier: normalizeTier(u.tier),
    bankroll: u.bankroll,
    dailyLossLimit: u.dailyLossLimit,
    isAdmin: u.isAdmin ?? false,
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

router.get("/user/performance", requireAuth, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [entries, recentPredictions] = await Promise.all([
      db
        .select()
        .from(bankrollEntries)
        .where(eq(bankrollEntries.userId, req.userId!))
        .orderBy(desc(bankrollEntries.createdAt))
        .limit(500),
      db
        .select()
        .from(predictions)
        .where(gte(predictions.createdAt, thirtyDaysAgo))
        .orderBy(desc(predictions.confidence))
        .limit(100),
    ]);

    const wins = entries.filter((e) => e.type === "win");
    const losses = entries.filter((e) => e.type === "loss");
    const deposits = entries.filter((e) => e.type === "deposit");

    const totalBets = wins.length + losses.length;
    const winRate = totalBets > 0 ? (wins.length / totalBets) * 100 : 0;
    const totalWon = wins.reduce((s, e) => s + e.amount, 0);
    const totalLost = losses.reduce((s, e) => s + Math.abs(e.amount), 0);
    const totalDeposited = deposits.reduce((s, e) => s + e.amount, 0);
    const netPnl = totalWon - totalLost;
    const roi = totalDeposited > 0 ? (netPnl / totalDeposited) * 100 : 0;

    const sportStats: Record<string, { picks: number; avgConfidence: number; valueCount: number }> = {};
    for (const p of recentPredictions) {
      if (!sportStats[p.sport]) sportStats[p.sport] = { picks: 0, avgConfidence: 0, valueCount: 0 };
      sportStats[p.sport].picks++;
      sportStats[p.sport].avgConfidence += p.confidence;
      if (p.valueDetected) sportStats[p.sport].valueCount++;
    }
    for (const s of Object.values(sportStats)) {
      s.avgConfidence = s.picks > 0 ? parseFloat((s.avgConfidence / s.picks).toFixed(1)) : 0;
    }

    const highConf = recentPredictions.filter((p) => p.confidence >= 70);
    const medConf = recentPredictions.filter((p) => p.confidence >= 50 && p.confidence < 70);
    const lowConf = recentPredictions.filter((p) => p.confidence < 50);

    res.json({
      winRate: parseFloat(winRate.toFixed(1)),
      roi: parseFloat(roi.toFixed(1)),
      totalBets,
      netPnl: parseFloat(netPnl.toFixed(2)),
      totalWon: parseFloat(totalWon.toFixed(2)),
      totalLost: parseFloat(totalLost.toFixed(2)),
      sportStats,
      predictionCount: recentPredictions.length,
      avgConfidence:
        recentPredictions.length > 0
          ? parseFloat((recentPredictions.reduce((s, p) => s + p.confidence, 0) / recentPredictions.length).toFixed(1))
          : 0,
      confidenceTiers: {
        high: { count: highConf.length, label: "High (70%+)" },
        medium: { count: medConf.length, label: "Medium (50-69%)" },
        low: { count: lowConf.length, label: "Low (<50%)" },
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to compute performance");
    res.status(500).json({ error: "Failed to compute performance stats" });
  }
});

export default router;
