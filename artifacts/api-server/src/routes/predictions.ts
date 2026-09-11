import { and, eq, gte, isNotNull, ne } from "drizzle-orm";
import { Router } from "express";

import { db, predictions as predictionsTable, users } from "@workspace/db";
import { isPremium } from "../lib/tier";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { aiUsageLimiter } from "../middleware/rate-limit";
import { getPredictions, refreshPredictions } from "../services/prediction-engine";

const router = Router();

// Premier League competition IDs (ESPN uses "eng.1" slug)
const FREE_TIER_LEAGUES = ["premier league", "epl", "english premier league"];

router.get("/predictions", requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select({
        tier: users.tier,
        manualTierOverride: users.manualTierOverride,
        freeTrialUntil: users.freeTrialUntil,
      })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    const preds = await getPredictions();

    if (isPremium(user)) {
      res.json(preds.map((p) => ({ ...p, locked: false })));
      return;
    }

    // Free tier: the full fixture list is returned so free users see real
    // matches, but only the first 2 Premier League picks include AI insights.
    // All other rows are redacted server-side (pick/confidence/reasoning/odds
    // stripped) and flagged locked — the UI blur is cosmetic, this is the
    // actual paywall boundary.
    const FREE_UNLOCKED = 2;
    let unlocked = 0;
    const gated = preds.map((p) => {
      const isFreePick =
        unlocked < FREE_UNLOCKED &&
        p.sport === "soccer" &&
        FREE_TIER_LEAGUES.some((l) => p.league.toLowerCase().includes(l));
      if (isFreePick) {
        unlocked += 1;
        return { ...p, locked: false };
      }
      return {
        ...p,
        prediction: "",
        confidence: 0,
        reasoning: "",
        keyFactors: [],
        againstFactors: [],
        weatherImpact: null,
        sharpMoneySignal: null,
        aiProbability: 0,
        bookmakerProbability: 0,
        simulationData: null,
        agentScores: null,
        publicBacking: null,
        avoidMatch: false,
        avoidReason: "",
        riskLevel: "medium",
        valueDetected: false,
        locked: true,
      };
    });

    res.json(gated);
  } catch (err) {
    req.log.error({ err }, "Failed to get predictions");
    res.status(500).json({ error: "Failed to fetch predictions" });
  }
});

// Mobile sport-filter keys → DB sport values
const SPORT_FILTER_MAP: Record<string, string[]> = {
  football: ["soccer"],
  basketball: ["nba", "basketball"],
  nfl: ["nfl"],
  baseball: ["mlb", "baseball"],
  hockey: ["nhl", "hockey"],
  tennis: ["tennis"],
  afl: ["afl"],
  rugby: ["rugby"],
  handball: ["handball"],
  volleyball: ["volleyball"],
  mma: ["mma"],
  formula1: ["formula1"],
  f1: ["formula1"],
};

router.get("/predictions/match-of-day", requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select({
        tier: users.tier,
        manualTierOverride: users.manualTierOverride,
        freeTrialUntil: users.freeTrialUntil,
      })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    const sportFilter = typeof req.query.sport === "string" ? req.query.sport : "all";
    const allowedSports = sportFilter === "all" ? null : SPORT_FILTER_MAP[sportFilter] ?? null;

    const preds = await getPredictions();
    const candidates = preds
      .filter((p) => !p.avoidMatch)
      .filter((p) => !allowedSports || allowedSports.includes(p.sport.toLowerCase()))
      .sort((a, b) => b.confidence - a.confidence);

    const top = candidates[0] ?? null;
    if (!top) {
      res.json(null);
      return;
    }

    const premium = isPremium(user);
    res.json({
      id: top.id,
      sport: top.sport,
      match: `${top.homeTeam} vs ${top.awayTeam}`,
      homeTeam: top.homeTeam,
      awayTeam: top.awayTeam,
      competition: top.league,
      matchDate: top.matchDate,
      pick: premium ? top.prediction : "",
      confidence: premium ? top.confidence : 0,
      analysis: premium ? top.reasoning : "",
      keyStats: premium ? (top.keyFactors ?? []).slice(0, 3) : [],
      valueDetected: premium ? top.valueDetected : false,
      locked: !premium,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get match of the day");
    res.status(500).json({ error: "Failed to fetch match of the day" });
  }
});

router.post("/predictions/refresh", requireAdmin, aiUsageLimiter, async (req, res) => {
  try {
    const preds = await refreshPredictions();
    res.json({ count: preds.length, message: "Predictions refreshed" });
  } catch (err) {
    req.log.error({ err }, "Failed to refresh predictions");
    res.status(500).json({ error: "Failed to refresh predictions" });
  }
});

router.get("/predictions/accuracy", requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const settled = await db
      .select({ result: predictionsTable.result, sport: predictionsTable.sport })
      .from(predictionsTable)
      .where(
        and(
          gte(predictionsTable.createdAt, monthStart),
          isNotNull(predictionsTable.result),
          ne(predictionsTable.result, "push"),
          eq(predictionsTable.avoidMatch, false),
        ),
      );

    const wins = settled.filter((p) => p.result === "win").length;
    const losses = settled.filter((p) => p.result === "loss").length;
    const total = wins + losses;

    const bySport: Record<string, { wins: number; total: number }> = {};
    for (const p of settled) {
      const s = p.sport;
      if (!bySport[s]) bySport[s] = { wins: 0, total: 0 };
      bySport[s].total++;
      if (p.result === "win") bySport[s].wins++;
    }

    res.json({
      accuracy: total >= 5 ? Math.round((wins / total) * 100) : null,
      wins,
      losses,
      total,
      bySport: Object.fromEntries(
        Object.entries(bySport).map(([sport, s]) => [
          sport,
          { accuracy: Math.round((s.wins / s.total) * 100), wins: s.wins, total: s.total },
        ]),
      ),
      month: monthStart.toISOString().slice(0, 7),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to compute accuracy");
    res.status(500).json({ error: "Failed to compute accuracy" });
  }
});

export default router;
