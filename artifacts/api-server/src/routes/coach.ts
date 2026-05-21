import { and, desc, eq, gte } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod/v4";

import { bankrollEntries, db, leaderboard, users } from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/coach", requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const todayEntries = await db
      .select()
      .from(bankrollEntries)
      .where(and(eq(bankrollEntries.userId, req.userId!), gte(bankrollEntries.createdAt, todayStart)))
      .orderBy(desc(bankrollEntries.createdAt));

    const recentEntries = await db
      .select()
      .from(bankrollEntries)
      .where(and(eq(bankrollEntries.userId, req.userId!), gte(bankrollEntries.createdAt, twoHoursAgo)))
      .orderBy(desc(bankrollEntries.createdAt));

    const todayLosses = todayEntries.filter((e) => e.type === "loss").reduce((s, e) => s + e.amount, 0);
    const todayWins = todayEntries.filter((e) => e.type === "win").reduce((s, e) => s + e.amount, 0);
    const recentLossStreak = countRecentLossStreak(todayEntries);
    const recentLossCount2h = recentEntries.filter((e) => e.type === "loss").length;

    const alerts: CoachAlert[] = [];

    const lossRatio = user.dailyLossLimit > 0 ? todayLosses / user.dailyLossLimit : 0;

    if (recentLossStreak >= 4) {
      alerts.push({
        type: "danger",
        icon: "🛑",
        title: "Stop — Reset Your Mind",
        message: `You've lost ${recentLossStreak} bets in a row today. The single biggest mistake bettors make is chasing losses. Step away for at least 30 minutes.`,
        action: "Take a break",
      });
    } else if (recentLossStreak === 3) {
      alerts.push({
        type: "warning",
        icon: "⚠️",
        title: "3-Loss Streak — Reduce Stake Size",
        message: "You've lost 3 bets in a row. Reduce your next stake to 50% of normal. Streaks are normal — don't let emotion drive your next bet.",
        action: "Reduce next stake by 50%",
      });
    }

    if (recentLossCount2h >= 3) {
      alerts.push({
        type: "warning",
        icon: "⏱️",
        title: "3 Losses in 2 Hours",
        message: "Fast-paced losses are a sign of emotional betting. Slow down — quality over quantity always wins long-term.",
        action: "Wait 1 hour before next bet",
      });
    }

    if (lossRatio >= 1.0) {
      alerts.push({
        type: "danger",
        icon: "🚫",
        title: "Daily Loss Limit Reached",
        message: `You've lost $${todayLosses.toFixed(0)} today, reaching your $${user.dailyLossLimit} limit. No more bets today — protect your bankroll.`,
        action: "Stop for today",
      });
    } else if (lossRatio >= 0.8) {
      alerts.push({
        type: "warning",
        icon: "📊",
        title: "80% of Daily Limit Used",
        message: `$${todayLosses.toFixed(0)} lost today (limit: $${user.dailyLossLimit}). You have $${(user.dailyLossLimit - todayLosses).toFixed(0)} remaining. Be selective.`,
        action: "Max 1 more bet today",
      });
    }

    if (todayWins > 0 && todayLosses === 0) {
      alerts.push({
        type: "positive",
        icon: "✅",
        title: "Great Day So Far",
        message: `You're up $${todayWins.toFixed(0)} today with no losses. Consider banking some profits — locking in a winning day is a skill.`,
        action: "Consider stopping here",
      });
    }

    const hourOfDay = now.getHours();
    if (hourOfDay >= 22 || hourOfDay < 4) {
      alerts.push({
        type: "info",
        icon: "🌙",
        title: "Late Night — Impaired Judgment Risk",
        message: "Research shows decision quality drops significantly late at night. Your best bets are placed with a clear head in the morning.",
        action: "Sleep on it",
      });
    }

    res.json({
      alerts,
      summary: {
        todayLosses,
        todayWins,
        todayNet: todayWins - todayLosses,
        lossRatio: Math.round(lossRatio * 100),
        recentLossStreak,
        bankroll: user.bankroll,
        dailyLossLimit: user.dailyLossLimit,
        riskProfile: user.riskProfile ?? "balanced",
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to compute coach alerts");
    res.status(500).json({ error: "Coach unavailable" });
  }
});

const riskProfileSchema = z.object({
  riskProfile: z.enum(["conservative", "balanced", "aggressive"]),
});

router.put("/coach/profile", requireAuth, async (req, res) => {
  const body = riskProfileSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid risk profile" });
    return;
  }
  await db.update(users).set({ riskProfile: body.data.riskProfile }).where(eq(users.id, req.userId!));
  res.json({ riskProfile: body.data.riskProfile });
});

function countRecentLossStreak(entries: typeof bankrollEntries.$inferSelect[]): number {
  let streak = 0;
  for (const e of entries) {
    if (e.type === "loss") streak++;
    else if (e.type === "win") break;
  }
  return streak;
}

interface CoachAlert {
  type: "danger" | "warning" | "info" | "positive";
  icon: string;
  title: string;
  message: string;
  action: string;
}

export default router;
