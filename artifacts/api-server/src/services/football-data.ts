const BASE = "https://api.football-data.org/v4";
const KEY  = process.env.FOOTBALL_DATA_API_KEY ?? "";

// ── Rate limiter (free tier: 10 req/min → 1 per 6 s) ──────────────────────────
let lastReqMs = 0;

async function fetchFD<T>(path: string): Promise<T> {
  if (!KEY) throw new Error("FOOTBALL_DATA_API_KEY not set");

  const now  = Date.now();
  const wait = 6_100 - (now - lastReqMs);
  if (wait > 0) await new Promise<void>((r) => setTimeout(r, wait));
  lastReqMs = Date.now();

  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Auth-Token": KEY },
  });

  if (res.status === 429) {
    await new Promise<void>((r) => setTimeout(r, 62_000));
    return fetchFD<T>(path);
  }
  if (!res.ok) throw new Error(`Football-Data ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

// ── Competition code mapping ───────────────────────────────────────────────────
const LEAGUE_TO_CODE: Record<string, string> = {
  "premier league":    "PL",
  "bundesliga":        "BL1",
  "serie a":           "SA",
  "ligue 1":           "FL1",
  "champions league":  "CL",
  "europa league":     "EL",
  "eredivisie":        "DED",
  "primeira liga":     "PPL",
  "championship":      "ELC",
  "world cup":         "WC",
  "fifa world cup":    "WC",
};

export function leagueNameToCode(league: string): string | null {
  return LEAGUE_TO_CODE[league.toLowerCase().trim()] ?? null;
}

// ── Simple in-memory cache ─────────────────────────────────────────────────────
const cache = new Map<string, { data: unknown; expiresAt: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data as T;
  return null;
}

function setCached(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ── Raw API types ──────────────────────────────────────────────────────────────

interface FDTeamRef   { id: number; name: string; shortName: string; crest: string }
interface FDScoreEnd  { home: number | null; away: number | null }
interface FDScore     { winner: string | null; fullTime: FDScoreEnd; halfTime: FDScoreEnd }
interface FDReferee   { id: number; name: string; nationality: string }
interface FDMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: FDTeamRef;
  awayTeam: FDTeamRef;
  score: FDScore;
  referees: FDReferee[];
  venue?: string;
  competition?: { id: number; name: string; code: string; emblem: string };
  area?: { name: string; code: string; flag: string };
}

interface FDH2HResponse {
  head2head: {
    numberOfMatches: number;
    totalGoals: number;
    homeTeam: { id: number; name: string; wins: number; draws: number; losses: number };
    awayTeam: { id: number; name: string; wins: number; draws: number; losses: number };
  };
  matches: FDMatch[];
}

interface FDStandingEntry {
  position: number;
  team: FDTeamRef;
  playedGames: number;
  won: number; draw: number; lost: number;
  points: number; goalDifference: number; goalsFor: number; goalsAgainst: number;
  form: string | null;
}

interface FDStandingsResponse {
  standings: Array<{
    stage: string;
    type: string;
    group: string | null;
    table: FDStandingEntry[];
  }>;
}

interface FDPlayer {
  id: number; name: string; position: string | null; nationality: string | null;
  dateOfBirth?: string | null; shirtNumber?: number | null;
}

interface FDTeamResponse {
  id: number; name: string; shortName: string; crest: string;
  venue: string; founded: number | null; clubColors: string | null;
  coach: { name: string; nationality: string | null } | null;
  squad: FDPlayer[];
}

// ── Exported types (used by route) ────────────────────────────────────────────

export interface FDH2HMeeting {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  competition: string;
  winner: "home" | "away" | "draw";
}

export interface FDH2HSummary {
  homeTeamWins: number;
  awayTeamWins: number;
  draws: number;
  meetings: FDH2HMeeting[];
}

export interface FDStandingRow {
  position: number;
  team: string;
  crest: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goalDiff: number;
  form: string | null;
}

export interface FDSquadPlayer {
  name: string;
  position: string | null;
  nationality: string | null;
  shirtNumber: number | null;
}

export interface FDTeamInfo {
  id: number;
  name: string;
  crest: string;
  venue: string;
  founded: number | null;
  clubColors: string | null;
  coach: string | null;
  squad: FDSquadPlayer[];
}

export interface FDWCMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: string;
  homeCrest: string;
  awayTeam: string;
  awayCrest: string;
  homeScore: number | null;
  awayScore: number | null;
  venue?: string;
  area?: string;
}

// ── Public functions ───────────────────────────────────────────────────────────

export async function getH2H(
  matchId: number,
  limit = 5,
): Promise<FDH2HSummary> {
  const raw = await fetchFD<FDH2HResponse>(`/matches/${matchId}/head2head?limit=${limit}`);
  const meetings: FDH2HMeeting[] = raw.matches
    .filter((m) => m.score.fullTime.home !== null)
    .slice(0, limit)
    .map((m) => {
      const hs = m.score.fullTime.home ?? 0;
      const as = m.score.fullTime.away ?? 0;
      return {
        date:      m.utcDate.slice(0, 10),
        homeTeam:  m.homeTeam.name,
        awayTeam:  m.awayTeam.name,
        homeScore: hs,
        awayScore: as,
        competition: m.competition?.name ?? "",
        winner: hs > as ? "home" : hs < as ? "away" : "draw",
      };
    });

  const { homeTeam: ht, awayTeam: at } = raw.head2head;
  return {
    homeTeamWins: ht.wins,
    awayTeamWins: at.wins,
    draws: ht.draws,
    meetings,
  };
}

export async function findMatchIdByTeams(
  code: string,
  homeTeam: string,
  awayTeam: string,
  matchDateStr: string,
): Promise<number | null> {
  const cacheKey = `match-id:${code}:${homeTeam}:${awayTeam}:${matchDateStr}`;
  const hit = getCached<number | null>(cacheKey);
  if (hit !== null) return hit;

  const matchDate = new Date(matchDateStr);
  const from = new Date(matchDate.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
  const to   = new Date(matchDate.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);

  const res = await fetchFD<{ matches: FDMatch[] }>(
    `/competitions/${code}/matches?dateFrom=${from}&dateTo=${to}`,
  );

  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const hn = normalise(homeTeam);
  const an = normalise(awayTeam);

  const found = res.matches.find((m) => {
    const mh = normalise(m.homeTeam.name);
    const ma = normalise(m.awayTeam.name);
    return (
      (mh.includes(hn) || hn.includes(mh)) &&
      (ma.includes(an) || an.includes(ma))
    );
  });

  const id = found?.id ?? null;
  setCached(cacheKey, id, 6 * 3_600_000); // cache 6h
  return id;
}

export async function getStandings(code: string): Promise<FDStandingRow[]> {
  const cacheKey = `standings:${code}`;
  const hit = getCached<FDStandingRow[]>(cacheKey);
  if (hit) return hit;

  const raw = await fetchFD<FDStandingsResponse>(`/competitions/${code}/standings`);
  const table = raw.standings.find((s) => s.type === "TOTAL")?.table ?? raw.standings[0]?.table ?? [];

  const rows: FDStandingRow[] = table.map((e) => ({
    position:  e.position,
    team:      e.team.name,
    crest:     e.team.crest,
    played:    e.playedGames,
    won:       e.won,
    drawn:     e.draw,
    lost:      e.lost,
    points:    e.points,
    goalDiff:  e.goalDifference,
    form:      e.form,
  }));

  setCached(cacheKey, rows, 30 * 60_000); // cache 30 min
  return rows;
}

export async function getTeamInfo(teamId: number): Promise<FDTeamInfo> {
  const cacheKey = `team:${teamId}`;
  const hit = getCached<FDTeamInfo>(cacheKey);
  if (hit) return hit;

  const raw = await fetchFD<FDTeamResponse>(`/teams/${teamId}`);
  const info: FDTeamInfo = {
    id:         raw.id,
    name:       raw.name,
    crest:      raw.crest,
    venue:      raw.venue,
    founded:    raw.founded,
    clubColors: raw.clubColors,
    coach:      raw.coach?.name ?? null,
    squad:      raw.squad.map((p) => ({
      name:        p.name,
      position:    p.position,
      nationality: p.nationality,
      shirtNumber: p.shirtNumber ?? null,
    })),
  };

  setCached(cacheKey, info, 24 * 3_600_000); // cache 24h
  return info;
}

export async function getWCMatches(): Promise<FDWCMatch[]> {
  const cacheKey = "wc-matches";
  const hit = getCached<FDWCMatch[]>(cacheKey);
  if (hit) return hit;

  const raw = await fetchFD<{ matches: FDMatch[] }>("/competitions/WC/matches");
  const matches: FDWCMatch[] = raw.matches.map((m) => ({
    id:         m.id,
    utcDate:    m.utcDate,
    status:     m.status,
    stage:      m.stage,
    group:      m.group,
    homeTeam:   m.homeTeam.name,
    homeCrest:  m.homeTeam.crest,
    awayTeam:   m.awayTeam.name,
    awayCrest:  m.awayTeam.crest,
    homeScore:  m.score.fullTime.home,
    awayScore:  m.score.fullTime.away,
    venue:      m.venue,
    area:       m.area?.name,
  }));

  setCached(cacheKey, matches, 60 * 60_000); // cache 1h
  return matches;
}
