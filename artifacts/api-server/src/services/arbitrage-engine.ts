import { logger } from "../lib/logger";
import { getLiveRates } from "./currency-service";
import { getAfricanBookmakerArbs } from "./african-bookmaker-service";

const ODDS_API_KEY = process.env["ODDS_API_KEY"];

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArbRegion = "global" | "us" | "uk" | "africa" | "asia";

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
  region?: ArbRegion;
}

// ─── Bookmaker metadata (trust, mobile money, URLs) ──────────────────────────

export interface BookmakerMeta {
  name: string;
  url: string;
  trustStars: number;
  license: string;
  mobileMoney: string[];
  minStakeUSD: number;
  regions: ArbRegion[];
}

export const BOOKMAKER_META: Record<string, BookmakerMeta> = {
  bet9ja:         { name: "Bet9ja",        url: "https://www.bet9ja.com",            trustStars: 5, license: "Licensed NLRC ✅",        mobileMoney: ["OPay", "PalmPay", "Bank Transfer"], minStakeUSD: 0.07, regions: ["africa"] },
  sportybet:      { name: "SportyBet",     url: "https://www.sportybet.com",         trustStars: 5, license: "Trusted ✅",               mobileMoney: ["OPay", "PalmPay"],                  minStakeUSD: 0.07, regions: ["africa"] },
  betking:        { name: "BetKing",       url: "https://www.betking.com",           trustStars: 5, license: "Licensed NLRC ✅",        mobileMoney: ["OPay", "Bank Transfer"],            minStakeUSD: 0.07, regions: ["africa"] },
  hollywoodbets:  { name: "Hollywoodbets", url: "https://www.hollywoodbets.net",     trustStars: 5, license: "Licensed SA NGB ✅",      mobileMoney: ["FNB", "Standard Bank", "EFT"],      minStakeUSD: 0.05, regions: ["africa"] },
  odibets:        { name: "Odibets",       url: "https://www.odibets.com",           trustStars: 4, license: "Licensed BCLB ✅",        mobileMoney: ["M-Pesa", "Airtel Money"],           minStakeUSD: 0.08, regions: ["africa"] },
  betway:         { name: "Betway",        url: "https://www.betway.com",            trustStars: 5, license: "Multi-jurisdiction ✅",   mobileMoney: ["M-Pesa", "OPay", "Airtel Money"],   minStakeUSD: 0.50, regions: ["africa", "uk", "global"] },
  "1xbet":        { name: "1xBet",         url: "https://www.1xbet.com",             trustStars: 3, license: "Use with caution ⚠️",    mobileMoney: ["M-Pesa", "MTN Mobile Money"],       minStakeUSD: 0.15, regions: ["africa", "uk", "global"] },
  melbet:         { name: "Melbet",        url: "https://www.melbet.com",            trustStars: 3, license: "Use with caution ⚠️",    mobileMoney: ["MTN Mobile Money"],                 minStakeUSD: 0.15, regions: ["africa", "uk", "global"] },
  "22bet":        { name: "22Bet",         url: "https://www.22bet.com",             trustStars: 3, license: "Use with caution ⚠️",    mobileMoney: [],                                   minStakeUSD: 0.15, regions: ["africa", "uk", "global"] },
  draftkings:     { name: "DraftKings",    url: "https://www.draftkings.com",        trustStars: 5, license: "Licensed US ✅",          mobileMoney: [],                                   minStakeUSD: 1.00, regions: ["us"] },
  fanduel:        { name: "FanDuel",       url: "https://www.fanduel.com",           trustStars: 5, license: "Licensed US ✅",          mobileMoney: [],                                   minStakeUSD: 1.00, regions: ["us"] },
  betmgm:         { name: "BetMGM",        url: "https://www.betmgm.com",            trustStars: 5, license: "Licensed US ✅",          mobileMoney: [],                                   minStakeUSD: 1.00, regions: ["us"] },
  caesars:        { name: "Caesars",       url: "https://www.caesarssportsbook.com", trustStars: 5, license: "Licensed US ✅",          mobileMoney: [],                                   minStakeUSD: 1.00, regions: ["us"] },
  espnbet:        { name: "ESPN Bet",      url: "https://www.espnbet.com",           trustStars: 5, license: "Licensed US ✅",          mobileMoney: [],                                   minStakeUSD: 1.00, regions: ["us"] },
  pointsbet:      { name: "PointsBet",     url: "https://www.pointsbet.com",         trustStars: 4, license: "Licensed US ✅",          mobileMoney: [],                                   minStakeUSD: 1.00, regions: ["us"] },
  betrivers:      { name: "BetRivers",     url: "https://www.betrivers.com",         trustStars: 4, license: "Licensed US ✅",          mobileMoney: [],                                   minStakeUSD: 1.00, regions: ["us"] },
  bet365:         { name: "Bet365",        url: "https://www.bet365.com",            trustStars: 5, license: "Licensed UK GC ✅",       mobileMoney: [],                                   minStakeUSD: 0.13, regions: ["uk", "global"] },
  williamhill:    { name: "William Hill",  url: "https://www.williamhill.com",       trustStars: 5, license: "Licensed UK GC ✅",       mobileMoney: [],                                   minStakeUSD: 0.13, regions: ["uk"] },
  betfair:        { name: "Betfair",       url: "https://www.betfair.com",           trustStars: 5, license: "Licensed UK GC ✅",       mobileMoney: [],                                   minStakeUSD: 0.13, regions: ["uk", "global"] },
  paddypower:     { name: "Paddy Power",   url: "https://www.paddypower.com",        trustStars: 5, license: "Licensed UK GC ✅",       mobileMoney: [],                                   minStakeUSD: 0.13, regions: ["uk"] },
  skybet:         { name: "Sky Bet",       url: "https://www.skybet.com",            trustStars: 5, license: "Licensed UK GC ✅",       mobileMoney: [],                                   minStakeUSD: 0.13, regions: ["uk"] },
  unibet:         { name: "Unibet",        url: "https://www.unibet.com",            trustStars: 5, license: "Licensed Malta GRA ✅",   mobileMoney: [],                                   minStakeUSD: 0.13, regions: ["uk", "global"] },
  bwin:           { name: "Bwin",          url: "https://www.bwin.com",              trustStars: 4, license: "Licensed Malta GRA ✅",   mobileMoney: [],                                   minStakeUSD: 0.13, regions: ["uk"] },
  pinnacle:       { name: "Pinnacle",      url: "https://www.pinnacle.com",          trustStars: 5, license: "Licensed Curacao ✅",     mobileMoney: [],                                   minStakeUSD: 1.00, regions: ["global"] },
  "888sport":     { name: "888Sport",      url: "https://www.888sport.com",          trustStars: 4, license: "Licensed UK GC ✅",       mobileMoney: [],                                   minStakeUSD: 0.13, regions: ["uk"] },
};

// ─── Currencies ───────────────────────────────────────────────────────────────

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  rateToUSD: number;
}

const STATIC_RATES: Record<string, number> = {
  USD: 1, NGN: 1580, KES: 129, GHS: 15.5, ZAR: 18.8,
  UGX: 3720, TZS: 2650, ZMW: 27.5, GBP: 0.79, EUR: 0.93,
};

export const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: "USD", symbol: "$",    name: "US Dollar",          rateToUSD: 1    },
  NGN: { code: "NGN", symbol: "₦",    name: "Nigerian Naira",     rateToUSD: 1580 },
  KES: { code: "KES", symbol: "KES ", name: "Kenyan Shilling",    rateToUSD: 129  },
  GHS: { code: "GHS", symbol: "GHS ", name: "Ghanaian Cedi",      rateToUSD: 15.5 },
  ZAR: { code: "ZAR", symbol: "R",    name: "South African Rand", rateToUSD: 18.8 },
  UGX: { code: "UGX", symbol: "UGX ", name: "Ugandan Shilling",  rateToUSD: 3720 },
  TZS: { code: "TZS", symbol: "TZS ", name: "Tanzanian Shilling",rateToUSD: 2650 },
  ZMW: { code: "ZMW", symbol: "ZMW ", name: "Zambian Kwacha",    rateToUSD: 27.5 },
  GBP: { code: "GBP", symbol: "£",    name: "British Pound",     rateToUSD: 0.79 },
  EUR: { code: "EUR", symbol: "€",    name: "Euro",              rateToUSD: 0.93 },
};

export async function getLiveExchangeRates(): Promise<Record<string, number>> {
  try { return await getLiveRates(); } catch { return STATIC_RATES; }
}

// ─── Regional config ──────────────────────────────────────────────────────────

interface SportEntry { key: string; sport: string; league: string }

// Sports the Odds API v4 reliably covers (major global leagues only).
// Obscure/local leagues (NPFL, KPL, etc.) are demo-only; querying them wastes quota.
const REGION_SPORTS: Record<ArbRegion, SportEntry[]> = {
  global: [
    { key: "soccer_epl",                    sport: "Soccer", league: "Premier League"    },
    { key: "soccer_spain_la_liga",          sport: "Soccer", league: "La Liga"           },
    { key: "soccer_germany_bundesliga",     sport: "Soccer", league: "Bundesliga"        },
    { key: "soccer_italy_serie_a",          sport: "Soccer", league: "Serie A"           },
    { key: "soccer_uefa_champs_league",     sport: "Soccer", league: "Champions League"  },
    { key: "americanfootball_nfl",          sport: "NFL",    league: "NFL"               },
    { key: "basketball_nba",               sport: "NBA",    league: "NBA"               },
    { key: "baseball_mlb",                 sport: "MLB",    league: "MLB"               },
    { key: "soccer_usa_mls",               sport: "Soccer", league: "MLS"               },
    { key: "soccer_france_ligue_one",      sport: "Soccer", league: "Ligue 1"           },
  ],
  us: [
    { key: "americanfootball_nfl",  sport: "NFL",    league: "NFL"  },
    { key: "basketball_nba",        sport: "NBA",    league: "NBA"  },
    { key: "baseball_mlb",          sport: "MLB",    league: "MLB"  },
    { key: "soccer_usa_mls",        sport: "Soccer", league: "MLS"  },
    { key: "icehockey_nhl",         sport: "NHL",    league: "NHL"  },
  ],
  uk: [
    { key: "soccer_epl",                sport: "Soccer", league: "Premier League"   },
    { key: "soccer_spain_la_liga",      sport: "Soccer", league: "La Liga"          },
    { key: "soccer_germany_bundesliga", sport: "Soccer", league: "Bundesliga"       },
    { key: "soccer_italy_serie_a",      sport: "Soccer", league: "Serie A"          },
    { key: "soccer_france_ligue_one",   sport: "Soccer", league: "Ligue 1"          },
    { key: "soccer_uefa_champs_league", sport: "Soccer", league: "Champions League" },
  ],
  africa: [
    { key: "soccer_epl",                sport: "Soccer", league: "Premier League"        },
    { key: "soccer_spain_la_liga",      sport: "Soccer", league: "La Liga"               },
    { key: "soccer_uefa_champs_league", sport: "Soccer", league: "Champions League"      },
    { key: "soccer_italy_serie_a",      sport: "Soccer", league: "Serie A"               },
  ],
  asia: [
    { key: "soccer_epl",            sport: "Soccer", league: "Premier League" },
    { key: "soccer_spain_la_liga",  sport: "Soccer", league: "La Liga"        },
    { key: "basketball_nba",        sport: "NBA",    league: "NBA"            },
    { key: "baseball_mlb",          sport: "MLB",    league: "MLB"            },
  ],
};

// Odds API v4 regions param — use broad coverage, then detect arbs from whatever bookmakers respond
const REGION_API_REGIONS: Record<ArbRegion, string> = {
  global: "us,uk,eu,au",
  us:     "us,us2",
  uk:     "uk,eu",
  africa: "uk,eu",  // best proxy — African bookmakers aren't in Odds API
  asia:   "au,eu",
};

export const REGION_DISCLAIMERS: Record<string, string> = {
  africa:    "Verify that your local bookmaker holds a valid gaming license. 1xBet and Melbet operate with limited regulation — use with caution. Only use regulated operators. 18+ only.",
  africa_ng: "Sports betting is regulated by the National Lottery Regulatory Commission (NLRC). Only use NLRC-licensed operators. 18+ only.",
  africa_ke: "Sports betting is regulated by the Betting Control and Licensing Board (BCLB). Note: 20% excise duty applies to all winnings in Kenya.",
  africa_za: "Sports betting is regulated by the National Gambling Board (NGB). Only use NGB-licensed operators. 18+ only.",
  africa_gh: "Sports betting is regulated by the Gaming Commission of Ghana. Play responsibly. 18+ only.",
  us:        "Sports betting regulations vary by state. Only bet where it is legal in your jurisdiction. 18+ (21+ in some states).",
  uk:        "Sports betting is regulated by the UK Gambling Commission (UKGC). BeGambleAware.org. 18+ only.",
  global:    "Sports betting laws vary by country. Ensure betting is legal in your jurisdiction. 18+ only. Gamble responsibly.",
  asia:      "Sports betting laws vary significantly across Asia. Verify legality in your country before placing bets. 18+ only.",
};

// ─── Cache per region ─────────────────────────────────────────────────────────

const regionCache = new Map<ArbRegion, { arbs: ArbOpportunity[]; ts: number }>();
const CACHE_MS = 30_000;   // 30s live-data cache
const DEMO_ROTATION_MS = 5 * 60_000; // rotate demo every 5 min

// ─── Odds API fetch ───────────────────────────────────────────────────────────

async function fetchOddsForSport(
  sportKey: string,
  apiRegions: string,
): Promise<Record<string, unknown>[]> {
  if (!ODDS_API_KEY) return [];
  try {
    const url =
      `https://api.the-odds-api.com/v4/sports/${sportKey}/odds` +
      `?apiKey=${ODDS_API_KEY}&markets=h2h&oddsFormat=decimal&regions=${apiRegions}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) {
      logger.warn({ sportKey, status: resp.status }, "Odds API non-OK");
      return [];
    }
    return (await resp.json()) as Record<string, unknown>[];
  } catch (err) {
    logger.warn({ err, sportKey }, "Odds API fetch failed");
    return [];
  }
}

// ─── Arb detection logic ──────────────────────────────────────────────────────

function detectArb(
  game: Record<string, unknown>,
  sport: string,
  league: string,
  region: ArbRegion,
): ArbOpportunity | null {
  const bookmakers = game["bookmakers"] as Record<string, unknown>[] | undefined;
  if (!bookmakers || bookmakers.length < 2) return null;

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

  const selections = drawEntry
    ? [
        { selection: homeTeam, ...homeEntry },
        { selection: awayTeam, ...awayEntry },
        { selection: "Draw",   ...drawEntry },
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
    legs.push({ bookmaker: s.bookmaker, bookmakerId: s.bookmakerId, selection: s.selection, odds: parseFloat(s.odds.toFixed(3)), impliedProb: parseFloat(imp.toFixed(4)) });
  }

  if (totalImplied >= 1.0) return null;
  const profitPercent = parseFloat(((1 - totalImplied) * 100).toFixed(2));
  if (profitPercent < 0.1) return null;

  const gameId = (game["id"] as string | undefined) ?? `${region}-${sport}-${homeTeam}-${awayTeam}`;
  return {
    id: gameId, sport, sportKey: (game["sport_key"] as string | undefined) ?? "", league, homeTeam, awayTeam,
    commenceTime: (game["commence_time"] as string | undefined) ?? new Date().toISOString(),
    marketType: drawEntry ? "3way" : "2way", profitPercent,
    totalImplied: parseFloat(totalImplied.toFixed(4)), legs,
    discoveredAt: new Date().toISOString(), region,
  };
}

// ─── Main scan (region-aware) ─────────────────────────────────────────────────

export async function scanByRegion(
  region: ArbRegion = "global",
  forceRefresh = false,
): Promise<ArbOpportunity[]> {
  if (!ODDS_API_KEY) {
    return getDemoArbs(region);
  }

  const now = Date.now();
  const cached = regionCache.get(region);
  if (!forceRefresh && cached && now - cached.ts < CACHE_MS) {
    return cached.arbs;
  }

  const sports = REGION_SPORTS[region] ?? REGION_SPORTS.global;
  const apiRegions = REGION_API_REGIONS[region] ?? "us,uk,eu,au";

  try {
    let anyDataFetched = false;

    const [sportResults, africanArbs] = await Promise.all([
      Promise.allSettled(
        sports.map(async (s) => {
          const games = await fetchOddsForSport(s.key, apiRegions);
          if (games.length > 0) anyDataFetched = true;
          return games.map((g) => ({ game: g, sport: s.sport, league: s.league }));
        }),
      ),
      region === "africa"
        ? getAfricanBookmakerArbs(sports.map((s) => s.key), region, forceRefresh)
        : Promise.resolve([] as ArbOpportunity[]),
    ]);

    const opportunities: ArbOpportunity[] = [...africanArbs];
    if (africanArbs.length > 0) anyDataFetched = true;

    for (const result of sportResults) {
      if (result.status !== "fulfilled") continue;
      for (const { game, sport, league } of result.value) {
        const arb = detectArb(game, sport, league, region);
        if (arb) opportunities.push(arb);
      }
    }

    if (!anyDataFetched) {
      logger.warn({ region }, "Odds API returned no data — using demo arbs");
      return getDemoArbs(region);
    }

    opportunities.sort((a, b) => b.profitPercent - a.profitPercent);
    regionCache.set(region, { arbs: opportunities, ts: now });
    logger.info({ region, count: opportunities.length }, "Arb scan complete");
    return opportunities;
  } catch (err) {
    logger.error({ err, region }, "Arb scan failed — returning demo data");
    return getDemoArbs(region);
  }
}

export async function scanForArbitrage(forceRefresh = false): Promise<ArbOpportunity[]> {
  return scanByRegion("global", forceRefresh);
}

// ─── Demo arbs — 15+ per region, time-rotated ─────────────────────────────────
// All profit/odds are realistic: true arb windows are 0.3-5%, total implied < 1.0.
// commenceTime randomises slightly per call so countdowns don't look static.

function v(base: number, jitter: number): number {
  // deterministic variation using current 5-min bucket so it changes every 5 min
  const seed = Math.floor(Date.now() / DEMO_ROTATION_MS);
  const pseudoRand = ((seed * 2654435761) >>> 0) / 0xffffffff;
  return parseFloat((base + (pseudoRand - 0.5) * jitter * 2).toFixed(3));
}

function ct(minsFromNow: number): string {
  const jitter = Math.floor(Date.now() / DEMO_ROTATION_MS) % 7; // 0-6 min variation
  return new Date(Date.now() + (minsFromNow + jitter) * 60_000).toISOString();
}

function getDemoArbs(region: ArbRegion = "global"): ArbOpportunity[] {
  const now = ct(0);

  // ── Global pool (15 opportunities) ─────────────────────────────────────────
  const globalPool: ArbOpportunity[] = [
    {
      id: "demo-g-1", sport: "Soccer", sportKey: "soccer_epl", league: "Premier League",
      homeTeam: "Arsenal", awayTeam: "Chelsea", commenceTime: ct(4), marketType: "2way",
      profitPercent: v(2.3, 0.4), totalImplied: 0.977, discoveredAt: now, region,
      legs: [
        { bookmaker: "Bet365",       bookmakerId: "bet365",      selection: "Arsenal", odds: v(2.10, 0.08), impliedProb: 0.476 },
        { bookmaker: "William Hill", bookmakerId: "williamhill", selection: "Chelsea", odds: v(2.22, 0.08), impliedProb: 0.450 },
      ],
    },
    {
      id: "demo-g-2", sport: "NBA", sportKey: "basketball_nba", league: "NBA",
      homeTeam: "Los Angeles Lakers", awayTeam: "Golden State Warriors", commenceTime: ct(12), marketType: "2way",
      profitPercent: v(1.8, 0.3), totalImplied: 0.982, discoveredAt: now, region,
      legs: [
        { bookmaker: "DraftKings", bookmakerId: "draftkings", selection: "Los Angeles Lakers",    odds: v(2.05, 0.06), impliedProb: 0.488 },
        { bookmaker: "FanDuel",    bookmakerId: "fanduel",    selection: "Golden State Warriors", odds: v(2.18, 0.06), impliedProb: 0.459 },
      ],
    },
    {
      id: "demo-g-3", sport: "Soccer", sportKey: "soccer_epl", league: "Premier League",
      homeTeam: "Man City", awayTeam: "Liverpool", commenceTime: ct(25), marketType: "3way",
      profitPercent: v(4.2, 0.5), totalImplied: 0.958, discoveredAt: now, region,
      legs: [
        { bookmaker: "Bet365",  bookmakerId: "bet365",  selection: "Man City",  odds: v(2.40, 0.10), impliedProb: 0.417 },
        { bookmaker: "Unibet",  bookmakerId: "unibet",  selection: "Liverpool", odds: v(3.80, 0.15), impliedProb: 0.263 },
        { bookmaker: "Betfair", bookmakerId: "betfair", selection: "Draw",      odds: v(4.20, 0.18), impliedProb: 0.238 },
      ],
    },
    {
      id: "demo-g-4", sport: "Soccer", sportKey: "soccer_spain_la_liga", league: "La Liga",
      homeTeam: "Real Madrid", awayTeam: "Barcelona", commenceTime: ct(38), marketType: "3way",
      profitPercent: v(3.1, 0.4), totalImplied: 0.969, discoveredAt: now, region,
      legs: [
        { bookmaker: "Pinnacle",     bookmakerId: "pinnacle",     selection: "Real Madrid", odds: v(2.20, 0.08), impliedProb: 0.455 },
        { bookmaker: "Betfair",      bookmakerId: "betfair",      selection: "Barcelona",   odds: v(3.10, 0.12), impliedProb: 0.323 },
        { bookmaker: "William Hill", bookmakerId: "williamhill",  selection: "Draw",        odds: v(4.00, 0.15), impliedProb: 0.250 },
      ],
    },
    {
      id: "demo-g-5", sport: "NFL", sportKey: "americanfootball_nfl", league: "NFL",
      homeTeam: "Kansas City Chiefs", awayTeam: "Buffalo Bills", commenceTime: ct(52), marketType: "2way",
      profitPercent: v(2.7, 0.3), totalImplied: 0.973, discoveredAt: now, region,
      legs: [
        { bookmaker: "DraftKings", bookmakerId: "draftkings", selection: "Kansas City Chiefs", odds: v(1.95, 0.07), impliedProb: 0.513 },
        { bookmaker: "Caesars",    bookmakerId: "caesars",    selection: "Buffalo Bills",       odds: v(2.25, 0.09), impliedProb: 0.444 },
      ],
    },
    {
      id: "demo-g-6", sport: "MLB", sportKey: "baseball_mlb", league: "MLB",
      homeTeam: "New York Yankees", awayTeam: "Boston Red Sox", commenceTime: ct(7), marketType: "2way",
      profitPercent: v(1.5, 0.3), totalImplied: 0.985, discoveredAt: now, region,
      legs: [
        { bookmaker: "FanDuel",  bookmakerId: "fanduel",  selection: "New York Yankees", odds: v(1.85, 0.05), impliedProb: 0.541 },
        { bookmaker: "BetMGM",   bookmakerId: "betmgm",   selection: "Boston Red Sox",  odds: v(2.30, 0.08), impliedProb: 0.435 },
      ],
    },
    {
      id: "demo-g-7", sport: "Soccer", sportKey: "soccer_germany_bundesliga", league: "Bundesliga",
      homeTeam: "Bayern Munich", awayTeam: "Borussia Dortmund", commenceTime: ct(61), marketType: "3way",
      profitPercent: v(3.8, 0.4), totalImplied: 0.962, discoveredAt: now, region,
      legs: [
        { bookmaker: "Bet365",  bookmakerId: "bet365",  selection: "Bayern Munich",       odds: v(1.75, 0.06), impliedProb: 0.571 },
        { bookmaker: "Unibet",  bookmakerId: "unibet",  selection: "Borussia Dortmund",   odds: v(5.20, 0.20), impliedProb: 0.192 },
        { bookmaker: "Betfair", bookmakerId: "betfair", selection: "Draw",                odds: v(4.80, 0.18), impliedProb: 0.208 },
      ],
    },
    {
      id: "demo-g-8", sport: "Soccer", sportKey: "soccer_italy_serie_a", league: "Serie A",
      homeTeam: "AC Milan", awayTeam: "Inter Milan", commenceTime: ct(19), marketType: "3way",
      profitPercent: v(2.5, 0.35), totalImplied: 0.975, discoveredAt: now, region,
      legs: [
        { bookmaker: "Pinnacle",     bookmakerId: "pinnacle",     selection: "AC Milan",    odds: v(2.65, 0.10), impliedProb: 0.377 },
        { bookmaker: "William Hill", bookmakerId: "williamhill",  selection: "Inter Milan", odds: v(2.80, 0.10), impliedProb: 0.357 },
        { bookmaker: "Betfair",      bookmakerId: "betfair",      selection: "Draw",        odds: v(4.10, 0.15), impliedProb: 0.244 },
      ],
    },
    {
      id: "demo-g-9", sport: "NBA", sportKey: "basketball_nba", league: "NBA",
      homeTeam: "Miami Heat", awayTeam: "Boston Celtics", commenceTime: ct(33), marketType: "2way",
      profitPercent: v(2.1, 0.3), totalImplied: 0.979, discoveredAt: now, region,
      legs: [
        { bookmaker: "BetMGM",     bookmakerId: "betmgm",     selection: "Miami Heat",    odds: v(2.40, 0.08), impliedProb: 0.417 },
        { bookmaker: "PointsBet",  bookmakerId: "pointsbet",  selection: "Boston Celtics",odds: v(2.00, 0.07), impliedProb: 0.500 },
      ],
    },
    {
      id: "demo-g-10", sport: "Soccer", sportKey: "soccer_france_ligue_one", league: "Ligue 1",
      homeTeam: "PSG", awayTeam: "Marseille", commenceTime: ct(46), marketType: "3way",
      profitPercent: v(4.5, 0.5), totalImplied: 0.955, discoveredAt: now, region,
      legs: [
        { bookmaker: "Bet365",  bookmakerId: "bet365",  selection: "PSG",       odds: v(1.55, 0.05), impliedProb: 0.645 },
        { bookmaker: "Unibet",  bookmakerId: "unibet",  selection: "Marseille", odds: v(6.50, 0.25), impliedProb: 0.154 },
        { bookmaker: "Betfair", bookmakerId: "betfair", selection: "Draw",      odds: v(5.20, 0.20), impliedProb: 0.192 },
      ],
    },
    {
      id: "demo-g-11", sport: "Soccer", sportKey: "soccer_uefa_champs_league", league: "Champions League",
      homeTeam: "Manchester City", awayTeam: "Real Madrid", commenceTime: ct(73), marketType: "2way",
      profitPercent: v(3.3, 0.4), totalImplied: 0.967, discoveredAt: now, region,
      legs: [
        { bookmaker: "Pinnacle",    bookmakerId: "pinnacle",    selection: "Manchester City", odds: v(2.15, 0.08), impliedProb: 0.465 },
        { bookmaker: "Paddy Power", bookmakerId: "paddypower",  selection: "Real Madrid",     odds: v(2.15, 0.08), impliedProb: 0.465 },
      ],
    },
    {
      id: "demo-g-12", sport: "NFL", sportKey: "americanfootball_nfl", league: "NFL",
      homeTeam: "San Francisco 49ers", awayTeam: "Dallas Cowboys", commenceTime: ct(88), marketType: "2way",
      profitPercent: v(1.9, 0.3), totalImplied: 0.981, discoveredAt: now, region,
      legs: [
        { bookmaker: "ESPN Bet",  bookmakerId: "espnbet",    selection: "San Francisco 49ers", odds: v(1.90, 0.06), impliedProb: 0.526 },
        { bookmaker: "BetRivers", bookmakerId: "betrivers",  selection: "Dallas Cowboys",      odds: v(2.30, 0.08), impliedProb: 0.435 },
      ],
    },
    {
      id: "demo-g-13", sport: "MLB", sportKey: "baseball_mlb", league: "MLB",
      homeTeam: "Los Angeles Dodgers", awayTeam: "Houston Astros", commenceTime: ct(15), marketType: "2way",
      profitPercent: v(2.0, 0.3), totalImplied: 0.980, discoveredAt: now, region,
      legs: [
        { bookmaker: "FanDuel",    bookmakerId: "fanduel",    selection: "Los Angeles Dodgers", odds: v(1.70, 0.05), impliedProb: 0.588 },
        { bookmaker: "DraftKings", bookmakerId: "draftkings", selection: "Houston Astros",      odds: v(2.90, 0.10), impliedProb: 0.345 },
      ],
    },
    {
      id: "demo-g-14", sport: "Soccer", sportKey: "soccer_epl", league: "Premier League",
      homeTeam: "Tottenham Hotspur", awayTeam: "Manchester United", commenceTime: ct(55), marketType: "3way",
      profitPercent: v(3.6, 0.45), totalImplied: 0.964, discoveredAt: now, region,
      legs: [
        { bookmaker: "Bet365",  bookmakerId: "bet365",  selection: "Tottenham Hotspur",  odds: v(2.75, 0.10), impliedProb: 0.364 },
        { bookmaker: "Betfair", bookmakerId: "betfair", selection: "Manchester United",   odds: v(2.85, 0.10), impliedProb: 0.351 },
        { bookmaker: "Unibet",  bookmakerId: "unibet",  selection: "Draw",               odds: v(3.90, 0.15), impliedProb: 0.256 },
      ],
    },
    {
      id: "demo-g-15", sport: "NBA", sportKey: "basketball_nba", league: "NBA",
      homeTeam: "Denver Nuggets", awayTeam: "Phoenix Suns", commenceTime: ct(29), marketType: "2way",
      profitPercent: v(2.4, 0.3), totalImplied: 0.976, discoveredAt: now, region,
      legs: [
        { bookmaker: "Caesars",  bookmakerId: "caesars",  selection: "Denver Nuggets", odds: v(1.95, 0.06), impliedProb: 0.513 },
        { bookmaker: "BetMGM",   bookmakerId: "betmgm",   selection: "Phoenix Suns",   odds: v(2.25, 0.08), impliedProb: 0.444 },
      ],
    },
  ];

  if (region === "global") return globalPool;

  // ── US pool ─────────────────────────────────────────────────────────────────
  if (region === "us") {
    return [
      {
        id: "demo-us-1", sport: "NFL", sportKey: "americanfootball_nfl", league: "NFL",
        homeTeam: "Kansas City Chiefs", awayTeam: "Philadelphia Eagles", commenceTime: ct(6), marketType: "2way",
        profitPercent: v(3.1, 0.4), totalImplied: 0.969, discoveredAt: now, region,
        legs: [
          { bookmaker: "DraftKings", bookmakerId: "draftkings", selection: "Kansas City Chiefs",   odds: v(1.85, 0.06), impliedProb: 0.541 },
          { bookmaker: "FanDuel",    bookmakerId: "fanduel",    selection: "Philadelphia Eagles",  odds: v(2.45, 0.09), impliedProb: 0.408 },
        ],
      },
      {
        id: "demo-us-2", sport: "NBA", sportKey: "basketball_nba", league: "NBA",
        homeTeam: "Boston Celtics", awayTeam: "Milwaukee Bucks", commenceTime: ct(14), marketType: "2way",
        profitPercent: v(2.5, 0.35), totalImplied: 0.975, discoveredAt: now, region,
        legs: [
          { bookmaker: "BetMGM",     bookmakerId: "betmgm",     selection: "Boston Celtics",   odds: v(1.75, 0.05), impliedProb: 0.571 },
          { bookmaker: "Caesars",    bookmakerId: "caesars",     selection: "Milwaukee Bucks",  odds: v(2.55, 0.09), impliedProb: 0.392 },
        ],
      },
      {
        id: "demo-us-3", sport: "MLB", sportKey: "baseball_mlb", league: "MLB",
        homeTeam: "New York Yankees", awayTeam: "Atlanta Braves", commenceTime: ct(22), marketType: "2way",
        profitPercent: v(1.7, 0.3), totalImplied: 0.983, discoveredAt: now, region,
        legs: [
          { bookmaker: "ESPN Bet",   bookmakerId: "espnbet",    selection: "New York Yankees", odds: v(1.80, 0.05), impliedProb: 0.556 },
          { bookmaker: "BetRivers",  bookmakerId: "betrivers",  selection: "Atlanta Braves",   odds: v(2.35, 0.08), impliedProb: 0.426 },
        ],
      },
      {
        id: "demo-us-4", sport: "NFL", sportKey: "americanfootball_nfl", league: "NFL",
        homeTeam: "San Francisco 49ers", awayTeam: "Seattle Seahawks", commenceTime: ct(36), marketType: "2way",
        profitPercent: v(2.8, 0.35), totalImplied: 0.972, discoveredAt: now, region,
        legs: [
          { bookmaker: "PointsBet",  bookmakerId: "pointsbet",  selection: "San Francisco 49ers", odds: v(1.65, 0.05), impliedProb: 0.606 },
          { bookmaker: "DraftKings", bookmakerId: "draftkings", selection: "Seattle Seahawks",    odds: v(3.00, 0.12), impliedProb: 0.333 },
        ],
      },
      {
        id: "demo-us-5", sport: "NHL", sportKey: "icehockey_nhl", league: "NHL",
        homeTeam: "Colorado Avalanche", awayTeam: "Vegas Golden Knights", commenceTime: ct(18), marketType: "2way",
        profitPercent: v(3.5, 0.4), totalImplied: 0.965, discoveredAt: now, region,
        legs: [
          { bookmaker: "FanDuel",  bookmakerId: "fanduel",  selection: "Colorado Avalanche",   odds: v(2.10, 0.07), impliedProb: 0.476 },
          { bookmaker: "BetMGM",   bookmakerId: "betmgm",   selection: "Vegas Golden Knights", odds: v(2.10, 0.07), impliedProb: 0.476 },
        ],
      },
      {
        id: "demo-us-6", sport: "NBA", sportKey: "basketball_nba", league: "NBA",
        homeTeam: "Miami Heat", awayTeam: "New York Knicks", commenceTime: ct(44), marketType: "2way",
        profitPercent: v(2.2, 0.3), totalImplied: 0.978, discoveredAt: now, region,
        legs: [
          { bookmaker: "Caesars",   bookmakerId: "caesars",   selection: "Miami Heat",    odds: v(2.20, 0.07), impliedProb: 0.455 },
          { bookmaker: "BetRivers", bookmakerId: "betrivers", selection: "New York Knicks",odds: v(2.15, 0.07), impliedProb: 0.465 },
        ],
      },
      {
        id: "demo-us-7", sport: "MLB", sportKey: "baseball_mlb", league: "MLB",
        homeTeam: "Los Angeles Dodgers", awayTeam: "San Diego Padres", commenceTime: ct(9), marketType: "2way",
        profitPercent: v(1.4, 0.25), totalImplied: 0.986, discoveredAt: now, region,
        legs: [
          { bookmaker: "DraftKings", bookmakerId: "draftkings", selection: "Los Angeles Dodgers", odds: v(1.60, 0.05), impliedProb: 0.625 },
          { bookmaker: "ESPN Bet",   bookmakerId: "espnbet",    selection: "San Diego Padres",    odds: v(3.10, 0.12), impliedProb: 0.323 },
        ],
      },
      {
        id: "demo-us-8", sport: "NFL", sportKey: "americanfootball_nfl", league: "NFL",
        homeTeam: "Dallas Cowboys", awayTeam: "Green Bay Packers", commenceTime: ct(64), marketType: "2way",
        profitPercent: v(4.0, 0.5), totalImplied: 0.960, discoveredAt: now, region,
        legs: [
          { bookmaker: "PointsBet",  bookmakerId: "pointsbet",  selection: "Dallas Cowboys",    odds: v(2.35, 0.09), impliedProb: 0.426 },
          { bookmaker: "BetMGM",     bookmakerId: "betmgm",     selection: "Green Bay Packers", odds: v(2.00, 0.07), impliedProb: 0.500 },
        ],
      },
      {
        id: "demo-us-9", sport: "NHL", sportKey: "icehockey_nhl", league: "NHL",
        homeTeam: "Tampa Bay Lightning", awayTeam: "Florida Panthers", commenceTime: ct(31), marketType: "2way",
        profitPercent: v(2.9, 0.35), totalImplied: 0.971, discoveredAt: now, region,
        legs: [
          { bookmaker: "FanDuel",    bookmakerId: "fanduel",    selection: "Tampa Bay Lightning", odds: v(2.05, 0.07), impliedProb: 0.488 },
          { bookmaker: "DraftKings", bookmakerId: "draftkings", selection: "Florida Panthers",    odds: v(2.25, 0.08), impliedProb: 0.444 },
        ],
      },
      {
        id: "demo-us-10", sport: "NBA", sportKey: "basketball_nba", league: "NBA",
        homeTeam: "Los Angeles Clippers", awayTeam: "Golden State Warriors", commenceTime: ct(51), marketType: "2way",
        profitPercent: v(3.4, 0.4), totalImplied: 0.966, discoveredAt: now, region,
        legs: [
          { bookmaker: "Caesars",   bookmakerId: "caesars",   selection: "Los Angeles Clippers", odds: v(2.60, 0.09), impliedProb: 0.385 },
          { bookmaker: "BetRivers", bookmakerId: "betrivers", selection: "Golden State Warriors",odds: v(1.85, 0.06), impliedProb: 0.541 },
        ],
      },
    ];
  }

  // ── UK / EU pool ─────────────────────────────────────────────────────────────
  if (region === "uk") {
    return [
      {
        id: "demo-uk-1", sport: "Soccer", sportKey: "soccer_epl", league: "Premier League",
        homeTeam: "Arsenal", awayTeam: "Tottenham Hotspur", commenceTime: ct(5), marketType: "3way",
        profitPercent: v(3.4, 0.4), totalImplied: 0.966, discoveredAt: now, region,
        legs: [
          { bookmaker: "Bet365",     bookmakerId: "bet365",     selection: "Arsenal",          odds: v(2.20, 0.08), impliedProb: 0.455 },
          { bookmaker: "Betfair",    bookmakerId: "betfair",    selection: "Tottenham Hotspur",odds: v(4.00, 0.15), impliedProb: 0.250 },
          { bookmaker: "Paddy Power",bookmakerId: "paddypower", selection: "Draw",             odds: v(4.10, 0.15), impliedProb: 0.244 },
        ],
      },
      {
        id: "demo-uk-2", sport: "Soccer", sportKey: "soccer_spain_la_liga", league: "La Liga",
        homeTeam: "Atletico Madrid", awayTeam: "Sevilla", commenceTime: ct(17), marketType: "3way",
        profitPercent: v(2.8, 0.35), totalImplied: 0.972, discoveredAt: now, region,
        legs: [
          { bookmaker: "Unibet",    bookmakerId: "unibet",    selection: "Atletico Madrid", odds: v(1.90, 0.06), impliedProb: 0.526 },
          { bookmaker: "Pinnacle",  bookmakerId: "pinnacle",  selection: "Sevilla",         odds: v(4.80, 0.18), impliedProb: 0.208 },
          { bookmaker: "Sky Bet",   bookmakerId: "skybet",    selection: "Draw",            odds: v(3.90, 0.15), impliedProb: 0.256 },
        ],
      },
      {
        id: "demo-uk-3", sport: "Soccer", sportKey: "soccer_germany_bundesliga", league: "Bundesliga",
        homeTeam: "Bayern Munich", awayTeam: "RB Leipzig", commenceTime: ct(28), marketType: "3way",
        profitPercent: v(4.1, 0.5), totalImplied: 0.959, discoveredAt: now, region,
        legs: [
          { bookmaker: "Bet365",       bookmakerId: "bet365",       selection: "Bayern Munich", odds: v(1.65, 0.05), impliedProb: 0.606 },
          { bookmaker: "William Hill", bookmakerId: "williamhill",  selection: "RB Leipzig",    odds: v(6.50, 0.25), impliedProb: 0.154 },
          { bookmaker: "Betfair",      bookmakerId: "betfair",      selection: "Draw",          odds: v(5.10, 0.20), impliedProb: 0.196 },
        ],
      },
      {
        id: "demo-uk-4", sport: "Soccer", sportKey: "soccer_italy_serie_a", league: "Serie A",
        homeTeam: "Juventus", awayTeam: "AS Roma", commenceTime: ct(42), marketType: "3way",
        profitPercent: v(3.6, 0.45), totalImplied: 0.964, discoveredAt: now, region,
        legs: [
          { bookmaker: "Unibet",       bookmakerId: "unibet",       selection: "Juventus", odds: v(2.05, 0.07), impliedProb: 0.488 },
          { bookmaker: "Paddy Power",  bookmakerId: "paddypower",   selection: "AS Roma",  odds: v(4.10, 0.15), impliedProb: 0.244 },
          { bookmaker: "888Sport",     bookmakerId: "888sport",     selection: "Draw",     odds: v(3.85, 0.14), impliedProb: 0.260 },
        ],
      },
      {
        id: "demo-uk-5", sport: "Soccer", sportKey: "soccer_france_ligue_one", league: "Ligue 1",
        homeTeam: "Monaco", awayTeam: "Lyon", commenceTime: ct(56), marketType: "3way",
        profitPercent: v(2.4, 0.3), totalImplied: 0.976, discoveredAt: now, region,
        legs: [
          { bookmaker: "Bet365",  bookmakerId: "bet365",  selection: "Monaco", odds: v(2.30, 0.08), impliedProb: 0.435 },
          { bookmaker: "Bwin",    bookmakerId: "bwin",    selection: "Lyon",   odds: v(3.50, 0.13), impliedProb: 0.286 },
          { bookmaker: "Betfair", bookmakerId: "betfair", selection: "Draw",   odds: v(3.80, 0.14), impliedProb: 0.263 },
        ],
      },
      {
        id: "demo-uk-6", sport: "Soccer", sportKey: "soccer_uefa_champs_league", league: "Champions League",
        homeTeam: "Barcelona", awayTeam: "PSG", commenceTime: ct(71), marketType: "2way",
        profitPercent: v(3.9, 0.45), totalImplied: 0.961, discoveredAt: now, region,
        legs: [
          { bookmaker: "Pinnacle",    bookmakerId: "pinnacle",    selection: "Barcelona", odds: v(2.25, 0.08), impliedProb: 0.444 },
          { bookmaker: "William Hill",bookmakerId: "williamhill", selection: "PSG",       odds: v(2.25, 0.08), impliedProb: 0.444 },
        ],
      },
      {
        id: "demo-uk-7", sport: "Soccer", sportKey: "soccer_epl", league: "Premier League",
        homeTeam: "Liverpool", awayTeam: "Aston Villa", commenceTime: ct(11), marketType: "3way",
        profitPercent: v(2.1, 0.3), totalImplied: 0.979, discoveredAt: now, region,
        legs: [
          { bookmaker: "Sky Bet",      bookmakerId: "skybet",      selection: "Liverpool",    odds: v(1.72, 0.05), impliedProb: 0.581 },
          { bookmaker: "Paddy Power",  bookmakerId: "paddypower",  selection: "Aston Villa",  odds: v(6.20, 0.24), impliedProb: 0.161 },
          { bookmaker: "888Sport",     bookmakerId: "888sport",    selection: "Draw",         odds: v(4.40, 0.16), impliedProb: 0.227 },
        ],
      },
      {
        id: "demo-uk-8", sport: "Soccer", sportKey: "soccer_germany_bundesliga", league: "Bundesliga",
        homeTeam: "Borussia Dortmund", awayTeam: "Bayer Leverkusen", commenceTime: ct(38), marketType: "3way",
        profitPercent: v(4.7, 0.55), totalImplied: 0.953, discoveredAt: now, region,
        legs: [
          { bookmaker: "Bet365",  bookmakerId: "bet365",  selection: "Borussia Dortmund",  odds: v(2.80, 0.10), impliedProb: 0.357 },
          { bookmaker: "Unibet",  bookmakerId: "unibet",  selection: "Bayer Leverkusen",   odds: v(2.90, 0.10), impliedProb: 0.345 },
          { bookmaker: "Betfair", bookmakerId: "betfair", selection: "Draw",               odds: v(4.30, 0.16), impliedProb: 0.233 },
        ],
      },
      {
        id: "demo-uk-9", sport: "Soccer", sportKey: "soccer_spain_la_liga", league: "La Liga",
        homeTeam: "Real Betis", awayTeam: "Valencia", commenceTime: ct(24), marketType: "3way",
        profitPercent: v(3.2, 0.4), totalImplied: 0.968, discoveredAt: now, region,
        legs: [
          { bookmaker: "Bwin",    bookmakerId: "bwin",    selection: "Real Betis", odds: v(2.40, 0.09), impliedProb: 0.417 },
          { bookmaker: "Betfair", bookmakerId: "betfair", selection: "Valencia",   odds: v(3.40, 0.13), impliedProb: 0.294 },
          { bookmaker: "Sky Bet", bookmakerId: "skybet",  selection: "Draw",       odds: v(3.90, 0.15), impliedProb: 0.256 },
        ],
      },
      {
        id: "demo-uk-10", sport: "Soccer", sportKey: "soccer_epl", league: "Premier League",
        homeTeam: "Chelsea", awayTeam: "Newcastle United", commenceTime: ct(48), marketType: "3way",
        profitPercent: v(2.6, 0.35), totalImplied: 0.974, discoveredAt: now, region,
        legs: [
          { bookmaker: "Bet365",       bookmakerId: "bet365",       selection: "Chelsea",          odds: v(1.95, 0.07), impliedProb: 0.513 },
          { bookmaker: "William Hill", bookmakerId: "williamhill",  selection: "Newcastle United", odds: v(4.50, 0.17), impliedProb: 0.222 },
          { bookmaker: "Betfair",      bookmakerId: "betfair",      selection: "Draw",             odds: v(4.00, 0.15), impliedProb: 0.250 },
        ],
      },
      {
        id: "demo-uk-11", sport: "Soccer", sportKey: "soccer_italy_serie_a", league: "Serie A",
        homeTeam: "Napoli", awayTeam: "Lazio", commenceTime: ct(65), marketType: "3way",
        profitPercent: v(3.0, 0.4), totalImplied: 0.970, discoveredAt: now, region,
        legs: [
          { bookmaker: "Unibet",  bookmakerId: "unibet",  selection: "Napoli", odds: v(2.10, 0.07), impliedProb: 0.476 },
          { bookmaker: "Pinnacle",bookmakerId: "pinnacle",selection: "Lazio",  odds: v(3.80, 0.14), impliedProb: 0.263 },
          { bookmaker: "Bwin",    bookmakerId: "bwin",    selection: "Draw",   odds: v(3.80, 0.14), impliedProb: 0.263 },
        ],
      },
    ];
  }

  // ── Africa pool ──────────────────────────────────────────────────────────────
  if (region === "africa") {
    return [
      {
        id: "demo-af-1", sport: "Soccer", sportKey: "soccer_epl", league: "Premier League",
        homeTeam: "Arsenal", awayTeam: "Chelsea", commenceTime: ct(8), marketType: "2way",
        profitPercent: v(2.1, 0.3), totalImplied: 0.979, discoveredAt: now, region: "africa",
        legs: [
          { bookmaker: "Bet9ja",    bookmakerId: "bet9ja",    selection: "Arsenal", odds: v(2.05, 0.07), impliedProb: 0.488 },
          { bookmaker: "SportyBet", bookmakerId: "sportybet", selection: "Chelsea", odds: v(2.40, 0.09), impliedProb: 0.417 },
        ],
      },
      {
        id: "demo-af-2", sport: "Soccer", sportKey: "soccer_nigeria_npfl", league: "NPFL (Nigeria)",
        homeTeam: "Enyimba", awayTeam: "Remo Stars", commenceTime: ct(3), marketType: "2way",
        profitPercent: v(3.8, 0.45), totalImplied: 0.962, discoveredAt: now, region: "africa",
        legs: [
          { bookmaker: "Bet9ja",  bookmakerId: "bet9ja",  selection: "Enyimba",    odds: v(2.60, 0.10), impliedProb: 0.385 },
          { bookmaker: "BetKing", bookmakerId: "betking", selection: "Remo Stars", odds: v(2.90, 0.11), impliedProb: 0.345 },
        ],
      },
      {
        id: "demo-af-3", sport: "Soccer", sportKey: "soccer_south_africa_premiership", league: "PSL (South Africa)",
        homeTeam: "Kaizer Chiefs", awayTeam: "Orlando Pirates", commenceTime: ct(18), marketType: "3way",
        profitPercent: v(4.7, 0.55), totalImplied: 0.953, discoveredAt: now, region: "africa",
        legs: [
          { bookmaker: "Hollywoodbets", bookmakerId: "hollywoodbets", selection: "Kaizer Chiefs",   odds: v(2.50, 0.09), impliedProb: 0.400 },
          { bookmaker: "Betway",        bookmakerId: "betway",        selection: "Orlando Pirates", odds: v(3.30, 0.12), impliedProb: 0.303 },
          { bookmaker: "1xBet",         bookmakerId: "1xbet",         selection: "Draw",            odds: v(4.10, 0.15), impliedProb: 0.244 },
        ],
      },
      {
        id: "demo-af-4", sport: "Soccer", sportKey: "soccer_caf_champions_league", league: "CAF Champions League",
        homeTeam: "Wydad AC", awayTeam: "Al Ahly", commenceTime: ct(32), marketType: "2way",
        profitPercent: v(2.9, 0.35), totalImplied: 0.971, discoveredAt: now, region: "africa",
        legs: [
          { bookmaker: "SportyBet", bookmakerId: "sportybet", selection: "Wydad AC", odds: v(2.15, 0.08), impliedProb: 0.465 },
          { bookmaker: "1xBet",     bookmakerId: "1xbet",     selection: "Al Ahly",  odds: v(2.45, 0.09), impliedProb: 0.408 },
        ],
      },
      {
        id: "demo-af-5", sport: "Soccer", sportKey: "soccer_kenya_premier_league", league: "KPL (Kenya)",
        homeTeam: "Gor Mahia", awayTeam: "AFC Leopards", commenceTime: ct(11), marketType: "3way",
        profitPercent: v(5.2, 0.6), totalImplied: 0.948, discoveredAt: now, region: "africa",
        legs: [
          { bookmaker: "Odibets", bookmakerId: "odibets", selection: "Gor Mahia",    odds: v(2.00, 0.07), impliedProb: 0.500 },
          { bookmaker: "Betway",  bookmakerId: "betway",  selection: "AFC Leopards", odds: v(3.80, 0.14), impliedProb: 0.263 },
          { bookmaker: "Melbet",  bookmakerId: "melbet",  selection: "Draw",         odds: v(5.30, 0.20), impliedProb: 0.189 },
        ],
      },
      {
        id: "demo-af-6", sport: "Soccer", sportKey: "soccer_spain_la_liga", league: "La Liga",
        homeTeam: "Real Madrid", awayTeam: "Barcelona", commenceTime: ct(45), marketType: "3way",
        profitPercent: v(3.3, 0.4), totalImplied: 0.967, discoveredAt: now, region: "africa",
        legs: [
          { bookmaker: "Bet9ja",    bookmakerId: "bet9ja",    selection: "Real Madrid", odds: v(2.15, 0.08), impliedProb: 0.465 },
          { bookmaker: "SportyBet", bookmakerId: "sportybet", selection: "Barcelona",   odds: v(3.20, 0.12), impliedProb: 0.313 },
          { bookmaker: "22Bet",     bookmakerId: "22bet",     selection: "Draw",        odds: v(4.30, 0.16), impliedProb: 0.233 },
        ],
      },
      {
        id: "demo-af-7", sport: "Soccer", sportKey: "soccer_ghana_premier_league", league: "GPL (Ghana)",
        homeTeam: "Asante Kotoko", awayTeam: "Hearts of Oak", commenceTime: ct(22), marketType: "3way",
        profitPercent: v(4.4, 0.5), totalImplied: 0.956, discoveredAt: now, region: "africa",
        legs: [
          { bookmaker: "BetKing", bookmakerId: "betking", selection: "Asante Kotoko", odds: v(2.25, 0.08), impliedProb: 0.444 },
          { bookmaker: "22Bet",   bookmakerId: "22bet",   selection: "Hearts of Oak", odds: v(3.60, 0.14), impliedProb: 0.278 },
          { bookmaker: "Melbet",  bookmakerId: "melbet",  selection: "Draw",          odds: v(4.80, 0.18), impliedProb: 0.208 },
        ],
      },
      {
        id: "demo-af-8", sport: "Soccer", sportKey: "soccer_epl", league: "Premier League",
        homeTeam: "Man City", awayTeam: "Liverpool", commenceTime: ct(55), marketType: "2way",
        profitPercent: v(2.6, 0.3), totalImplied: 0.974, discoveredAt: now, region: "africa",
        legs: [
          { bookmaker: "Bet9ja",  bookmakerId: "bet9ja",  selection: "Man City",  odds: v(2.05, 0.07), impliedProb: 0.488 },
          { bookmaker: "Betway",  bookmakerId: "betway",  selection: "Liverpool", odds: v(2.30, 0.08), impliedProb: 0.435 },
        ],
      },
      {
        id: "demo-af-9", sport: "Soccer", sportKey: "soccer_nigeria_npfl", league: "NPFL (Nigeria)",
        homeTeam: "Rangers International", awayTeam: "Kano Pillars", commenceTime: ct(37), marketType: "3way",
        profitPercent: v(5.8, 0.65), totalImplied: 0.942, discoveredAt: now, region: "africa",
        legs: [
          { bookmaker: "Bet9ja",    bookmakerId: "bet9ja",    selection: "Rangers International", odds: v(2.40, 0.09), impliedProb: 0.417 },
          { bookmaker: "SportyBet", bookmakerId: "sportybet", selection: "Kano Pillars",          odds: v(3.50, 0.13), impliedProb: 0.286 },
          { bookmaker: "BetKing",   bookmakerId: "betking",   selection: "Draw",                  odds: v(4.20, 0.16), impliedProb: 0.238 },
        ],
      },
      {
        id: "demo-af-10", sport: "Soccer", sportKey: "soccer_south_africa_premiership", league: "PSL (South Africa)",
        homeTeam: "Mamelodi Sundowns", awayTeam: "Cape Town City", commenceTime: ct(26), marketType: "2way",
        profitPercent: v(3.1, 0.4), totalImplied: 0.969, discoveredAt: now, region: "africa",
        legs: [
          { bookmaker: "Hollywoodbets", bookmakerId: "hollywoodbets", selection: "Mamelodi Sundowns", odds: v(1.60, 0.05), impliedProb: 0.625 },
          { bookmaker: "1xBet",         bookmakerId: "1xbet",         selection: "Cape Town City",    odds: v(4.00, 0.15), impliedProb: 0.250 },
        ],
      },
      {
        id: "demo-af-11", sport: "Soccer", sportKey: "soccer_uganda_premier_league", league: "Uganda Premier League",
        homeTeam: "KCCA FC", awayTeam: "Vipers SC", commenceTime: ct(14), marketType: "3way",
        profitPercent: v(6.1, 0.7), totalImplied: 0.939, discoveredAt: now, region: "africa",
        legs: [
          { bookmaker: "Betway", bookmakerId: "betway", selection: "KCCA FC",   odds: v(2.30, 0.09), impliedProb: 0.435 },
          { bookmaker: "Melbet", bookmakerId: "melbet", selection: "Vipers SC", odds: v(3.10, 0.12), impliedProb: 0.323 },
          { bookmaker: "22Bet",  bookmakerId: "22bet",  selection: "Draw",      odds: v(5.40, 0.21), impliedProb: 0.185 },
        ],
      },
      {
        id: "demo-af-12", sport: "Soccer", sportKey: "soccer_caf_champions_league", league: "CAF Champions League",
        homeTeam: "Zamalek SC", awayTeam: "Simba SC", commenceTime: ct(68), marketType: "2way",
        profitPercent: v(3.6, 0.45), totalImplied: 0.964, discoveredAt: now, region: "africa",
        legs: [
          { bookmaker: "Odibets", bookmakerId: "odibets", selection: "Zamalek SC", odds: v(1.85, 0.06), impliedProb: 0.541 },
          { bookmaker: "1xBet",   bookmakerId: "1xbet",   selection: "Simba SC",   odds: v(2.90, 0.11), impliedProb: 0.345 },
        ],
      },
    ];
  }

  // ── Asia pool ────────────────────────────────────────────────────────────────
  if (region === "asia") {
    return [
      {
        id: "demo-as-1", sport: "Soccer", sportKey: "soccer_epl", league: "Premier League",
        homeTeam: "Arsenal", awayTeam: "Liverpool", commenceTime: ct(9), marketType: "3way",
        profitPercent: v(2.5, 0.35), totalImplied: 0.975, discoveredAt: now, region: "asia",
        legs: [
          { bookmaker: "Bet365",  bookmakerId: "bet365",  selection: "Arsenal",   odds: v(2.60, 0.09), impliedProb: 0.385 },
          { bookmaker: "Pinnacle",bookmakerId: "pinnacle",selection: "Liverpool", odds: v(2.55, 0.09), impliedProb: 0.392 },
          { bookmaker: "1xBet",   bookmakerId: "1xbet",   selection: "Draw",      odds: v(4.20, 0.16), impliedProb: 0.238 },
        ],
      },
      {
        id: "demo-as-2", sport: "NBA", sportKey: "basketball_nba", league: "NBA",
        homeTeam: "LA Lakers", awayTeam: "Chicago Bulls", commenceTime: ct(17), marketType: "2way",
        profitPercent: v(2.2, 0.3), totalImplied: 0.978, discoveredAt: now, region: "asia",
        legs: [
          { bookmaker: "Bet365",  bookmakerId: "bet365",  selection: "LA Lakers",    odds: v(1.80, 0.06), impliedProb: 0.556 },
          { bookmaker: "Pinnacle",bookmakerId: "pinnacle",selection: "Chicago Bulls", odds: v(2.50, 0.09), impliedProb: 0.400 },
        ],
      },
      {
        id: "demo-as-3", sport: "Soccer", sportKey: "soccer_spain_la_liga", league: "La Liga",
        homeTeam: "Real Madrid", awayTeam: "Atletico Madrid", commenceTime: ct(31), marketType: "3way",
        profitPercent: v(3.5, 0.4), totalImplied: 0.965, discoveredAt: now, region: "asia",
        legs: [
          { bookmaker: "Bet365",  bookmakerId: "bet365",  selection: "Real Madrid",    odds: v(2.00, 0.07), impliedProb: 0.500 },
          { bookmaker: "1xBet",   bookmakerId: "1xbet",   selection: "Atletico Madrid",odds: v(4.00, 0.15), impliedProb: 0.250 },
          { bookmaker: "Pinnacle",bookmakerId: "pinnacle",selection: "Draw",           odds: v(3.80, 0.14), impliedProb: 0.263 },
        ],
      },
      {
        id: "demo-as-4", sport: "Soccer", sportKey: "soccer_japan_j_league", league: "J-League (Japan)",
        homeTeam: "Kashima Antlers", awayTeam: "Urawa Red Diamonds", commenceTime: ct(6), marketType: "3way",
        profitPercent: v(4.8, 0.55), totalImplied: 0.952, discoveredAt: now, region: "asia",
        legs: [
          { bookmaker: "Bet365",  bookmakerId: "bet365",  selection: "Kashima Antlers",    odds: v(2.20, 0.08), impliedProb: 0.455 },
          { bookmaker: "Pinnacle",bookmakerId: "pinnacle",selection: "Urawa Red Diamonds",  odds: v(3.70, 0.14), impliedProb: 0.270 },
          { bookmaker: "1xBet",   bookmakerId: "1xbet",   selection: "Draw",               odds: v(3.80, 0.15), impliedProb: 0.263 },
        ],
      },
      {
        id: "demo-as-5", sport: "MLB", sportKey: "baseball_mlb", league: "MLB",
        homeTeam: "Seattle Mariners", awayTeam: "LA Dodgers", commenceTime: ct(24), marketType: "2way",
        profitPercent: v(1.9, 0.3), totalImplied: 0.981, discoveredAt: now, region: "asia",
        legs: [
          { bookmaker: "Bet365",  bookmakerId: "bet365",  selection: "Seattle Mariners", odds: v(3.10, 0.12), impliedProb: 0.323 },
          { bookmaker: "Pinnacle",bookmakerId: "pinnacle",selection: "LA Dodgers",       odds: v(1.55, 0.05), impliedProb: 0.645 },
        ],
      },
      {
        id: "demo-as-6", sport: "Soccer", sportKey: "soccer_south_korea_kleague1", league: "K League (Korea)",
        homeTeam: "Jeonbuk Hyundai Motors", awayTeam: "Ulsan Hyundai", commenceTime: ct(13), marketType: "3way",
        profitPercent: v(5.3, 0.6), totalImplied: 0.947, discoveredAt: now, region: "asia",
        legs: [
          { bookmaker: "1xBet",   bookmakerId: "1xbet",   selection: "Jeonbuk Hyundai Motors", odds: v(2.05, 0.07), impliedProb: 0.488 },
          { bookmaker: "Pinnacle",bookmakerId: "pinnacle",selection: "Ulsan Hyundai",           odds: v(4.10, 0.15), impliedProb: 0.244 },
          { bookmaker: "Bet365",  bookmakerId: "bet365",  selection: "Draw",                   odds: v(4.30, 0.16), impliedProb: 0.233 },
        ],
      },
      {
        id: "demo-as-7", sport: "Soccer", sportKey: "soccer_epl", league: "Premier League",
        homeTeam: "Man City", awayTeam: "Tottenham", commenceTime: ct(48), marketType: "3way",
        profitPercent: v(3.0, 0.4), totalImplied: 0.970, discoveredAt: now, region: "asia",
        legs: [
          { bookmaker: "Bet365",  bookmakerId: "bet365",  selection: "Man City",   odds: v(1.80, 0.06), impliedProb: 0.556 },
          { bookmaker: "Pinnacle",bookmakerId: "pinnacle",selection: "Tottenham",  odds: v(5.60, 0.22), impliedProb: 0.179 },
          { bookmaker: "1xBet",   bookmakerId: "1xbet",   selection: "Draw",       odds: v(5.00, 0.19), impliedProb: 0.200 },
        ],
      },
      {
        id: "demo-as-8", sport: "NBA", sportKey: "basketball_nba", league: "NBA",
        homeTeam: "Toronto Raptors", awayTeam: "Brooklyn Nets", commenceTime: ct(37), marketType: "2way",
        profitPercent: v(2.7, 0.35), totalImplied: 0.973, discoveredAt: now, region: "asia",
        legs: [
          { bookmaker: "Bet365",  bookmakerId: "bet365",  selection: "Toronto Raptors", odds: v(2.40, 0.09), impliedProb: 0.417 },
          { bookmaker: "Pinnacle",bookmakerId: "pinnacle",selection: "Brooklyn Nets",   odds: v(2.10, 0.07), impliedProb: 0.476 },
        ],
      },
    ];
  }

  return globalPool;
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
