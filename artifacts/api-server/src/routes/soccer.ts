import { Router } from "express";
import { eq } from "drizzle-orm";

import { db, users } from "@workspace/db";
import { isPremium } from "../lib/tier";
import { requireAuth } from "../middleware/auth";
import {
  getTodaysFixtures,
  getLiveFixtures,
  getLiveFixturesCacheMetadata,
  getFixtureDetail,
} from "../services/soccer-engine";
import { getAllSportsToday, getAllSportsTomorrow } from "../services/multi-sport-engine";

const router = Router();

type GatedFixture = {
  prediction: string;
  confidence: number;
  riskLevel: string;
  valueDetected: boolean;
  locked?: boolean;
};

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

function gateFixture<T extends GatedFixture>(fixture: T, premium: boolean): T & { locked: boolean } {
  if (premium) return { ...fixture, locked: false };
  const redacted = {
    ...fixture,
    locked: true,
    prediction: "",
    confidence: 0,
    riskLevel: "medium",
    valueDetected: false,
  };
  const mutable = redacted as Record<string, unknown>;
  for (const key of Object.keys(mutable)) {
    if (/value|edge|tip/i.test(key) && key !== "valueDetected") mutable[key] = null;
  }
  return redacted as T & { locked: boolean };
}

function gateFeed<T extends {
  fixtures: GatedFixture[];
  leagueGroups: Array<{ fixtures: GatedFixture[] }>;
  featuredMatch: GatedFixture | null;
}>(feed: T, premium: boolean): T {
  return {
    ...feed,
    fixtures: feed.fixtures.map((fixture) => gateFixture(fixture, premium)),
    leagueGroups: feed.leagueGroups.map((group) => ({
      ...group,
      fixtures: group.fixtures.map((fixture) => gateFixture(fixture, premium)),
    })),
    featuredMatch: feed.featuredMatch ? gateFixture(feed.featuredMatch, premium) : null,
  };
}

router.get("/soccer/fixtures", requireAuth, async (req, res) => {
  try {
    const [data, premium] = await Promise.all([
      getTodaysFixtures(undefined, true),
      requesterIsPremium(req.userId!),
    ]);
    res.json(gateFeed(data, premium));
  } catch (err) {
    req.log.error({ err }, "Failed to get soccer fixtures");
    res.status(500).json({ error: "Failed to fetch soccer fixtures" });
  }
});

router.get("/soccer/live", requireAuth, async (req, res) => {
  try {
    const [live, premium] = await Promise.all([
      getLiveFixtures(true),
      requesterIsPremium(req.userId!),
    ]);
    const metadata = getLiveFixturesCacheMetadata();
    res.setHeader("X-Cache-Status", metadata.cacheStatus);
    if (metadata.cachedAt) res.setHeader("X-Cached-At", metadata.cachedAt);
    res.setHeader("X-Cache-Stale", String(metadata.stale));
    res.json(live.map((fixture) => gateFixture(fixture, premium)));
  } catch (err) {
    req.log.error({ err }, "Failed to get live fixtures");
    res.status(500).json({ error: "Failed to fetch live fixtures" });
  }
});

router.get("/soccer/fixture/:id/detail", requireAuth, async (req, res) => {
  try {
    const fixtureId = parseInt(String(req.params.id), 10);
    if (isNaN(fixtureId)) {
      res.status(400).json({ error: "Invalid fixture ID" });
      return;
    }
    const [detail, premium] = await Promise.all([
      getFixtureDetail(fixtureId, true),
      requesterIsPremium(req.userId!),
    ]);
    if (!detail) {
      res.status(404).json({ error: "Match detail is not cached", cacheStatus: "empty" });
      return;
    }
    res.json({ ...detail, locked: !premium, cacheStatus: "hit" });
  } catch (err) {
    req.log.error({ err }, "Failed to get fixture detail");
    res.status(500).json({ error: "Failed to fetch match detail" });
  }
});

router.get("/sports/today", requireAuth, async (req, res) => {
  try {
    const [soccerData, multiSport, premium] = await Promise.all([
      getTodaysFixtures(undefined, true),
      getAllSportsToday(true),
      requesterIsPremium(req.userId!),
    ]);
    res.json({
      soccer: gateFeed(soccerData, premium),
      nba: multiSport.nba,
      nfl: multiSport.nfl,
      mlb: multiSport.mlb,
      hasApiKey: multiSport.hasApiKey,
      fetchedAt: multiSport.fetchedAt,
      cachedAt: multiSport.cachedAt,
      stale: soccerData.stale || multiSport.stale,
      cacheStatus:
        soccerData.cacheStatus === "hit" || multiSport.cacheStatus === "hit" ? "hit" : "empty",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get all sports today");
    res.status(500).json({ error: "Failed to fetch sports data" });
  }
});

router.get("/sports/tomorrow", requireAuth, async (req, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    const [soccerData, multiSport, premium] = await Promise.all([
      getTodaysFixtures(tomorrowStr, true),
      getAllSportsTomorrow(true),
      requesterIsPremium(req.userId!),
    ]);
    res.json({
      soccer: gateFeed(soccerData, premium),
      nba: multiSport.nba,
      nfl: multiSport.nfl,
      mlb: multiSport.mlb,
      hasApiKey: multiSport.hasApiKey,
      fetchedAt: multiSport.fetchedAt,
      cachedAt: multiSport.cachedAt,
      stale: soccerData.stale || multiSport.stale,
      cacheStatus:
        soccerData.cacheStatus === "hit" || multiSport.cacheStatus === "hit" ? "hit" : "empty",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get all sports tomorrow");
    res.status(500).json({ error: "Failed to fetch sports data" });
  }
});

router.post("/soccer/preview", requireAuth, async (req, res) => {
  void req;
  res.json({
    preview: "",
    cachedAt: null,
    stale: false,
    cacheStatus: "empty",
  });
});

export default router;
