import { logger } from "../lib/logger";

const API_SPORTS_KEY = process.env.API_SPORTS_KEY;
const NBA_BASE    = "https://v2.nba.api-sports.io";
const NFL_BASE    = "https://v1.american-football.api-sports.io";
const ESPN_MLB_URL = "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard";

const TTL = 30 * 60 * 1000; // 30-minute cache

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NBAGame {
  id: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  arena: string;
  season: number;
}

export interface NFLGame {
  id: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  week: string;
  season: number;
}

export interface MLBGame {
  id: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  venue: string;
  season: number;
}

export interface MultiSportResponse {
  nba: NBAGame[];
  nfl: NFLGame[];
  mlb: MLBGame[];
  hasApiKey: boolean;
  fetchedAt: string;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const cache: {
  nba?: { data: NBAGame[]; expiresAt: number };
  nfl?: { data: NFLGame[]; expiresAt: number };
  mlb?: { data: MLBGame[]; expiresAt: number };
} = {};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ESPN MLB: free, no key required, always returns current-season data
async function fetchMLBFromESPN(): Promise<MLBGame[]> {
  try {
    const resp = await fetch(ESPN_MLB_URL, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { events?: unknown[] };
    const events = (data.events ?? []) as Record<string, unknown>[];
    return events.map((e) => {
      const competitions = (e.competitions ?? []) as Record<string, unknown>[];
      const comp = competitions[0] as Record<string, unknown> | undefined;
      const competitors = (comp?.competitors ?? []) as Record<string, unknown>[];
      const home = competitors.find((c) => (c as Record<string, unknown>).homeAway === "home") as Record<string, unknown> | undefined;
      const away = competitors.find((c) => (c as Record<string, unknown>).homeAway === "away") as Record<string, unknown> | undefined;
      const homeTeam = home?.team as Record<string, unknown> | undefined;
      const awayTeam = away?.team as Record<string, unknown> | undefined;
      const homeScoreVal = home?.score as string | undefined;
      const awayScoreVal = away?.score as string | undefined;
      const status = comp?.status as Record<string, unknown> | undefined;
      const statusType = status?.type as Record<string, unknown> | undefined;
      const venue = comp?.venue as Record<string, unknown> | undefined;
      return {
        id: parseInt(String(e.id ?? 0), 10),
        date: (e.date as string) ?? new Date().toISOString(),
        homeTeam: (homeTeam?.displayName as string) ?? "Home",
        awayTeam: (awayTeam?.displayName as string) ?? "Away",
        homeScore: homeScoreVal != null ? parseInt(homeScoreVal, 10) : null,
        awayScore: awayScoreVal != null ? parseInt(awayScoreVal, 10) : null,
        status: (statusType?.description as string) ?? (statusType?.name as string) ?? "Scheduled",
        venue: (venue?.fullName as string) ?? "",
        season: new Date().getFullYear(),
      } satisfies MLBGame;
    });
  } catch (err) {
    logger.warn({ err }, "ESPN MLB fetch failed");
    return [];
  }
}

async function fetchSports<T>(
  baseUrl: string,
  path: string,
  parser: (raw: Record<string, unknown>) => T | null,
  label: string,
): Promise<T[]> {
  if (!API_SPORTS_KEY) return [];
  try {
    const url = `${baseUrl}${path}`;
    const resp = await fetch(url, {
      headers: { "x-apisports-key": API_SPORTS_KEY },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) {
      logger.warn({ status: resp.status, url }, `${label} API non-OK`);
      return [];
    }
    const data = (await resp.json()) as { response?: unknown[] };
    const items = (data.response ?? []) as Record<string, unknown>[];
    return items.map(parser).filter((x): x is T => x !== null);
  } catch (err) {
    logger.warn({ err, label }, `${label} fetch failed`);
    return [];
  }
}

// ─── NBA ──────────────────────────────────────────────────────────────────────

function parseNBAGame(raw: Record<string, unknown>): NBAGame | null {
  const teams  = raw.teams  as Record<string, unknown> | undefined;
  const scores = raw.scores as Record<string, unknown> | undefined;
  const status = raw.status as Record<string, unknown> | undefined;
  const date   = raw.date   as Record<string, unknown> | undefined;

  // API-Sports NBA uses "visitors" for the away team (not "away")
  const home      = teams?.home     as Record<string, unknown> | undefined;
  const away      = (teams?.visitors ?? teams?.away) as Record<string, unknown> | undefined;
  // API-Sports NBA uses "points" for the score total (not "total")
  const homeScore = scores?.home     as Record<string, unknown> | undefined;
  const awayScore = (scores?.visitors ?? scores?.away) as Record<string, unknown> | undefined;

  if (!home || !away) return null;

  const arenaObj = raw.arena as Record<string, unknown> | undefined;
  const arenaName = (arenaObj?.name as string) ?? (raw.arena as string) ?? "";

  return {
    id:        raw.id as number,
    date:      (date?.start as string) ?? new Date().toISOString(),
    homeTeam:  (home.name  as string) ?? "Home",
    awayTeam:  (away.name  as string) ?? "Away",
    homeScore: (homeScore?.points as number | null) ?? (homeScore?.total as number | null) ?? null,
    awayScore: (awayScore?.points as number | null) ?? (awayScore?.total as number | null) ?? null,
    status:    (status?.long  as string) ?? "Not Started",
    arena:     arenaName,
    season:    (raw.season as number) ?? 2025,
  };
}

// ─── NFL ──────────────────────────────────────────────────────────────────────

function parseNFLGame(raw: Record<string, unknown>): NFLGame | null {
  const teams  = raw.teams  as Record<string, unknown> | undefined;
  const scores = raw.scores as Record<string, unknown> | undefined;
  const game   = raw.game   as Record<string, unknown> | undefined;

  const home      = teams?.home  as Record<string, unknown> | undefined;
  const away      = teams?.away  as Record<string, unknown> | undefined;
  const homeScore = scores?.home as Record<string, unknown> | undefined;
  const awayScore = scores?.away as Record<string, unknown> | undefined;
  const status    = game?.status as Record<string, unknown> | undefined;
  const gameDateObj = game?.date as Record<string, unknown> | undefined;
  const seasonObj   = game?.season as Record<string, unknown> | undefined;

  if (!home || !away) return null;

  return {
    id:        raw.id as number,
    date:      (gameDateObj?.start as string) ?? new Date().toISOString(),
    homeTeam:  (home.name as string) ?? "Home",
    awayTeam:  (away.name as string) ?? "Away",
    homeScore: (homeScore?.total as number | null) ?? null,
    awayScore: (awayScore?.total as number | null) ?? null,
    status:    (status?.short as string) ?? "NS",
    week:      (game?.week as string) ?? "",
    season:    (seasonObj?.year as number) ?? 2025,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getAllSportsTomorrow(): Promise<MultiSportResponse> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0]; // e.g. "2026-05-26"
  const espnDate = dateStr.replace(/-/g, ""); // e.g. "20260526"

  const [nba, nfl, mlb] = await Promise.all([
    fetchSports<NBAGame>(NBA_BASE, `/games?date=${dateStr}`, parseNBAGame, "NBA-Tomorrow"),
    fetchSports<NFLGame>(NFL_BASE, `/games?date=${dateStr}&league=1`, parseNFLGame, "NFL-Tomorrow"),
    (async (): Promise<MLBGame[]> => {
      try {
        const url = `${ESPN_MLB_URL}?dates=${espnDate}`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!resp.ok) return [];
        const data = (await resp.json()) as { events?: unknown[] };
        const events = (data.events ?? []) as Record<string, unknown>[];
        return events.map((e) => {
          const competitions = (e.competitions ?? []) as Record<string, unknown>[];
          const comp = competitions[0] as Record<string, unknown> | undefined;
          const competitors = (comp?.competitors ?? []) as Record<string, unknown>[];
          const home = competitors.find((c) => (c as Record<string, unknown>).homeAway === "home") as Record<string, unknown> | undefined;
          const away = competitors.find((c) => (c as Record<string, unknown>).homeAway === "away") as Record<string, unknown> | undefined;
          const homeTeam = home?.team as Record<string, unknown> | undefined;
          const awayTeam = away?.team as Record<string, unknown> | undefined;
          const status = comp?.status as Record<string, unknown> | undefined;
          const statusType = status?.type as Record<string, unknown> | undefined;
          const venue = comp?.venue as Record<string, unknown> | undefined;
          return {
            id: parseInt(String(e.id ?? 0), 10),
            date: (e.date as string) ?? tomorrow.toISOString(),
            homeTeam: (homeTeam?.displayName as string) ?? "Home",
            awayTeam: (awayTeam?.displayName as string) ?? "Away",
            homeScore: null,
            awayScore: null,
            status: (statusType?.description as string) ?? "Scheduled",
            venue: (venue?.fullName as string) ?? "",
            season: tomorrow.getFullYear(),
          } satisfies MLBGame;
        });
      } catch (err) {
        logger.warn({ err }, "ESPN MLB tomorrow fetch failed");
        return [];
      }
    })(),
  ]);

  logger.info({ nba: nba.length, nfl: nfl.length, mlb: mlb.length, dateStr }, "Multi-sport tomorrow fetch complete");

  return {
    nba,
    nfl,
    mlb,
    hasApiKey: Boolean(API_SPORTS_KEY),
    fetchedAt: new Date().toISOString(),
  };
}

export async function getAllSportsToday(): Promise<MultiSportResponse> {
  const now   = Date.now();
  const today = new Date().toISOString().split("T")[0];

  const nbaFresh = cache.nba && cache.nba.expiresAt > now;
  const nflFresh = cache.nfl && cache.nfl.expiresAt > now;
  const mlbFresh = cache.mlb && cache.mlb.expiresAt > now;

  if (nbaFresh && nflFresh && mlbFresh) {
    return {
      nba: cache.nba!.data,
      nfl: cache.nfl!.data,
      mlb: cache.mlb!.data,
      hasApiKey: Boolean(API_SPORTS_KEY),
      fetchedAt: new Date(cache.nba!.expiresAt - TTL).toISOString(),
    };
  }

  const [nba, nfl, mlb] = await Promise.all([
    nbaFresh
      ? cache.nba!.data
      : fetchSports<NBAGame>(NBA_BASE, `/games?date=${today}`, parseNBAGame, "NBA"),
    nflFresh
      ? cache.nfl!.data
      : fetchSports<NFLGame>(NFL_BASE, `/games?date=${today}&league=1`, parseNFLGame, "NFL"),
    mlbFresh
      ? cache.mlb!.data
      : fetchMLBFromESPN(),
  ]);

  if (!nbaFresh) cache.nba = { data: nba, expiresAt: now + TTL };
  if (!nflFresh) cache.nfl = { data: nfl, expiresAt: now + TTL };
  if (!mlbFresh) cache.mlb = { data: mlb, expiresAt: now + TTL };

  logger.info({ nba: nba.length, nfl: nfl.length, mlb: mlb.length, today }, "Multi-sport fetch complete");

  return {
    nba,
    nfl,
    mlb,
    hasApiKey: Boolean(API_SPORTS_KEY),
    fetchedAt: new Date().toISOString(),
  };
}
