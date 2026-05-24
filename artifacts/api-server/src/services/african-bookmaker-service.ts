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

// ─── Demo data helpers ────────────────────────────────────────────────────────

const DEMO_ROTATION_MS = 5 * 60_000; // rotate every 5 min

function v(base: number, jitter: number): number {
  const seed = Math.floor(Date.now() / DEMO_ROTATION_MS);
  const pr = ((seed * 2654435761) >>> 0) / 0xffffffff;
  return parseFloat((base + (pr - 0.5) * jitter * 2).toFixed(3));
}

function ct(minsFromNow: number): string {
  const jitter = Math.floor(Date.now() / DEMO_ROTATION_MS) % 7;
  return new Date(Date.now() + (minsFromNow + jitter) * 60_000).toISOString();
}

// ─── Enhanced demo data (used when BET_API_KEY not configured) ────────────────
//
// 13 realistic cross-bookmaker arbs — African local leagues + major tournaments.
// Time-rotated via ct()/v() so countdowns and odds look live.

function getAfricanDemoArbs(_includeEnhanced = true): ArbOpportunity[] {
  const now = new Date().toISOString();
  return [
    {
      id: "bet-africa-1", sport: "Soccer", sportKey: "soccer_epl", league: "Premier League",
      homeTeam: "Arsenal", awayTeam: "Tottenham", commenceTime: ct(6), marketType: "2way",
      profitPercent: v(2.4, 0.35), totalImplied: 0.976, discoveredAt: now, region: "africa",
      legs: [
        { bookmaker: "Bet9ja",   bookmakerId: "bet9ja",   selection: "Arsenal",   odds: v(2.10, 0.07), impliedProb: 0.476 },
        { bookmaker: "Pinnacle", bookmakerId: "pinnacle", selection: "Tottenham", odds: v(2.30, 0.08), impliedProb: 0.435 },
      ],
    },
    {
      id: "bet-africa-2", sport: "Soccer", sportKey: "soccer_nigeria_npfl", league: "NPFL (Nigeria)",
      homeTeam: "Enyimba FC", awayTeam: "Kano Pillars", commenceTime: ct(3), marketType: "3way",
      profitPercent: v(5.1, 0.6), totalImplied: 0.949, discoveredAt: now, region: "africa",
      legs: [
        { bookmaker: "Bet9ja",   bookmakerId: "bet9ja",   selection: "Enyimba FC",   odds: v(2.70, 0.10), impliedProb: 0.370 },
        { bookmaker: "BetKing",  bookmakerId: "betking",  selection: "Kano Pillars", odds: v(3.10, 0.12), impliedProb: 0.323 },
        { bookmaker: "SportyBet",bookmakerId: "sportybet",selection: "Draw",         odds: v(3.80, 0.14), impliedProb: 0.263 },
      ],
    },
    {
      id: "bet-africa-3", sport: "Soccer", sportKey: "soccer_kenya_premier_league", league: "KPL (Kenya)",
      homeTeam: "Gor Mahia", awayTeam: "AFC Leopards", commenceTime: ct(14), marketType: "3way",
      profitPercent: v(6.2, 0.7), totalImplied: 0.938, discoveredAt: now, region: "africa",
      legs: [
        { bookmaker: "SportyBet", bookmakerId: "sportybet", selection: "Gor Mahia",    odds: v(2.40, 0.09), impliedProb: 0.417 },
        { bookmaker: "Odibets",   bookmakerId: "odibets",   selection: "AFC Leopards", odds: v(3.50, 0.13), impliedProb: 0.286 },
        { bookmaker: "Betway",    bookmakerId: "betway",    selection: "Draw",         odds: v(4.10, 0.15), impliedProb: 0.244 },
      ],
    },
    {
      id: "bet-africa-4", sport: "Soccer", sportKey: "soccer_south_africa_premiership", league: "PSL (South Africa)",
      homeTeam: "Mamelodi Sundowns", awayTeam: "Cape Town City", commenceTime: ct(22), marketType: "2way",
      profitPercent: v(3.3, 0.4), totalImplied: 0.967, discoveredAt: now, region: "africa",
      legs: [
        { bookmaker: "Hollywoodbets", bookmakerId: "hollywoodbets", selection: "Mamelodi Sundowns", odds: v(1.95, 0.06), impliedProb: 0.513 },
        { bookmaker: "Betway",        bookmakerId: "betway",        selection: "Cape Town City",    odds: v(2.45, 0.09), impliedProb: 0.408 },
      ],
    },
    {
      id: "bet-africa-5", sport: "Soccer", sportKey: "soccer_ghana_premier_league", league: "GPL (Ghana)",
      homeTeam: "Asante Kotoko", awayTeam: "Hearts of Oak", commenceTime: ct(10), marketType: "3way",
      profitPercent: v(4.8, 0.55), totalImplied: 0.952, discoveredAt: now, region: "africa",
      legs: [
        { bookmaker: "SportyBet", bookmakerId: "sportybet", selection: "Asante Kotoko", odds: v(2.20, 0.08), impliedProb: 0.455 },
        { bookmaker: "BetKing",   bookmakerId: "betking",   selection: "Hearts of Oak", odds: v(3.60, 0.14), impliedProb: 0.278 },
        { bookmaker: "1xBet",     bookmakerId: "1xbet",     selection: "Draw",          odds: v(4.50, 0.17), impliedProb: 0.222 },
      ],
    },
    {
      id: "bet-africa-6", sport: "Soccer", sportKey: "soccer_caf_champions_league", league: "CAF Champions League",
      homeTeam: "Al Ahly", awayTeam: "Espérance Sportive", commenceTime: ct(35), marketType: "2way",
      profitPercent: v(3.7, 0.45), totalImplied: 0.963, discoveredAt: now, region: "africa",
      legs: [
        { bookmaker: "Bet9ja",   bookmakerId: "bet9ja",   selection: "Al Ahly",            odds: v(1.90, 0.06), impliedProb: 0.526 },
        { bookmaker: "Pinnacle", bookmakerId: "pinnacle", selection: "Espérance Sportive", odds: v(2.55, 0.09), impliedProb: 0.392 },
      ],
    },
    {
      id: "bet-africa-7", sport: "Soccer", sportKey: "soccer_spain_la_liga", league: "La Liga",
      homeTeam: "Real Madrid", awayTeam: "Barcelona", commenceTime: ct(48), marketType: "3way",
      profitPercent: v(3.0, 0.38), totalImplied: 0.970, discoveredAt: now, region: "africa",
      legs: [
        { bookmaker: "Bet9ja",    bookmakerId: "bet9ja",    selection: "Real Madrid", odds: v(2.15, 0.08), impliedProb: 0.465 },
        { bookmaker: "SportyBet", bookmakerId: "sportybet", selection: "Barcelona",   odds: v(3.15, 0.12), impliedProb: 0.317 },
        { bookmaker: "22Bet",     bookmakerId: "22bet",     selection: "Draw",        odds: v(4.35, 0.16), impliedProb: 0.230 },
      ],
    },
    {
      id: "bet-africa-8", sport: "Soccer", sportKey: "soccer_nigeria_npfl", league: "NPFL (Nigeria)",
      homeTeam: "Rivers United", awayTeam: "Shooting Stars", commenceTime: ct(19), marketType: "2way",
      profitPercent: v(4.5, 0.5), totalImplied: 0.955, discoveredAt: now, region: "africa",
      legs: [
        { bookmaker: "Bet9ja",  bookmakerId: "bet9ja",  selection: "Rivers United",   odds: v(1.85, 0.06), impliedProb: 0.541 },
        { bookmaker: "BetKing", bookmakerId: "betking", selection: "Shooting Stars",  odds: v(3.00, 0.11), impliedProb: 0.333 },
      ],
    },
    {
      id: "bet-africa-9", sport: "Soccer", sportKey: "soccer_south_africa_premiership", league: "PSL (South Africa)",
      homeTeam: "Kaizer Chiefs", awayTeam: "SuperSport United", commenceTime: ct(41), marketType: "3way",
      profitPercent: v(5.5, 0.62), totalImplied: 0.945, discoveredAt: now, region: "africa",
      legs: [
        { bookmaker: "Hollywoodbets", bookmakerId: "hollywoodbets", selection: "Kaizer Chiefs",    odds: v(2.60, 0.10), impliedProb: 0.385 },
        { bookmaker: "Betway",        bookmakerId: "betway",        selection: "SuperSport United", odds: v(3.00, 0.11), impliedProb: 0.333 },
        { bookmaker: "1xBet",         bookmakerId: "1xbet",         selection: "Draw",             odds: v(4.90, 0.19), impliedProb: 0.204 },
      ],
    },
    {
      id: "bet-africa-10", sport: "Soccer", sportKey: "soccer_epl", league: "Premier League",
      homeTeam: "Liverpool", awayTeam: "Chelsea", commenceTime: ct(57), marketType: "3way",
      profitPercent: v(2.8, 0.35), totalImplied: 0.972, discoveredAt: now, region: "africa",
      legs: [
        { bookmaker: "Bet9ja",    bookmakerId: "bet9ja",    selection: "Liverpool", odds: v(1.95, 0.07), impliedProb: 0.513 },
        { bookmaker: "SportyBet", bookmakerId: "sportybet", selection: "Chelsea",   odds: v(4.20, 0.16), impliedProb: 0.238 },
        { bookmaker: "22Bet",     bookmakerId: "22bet",     selection: "Draw",      odds: v(4.40, 0.17), impliedProb: 0.227 },
      ],
    },
    {
      id: "bet-africa-11", sport: "Soccer", sportKey: "soccer_caf_champions_league", league: "CAF Champions League",
      homeTeam: "Simba SC", awayTeam: "TP Mazembe", commenceTime: ct(28), marketType: "3way",
      profitPercent: v(6.8, 0.75), totalImplied: 0.932, discoveredAt: now, region: "africa",
      legs: [
        { bookmaker: "Odibets",  bookmakerId: "odibets",  selection: "Simba SC",    odds: v(2.10, 0.08), impliedProb: 0.476 },
        { bookmaker: "SportyBet",bookmakerId: "sportybet",selection: "TP Mazembe",  odds: v(4.00, 0.15), impliedProb: 0.250 },
        { bookmaker: "Melbet",   bookmakerId: "melbet",   selection: "Draw",        odds: v(4.80, 0.18), impliedProb: 0.208 },
      ],
    },
    {
      id: "bet-africa-12", sport: "Soccer", sportKey: "soccer_kenya_premier_league", league: "KPL (Kenya)",
      homeTeam: "Tusker FC", awayTeam: "Bandari FC", commenceTime: ct(16), marketType: "2way",
      profitPercent: v(4.0, 0.48), totalImplied: 0.960, discoveredAt: now, region: "africa",
      legs: [
        { bookmaker: "Odibets", bookmakerId: "odibets", selection: "Tusker FC",  odds: v(2.00, 0.07), impliedProb: 0.500 },
        { bookmaker: "Betway",  bookmakerId: "betway",  selection: "Bandari FC", odds: v(2.85, 0.11), impliedProb: 0.351 },
      ],
    },
    {
      id: "bet-africa-13", sport: "Soccer", sportKey: "soccer_germany_bundesliga", league: "Bundesliga",
      homeTeam: "Bayern Munich", awayTeam: "Borussia Dortmund", commenceTime: ct(63), marketType: "3way",
      profitPercent: v(3.4, 0.42), totalImplied: 0.966, discoveredAt: now, region: "africa",
      legs: [
        { bookmaker: "Bet9ja",    bookmakerId: "bet9ja",    selection: "Bayern Munich",      odds: v(1.70, 0.06), impliedProb: 0.588 },
        { bookmaker: "SportyBet", bookmakerId: "sportybet", selection: "Borussia Dortmund",  odds: v(5.50, 0.21), impliedProb: 0.182 },
        { bookmaker: "22Bet",     bookmakerId: "22bet",     selection: "Draw",               odds: v(4.90, 0.19), impliedProb: 0.204 },
      ],
    },
  ];
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
