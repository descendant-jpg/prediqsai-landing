import { gte, desc } from "drizzle-orm";

import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, predictions as predictionsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const API_SPORTS_KEY = process.env.API_SPORTS_KEY;
const ODDS_API_KEY = process.env.ODDS_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

const SPORTS = [
  {
    sport: "nfl",
    league: "NFL",
    apiSportsBase: "https://v1.american-football.api-sports.io",
    apiSportsPath: "/games",
    oddsKey: "americanfootball_nfl",
    espnSport: "football",
    espnLeague: "nfl",
    outdoor: true,
    newsQuery: "NFL football injury trade",
  },
  {
    sport: "nba",
    league: "NBA",
    apiSportsBase: "https://v2.nba.api-sports.io",
    apiSportsPath: "/games",
    oddsKey: "basketball_nba",
    espnSport: "basketball",
    espnLeague: "nba",
    outdoor: false,
    newsQuery: "NBA basketball injury roster",
  },
  {
    sport: "mlb",
    league: "MLB",
    apiSportsBase: "https://v1.baseball.api-sports.io",
    apiSportsPath: "/games",
    oddsKey: "baseball_mlb",
    espnSport: "baseball",
    espnLeague: "mlb",
    outdoor: true,
    newsQuery: "MLB baseball injury pitcher",
  },
  {
    sport: "soccer",
    league: "Soccer",
    apiSportsBase: "https://v3.football.api-sports.io",
    apiSportsPath: "/fixtures",
    oddsKey: "soccer_epl",
    espnSport: "soccer",
    espnLeague: "eng.1",
    outdoor: true,
    newsQuery: "Premier League La Liga Bundesliga soccer injury suspension lineup",
  },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface GameInfo {
  homeTeam: string;
  awayTeam: string;
  date: string;
  venue?: string;
  city?: string;
}

interface GameOdds {
  homeTeam: string;
  awayTeam: string;
  homeOdds?: number;
  awayOdds?: number;
  drawOdds?: number;
  spread?: string;
  total?: number;
}

interface RawPrediction {
  homeTeam: string;
  awayTeam: string;
  matchDate?: string;
  prediction: string;
  confidence: number;
  riskLevel: string;
  volatilityScore?: number;
  isTrapGame?: boolean;
  avoidMatch?: boolean;
  avoidReason?: string | null;
  reasoning: string;
  keyFactors?: string[];
  weatherImpact?: string | null;
  sharpMoneySignal?: string | null;
  aiProbability: number;
  bookmakerProbability?: number;
  valueDetected?: boolean;
  tierRequired?: string;
}

// ─── API-Sports ───────────────────────────────────────────────────────────────

async function fetchApiSportsGames(
  base: string,
  path: string,
  sport: string,
  leagueId?: number,
): Promise<GameInfo[]> {
  if (!API_SPORTS_KEY) return [];
  try {
    const today = new Date().toISOString().split("T")[0];
    let url = `${base}${path}?date=${today}`;

    if (sport === "soccer") {
      const now = new Date();
      const season = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      const lid = leagueId ?? 39;
      url = `${base}${path}?date=${today}&league=${lid}&season=${season}`;
    }

    const resp = await fetch(url, {
      headers: { "x-apisports-key": API_SPORTS_KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      logger.warn({ sport, status: resp.status }, "API-Sports returned non-OK");
      return [];
    }

    const data = (await resp.json()) as { response?: unknown[] };
    const items = data.response ?? [];

    if (sport === "soccer") {
      return (items as Record<string, unknown>[]).slice(0, 6).map((g) => {
        const fixture = g.fixture as Record<string, unknown> | undefined;
        const teams = g.teams as Record<string, unknown> | undefined;
        const venue = (fixture?.venue as Record<string, unknown> | undefined) ?? {};
        return {
          homeTeam: ((teams?.home as Record<string, unknown> | undefined)?.name as string) ?? "Home",
          awayTeam: ((teams?.away as Record<string, unknown> | undefined)?.name as string) ?? "Away",
          date: (fixture?.date as string) ?? today,
          venue: venue.name as string | undefined,
          city: venue.city as string | undefined,
        };
      });
    }

    return (items as Record<string, unknown>[]).slice(0, 6).map((g) => {
      const teams = g.teams as Record<string, unknown> | undefined;
      const game = g.game as Record<string, unknown> | undefined;
      const home =
        ((teams?.home as Record<string, unknown> | undefined)?.name as string) ??
        "Home";
      const away =
        ((teams?.away as Record<string, unknown> | undefined)?.name as string) ??
        "Away";
      const venue = (g.venue ?? (game?.venue)) as Record<string, unknown> | undefined;
      const arena = g.arena as Record<string, unknown> | undefined;
      return {
        homeTeam: home,
        awayTeam: away,
        date: (g.date as string) ?? today,
        venue: (arena?.name ?? venue?.name) as string | undefined,
        city: (arena?.city ?? venue?.city) as string | undefined,
      };
    });
  } catch (err) {
    logger.warn({ err, sport }, "API-Sports fetch failed — falling back to ESPN");
    return [];
  }
}

// ─── ESPN Fallback ────────────────────────────────────────────────────────────

interface ESPNEvent {
  date: string;
  competitions: Array<{
    competitors: Array<{ homeAway: "home" | "away"; team: { displayName: string } }>;
    odds?: Array<{ details: string; overUnder?: number }>;
    status?: { type: { completed: boolean } };
    venue?: { fullName: string; address?: { city: string } };
  }>;
}

async function fetchESPNGames(espnSport: string, espnLeague: string): Promise<GameInfo[]> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/${espnLeague}/scoreboard`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { events?: ESPNEvent[] };
    const events = (data.events ?? []).filter(
      (e) => !e.competitions?.[0]?.status?.type?.completed,
    );
    return events.slice(0, 6).map((e) => {
      const comp = e.competitions?.[0];
      return {
        homeTeam: comp?.competitors?.find((c) => c.homeAway === "home")?.team.displayName ?? "Home",
        awayTeam: comp?.competitors?.find((c) => c.homeAway === "away")?.team.displayName ?? "Away",
        date: e.date,
        venue: comp?.venue?.fullName,
        city: comp?.venue?.address?.city,
      };
    });
  } catch {
    return [];
  }
}

// ─── ESPN News Fallback ───────────────────────────────────────────────────────

async function fetchESPNNews(espnSport: string, espnLeague: string): Promise<string[]> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/${espnLeague}/news`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { articles?: Array<{ headline: string }> };
    return (data.articles ?? []).slice(0, 6).map((a) => a.headline);
  } catch {
    return [];
  }
}

// ─── The Odds API ─────────────────────────────────────────────────────────────

async function fetchOdds(oddsKey: string): Promise<GameOdds[]> {
  if (!ODDS_API_KEY) return [];
  try {
    const url =
      `https://api.the-odds-api.com/v4/sports/${oddsKey}/odds` +
      `?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) {
      logger.warn({ oddsKey, status: resp.status }, "Odds API non-OK");
      return [];
    }
    const data = (await resp.json()) as Record<string, unknown>[];
    return data.slice(0, 10).map((game) => {
      const bookmakers = game.bookmakers as Record<string, unknown>[] | undefined;
      const bk = bookmakers?.[0];
      const markets = bk?.markets as Record<string, unknown>[] | undefined;
      const h2h = markets?.find((m) => m.key === "h2h");
      const spreads = markets?.find((m) => m.key === "spreads");
      const totals = markets?.find((m) => m.key === "totals");
      const outcomes = (h2h?.outcomes as Record<string, unknown>[] | undefined) ?? [];
      const spreadOutcomes = (spreads?.outcomes as Record<string, unknown>[] | undefined) ?? [];
      const totalOutcomes = (totals?.outcomes as Record<string, unknown>[] | undefined) ?? [];
      const homeName = game.home_team as string;
      const awayName = game.away_team as string;
      const homeH2h = outcomes.find((o) => o.name === homeName);
      const awayH2h = outcomes.find((o) => o.name === awayName);
      const drawH2h = outcomes.find((o) => o.name === "Draw");
      const homeSpread = spreadOutcomes.find((o) => o.name === homeName);
      const totalO = totalOutcomes[0];
      return {
        homeTeam: homeName,
        awayTeam: awayName,
        homeOdds: homeH2h?.price as number | undefined,
        awayOdds: awayH2h?.price as number | undefined,
        drawOdds: drawH2h?.price as number | undefined,
        spread: homeSpread
          ? `${homeName} ${(homeSpread.point as number) > 0 ? "+" : ""}${homeSpread.point}`
          : undefined,
        total: totalO?.point as number | undefined,
      };
    });
  } catch (err) {
    logger.warn({ err, oddsKey }, "Odds API fetch failed");
    return [];
  }
}

// ─── NewsAPI ──────────────────────────────────────────────────────────────────

async function fetchNewsApi(query: string): Promise<string[]> {
  if (!NEWS_API_KEY) return [];
  try {
    const url =
      `https://newsapi.org/v2/everything` +
      `?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=8&apiKey=${NEWS_API_KEY}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { articles?: Array<{ title: string }> };
    return (data.articles ?? []).slice(0, 6).map((a) => a.title);
  } catch {
    return [];
  }
}

// ─── WeatherAPI ───────────────────────────────────────────────────────────────

async function fetchWeather(city: string): Promise<string | null> {
  if (!WEATHER_API_KEY || !city) return null;
  try {
    const url =
      `https://api.weatherapi.com/v1/current.json` +
      `?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)}&aqi=no`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return null;
    const data = (await resp.json()) as Record<string, unknown>;
    const current = data.current as Record<string, unknown> | undefined;
    const cond = (current?.condition as Record<string, unknown> | undefined)?.text ?? "";
    const tempF = current?.temp_f ?? "";
    const windMph = current?.wind_mph ?? "";
    const precipIn = (current?.precip_in as number) ?? 0;
    return `${cond}, ${tempF}°F, Wind ${windMph}mph${precipIn > 0 ? `, Precip ${precipIn}"` : ""}`;
  } catch {
    return null;
  }
}

// ─── Odds matching helper ─────────────────────────────────────────────────────

function findMatchingOdds(odds: GameOdds[], game: GameInfo): GameOdds | undefined {
  const normalize = (s: string) => s.toLowerCase().split(" ").pop() ?? "";
  const homeKey = normalize(game.homeTeam);
  const awayKey = normalize(game.awayTeam);
  return odds.find(
    (o) =>
      normalize(o.homeTeam).includes(homeKey) ||
      normalize(o.awayTeam).includes(awayKey) ||
      homeKey.includes(normalize(o.homeTeam)) ||
      awayKey.includes(normalize(o.awayTeam)),
  );
}

// ─── Sport generator ──────────────────────────────────────────────────────────

async function generateForSport(
  sport: string,
  league: string,
  apiSportsBase: string,
  apiSportsPath: string,
  oddsKey: string,
  espnSport: string,
  espnLeague: string,
  outdoor: boolean,
  newsQuery: string,
) {
  // Fetch everything in parallel — for soccer, fan out across top leagues
  const SOCCER_LEAGUE_IDS = [39, 140, 78, 135, 61, 2, 3, 253, 88];
  const [apiSportsGames, odds, newsHeadlines, espnNews] = await Promise.all([
    sport === "soccer"
      ? Promise.allSettled(
          SOCCER_LEAGUE_IDS.map((id) => fetchApiSportsGames(apiSportsBase, apiSportsPath, sport, id)),
        ).then((results) =>
          results
            .filter((r): r is PromiseFulfilledResult<GameInfo[]> => r.status === "fulfilled")
            .flatMap((r) => r.value)
            .slice(0, 12),
        )
      : fetchApiSportsGames(apiSportsBase, apiSportsPath, sport),
    fetchOdds(oddsKey),
    fetchNewsApi(newsQuery),
    fetchESPNNews(espnSport, espnLeague),
  ]);

  // Use API-Sports if available, otherwise fall back to ESPN
  let games = apiSportsGames;
  let dataSource = "API-Sports (real-time)";
  if (games.length === 0) {
    games = await fetchESPNGames(espnSport, espnLeague);
    dataSource = "ESPN scoreboard";
  }

  // Weather for outdoor venues
  const weatherLines: string[] = [];
  if (outdoor && WEATHER_API_KEY && games.length > 0) {
    const results = await Promise.all(
      games.slice(0, 3).map(async (g) => {
        if (!g.city) return null;
        const w = await fetchWeather(g.city);
        return w ? `${g.homeTeam} (${g.city}): ${w}` : null;
      }),
    );
    for (const r of results) {
      if (r) weatherLines.push(r);
    }
  }

  // Build enriched game lines with real odds
  const gameLines = games.slice(0, 6).map((g) => {
    const o = findMatchingOdds(odds, g);
    const oddsStr = o
      ? ` | ML: Home ${o.homeOdds ?? "N/A"} / Away ${o.awayOdds ?? "N/A"}${o.drawOdds ? ` / Draw ${o.drawOdds}` : ""}${o.spread ? ` | Spread: ${o.spread}` : ""}${o.total ? ` | O/U: ${o.total}` : ""}`
      : "";
    const dateStr = new Date(g.date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const venueStr = g.venue ? ` @ ${g.venue}` : "";
    return `${g.homeTeam} vs ${g.awayTeam}${venueStr} (${dateStr})${oddsStr}`;
  });

  // News: prefer NewsAPI (richer), fall back to ESPN
  const newsLines = newsHeadlines.length > 0 ? newsHeadlines : espnNews;
  const hasGames = gameLines.length > 0;

  const prompt = `You are a world-class sports betting analyst specialising in ${league}.

DATA SOURCE: ${dataSource}
ODDS SOURCE: ${odds.length > 0 ? "The Odds API (live)" : "Not available"}
NEWS SOURCE: ${newsHeadlines.length > 0 ? "NewsAPI (real-time)" : espnNews.length > 0 ? "ESPN headlines" : "Not available"}

${hasGames ? `TODAY'S REAL GAMES:\n${gameLines.join("\n")}` : `No ${league} games scheduled today.`}

${newsLines.length > 0 ? `LATEST INJURIES & NEWS:\n${newsLines.join("\n")}` : ""}

${weatherLines.length > 0 ? `WEATHER CONDITIONS (outdoor venues):\n${weatherLines.join("\n")}` : ""}

${
  hasGames
    ? `Analyse each real game using the live odds, injury news, and weather data. Generate predictions for every listed game.`
    : `Generate 2 realistic fictional ${league} predictions for demonstration (label them as simulated).`
}

Return a JSON array ONLY — no markdown, no prose. Each element must be:
{
  "homeTeam": string,
  "awayTeam": string,
  "matchDate": ISO-8601 date string,
  "prediction": "home_win"|"away_win"|"draw"|"over"|"under",
  "confidence": integer 40-95,
  "riskLevel": "low"|"medium"|"high",
  "volatilityScore": number 1-10,
  "isTrapGame": boolean,
  "avoidMatch": boolean,
  "avoidReason": string|null,
  "reasoning": "2-3 sentences referencing the real odds and news",
  "keyFactors": [string, string, string],
  "weatherImpact": string|null,
  "sharpMoneySignal": string|null,
  "aiProbability": integer 40-95,
  "bookmakerProbability": integer 30-70,
  "valueDetected": boolean,
  "tierRequired": "free"|"pro"|"elite"
}

tierRequired rules:
- "free"  → public-knowledge or avoid picks
- "pro"   → moderate confidence 55-74 or notable value bets
- "elite" → high confidence ≥75 or sharp-money value detected`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "[]";
  const jsonStr = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
  const parsed = JSON.parse(jsonStr) as RawPrediction[];
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);

  logger.info(
    { sport, games: games.length, odds: odds.length, news: newsLines.length, predictions: parsed.length, dataSource },
    "Generated predictions",
  );

  return parsed.map((p) => ({
    sport,
    league,
    homeTeam: p.homeTeam,
    awayTeam: p.awayTeam,
    matchDate: p.matchDate ? new Date(p.matchDate) : new Date(Date.now() + 3 * 60 * 60 * 1000),
    prediction: p.prediction,
    confidence: p.confidence,
    riskLevel: p.riskLevel,
    volatilityScore: p.volatilityScore ?? 5.0,
    isTrapGame: p.isTrapGame ?? false,
    avoidMatch: p.avoidMatch ?? false,
    avoidReason: p.avoidReason ?? null,
    reasoning: p.reasoning,
    keyFactors: p.keyFactors ?? [],
    weatherImpact: p.weatherImpact ?? null,
    sharpMoneySignal: p.sharpMoneySignal ?? null,
    aiProbability: p.aiProbability,
    bookmakerProbability: p.bookmakerProbability ?? 50,
    valueDetected: p.valueDetected ?? false,
    tierRequired: p.tierRequired ?? "free",
    expiresAt,
  }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

function formatPrediction(p: typeof predictionsTable.$inferSelect) {
  return {
    id: String(p.id),
    sport: p.sport,
    league: p.league,
    homeTeam: p.homeTeam,
    awayTeam: p.awayTeam,
    matchDate: p.matchDate.toISOString(),
    prediction: p.prediction,
    confidence: p.confidence,
    riskLevel: p.riskLevel,
    volatilityScore: p.volatilityScore,
    isTrapGame: p.isTrapGame,
    avoidMatch: p.avoidMatch,
    avoidReason: p.avoidReason,
    reasoning: p.reasoning,
    keyFactors: p.keyFactors as string[],
    weatherImpact: p.weatherImpact,
    sharpMoneySignal: p.sharpMoneySignal,
    aiProbability: p.aiProbability,
    bookmakerProbability: p.bookmakerProbability,
    valueDetected: p.valueDetected,
    tierRequired: p.tierRequired,
  };
}

export async function refreshPredictions() {
  logger.info(
    {
      apis: {
        apiSports: Boolean(API_SPORTS_KEY),
        oddsApi: Boolean(ODDS_API_KEY),
        newsApi: Boolean(NEWS_API_KEY),
        weatherApi: Boolean(WEATHER_API_KEY),
      },
    },
    "Refreshing predictions from real APIs + Claude",
  );

  const rows: (typeof predictionsTable.$inferInsert)[] = [];

  await Promise.allSettled(
    SPORTS.map(async ({ sport, league, apiSportsBase, apiSportsPath, oddsKey, espnSport, espnLeague, outdoor, newsQuery }) => {
      try {
        const preds = await generateForSport(
          sport, league, apiSportsBase, apiSportsPath, oddsKey,
          espnSport, espnLeague, outdoor, newsQuery,
        );
        rows.push(...preds);
      } catch (err) {
        logger.error({ err, sport }, "Prediction generation failed for sport");
      }
    }),
  );

  if (rows.length > 0) {
    await db.insert(predictionsTable).values(rows);
    logger.info({ count: rows.length }, "Real predictions stored in DB");
  }

  return rows;
}

export async function getPredictions() {
  const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const fresh = await db
    .select()
    .from(predictionsTable)
    .where(gte(predictionsTable.createdAt, cutoff))
    .orderBy(desc(predictionsTable.confidence))
    .limit(24);

  if (fresh.length >= 4) {
    return fresh.map(formatPrediction);
  }

  await refreshPredictions();

  const afterRefresh = await db
    .select()
    .from(predictionsTable)
    .where(gte(predictionsTable.createdAt, new Date(Date.now() - 3 * 60 * 1000)))
    .orderBy(desc(predictionsTable.confidence))
    .limit(24);

  return afterRefresh.map(formatPrediction);
}
