import { and, desc, eq, gte, isNotNull, ne } from "drizzle-orm";
import { Router } from "express";

import { bankrollEntries, db, leaderboard, predictions, users } from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/leaderboard", requireAuth, async (req, res) => {
  try {
    const entries = await db
      .select()
      .from(leaderboard)
      .orderBy(desc(leaderboard.winRate), desc(leaderboard.totalPicks))
      .limit(50);

    const [me] = await db
      .select({ leaderboardOptIn: users.leaderboardOptIn })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    const myEntry = entries.find((e) => e.userId === req.userId) ?? null;

    res.json({
      leaderboard: entries,
      myEntry,
      optedIn: me?.leaderboardOptIn ?? false,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch leaderboard");
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

router.post("/leaderboard/optin", requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select({ username: users.username, leaderboardOptIn: users.leaderboardOptIn })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.leaderboardOptIn) {
      res.json({ message: "Already opted in" });
      return;
    }

    await db.update(users).set({ leaderboardOptIn: true }).where(eq(users.id, req.userId!));

    await syncLeaderboardEntry(req.userId!, user.username);

    res.json({ message: "Opted in to leaderboard" });
  } catch (err) {
    req.log.error({ err }, "Failed to opt in to leaderboard");
    res.status(500).json({ error: "Failed to opt in" });
  }
});

router.post("/leaderboard/optout", requireAuth, async (req, res) => {
  try {
    await db.update(users).set({ leaderboardOptIn: false }).where(eq(users.id, req.userId!));
    await db.delete(leaderboard).where(eq(leaderboard.userId, req.userId!));
    res.json({ message: "Removed from leaderboard" });
  } catch (err) {
    req.log.error({ err }, "Failed to opt out of leaderboard");
    res.status(500).json({ error: "Failed to opt out" });
  }
});

export async function syncLeaderboardEntry(userId: number, displayName: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const entries = await db
    .select()
    .from(bankrollEntries)
    .where(and(eq(bankrollEntries.userId, userId), gte(bankrollEntries.createdAt, monthStart)));

  const wins = entries.filter((e) => e.type === "win").length;
  const losses = entries.filter((e) => e.type === "loss").length;
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const deposits = entries.filter((e) => e.type === "deposit").reduce((s, e) => s + e.amount, 0);
  const winAmt = entries.filter((e) => e.type === "win").reduce((s, e) => s + e.amount, 0);
  const lossAmt = entries.filter((e) => e.type === "loss").reduce((s, e) => s + e.amount, 0);
  const roi = deposits > 0 ? Math.round(((winAmt - lossAmt) / deposits) * 100) : 0;

  let streak = 0;
  for (const e of [...entries].reverse()) {
    if (e.type === "win") streak++;
    else if (e.type === "loss") break;
  }

  const badge = winRate >= 75 ? "🏆 Expert" : winRate >= 60 ? "⭐ Sharp" : total >= 20 ? "📈 Active" : null;

  const existing = await db
    .select({ id: leaderboard.id })
    .from(leaderboard)
    .where(eq(leaderboard.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(leaderboard)
      .set({ wins, losses, winRate, roi, totalPicks: total, streak, badge, updatedAt: new Date() })
      .where(eq(leaderboard.userId, userId));
  } else {
    await db.insert(leaderboard).values({
      userId,
      displayName,
      wins,
      losses,
      winRate,
      roi,
      totalPicks: total,
      streak,
      badge,
    });
  }
}

export default router;
