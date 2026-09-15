import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  ne,
  sql,
} from "drizzle-orm";
import { Router } from "express";
import { z } from "zod/v4";

import { db, predictions as predictionsTable, users } from "@workspace/db";
import { isPremium } from "../lib/tier";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { aiUsageLimiter } from "../middleware/rate-limit";
import { formatPrediction, getPredictions, refreshPredictions } from "../services/prediction-engine";

const router = Router();
const PUBLIC_CACHE_TTL_MS = 5 * 60 * 1000;
const RECENT_WINS_CACHE_TTL_MS = 20 * 60 * 1000;
const publicCache = new Map<string, { expiresAt: number; value: unknown }>();

function getPublicCache<T>(key: string): T | undefined {
  const cached = publicCache.get(key);
  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    publicCache.delete(key);
    return undefined;
  }
  return cached.value as T;
}

function setPublicCache(key: string, value: unknown, ttlMs: number = PUBLIC_CACHE_TTL_MS): void {
  publicCache.set(key, { expiresAt: Date.now() + ttlMs, value });
}

// Premier League competition IDs (ESPN uses "eng.1" slug)
const FREE_TIER_LEAGUES = ["premier league", "epl", "english premier league"];

router.get("/predictions/teaser", async (req, res) => {
  const cached = getPublicCache<{ picks: unknown[] }>("teaser");
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const picks = await db
      .select({
        homeTeam: predictionsTable.homeTeam,
        awayTeam: predictionsTable.awayTeam,
        league: predictionsTable.league,
        matchDate: predictionsTable.matchDate,
        prediction: predictionsTable.prediction,
        confidence: predictionsTable.confidence,
        riskLevel: predictionsTable.riskLevel,
      })
      .from(predictionsTable)
      .where(
        and(
          eq(predictionsTable.sport, "soccer"),
          isNull(predictionsTable.result),
          gte(predictionsTable.matchDate, new Date()),
          eq(predictionsTable.avoidMatch, false),
        ),
      )
      .orderBy(desc(predictionsTable.confidence), asc(predictionsTable.matchDate))
      .limit(2);
    const response = { picks };
    setPublicCache("teaser", response);
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch prediction teaser");
    res.status(500).json({ error: "Failed to fetch prediction teaser" });
  }
});

router.get("/predictions/results", async (req, res) => {
  const cached = getPublicCache<Record<string, unknown>>("results");
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const settled = await db
      .select({ result: predictionsTable.result, sport: predictionsTable.sport })
      .from(predictionsTable)
      .where(
        and(
          inArray(predictionsTable.result, ["win", "loss", "push"]),
          eq(predictionsTable.avoidMatch, false),
        ),
      );
    const won = settled.filter((p) => p.result === "win").length;
    const lost = settled.filter((p) => p.result === "loss").length;
    const pushes = settled.filter((p) => p.result === "push").length;
    const denominator = won + lost;
    const bySport: Record<
      string,
      { totalGraded: number; won: number; lost: number; pushes: number; winRate: number }
    > = {};
    for (const item of settled) {
      const stats = (bySport[item.sport] ??= {
        totalGraded: 0,
        won: 0,
        lost: 0,
        pushes: 0,
        winRate: 0,
      });
      stats.totalGraded++;
      if (item.result === "win") stats.won++;
      else if (item.result === "loss") stats.lost++;
      else stats.pushes++;
    }
    for (const stats of Object.values(bySport)) {
      const sportDenominator = stats.won + stats.lost;
      stats.winRate =
        sportDenominator === 0 ? 0 : Math.round((stats.won / sportDenominator) * 1000) / 10;
    }
    const response = {
      totalGraded: settled.length,
      won,
      lost,
      pushes,
      winRate: denominator === 0 ? 0 : Math.round((won / denominator) * 1000) / 10,
      bySport,
    };
    setPublicCache("results", response);
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch prediction results");
    res.status(500).json({ error: "Failed to fetch prediction results" });
  }
});

const historyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

router.get("/predictions/history", async (req, res) => {
  const query = historyQuerySchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query parameters", details: query.error.issues });
    return;
  }
  const cacheKey = `history:${query.data.page}:${query.data.limit}`;
  const cached = getPublicCache<Record<string, unknown>>(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const graded = and(
      inArray(predictionsTable.result, ["win", "loss", "push"]),
      eq(predictionsTable.avoidMatch, false),
    );
    const [items, [totalRow]] = await Promise.all([
      db
        .select({
          id: predictionsTable.id,
          homeTeam: predictionsTable.homeTeam,
          awayTeam: predictionsTable.awayTeam,
          league: predictionsTable.league,
          sport: predictionsTable.sport,
          matchDate: predictionsTable.matchDate,
          prediction: predictionsTable.prediction,
          odds: sql<number>`round((100.0 / nullif(${predictionsTable.bookmakerProbability}, 0))::numeric, 2)::float`,
          confidence: predictionsTable.confidence,
          result: predictionsTable.result,
        })
        .from(predictionsTable)
        .where(graded)
        .orderBy(desc(predictionsTable.matchDate))
        .limit(query.data.limit)
        .offset((query.data.page - 1) * query.data.limit),
      db.select({ value: count() }).from(predictionsTable).where(graded),
    ]);
    const total = totalRow?.value ?? 0;
    const response = {
      items,
      total,
      page: query.data.page,
      totalPages: Math.ceil(total / query.data.limit),
    };
    setPublicCache(cacheKey, response);
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch prediction history");
    res.status(500).json({ error: "Failed to fetch prediction history" });
  }
});

// Recent Premium Wins showcase — public, cached 20 minutes to avoid DB load under traffic.
// Maps the requested status='won' to settled result='win' (value: win|loss|push).
router.get("/picks/recent-wins", async (req, res) => {
  const cached = getPublicCache<{ wins: unknown[] }>("recent-wins");
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const wins = await db
      .select({
        id: predictionsTable.id,
        homeTeam: predictionsTable.homeTeam,
        awayTeam: predictionsTable.awayTeam,
        league: predictionsTable.league,
        sport: predictionsTable.sport,
        matchDate: predictionsTable.matchDate,
        prediction: predictionsTable.prediction,
        odds: sql<number>`round((100.0 / nullif(${predictionsTable.bookmakerProbability}, 0))::numeric, 2)::float`,
        confidence: predictionsTable.confidence,
        result: predictionsTable.result,
      })
      .from(predictionsTable)
      .where(
        and(
          eq(predictionsTable.result, "win"),
          eq(predictionsTable.avoidMatch, false),
        ),
      )
      .orderBy(desc(predictionsTable.matchDate))
      .limit(10);

    const response = { wins };
    setPublicCache("recent-wins", response, RECENT_WINS_CACHE_TTL_MS);
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch recent wins");
    res.status(500).json({ error: "Failed to fetch recent wins" });
  }
});

// Settled winning picks for the Won tab — sourced directly from settled history
// (the rolling /predictions feed only holds the latest batch and can drop older
// settled rows). Full card fields with the same premium redaction as GET /predictions.
router.get("/predictions/won", requireAuth, async (req, res) => {
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

    const rows = await db
      .select()
      .from(predictionsTable)
      .where(
        and(
          eq(predictionsTable.result, "win"),
          eq(predictionsTable.avoidMatch, false),
        ),
      )
      .orderBy(desc(predictionsTable.matchDate))
      .limit(30);

    const premium = isPremium(user);
    const items = rows.map((row) => {
      const full = formatPrediction(row);
      if (premium) return { ...full, locked: false };
      // Same redaction boundary as the main feed: teams/result stay visible,
      // AI insights (pick, confidence, odds, reasoning) are stripped.
      return {
        ...full,
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
        riskLevel: "medium",
        valueDetected: false,
        locked: true,
      };
    });

    res.json(items);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch settled winning picks");
    res.status(500).json({ error: "Failed to fetch winning picks" });
  }
});

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

    // Monthly pending: created this month, not yet settled — same window and
    // settlement definition as wins/losses so the W-L-P bar is consistent.
    const [pendingRow] = await db
      .select({ value: count() })
      .from(predictionsTable)
      .where(
        and(
          gte(predictionsTable.createdAt, monthStart),
          isNull(predictionsTable.result),
          eq(predictionsTable.avoidMatch, false),
        ),
      );

    res.json({
      accuracy: total >= 5 ? Math.round((wins / total) * 100) : null,
      wins,
      losses,
      total,
      pending: pendingRow?.value ?? 0,
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
