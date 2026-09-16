import app from "./app";
import { logger } from "./lib/logger";
import { initTelegramBot } from "./telegram-bot";
import { getPredictions, refreshPredictions } from "./services/prediction-engine";
import { broadcastPushOnce } from "./services/notification-service";
import cron from "node-cron";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  getCachedArbitrage,
  getCachedEVBets,
  getCachedMiddles,
  scanByRegion,
  scanForEVBets,
  scanForMiddles,
} from "./services/arbitrage-engine";
import { getCachedOddsTicker, refreshOddsTicker } from "./services/odds-ticker";
import { isTopicGeneratorEnabled, runTopicGeneration } from "./services/topic-generator";
import {
  getLiveFixtures,
  getLiveFixturesCacheMetadata,
  getTodaysFixtures,
} from "./services/soccer-engine";
import { getAllSportsToday, getAllSportsTomorrow } from "./services/multi-sport-engine";
import {
  generateWCPrediction,
  getCachedWCPrediction,
  getWCFixtureCacheMetadata,
  getWCFixtures,
} from "./services/worldcup-engine";
import {
  findMatchIdByTeams,
  getH2H,
  getCachedStandings,
  getCachedWCMatches,
  getStandings,
  getTeamInfo,
  getWCMatches,
  leagueNameToCode,
} from "./services/football-data";

const PREDICTION_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h
const CACHE_WARM_DELAY_MS = 60 * 1000;
const CACHE_REFRESH_INTERVAL_MS = 3 * 60 * 60 * 1000;
const MATCH_REMINDER_INTERVAL_MS = 5 * 60 * 1000;
const WEBSITE_BLOG_CRON_SCHEDULE = "0 8,11,14,17,20 * * *";
const WEBSITE_BLOG_CRON_URL = "https://www.prediqsai.com/api/cron/generate-blog";
const FOOTBALL_DATA_COMPETITIONS = ["PL", "BL1", "SA", "FL1", "CL"] as const;
const CORE_ARBITRAGE_SPORTS = [
  "soccer_epl",
  "soccer_spain_la_liga",
  "soccer_uefa_champs_league",
] as const;

function startPredictionScheduler() {
  // Background-only prediction generation. User GET requests NEVER trigger
  // external API fetches — all fetching/writing happens here.
  //
  // Warm-up: shortly after boot, check the DB cache (free, no external calls)
  // and run one background refresh ONLY if the cache is empty — otherwise a
  // fresh deploy would serve no picks for up to 6 hours.
  setTimeout(() => {
    getPredictions()
      .then(async (preds) => {
        if (preds.length > 0) {
          logger.info({ count: preds.length }, "Prediction cache warm — skipping boot refresh");
          return;
        }
        const rows = await refreshPredictions();
        const alerts = await notifyNewPredictions(rows);
        logger.info({ count: rows.length, alerts }, "Boot-time prediction refresh complete (cache was empty)");
      })
      .catch((err) => logger.error({ err }, "Prediction warm-up failed"));
  }, 15_000);

  // Scheduled background worker: refresh exactly once every 6 hours.
  setInterval(() => {
    refreshPredictions()
      .then(async (rows) => {
        const alerts = await notifyNewPredictions(rows);
        logger.info({ count: rows.length, alerts }, "Scheduled prediction refresh complete");
      })
      .catch((err) => logger.error({ err }, "Scheduled prediction refresh failed"));
  }, PREDICTION_REFRESH_INTERVAL_MS);
}

async function notifyNewPredictions(rows: Awaited<ReturnType<typeof refreshPredictions>>): Promise<number> {
  let alerts = 0;
  for (const prediction of rows) {
    if (prediction.avoidMatch || (prediction.confidence ?? 0) < 75 || !prediction.matchDate) continue;
    const matchDate = prediction.matchDate.toISOString();
    alerts += await broadcastPushOnce(
      `ai:${prediction.sport}:${prediction.homeTeam}:${prediction.awayTeam}:${matchDate}`,
      {
        category: "aiPick",
        title: "New high-confidence AI pick",
        body: `${prediction.homeTeam} vs ${prediction.awayTeam} is rated ${Math.round(prediction.confidence ?? 0)}%.`,
        data: { type: "aiPick", sport: prediction.sport, homeTeam: prediction.homeTeam, awayTeam: prediction.awayTeam, matchDate },
      },
    );
  }
  return alerts;
}

async function runCacheWarmCycle(coldOnly: boolean) {
  const results: Record<string, string> = {};
  const run = async (name: string, enabled: boolean, task: () => Promise<unknown>) => {
    if (!enabled) {
      results[name] = "skipped (API key missing)";
      return;
    }
    try {
      await task();
      results[name] = "ok";
    } catch (err) {
      results[name] = "failed";
      logger.error({ err, cache: name }, "Background cache warm failed");
    }
  };

  await run("arbitrage:global", Boolean(process.env.ODDS_API_KEY), async () => {
    if (!coldOnly || getCachedArbitrage("global").cacheStatus === "empty") {
      const opportunities = await scanByRegion("global", true, CORE_ARBITRAGE_SPORTS);
      for (const opportunity of opportunities.filter((item) => item.profitPercent >= 2).slice(0, 5)) {
        const isLive = new Date(opportunity.commenceTime).getTime() <= Date.now();
        await broadcastPushOnce(
          `arb:global:${opportunity.id}`,
          {
            category: isLive ? "liveArb" : "arbitrage",
            title: isLive ? "Live arbitrage opportunity" : "New arbitrage opportunity",
            body: `${opportunity.homeTeam} vs ${opportunity.awayTeam}: ${opportunity.profitPercent.toFixed(1)}% guaranteed margin.`,
            data: { type: isLive ? "liveArb" : "arbitrage", opportunityId: opportunity.id, sport: opportunity.sportKey },
          },
        );
      }
    }
  });
  await run("arbitrage:ev:global", Boolean(process.env.ODDS_API_KEY), async () => {
    if (!coldOnly || getCachedEVBets("global").cacheStatus === "empty") {
      const opportunities = await scanForEVBets("global", true, CORE_ARBITRAGE_SPORTS);
      for (const opportunity of opportunities.filter((item) => item.evPercent >= 3).slice(0, 5)) {
        await broadcastPushOnce(
          `ev:global:${opportunity.id}`,
          {
            category: "evAlert",
            title: "New +EV betting opportunity",
            body: `${opportunity.homeTeam} vs ${opportunity.awayTeam}: ${opportunity.evPercent.toFixed(1)}% expected value.`,
            data: { type: "evAlert", opportunityId: opportunity.id, sport: opportunity.sportKey },
          },
        );
      }
    }
  });
  await run("arbitrage:middles:global", true, async () => {
    if (!coldOnly || getCachedMiddles("global").cacheStatus === "empty") {
      await scanForMiddles("global", true);
    }
  });
  await run("odds:ticker", Boolean(process.env.ODDS_API_KEY), async () => {
    await refreshOddsTicker(coldOnly);
  });

  const apiSportsEnabled = Boolean(process.env.API_SPORTS_KEY);
  const today = new Date().toISOString().split("T")[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString().split("T")[0];

  await run("soccer:today", apiSportsEnabled, async () => {
    if (!coldOnly || (await getTodaysFixtures(today, true)).cacheStatus === "empty") {
      await getTodaysFixtures(today);
    }
  });
  await run("soccer:tomorrow", apiSportsEnabled, async () => {
    if (!coldOnly || (await getTodaysFixtures(tomorrow, true)).cacheStatus === "empty") {
      await getTodaysFixtures(tomorrow);
    }
  });
  await run("soccer:live", apiSportsEnabled, async () => {
    if (!coldOnly || getLiveFixturesCacheMetadata().cacheStatus === "empty") {
      await getLiveFixtures();
    }
  });
  await run("sports:today", apiSportsEnabled, async () => {
    if (!coldOnly || (await getAllSportsToday(true)).cacheStatus === "empty") {
      await getAllSportsToday();
    }
  });
  await run("sports:tomorrow", apiSportsEnabled, async () => {
    if (!coldOnly || (await getAllSportsTomorrow(true)).cacheStatus === "empty") {
      await getAllSportsTomorrow();
    }
  });
  await run("worldcup:fixtures", apiSportsEnabled, async () => {
    if (!coldOnly || getWCFixtureCacheMetadata().cacheStatus === "empty") {
      await getWCFixtures();
    }
  });
  const warmableWCStatuses = new Set(["NS", "1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);
  const cachedWCFixtures = (await getWCFixtures(true))
    .filter((fixture) => warmableWCStatuses.has(fixture.status))
    .slice(0, 10);
  const anthropicEnabled = Boolean(
    process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  );
  for (const fixture of cachedWCFixtures) {
    await run(`worldcup:prediction:${fixture.id}`, anthropicEnabled, async () => {
      if (
        !coldOnly ||
        getCachedWCPrediction(fixture.homeTeam, fixture.awayTeam).cacheStatus === "empty"
      ) {
        await generateWCPrediction(fixture.homeTeam, fixture.awayTeam);
      }
    });
  }

  const footballDataEnabled = Boolean(process.env.FOOTBALL_DATA_API_KEY);
  await run("football-data:worldcup", footballDataEnabled, async () => {
    if (!coldOnly || getCachedWCMatches().cacheStatus === "empty") {
      await getWCMatches();
    }
  });
  for (const code of FOOTBALL_DATA_COMPETITIONS) {
    await run(`football-data:standings:${code}`, footballDataEnabled, async () => {
      if (!coldOnly || getCachedStandings(code).cacheStatus === "empty") {
        await getStandings(code);
      }
    });
  }

  const standingTeamIds = Array.from(new Set(
    FOOTBALL_DATA_COMPETITIONS.flatMap((code) =>
      getCachedStandings(code).data.map((row) => row.teamId),
    ),
  )).slice(0, 10);
  for (const teamId of standingTeamIds) {
    await run(`football-data:team:${teamId}`, footballDataEnabled, async () => {
      await getTeamInfo(teamId);
    });
  }

  const cachedSoccerFixtures = [
    ...(await getTodaysFixtures(today, true)).fixtures,
    ...(await getTodaysFixtures(tomorrow, true)).fixtures,
  ]
    .filter((fixture) => fixture.statusShort === "NS")
    .slice(0, 10);
  for (const fixture of cachedSoccerFixtures) {
    const code = leagueNameToCode(fixture.leagueName);
    if (!code) continue;
    await run(`football-data:h2h:${fixture.id}`, footballDataEnabled, async () => {
      const matchId = await findMatchIdByTeams(
        code,
        fixture.homeTeam,
        fixture.awayTeam,
        fixture.kickoff,
      );
      if (matchId) await getH2H(matchId, 5);
    });
  }

  logger.info({ coldOnly, results }, "Background cache warm cycle complete");
}

function startCacheWarmer() {
  setTimeout(() => {
    void runCacheWarmCycle(true);
  }, CACHE_WARM_DELAY_MS);
  setInterval(() => {
    void runCacheWarmCycle(false);
  }, CACHE_REFRESH_INTERVAL_MS);
}

async function sendMatchReminders() {
  const { fixtures } = await getTodaysFixtures(undefined, true);
  const now = Date.now();

  for (const fixture of fixtures
    .filter((item) => item.leagueTier <= 2)
    .filter((item) => {
      const minutesUntilKickoff = (new Date(item.kickoff).getTime() - now) / 60_000;
      return minutesUntilKickoff >= 20 && minutesUntilKickoff <= 40;
    })
    .slice(0, 5)) {
    await broadcastPushOnce(
      `reminder:${fixture.id}`,
      {
        category: "matchReminder",
        title: "Match starts soon",
        body: `${fixture.homeTeam} vs ${fixture.awayTeam} kicks off in about 30 minutes.`,
        data: { type: "matchReminder", fixtureId: fixture.id, kickoff: fixture.kickoff },
      },
      2 * 60 * 60 * 1000,
    );
  }
}

function startMatchReminderScheduler() {
  setTimeout(() => {
    void sendMatchReminders().catch((err) => logger.error({ err }, "Match reminder check failed"));
  }, 2 * 60 * 1000);
  setInterval(() => {
    void sendMatchReminders().catch((err) => logger.error({ err }, "Match reminder check failed"));
  }, MATCH_REMINDER_INTERVAL_MS);
}

function startTopicGeneratorScheduler() {
  if (!isTopicGeneratorEnabled()) {
    logger.warn("GEMINI_API_KEY not set — AI Editor topic scheduler disabled");
    return;
  }
  // Daily at 01:00 server time. The service never throws, so a failed RSS
  // fetch or a malformed Gemini response logs and waits for the next run.
  cron.schedule("0 1 * * *", () => {
    void runTopicGeneration();
  });
  logger.info({ schedule: "0 1 * * *" }, "AI Editor topic scheduler started");
}

function startWebsiteBlogGeneratorScheduler() {
  const websiteCronSecret = process.env.WEBSITE_CRON_SECRET;
  if (!websiteCronSecret) {
    logger.warn("WEBSITE_CRON_SECRET not set — website blog generation scheduler disabled");
    return;
  }

  cron.schedule(WEBSITE_BLOG_CRON_SCHEDULE, () => {
    void fetch(WEBSITE_BLOG_CRON_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${websiteCronSecret}`,
      },
      signal: AbortSignal.timeout(60_000),
    })
      .then((response) => {
        if (!response.ok) {
          logger.error(
            { status: response.status, statusText: response.statusText },
            "Website blog generation cron request failed",
          );
          return;
        }
        logger.info("Website blog generation cron request completed");
      })
      .catch((err) => logger.error({ err }, "Website blog generation cron request failed"));
  });

  logger.info({ schedule: WEBSITE_BLOG_CRON_SCHEDULE }, "Website blog generation scheduler started");
}

async function autoBootstrapAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;
  try {
    const [updated] = await db
      .update(users)
      .set({ isAdmin: true })
      .where(eq(users.email, adminEmail.toLowerCase()))
      .returning({ email: users.email });
    if (updated) {
      logger.info({ email: updated.email }, "✅ Admin auto-bootstrapped on startup");
    }
  } catch (err) {
    logger.warn({ err }, "⚠️ Could not auto-bootstrap admin");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  autoBootstrapAdmin();
  initTelegramBot();
  startPredictionScheduler();
  startCacheWarmer();
  startMatchReminderScheduler();
  startTopicGeneratorScheduler();
  startWebsiteBlogGeneratorScheduler();
});
