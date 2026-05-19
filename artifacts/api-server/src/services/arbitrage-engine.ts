import { logger } from "../lib/logger";

const ODDS_API_KEY = process.env["ODDS_API_KEY"];

// Sports to scan for arbitrage opportunities
const SPORTS_TO_SCAN = [
  { key: "soccer_epl",                  sport: "Soccer", league: "Premier League" },
  { key: "soccer_spain_la_liga",        sport: "Soccer", league: "La Liga" },
  { key: "soccer_germany_bundesliga",   sport: "Soccer", league: "Bundesliga" },
  { key: "soccer_italy_serie_a",        sport: "Soccer", league: "Serie A" },
  { key: "soccer_france_ligue_one",     sport: "Soccer", league: "Ligue 1" },
  { key: "americanfootball_nfl",        sport: "NFL",    league: "NFL" },
  { key: "basketball_nba",             sport: "NBA",    league: "NBA" },
  { key: "baseball_mlb",               sport: "MLB",    league: "MLB" },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArbLeg {
  bookmaker: string;
  bookmakerId: string;
  selection: string;
  odds: number;
  impliedProb: number;
}

export interface ArbOpportunity {
  id: string;
  sport: string;
  sportKey: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  marketType: "2way" | "3way";
  profitPercent: number;
  totalImplied: number;
  legs: ArbLeg[];
  discoveredAt: string;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

let cachedArbs: ArbOpportunity[] = [];
let lastFetched = 0;
const CACHE_MS = 30_000; // 30-second cache for Elite real-time feel

// ─── Fetch raw odds from Odds API (decimal format, all regions) ───────────────

async function fetchOddsForSport(sportKey: string): Promise<Record<string, unknown>[]> {
  if (!ODDS_API_KEY) return [];
  try {
    const url =
      `https://api.the-odds-api.com/v4/sports/${sportKey}/odds` +
      `?apiKey=${ODDS_API_KEY}&regions=us,uk,eu&markets=h2h&oddsFormat=decimal`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) {
      logger.warn({ sportKey, status: resp.status }, "Odds API non-OK for arb scan");
      return [];
    }
    return (await resp.json()) as Record<string, unknown>[];
  } catch (err) {
    logger.warn({ err, sportKey }, "Odds API fetch failed for arb");
    return [];
  }
}

// ─── Detect arb in a single game ─────────────────────────────────────────────

function detectArb(
  game: Record<string, unknown>,
  sport: string,
  league: string,
): ArbOpportunity | null {
  const bookmakers = game["bookmakers"] as Record<string, unknown>[] | undefined;
  if (!bookmakers || bookmakers.length < 2) return null;

  // Build map: outcome name → { best decimal odds, bookmaker }
  const bestMap = new Map<string, { odds: number; bookmaker: string; bookmakerId: string }>();

  for (const bk of bookmakers) {
    const markets = bk["markets"] as Record<string, unknown>[] | undefined;
    const h2h = markets?.find((m) => m["key"] === "h2h");
    if (!h2h) continue;
    const outcomes = h2h["outcomes"] as Record<string, unknown>[] | undefined;
    for (const o of outcomes ?? []) {
      const name = o["name"] as string;
      const price = o["price"] as number;
      if (!price || price <= 1.01) continue;
      const existing = bestMap.get(name);
      if (!existing || price > existing.odds) {
        bestMap.set(name, {
          odds: price,
          bookmaker: bk["title"] as string,
          bookmakerId: bk["key"] as string,
        });
      }
    }
  }

  const homeTeam = game["home_team"] as string;
  const awayTeam = game["away_team"] as string;
  const homeEntry = bestMap.get(homeTeam);
  const awayEntry = bestMap.get(awayTeam);
  const drawEntry = bestMap.get("Draw");

  if (!homeEntry || !awayEntry) return null;

  // Build legs and check if arb exists
  const selections = drawEntry
    ? [
        { selection: homeTeam, ...homeEntry },
        { selection: awayTeam, ...awayEntry },
        { selection: "Draw", ...drawEntry },
      ]
    : [
        { selection: homeTeam, ...homeEntry },
        { selection: awayTeam, ...awayEntry },
      ];

  let totalImplied = 0;
  const legs: ArbLeg[] = [];

  for (const s of selections) {
    const imp = 1 / s.odds;
    totalImplied += imp;
    legs.push({
      bookmaker: s.bookmaker,
      bookmakerId: s.bookmakerId,
      selection: s.selection,
      odds: parseFloat(s.odds.toFixed(3)),
      impliedProb: parseFloat(imp.toFixed(4)),
    });
  }

  if (totalImplied >= 1.0) return null; // No arb opportunity

  const profitPercent = parseFloat(((1 - totalImplied) * 100).toFixed(2));
  if (profitPercent < 0.1) return null; // Too tiny to be actionable

  const gameId = (game["id"] as string | undefined) ?? `${sport}-${homeTeam}-${awayTeam}`;

  return {
    id: gameId,
    sport,
    sportKey: (game["sport_key"] as string | undefined) ?? "",
    league,
    homeTeam,
    awayTeam,
    commenceTime: (game["commence_time"] as string | undefined) ?? new Date().toISOString(),
    marketType: drawEntry ? "3way" : "2way",
    profitPercent,
    totalImplied: parseFloat(totalImplied.toFixed(4)),
    legs,
    discoveredAt: new Date().toISOString(),
  };
}

// ─── Main scan ────────────────────────────────────────────────────────────────

export async function scanForArbitrage(forceRefresh = false): Promise<ArbOpportunity[]> {
  if (!ODDS_API_KEY) {
    logger.info("No ODDS_API_KEY — returning demo arbitrage data");
    return getDemoArbs();
  }

  const now = Date.now();
  if (!forceRefresh && now - lastFetched < CACHE_MS && cachedArbs.length > 0) {
    return cachedArbs;
  }

  try {
    const sportResults = await Promise.allSettled(
      SPORTS_TO_SCAN.map(async (s) => {
        const games = await fetchOddsForSport(s.key);
        return games.map((g) => ({ game: g, sport: s.sport, league: s.league }));
      }),
    );

    const opportunities: ArbOpportunity[] = [];
    for (const result of sportResults) {
      if (result.status !== "fulfilled") continue;
      for (const { game, sport, league } of result.value) {
        const arb = detectArb(game, sport, league);
        if (arb) opportunities.push(arb);
      }
    }

    opportunities.sort((a, b) => b.profitPercent - a.profitPercent);
    cachedArbs = opportunities;
    lastFetched = now;
    logger.info({ count: opportunities.length }, "Arbitrage scan complete");
    return opportunities;
  } catch (err) {
    logger.error({ err }, "Arbitrage scan failed — returning demo data");
    return getDemoArbs();
  }
}

// ─── Demo arbs (shown when no API key or no real opportunities) ───────────────

function getDemoArbs(): ArbOpportunity[] {
  const now = Date.now();
  return [
    {
      id: "demo-arb-1",
      sport: "Soccer", sportKey: "soccer_epl", league: "Premier League",
      homeTeam: "Arsenal", awayTeam: "Chelsea",
      commenceTime: new Date(now + 4 * 60_000 + 32_000).toISOString(),
      marketType: "2way", profitPercent: 2.3, totalImplied: 0.977,
      discoveredAt: new Date().toISOString(),
      legs: [
        { bookmaker: "Bet365",       bookmakerId: "bet365",      selection: "Arsenal", odds: 2.10, impliedProb: 0.476 },
        { bookmaker: "William Hill", bookmakerId: "williamhill", selection: "Chelsea", odds: 2.20, impliedProb: 0.454 },
      ],
    },
    {
      id: "demo-arb-2",
      sport: "NBA", sportKey: "basketball_nba", league: "NBA",
      homeTeam: "Los Angeles Lakers", awayTeam: "Golden State Warriors",
      commenceTime: new Date(now + 12 * 60_000 + 15_000).toISOString(),
      marketType: "2way", profitPercent: 1.8, totalImplied: 0.982,
      discoveredAt: new Date().toISOString(),
      legs: [
        { bookmaker: "DraftKings", bookmakerId: "draftkings", selection: "Los Angeles Lakers",    odds: 2.05, impliedProb: 0.488 },
        { bookmaker: "FanDuel",    bookmakerId: "fanduel",    selection: "Golden State Warriors", odds: 2.15, impliedProb: 0.465 },
      ],
    },
    {
      id: "demo-arb-3",
      sport: "NFL", sportKey: "americanfootball_nfl", league: "NFL",
      homeTeam: "Kansas City Chiefs", awayTeam: "Baltimore Ravens",
      commenceTime: new Date(now + 2 * 60_000 + 45_000).toISOString(),
      marketType: "2way", profitPercent: 3.1, totalImplied: 0.969,
      discoveredAt: new Date().toISOString(),
      legs: [
        { bookmaker: "BetMGM",   bookmakerId: "betmgm",   selection: "Kansas City Chiefs", odds: 2.30, impliedProb: 0.435 },
        { bookmaker: "Caesars",  bookmakerId: "caesars",  selection: "Baltimore Ravens",   odds: 2.40, impliedProb: 0.417 },
      ],
    },
    {
      id: "demo-arb-4",
      sport: "Soccer", sportKey: "soccer_epl", league: "Premier League",
      homeTeam: "Man City", awayTeam: "Liverpool",
      commenceTime: new Date(now + 25 * 60_000).toISOString(),
      marketType: "3way", profitPercent: 4.2, totalImplied: 0.958,
      discoveredAt: new Date().toISOString(),
      legs: [
        { bookmaker: "Bet365",  bookmakerId: "bet365",  selection: "Man City",  odds: 2.40, impliedProb: 0.417 },
        { bookmaker: "Unibet",  bookmakerId: "unibet",  selection: "Liverpool", odds: 3.80, impliedProb: 0.263 },
        { bookmaker: "Betfair", bookmakerId: "betfair", selection: "Draw",      odds: 4.20, impliedProb: 0.238 },
      ],
    },
  ];
}

// ─── Stake calculator ─────────────────────────────────────────────────────────

export function calculateStakes(
  arb: ArbOpportunity,
  budget: number,
): Array<{ selection: string; bookmaker: string; stake: number; returns: number }> {
  return arb.legs.map((leg) => {
    const stake = parseFloat(((budget * leg.impliedProb) / arb.totalImplied).toFixed(2));
    const returns = parseFloat((stake * leg.odds).toFixed(2));
    return { selection: leg.selection, bookmaker: leg.bookmaker, stake, returns };
  });
}
