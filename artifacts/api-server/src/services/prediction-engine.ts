import { gte, desc } from "drizzle-orm";

import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, predictions as predictionsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const SPORTS = [
  { sport: "nfl", league: "NFL", espnSport: "football", espnLeague: "nfl" },
  { sport: "nba", league: "NBA", espnSport: "basketball", espnLeague: "nba" },
  { sport: "mlb", league: "MLB", espnSport: "baseball", espnLeague: "mlb" },
  {
    sport: "soccer",
    league: "Premier League",
    espnSport: "soccer",
    espnLeague: "eng.1",
  },
] as const;

interface ESPNCompetitor {
  homeAway: "home" | "away";
  team: { displayName: string };
}

interface ESPNOdds {
  details: string;
  overUnder?: number;
}

interface ESPNEvent {
  date: string;
  competitions: Array<{
    competitors: ESPNCompetitor[];
    odds?: ESPNOdds[];
    status?: { type: { completed: boolean } };
  }>;
}

async function fetchESPNGames(espnSport: string, espnLeague: string): Promise<ESPNEvent[]> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/${espnLeague}/scoreboard`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { events?: ESPNEvent[] };
    return (data.events ?? []).filter(
      (e) => !e.competitions?.[0]?.status?.type?.completed,
    );
  } catch {
    return [];
  }
}

async function fetchESPNNews(espnSport: string, espnLeague: string): Promise<string[]> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/${espnLeague}/news`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { articles?: Array<{ headline: string }> };
    return (data.articles ?? []).slice(0, 8).map((a) => a.headline);
  } catch {
    return [];
  }
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

async function generateForSport(
  sport: string,
  league: string,
  espnSport: string,
  espnLeague: string,
) {
  const [games, news] = await Promise.all([
    fetchESPNGames(espnSport, espnLeague),
    fetchESPNNews(espnSport, espnLeague),
  ]);

  const gameLines = games.slice(0, 5).map((e) => {
    const comp = e.competitions?.[0];
    const home = comp?.competitors?.find((c) => c.homeAway === "home")?.team.displayName ?? "Home";
    const away = comp?.competitors?.find((c) => c.homeAway === "away")?.team.displayName ?? "Away";
    const odds = comp?.odds?.[0];
    const date = new Date(e.date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return `${home} vs ${away} (${date})${odds ? ` — Line: ${odds.details}` : ""}`;
  });

  const newsLines = news.slice(0, 6);
  const hasGames = gameLines.length > 0;

  const prompt = `You are a world-class sports betting analyst specialising in ${league}.

${hasGames ? `UPCOMING GAMES:\n${gameLines.join("\n")}` : "No live games are scheduled right now."}

RECENT NEWS:\n${newsLines.length > 0 ? newsLines.join("\n") : "No recent news."}

${
  hasGames
    ? `Analyse the listed games and produce predictions for each one.`
    : `Generate 2 realistic fictional ${league} predictions for demonstration purposes (clearly label them as simulated).`
}

Respond with a JSON array ONLY — no markdown, no prose, just the raw array. Each element must conform exactly to:
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
  "reasoning": "2–3 sentence analysis",
  "keyFactors": [string, string, string],
  "weatherImpact": string|null,
  "sharpMoneySignal": string|null,
  "aiProbability": integer 40-95,
  "bookmakerProbability": integer 30-70,
  "valueDetected": boolean,
  "tierRequired": "free"|"pro"|"elite"
}

Rules for tierRequired:
- "free"  → public-knowledge or avoid picks
- "pro"   → moderate confidence (55–74) or notable value
- "elite" → high confidence (≥75) value picks`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "[]";
  const jsonStr = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
  const parsed = JSON.parse(jsonStr) as RawPrediction[];

  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);

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
  logger.info("Refreshing AI predictions from ESPN + Claude…");

  const rows: (typeof predictionsTable.$inferInsert)[] = [];

  await Promise.allSettled(
    SPORTS.map(async ({ sport, league, espnSport, espnLeague }) => {
      try {
        const preds = await generateForSport(sport, league, espnSport, espnLeague);
        rows.push(...preds);
      } catch (err) {
        logger.error({ err, sport }, "Prediction generation failed for sport");
      }
    }),
  );

  if (rows.length > 0) {
    await db.insert(predictionsTable).values(rows);
    logger.info({ count: rows.length }, "Predictions stored");
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
    .limit(20);

  if (fresh.length >= 4) {
    return fresh.map(formatPrediction);
  }

  // No fresh predictions — generate and return
  await refreshPredictions();

  const afterRefresh = await db
    .select()
    .from(predictionsTable)
    .where(gte(predictionsTable.createdAt, new Date(Date.now() - 2 * 60 * 1000)))
    .orderBy(desc(predictionsTable.confidence))
    .limit(20);

  return afterRefresh.map(formatPrediction);
}
