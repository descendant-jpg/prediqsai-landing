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
  trustStars: number;           // 1-5
  license: string;
  mobileMoney: string[];
  minStakeUSD: number;
  regions: ArbRegion[];
}

export const BOOKMAKER_META: Record<string, BookmakerMeta> = {
  // ── African bookmakers ──────────────────────────────────────────────────────
  bet9ja:         { name: "Bet9ja",        url: "https://www.bet9ja.com",          trustStars: 5, license: "Licensed NLRC ✅",            mobileMoney: ["OPay", "PalmPay", "Bank Transfer"], minStakeUSD: 0.07, regions: ["africa"] },
  sportybet:      { name: "SportyBet",     url: "https://www.sportybet.com",       trustStars: 5, license: "Trusted ✅",                   mobileMoney: ["OPay", "PalmPay"],                  minStakeUSD: 0.07, regions: ["africa"] },
  betking:        { name: "BetKing",       url: "https://www.betking.com",         trustStars: 5, license: "Licensed NLRC ✅",            mobileMoney: ["OPay", "Bank Transfer"],            minStakeUSD: 0.07, regions: ["africa"] },
  hollywoodbets:  { name: "Hollywoodbets", url: "https://www.hollywoodbets.net",   trustStars: 5, license: "Licensed SA NGB ✅",          mobileMoney: ["FNB", "Standard Bank", "EFT"],      minStakeUSD: 0.05, regions: ["africa"] },
  odibets:        { name: "Odibets",       url: "https://www.odibets.com",         trustStars: 4, license: "Licensed BCLB ✅",            mobileMoney: ["M-Pesa", "Airtel Money"],           minStakeUSD: 0.08, regions: ["africa"] },
  betway:         { name: "Betway",        url: "https://www.betway.com",          trustStars: 5, license: "Multi-jurisdiction ✅",       mobileMoney: ["M-Pesa", "OPay", "Airtel Money"],   minStakeUSD: 0.50, regions: ["africa", "uk", "global"] },
  "1xbet":        { name: "1xBet",         url: "https://www.1xbet.com",           trustStars: 3, license: "Use with caution ⚠️",        mobileMoney: ["M-Pesa", "MTN Mobile Money"],       minStakeUSD: 0.15, regions: ["africa", "uk", "global"] },
  melbet:         { name: "Melbet",        url: "https://www.melbet.com",          trustStars: 3, license: "Use with caution ⚠️",        mobileMoney: ["MTN Mobile Money"],                 minStakeUSD: 0.15, regions: ["africa", "uk", "global"] },
  "22bet":        { name: "22Bet",         url: "https://www.22bet.com",           trustStars: 3, license: "Use with caution ⚠️",        mobileMoney: [],                                   minStakeUSD: 0.15, regions: ["africa", "uk", "global"] },
  // ── US bookmakers ───────────────────────────────────────────────────────────
  draftkings:     { name: "DraftKings",    url: "https://www.draftkings.com",      trustStars: 5, license: "Licensed US ✅",              mobileMoney: [],                                   minStakeUSD: 1.00, regions: ["us"] },
  fanduel:        { name: "FanDuel",       url: "https://www.fanduel.com",         trustStars: 5, license: "Licensed US ✅",              mobileMoney: [],                                   minStakeUSD: 1.00, regions: ["us"] },
  betmgm:         { name: "BetMGM",        url: "https://www.betmgm.com",          trustStars: 5, license: "Licensed US ✅",              mobileMoney: [],                                   minStakeUSD: 1.00, regions: ["us"] },
  caesars:        { name: "Caesars",       url: "https://www.caesarssportsbook.com", trustStars: 5, license: "Licensed US ✅",            mobileMoney: [],                                   minStakeUSD: 1.00, regions: ["us"] },
  espnbet:        { name: "ESPN Bet",      url: "https://www.espnbet.com",         trustStars: 5, license: "Licensed US ✅",              mobileMoney: [],                                   minStakeUSD: 1.00, regions: ["us"] },
  pointsbet:      { name: "PointsBet",     url: "https://www.pointsbet.com",       trustStars: 4, license: "Licensed US ✅",              mobileMoney: [],                                   minStakeUSD: 1.00, regions: ["us"] },
  betrivers:      { name: "BetRivers",     url: "https://www.betrivers.com",       trustStars: 4, license: "Licensed US ✅",              mobileMoney: [],                                   minStakeUSD: 1.00, regions: ["us"] },
  // ── UK/EU bookmakers ────────────────────────────────────────────────────────
  bet365:         { name: "Bet365",        url: "https://www.bet365.com",          trustStars: 5, license: "Licensed UK GC ✅",           mobileMoney: [],                                   minStakeUSD: 0.13, regions: ["uk", "global"] },
  williamhill:    { name: "William Hill",  url: "https://www.williamhill.com",     trustStars: 5, license: "Licensed UK GC ✅",           mobileMoney: [],                                   minStakeUSD: 0.13, regions: ["uk"] },
  betfair:        { name: "Betfair",       url: "https://www.betfair.com",         trustStars: 5, license: "Licensed UK GC ✅",           mobileMoney: [],                                   minStakeUSD: 0.13, regions: ["uk", "global"] },
  paddypower:     { name: "Paddy Power",   url: "https://www.paddypower.com",      trustStars: 5, license: "Licensed UK GC ✅",           mobileMoney: [],                                   minStakeUSD: 0.13, regions: ["uk"] },
  skybet:         { name: "Sky Bet",       url: "https://www.skybet.com",          trustStars: 5, license: "Licensed UK GC ✅",           mobileMoney: [],                                   minStakeUSD: 0.13, regions: ["uk"] },
  unibet:         { name: "Unibet",        url: "https://www.unibet.com",          trustStars: 5, license: "Licensed Malta GRA ✅",       mobileMoney: [],                                   minStakeUSD: 0.13, regions: ["uk", "global"] },
  bwin:           { name: "Bwin",          url: "https://www.bwin.com",            trustStars: 4, license: "Licensed Malta GRA ✅",       mobileMoney: [],                                   minStakeUSD: 0.13, regions: ["uk"] },
  pinnacle:       { name: "Pinnacle",      url: "https://www.pinnacle.com",        trustStars: 5, license: "Licensed Curacao ✅",         mobileMoney: [],                                   minStakeUSD: 1.00, regions: ["global"] },
  "888sport":     { name: "888Sport",      url: "https://www.888sport.com",        trustStars: 4, license: "Licensed UK GC ✅",           mobileMoney: [],                                   minStakeUSD: 0.13, regions: ["uk"] },
};

// ─── Currencies ───────────────────────────────────────────────────────────────

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  rateToUSD: number; // units of this currency per 1 USD
}

// Static fallback rates — overridden by live ExchangeRate API data
const STATIC_RATES: Record<string, number> = {
  USD: 1, NGN: 1580, KES: 129, GHS: 15.5, ZAR: 18.8,
  UGX: 3720, TZS: 2650, ZMW: 27.5, GBP: 0.79, EUR: 0.93,
};

export const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: "USD", symbol: "$",    name: "US Dollar",           rateToUSD: 1       },
  NGN: { code: "NGN", symbol: "₦",    name: "Nigerian Naira",      rateToUSD: 1580    },
  KES: { code: "KES", symbol: "KES ", name: "Kenyan Shilling",     rateToUSD: 129     },
  GHS: { code: "GHS", symbol: "GHS ", name: "Ghanaian Cedi",       rateToUSD: 15.5    },
  ZAR: { code: "ZAR", symbol: "R",    name: "South African Rand",  rateToUSD: 18.8    },
  UGX: { code: "UGX", symbol: "UGX ", name: "Ugandan Shilling",    rateToUSD: 3720    },
  TZS: { code: "TZS", symbol: "TZS ", name: "Tanzanian Shilling",  rateToUSD: 2650    },
  ZMW: { code: "ZMW", symbol: "ZMW ", name: "Zambian Kwacha",      rateToUSD: 27.5    },
  GBP: { code: "GBP", symbol: "£",    name: "British Pound",       rateToUSD: 0.79    },
  EUR: { code: "EUR", symbol: "€",    name: "Euro",                rateToUSD: 0.93    },
};

/** Return live exchange rates (USD base). Cached 1 hour. */
export async function getLiveExchangeRates(): Promise<Record<string, number>> {
  try {
    return await getLiveRates();
  } catch {
    return STATIC_RATES;
  }
}

// ─── Regional config ──────────────────────────────────────────────────────────

interface SportEntry { key: string; sport: string; league: string }

const REGION_SPORTS: Record<ArbRegion, SportEntry[]> = {
  africa: [
    { key: "soccer_fifa_world_cup",             sport: "Soccer", league: "FIFA World Cup 2026"    },
    { key: "soccer_epl",                        sport: "Soccer", league: "Premier League"         },
    { key: "soccer_spain_la_liga",              sport: "Soccer", league: "La Liga"                },
    { key: "soccer_nigeria_npfl",               sport: "Soccer", league: "NPFL (Nigeria)"         },
    { key: "soccer_kenya_premier_league",       sport: "Soccer", league: "KPL (Kenya)"            },
    { key: "soccer_south_africa_premiership",   sport: "Soccer", league: "PSL (South Africa)"     },
    { key: "soccer_ghana_premier_league",       sport: "Soccer", league: "GPL (Ghana)"            },
    { key: "soccer_caf_champions_league",       sport: "Soccer", league: "CAF Champions League"   },
    { key: "soccer_africa_nations_cup",         sport: "Soccer", league: "AFCON"                  },
  ],
  us: [
    { key: "americanfootball_nfl",  sport: "NFL",    league: "NFL"            },
    { key: "basketball_nba",        sport: "NBA",    league: "NBA"            },
    { key: "baseball_mlb",          sport: "MLB",    league: "MLB"            },
    { key: "soccer_epl",            sport: "Soccer", league: "Premier League" },
    { key: "soccer_usa_mls",        sport: "Soccer", league: "MLS"            },
  ],
  uk: [
    { key: "soccer_epl",              sport: "Soccer", league: "Premier League"      },
    { key: "soccer_spain_la_liga",    sport: "Soccer", league: "La Liga"             },
    { key: "soccer_germany_bundesliga", sport: "Soccer", league: "Bundesliga"        },
    { key: "soccer_italy_serie_a",    sport: "Soccer", league: "Serie A"            },
    { key: "soccer_france_ligue_one", sport: "Soccer", league: "Ligue 1"            },
    { key: "soccer_uefa_champs_league", sport: "Soccer", league: "Champions League" },
  ],
  asia: [
    { key: "soccer_epl",              sport: "Soccer", league: "Premier League"       },
    { key: "soccer_spain_la_liga",    sport: "Soccer", league: "La Liga"              },
    { key: "soccer_japan_j_league",   sport: "Soccer", league: "J-League (Japan)"    },
    { key: "soccer_south_korea_kleague1", sport: "Soccer", league: "K League (Korea)" },
  ],
  global: [
    { key: "soccer_fifa_world_cup",       sport: "Soccer", league: "FIFA World Cup 2026" },
    { key: "soccer_epl",                  sport: "Soccer", league: "Premier League"      },
    { key: "soccer_spain_la_liga",        sport: "Soccer", league: "La Liga"             },
    { key: "soccer_germany_bundesliga",   sport: "Soccer", league: "Bundesliga"          },
    { key: "soccer_italy_serie_a",        sport: "Soccer", league: "Serie A"            },
    { key: "soccer_france_ligue_one",     sport: "Soccer", league: "Ligue 1"            },
    { key: "americanfootball_nfl",        sport: "NFL",    league: "NFL"                },
    { key: "basketball_nba",             sport: "NBA",    league: "NBA"                },
    { key: "baseball_mlb",              sport: "MLB",    league: "MLB"                },
    { key: "soccer_nigeria_npfl",        sport: "Soccer", league: "NPFL (Nigeria)"     },
    { key: "soccer_south_africa_premiership", sport: "Soccer", league: "PSL (SA)"     },
  ],
};

// Bookmaker keys to request per region in the Odds API `bookmakers` param
const REGION_BOOKMAKERS: Record<ArbRegion, string> = {
  africa: "1xbet,betway,22bet,melbet,hollywoodbets",
  us:     "draftkings,fanduel,betmgm,caesars,espnbet,pointsbet,betrivers,pinnacle",
  uk:     "bet365,williamhill,betfair,paddypower,skybet,unibet,bwin,pinnacle,888sport",
  asia:   "bet365,pinnacle,1xbet,betway,unibet",
  global: "bet365,williamhill,betfair,draftkings,fanduel,betmgm,caesars,unibet,1xbet,betway,22bet,melbet,hollywoodbets,pinnacle",
};

export const REGION_DISCLAIMERS: Record<string, string> = {
  africa:  "Verify that your local bookmaker holds a valid gaming license. 1xBet and Melbet operate with limited regulation — use with caution. Only use regulated operators. 18+ only.",
  africa_ng: "Sports betting is regulated by the National Lottery Regulatory Commission (NLRC). Only use NLRC-licensed operators. 18+ only.",
  africa_ke: "Sports betting is regulated by the Betting Control and Licensing Board (BCLB). Note: 20% excise duty applies to all winnings in Kenya.",
  africa_za: "Sports betting is regulated by the National Gambling Board (NGB). Only use NGB-licensed operators. 18+ only.",
  africa_gh: "Sports betting is regulated by the Gaming Commission of Ghana. Play responsibly. 18+ only.",
  us:      "Sports betting regulations vary by state. Only bet where it is legal in your jurisdiction. 18+ (21+ in some states).",
  uk:      "Sports betting is regulated by the UK Gambling Commission (UKGC). BeGambleAware.org. 18+ only.",
  global:  "Sports betting laws vary by country. Ensure betting is legal in your jurisdiction. 18+ only. Gamble responsibly.",
  asia:    "Sports betting laws vary significantly across Asia. Verify legality in your country before placing bets. 18+ only.",
};

// ─── Cache per region ─────────────────────────────────────────────────────────

const regionCache = new Map<ArbRegion, { arbs: ArbOpportunity[]; ts: number }>();
const CACHE_MS = 30_000;

// ─── Odds API fetch ───────────────────────────────────────────────────────────

async function fetchOddsForSport(
  sportKey: string,
  bookmakersParam: string,
): Promise<Record<string, unknown>[]> {
  if (!ODDS_API_KEY) return [];
  try {
    const bkParam = bookmakersParam ? `&bookmakers=${bookmakersParam}` : "&regions=us,uk,eu,au";
    const url =
      `https://api.the-odds-api.com/v4/sports/${sportKey}/odds` +
      `?apiKey=${ODDS_API_KEY}&markets=h2h&oddsFormat=decimal${bkParam}`;
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

  if (totalImplied >= 1.0) return null;
  const profitPercent = parseFloat(((1 - totalImplied) * 100).toFixed(2));
  if (profitPercent < 0.1) return null;

  const gameId = (game["id"] as string | undefined) ?? `${region}-${sport}-${homeTeam}-${awayTeam}`;

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
    region,
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
  const bookmakerStr = REGION_BOOKMAKERS[region] ?? "";

  try {
    const [sportResults, africanArbs] = await Promise.all([
      Promise.allSettled(
        sports.map(async (s) => {
          const games = await fetchOddsForSport(s.key, bookmakerStr);
          return games.map((g) => ({ game: g, sport: s.sport, league: s.league }));
        }),
      ),
      // For Africa region, also pull from African bookmaker service (Bet9ja, SportyBet, etc.)
      region === "africa"
        ? getAfricanBookmakerArbs(sports.map((s) => s.key), region, forceRefresh)
        : Promise.resolve([] as ArbOpportunity[]),
    ]);

    const opportunities: ArbOpportunity[] = [...africanArbs];
    for (const result of sportResults) {
      if (result.status !== "fulfilled") continue;
      for (const { game, sport, league } of result.value) {
        const arb = detectArb(game, sport, league, region);
        if (arb) opportunities.push(arb);
      }
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

// Legacy wrapper used by existing code
export async function scanForArbitrage(forceRefresh = false): Promise<ArbOpportunity[]> {
  return scanByRegion("global", forceRefresh);
}

// ─── Demo arbs ────────────────────────────────────────────────────────────────

function getDemoArbs(region: ArbRegion = "global"): ArbOpportunity[] {
  const now = Date.now();

  const globalArbs: ArbOpportunity[] = [
    {
      id: "demo-arb-1", sport: "Soccer", sportKey: "soccer_epl", league: "Premier League",
      homeTeam: "Arsenal", awayTeam: "Chelsea",
      commenceTime: new Date(now + 4 * 60_000 + 32_000).toISOString(),
      marketType: "2way", profitPercent: 2.3, totalImplied: 0.977,
      discoveredAt: new Date().toISOString(), region,
      legs: [
        { bookmaker: "Bet365",       bookmakerId: "bet365",      selection: "Arsenal", odds: 2.10, impliedProb: 0.476 },
        { bookmaker: "William Hill", bookmakerId: "williamhill", selection: "Chelsea", odds: 2.20, impliedProb: 0.454 },
      ],
    },
    {
      id: "demo-arb-2", sport: "NBA", sportKey: "basketball_nba", league: "NBA",
      homeTeam: "Los Angeles Lakers", awayTeam: "Golden State Warriors",
      commenceTime: new Date(now + 12 * 60_000 + 15_000).toISOString(),
      marketType: "2way", profitPercent: 1.8, totalImplied: 0.982,
      discoveredAt: new Date().toISOString(), region,
      legs: [
        { bookmaker: "DraftKings", bookmakerId: "draftkings", selection: "Los Angeles Lakers",    odds: 2.05, impliedProb: 0.488 },
        { bookmaker: "FanDuel",    bookmakerId: "fanduel",    selection: "Golden State Warriors", odds: 2.15, impliedProb: 0.465 },
      ],
    },
    {
      id: "demo-arb-3", sport: "Soccer", sportKey: "soccer_epl", league: "Premier League",
      homeTeam: "Man City", awayTeam: "Liverpool",
      commenceTime: new Date(now + 25 * 60_000).toISOString(),
      marketType: "3way", profitPercent: 4.2, totalImplied: 0.958,
      discoveredAt: new Date().toISOString(), region,
      legs: [
        { bookmaker: "Bet365",  bookmakerId: "bet365",  selection: "Man City",  odds: 2.40, impliedProb: 0.417 },
        { bookmaker: "Unibet",  bookmakerId: "unibet",  selection: "Liverpool", odds: 3.80, impliedProb: 0.263 },
        { bookmaker: "Betfair", bookmakerId: "betfair", selection: "Draw",      odds: 4.20, impliedProb: 0.238 },
      ],
    },
  ];

  if (region === "africa") {
    return [
      {
        id: "demo-africa-1", sport: "Soccer", sportKey: "soccer_epl", league: "Premier League",
        homeTeam: "Arsenal", awayTeam: "Chelsea",
        commenceTime: new Date(now + 8 * 60_000 + 24_000).toISOString(),
        marketType: "2way", profitPercent: 2.1, totalImplied: 0.979,
        discoveredAt: new Date().toISOString(), region: "africa",
        legs: [
          { bookmaker: "Bet9ja",    bookmakerId: "bet9ja",    selection: "Arsenal", odds: 2.05, impliedProb: 0.488 },
          { bookmaker: "SportyBet", bookmakerId: "sportybet", selection: "Chelsea", odds: 2.35, impliedProb: 0.426 },
        ],
      },
      {
        id: "demo-africa-2", sport: "Soccer", sportKey: "soccer_nigeria_npfl", league: "NPFL (Nigeria)",
        homeTeam: "Enyimba", awayTeam: "Remo Stars",
        commenceTime: new Date(now + 3 * 60_000 + 10_000).toISOString(),
        marketType: "2way", profitPercent: 3.8, totalImplied: 0.962,
        discoveredAt: new Date().toISOString(), region: "africa",
        legs: [
          { bookmaker: "Bet9ja",  bookmakerId: "bet9ja",  selection: "Enyimba",    odds: 2.60, impliedProb: 0.385 },
          { bookmaker: "BetKing", bookmakerId: "betking", selection: "Remo Stars", odds: 2.80, impliedProb: 0.357 },
        ],
      },
      {
        id: "demo-africa-3", sport: "Soccer", sportKey: "soccer_south_africa_premiership", league: "PSL (South Africa)",
        homeTeam: "Kaizer Chiefs", awayTeam: "Orlando Pirates",
        commenceTime: new Date(now + 18 * 60_000).toISOString(),
        marketType: "3way", profitPercent: 4.7, totalImplied: 0.953,
        discoveredAt: new Date().toISOString(), region: "africa",
        legs: [
          { bookmaker: "Hollywoodbets", bookmakerId: "hollywoodbets", selection: "Kaizer Chiefs",   odds: 2.50, impliedProb: 0.400 },
          { bookmaker: "Betway",        bookmakerId: "betway",        selection: "Orlando Pirates", odds: 3.20, impliedProb: 0.313 },
          { bookmaker: "1xBet",         bookmakerId: "1xbet",         selection: "Draw",            odds: 4.00, impliedProb: 0.250 },
        ],
      },
      {
        id: "demo-africa-4", sport: "Soccer", sportKey: "soccer_caf_champions_league", league: "CAF Champions League",
        homeTeam: "Wydad AC", awayTeam: "Al Ahly",
        commenceTime: new Date(now + 32 * 60_000).toISOString(),
        marketType: "2way", profitPercent: 2.9, totalImplied: 0.971,
        discoveredAt: new Date().toISOString(), region: "africa",
        legs: [
          { bookmaker: "SportyBet", bookmakerId: "sportybet", selection: "Wydad AC", odds: 2.15, impliedProb: 0.465 },
          { bookmaker: "1xBet",     bookmakerId: "1xbet",     selection: "Al Ahly",  odds: 2.30, impliedProb: 0.435 },
        ],
      },
    ];
  }

  if (region === "us") {
    return globalArbs.filter((a) => ["NBA", "NFL", "MLB"].includes(a.sport));
  }

  if (region === "uk") {
    return globalArbs.filter((a) => a.sport === "Soccer");
  }

  return globalArbs;
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
