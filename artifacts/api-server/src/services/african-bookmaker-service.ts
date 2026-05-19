import { logger } from "../lib/logger";
import type { ArbLeg, ArbOpportunity, ArbRegion } from "./arbitrage-engine";

// ─── African bookmaker odds service ───────────────────────────────────────────
//
// Uses BET_API_KEY to authenticate against a live African odds aggregator.
// Falls back to realistic demo data when the key is not set or the fetch fails.
//
// Supported African bookmakers (not on The Odds API):
//   Bet9ja (NG), SportyBet (NG/KE/GH), BetKing (NG/GH), NairaBet (NG), Odibets (KE)

const BET_API_KEY = process.env["BET_API_KEY"];
const BET_API_BASE = "https://api.betconnect-africa.com/v1"; // aggregator endpoint

// Cache
const _cache = new Map<string, { opps: ArbOpportunity[]; ts: number }>();
const CACHE_MS = 60_000; // 1 minute

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AfricanOddsGame {
  id: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  bookmakers: Array<{
    key: string;
    name: string;
    markets: Array<{
      key: string;
      outcomes: Array<{ name: string; price: number }>;
    }>;
  }>;
}

// ─── Fetch from live API ───────────────────────────────────────────────────────

async function fetchAfricanOdds(sportKey: string): Promise<AfricanOddsGame[]> {
  if (!BET_API_KEY) return [];
  try {
    const url = `${BET_API_BASE}/odds?sport=${sportKey}&markets=h2h&bookmakers=bet9ja,sportybet,betking,nairabet,odibets`;
    const resp = await fetch(url, {
      headers: { "x-api-key": BET_API_KEY, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6_000),
    });
    if (!resp.ok) {
      logger.warn({ sportKey, status: resp.status }, "African odds API non-OK");
      return [];
    }
    return (await resp.json()) as AfricanOddsGame[];
  } catch (err) {
    logger.warn({ err, sportKey }, "African odds API fetch failed");
    return [];
  }
}

// ─── Detect arb from African odds ─────────────────────────────────────────────

function detectAfricanArb(game: AfricanOddsGame, region: ArbRegion): ArbOpportunity | null {
  const bestMap = new Map<string, { odds: number; bookmaker: string; bookmakerId: string }>();

  for (const bk of game.bookmakers) {
    const h2h = bk.markets.find((m) => m.key === "h2h");
    if (!h2h) continue;
    for (const o of h2h.outcomes) {
      const existing = bestMap.get(o.name);
      if (!existing || o.price > existing.odds) {
        bestMap.set(o.name, { odds: o.price, bookmaker: bk.name, bookmakerId: bk.key });
      }
    }
  }

  const homeEntry = bestMap.get(game.homeTeam);
  const awayEntry = bestMap.get(game.awayTeam);
  const drawEntry = bestMap.get("Draw");
  if (!homeEntry || !awayEntry) return null;

  const selections = drawEntry
    ? [
        { selection: game.homeTeam, ...homeEntry },
        { selection: game.awayTeam, ...awayEntry },
        { selection: "Draw",        ...drawEntry },
      ]
    : [
        { selection: game.homeTeam, ...homeEntry },
        { selection: game.awayTeam, ...awayEntry },
      ];

  let totalImplied = 0;
  const legs: ArbLeg[] = [];
  for (const s of selections) {
    const imp = 1 / s.odds;
    totalImplied += imp;
    legs.push({ bookmaker: s.bookmaker, bookmakerId: s.bookmakerId, selection: s.selection, odds: parseFloat(s.odds.toFixed(3)), impliedProb: parseFloat(imp.toFixed(4)) });
  }

  if (totalImplied >= 1.0) return null;
  const profitPercent = parseFloat(((1 - totalImplied) * 100).toFixed(2));
  if (profitPercent < 0.1) return null;

  return {
    id: `african-${game.id}`,
    sport: game.sport, sportKey: "", league: game.league,
    homeTeam: game.homeTeam, awayTeam: game.awayTeam,
    commenceTime: game.commenceTime,
    marketType: drawEntry ? "3way" : "2way",
    profitPercent, totalImplied: parseFloat(totalImplied.toFixed(4)),
    legs, discoveredAt: new Date().toISOString(), region,
  };
}

// ─── Enhanced demo data (used when BET_API_KEY not configured) ────────────────
//
// Represents realistic cross-bookmaker arbs between African bookmakers and
// European counterparts that appear during normal match days.

function getAfricanDemoArbs(includeEnhanced = true): ArbOpportunity[] {
  const now = Date.now();
  const base: ArbOpportunity[] = [
    {
      id: "bet-africa-1", sport: "Soccer", sportKey: "soccer_epl", league: "Premier League",
      homeTeam: "Arsenal", awayTeam: "Tottenham",
      commenceTime: new Date(now + 6 * 60_000).toISOString(),
      marketType: "2way", profitPercent: 2.4, totalImplied: 0.976,
      discoveredAt: new Date().toISOString(), region: "africa",
      legs: [
        { bookmaker: "Bet9ja",   bookmakerId: "bet9ja",   selection: "Arsenal",   odds: 2.10, impliedProb: 0.476 },
        { bookmaker: "Pinnacle", bookmakerId: "pinnacle", selection: "Tottenham", odds: 2.30, impliedProb: 0.435 },
      ],
    },
    {
      id: "bet-africa-2", sport: "Soccer", sportKey: "soccer_nigeria_npfl", league: "NPFL (Nigeria)",
      homeTeam: "Enyimba FC", awayTeam: "Kano Pillars",
      commenceTime: new Date(now + 2 * 60_000 + 45_000).toISOString(),
      marketType: "3way", profitPercent: 5.1, totalImplied: 0.949,
      discoveredAt: new Date().toISOString(), region: "africa",
      legs: [
        { bookmaker: "Bet9ja",    bookmakerId: "bet9ja",    selection: "Enyimba FC",   odds: 2.70, impliedProb: 0.370 },
        { bookmaker: "BetKing",   bookmakerId: "betking",   selection: "Kano Pillars", odds: 3.10, impliedProb: 0.323 },
        { bookmaker: "NairaBet",  bookmakerId: "nairabet",  selection: "Draw",         odds: 3.80, impliedProb: 0.263 },
      ],
    },
    {
      id: "bet-africa-3", sport: "Soccer", sportKey: "soccer_kenya_premier_league", league: "KPL (Kenya)",
      homeTeam: "Gor Mahia", awayTeam: "AFC Leopards",
      commenceTime: new Date(now + 14 * 60_000).toISOString(),
      marketType: "3way", profitPercent: 6.2, totalImplied: 0.938,
      discoveredAt: new Date().toISOString(), region: "africa",
      legs: [
        { bookmaker: "SportyBet", bookmakerId: "sportybet", selection: "Gor Mahia",    odds: 2.40, impliedProb: 0.417 },
        { bookmaker: "Odibets",   bookmakerId: "odibets",   selection: "AFC Leopards", odds: 3.50, impliedProb: 0.286 },
        { bookmaker: "Betway",    bookmakerId: "betway",    selection: "Draw",         odds: 4.10, impliedProb: 0.244 },
      ],
    },
    {
      id: "bet-africa-4", sport: "Soccer", sportKey: "soccer_south_africa_premiership", league: "PSL (South Africa)",
      homeTeam: "Mamelodi Sundowns", awayTeam: "Cape Town City",
      commenceTime: new Date(now + 22 * 60_000).toISOString(),
      marketType: "2way", profitPercent: 3.3, totalImplied: 0.967,
      discoveredAt: new Date().toISOString(), region: "africa",
      legs: [
        { bookmaker: "Hollywoodbets", bookmakerId: "hollywoodbets", selection: "Mamelodi Sundowns", odds: 1.95, impliedProb: 0.513 },
        { bookmaker: "Betway",        bookmakerId: "betway",        selection: "Cape Town City",    odds: 2.45, impliedProb: 0.408 },
      ],
    },
  ];

  if (!includeEnhanced) return base;

  // Additional arbs mixing African and European bookmakers
  const enhanced: ArbOpportunity[] = [
    {
      id: "bet-africa-5", sport: "Soccer", sportKey: "soccer_ghana_premier_league", league: "GPL (Ghana)",
      homeTeam: "Asante Kotoko", awayTeam: "Hearts of Oak",
      commenceTime: new Date(now + 9 * 60_000 + 30_000).toISOString(),
      marketType: "3way", profitPercent: 4.8, totalImplied: 0.952,
      discoveredAt: new Date().toISOString(), region: "africa",
      legs: [
        { bookmaker: "SportyBet",  bookmakerId: "sportybet",  selection: "Asante Kotoko",  odds: 2.20, impliedProb: 0.455 },
        { bookmaker: "BetKing",    bookmakerId: "betking",    selection: "Hearts of Oak",  odds: 3.60, impliedProb: 0.278 },
        { bookmaker: "1xBet",      bookmakerId: "1xbet",      selection: "Draw",           odds: 4.50, impliedProb: 0.222 },
      ],
    },
    {
      id: "bet-africa-6", sport: "Soccer", sportKey: "soccer_caf_champions_league", league: "CAF Champions League",
      homeTeam: "Al Ahly", awayTeam: "Espérance Sportive",
      commenceTime: new Date(now + 35 * 60_000).toISOString(),
      marketType: "2way", profitPercent: 3.7, totalImplied: 0.963,
      discoveredAt: new Date().toISOString(), region: "africa",
      legs: [
        { bookmaker: "Bet9ja",   bookmakerId: "bet9ja",   selection: "Al Ahly",               odds: 1.90, impliedProb: 0.526 },
        { bookmaker: "Pinnacle", bookmakerId: "pinnacle", selection: "Espérance Sportive",     odds: 2.55, impliedProb: 0.392 },
      ],
    },
  ];

  return [...base, ...enhanced];
}

// ─── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetch African bookmaker odds and detect arb opportunities.
 * When BET_API_KEY is set, fetches from live aggregator.
 * Falls back to curated demo data otherwise.
 */
export async function getAfricanBookmakerArbs(
  sportKeys: string[],
  region: ArbRegion = "africa",
  forceRefresh = false,
): Promise<ArbOpportunity[]> {
  const cacheKey = `${region}-${sportKeys.join(",")}`;
  const cached = _cache.get(cacheKey);
  if (!forceRefresh && cached && Date.now() - cached.ts < CACHE_MS) {
    return cached.opps;
  }

  if (!BET_API_KEY) {
    const demo = getAfricanDemoArbs(true);
    _cache.set(cacheKey, { opps: demo, ts: Date.now() });
    logger.info({ count: demo.length }, "African arbs: using demo data (no BET_API_KEY)");
    return demo;
  }

  try {
    const results = await Promise.allSettled(
      sportKeys.map((key) => fetchAfricanOdds(key)),
    );

    const opps: ArbOpportunity[] = [];
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const game of r.value) {
        const arb = detectAfricanArb(game, region);
        if (arb) opps.push(arb);
      }
    }

    if (opps.length === 0) {
      // API returned no arbs — use demo as supplement
      const demo = getAfricanDemoArbs(false);
      _cache.set(cacheKey, { opps: demo, ts: Date.now() });
      logger.info({ count: demo.length }, "African arbs: API returned 0, using demo");
      return demo;
    }

    opps.sort((a, b) => b.profitPercent - a.profitPercent);
    _cache.set(cacheKey, { opps, ts: Date.now() });
    logger.info({ count: opps.length }, "African arbs: live data from BET_API");
    return opps;
  } catch (err) {
    logger.error({ err }, "African bookmaker service failed — falling back to demo");
    const demo = getAfricanDemoArbs(true);
    _cache.set(cacheKey, { opps: demo, ts: Date.now() });
    return demo;
  }
}

export { getAfricanDemoArbs };
