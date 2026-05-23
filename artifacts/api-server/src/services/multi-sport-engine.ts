import { logger } from "../lib/logger";

const API_SPORTS_KEY = process.env.API_SPORTS_KEY;
const NBA_BASE    = "https://v2.nba.api-sports.io";
const NFL_BASE    = "https://v1.american-football.api-sports.io";
const MLB_BASE    = "https://v1.baseball.api-sports.io";

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

  const home      = teams?.home  as Record<string, unknown> | undefined;
  const away      = teams?.away  as Record<string, unknown> | undefined;
  const homeScore = scores?.home as Record<string, unknown> | undefined;
  const awayScore = scores?.away as Record<string, unknown> | undefined;

  if (!home || !away) return null;

  return {
    id:        raw.id as number,
    date:      (date?.start as string) ?? new Date().toISOString(),
    homeTeam:  (home.name  as string) ?? "Home",
    awayTeam:  (away.name  as string) ?? "Away",
    homeScore: (homeScore?.total as number | null) ?? null,
    awayScore: (awayScore?.total as number | null) ?? null,
    status:    (status?.long  as string) ?? "Not Started",
    arena:     (raw.arena as string) ?? "",
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

// ─── MLB ──────────────────────────────────────────────────────────────────────

function parseMLBGame(raw: Record<string, unknown>): MLBGame | null {
  const teams  = raw.teams  as Record<string, unknown> | undefined;
  const scores = raw.scores as Record<string, unknown> | undefined;
  const game   = raw.game   as Record<string, unknown> | undefined;
  const status = raw.status as Record<string, unknown> | undefined;

  const home      = teams?.home  as Record<string, unknown> | undefined;
  const away      = teams?.away  as Record<string, unknown> | undefined;
  const homeScore = scores?.home as Record<string, unknown> | undefined;
  const awayScore = scores?.away as Record<string, unknown> | undefined;
  const venue     = game?.venue  as Record<string, unknown> | undefined;

  if (!home || !away) return null;

  return {
    id:        raw.id as number,
    date:      (raw.date as string) ?? new Date().toISOString(),
    homeTeam:  (home.name as string) ?? "Home",
    awayTeam:  (away.name as string) ?? "Away",
    homeScore: (homeScore?.total as number | null) ?? null,
    awayScore: (awayScore?.total as number | null) ?? null,
    status:    (status?.long as string) ?? "Not Started",
    venue:     (venue?.name as string) ?? "",
    season:    2025,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

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
      : fetchSports<MLBGame>(MLB_BASE, `/games?date=${today}&league=1&season=2025`, parseMLBGame, "MLB"),
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
