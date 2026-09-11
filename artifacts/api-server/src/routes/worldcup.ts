import { Router } from "express";
import { eq } from "drizzle-orm";

import { db, users } from "@workspace/db";
import { isPremium } from "../lib/tier";
import { requireAuth } from "../middleware/auth";
import {
  AFRICAN_TEAMS,
  WC_WINNER_ODDS,
  getCachedWCPrediction,
  getCountdown,
  getDemoWCArb,
  getWCFixtures,
  getWCFixtureCacheMetadata,
} from "../services/worldcup-engine";

const router = Router();
const UPCOMING_OR_LIVE_STATUSES = new Set(["NS", "1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);

async function requesterIsPremium(userId: number): Promise<boolean> {
  const [user] = await db
    .select({
      tier: users.tier,
      manualTierOverride: users.manualTierOverride,
      freeTrialUntil: users.freeTrialUntil,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return isPremium(user);
}

// GET /api/worldcup/countdown
router.get("/worldcup/countdown", async (_req, res) => {
  res.json(getCountdown());
});

// GET /api/worldcup/overview  (public — no auth needed for countdown/splash)
router.get("/worldcup/overview", async (_req, res) => {
  res.json({
    countdown: getCountdown(),
    winnerOdds: WC_WINNER_ODDS,
    africanTeams: AFRICAN_TEAMS.slice(0, 6),
    demoArb: getDemoWCArb(),
  });
});

// GET /api/worldcup/fixtures  (auth required)
router.get("/worldcup/fixtures", requireAuth, async (req, res) => {
  try {
    const [fixtures, premium] = await Promise.all([
      getWCFixtures(true),
      requesterIsPremium(req.userId!),
    ]);
    const metadata = getWCFixtureCacheMetadata();
    // Attach cached predictions to the first six upcoming/live fixtures.
    const upcoming = fixtures
      .filter((fixture) => UPCOMING_OR_LIVE_STATUSES.has(fixture.status))
      .slice(0, 6);

    const withPreds = await Promise.all(
      upcoming.map(async (f) => {
        const prediction = getCachedWCPrediction(f.homeTeam, f.awayTeam).prediction;
        if (premium) return { ...f, prediction, locked: false };
        return {
          ...f,
          locked: true,
          prediction: {
            homeWinPct: null,
            drawPct: null,
            awayWinPct: null,
            prediction: "",
            confidence: 0,
            reasoning: "",
            keyFactors: [],
          },
        };
      }),
    );
    res.json({ fixtures: withPreds, total: fixtures.length, ...metadata });
  } catch (err) {
    req.log.error({ err }, "WC fixtures failed");
    res.status(500).json({ error: "Failed to load fixtures" });
  }
});

// GET /api/worldcup/african-teams
router.get("/worldcup/african-teams", requireAuth, async (_req, res) => {
  res.json({ teams: AFRICAN_TEAMS });
});

// POST /api/worldcup/predict  (auth required)
router.post("/worldcup/predict", requireAuth, async (req, res) => {
  const { homeTeam, awayTeam } = req.body as { homeTeam?: string; awayTeam?: string };
  // Team names go into an AI prompt — restrict to a plausible team-name shape
  // (letters, spaces, common punctuation, max 60 chars) to block injected instructions.
  const TEAM_RE = /^[\p{L}\p{M}0-9 .'&()-]{2,60}$/u;
  if (!homeTeam || !awayTeam || !TEAM_RE.test(homeTeam) || !TEAM_RE.test(awayTeam)) {
    res.status(400).json({ error: "Valid homeTeam and awayTeam required" });
    return;
  }
  try {
    if (!(await requesterIsPremium(req.userId!))) {
      res.status(403).json({
        error: "World Cup AI predictions require Premium tier",
        upgradeRequired: true,
      });
      return;
    }
    const cached = getCachedWCPrediction(homeTeam, awayTeam);
    if (!cached.prediction) {
      res.status(503).json({ error: "Prediction is not cached", cacheStatus: "empty" });
      return;
    }
    res.json({
      ...cached.prediction,
      cachedAt: cached.cachedAt,
      stale: cached.stale,
      cacheStatus: cached.cacheStatus,
    });
  } catch (err) {
    req.log.error({ err }, "WC prediction route failed");
    res.status(500).json({ error: "Prediction failed" });
  }
});

export default router;
