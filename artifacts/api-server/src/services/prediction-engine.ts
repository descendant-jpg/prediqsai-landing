import { gte, desc, isNotNull, and, ne, eq } from "drizzle-orm";

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
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeamRecord?: string;
  awayTeamRecord?: string;
  fixtureId?: string;
  homeApiSportsId?: number;
  awayApiSportsId?: number;
  apiLeagueId?: number;
  apiSeason?: number;
  // MLB
  homePitcher?: string;
  awayPitcher?: string;
  homePitcherERA?: string;
  awayPitcherERA?: string;
  homePitcherHand?: string;
  awayPitcherHand?: string;
  // Game context
  gameTimeLocal?: string;
  isDayGame?: boolean;
}

interface TeamFormData {
  formString: string;
  formCompact: string;
  goalsScored: number;
  goalsConceded: number;
  gamesPlayed: number;
  homeRecord: string;
  awayRecord: string;
  daysRest: number | null;
  lastGameDate: string | null;
}

interface TeamStandingData {
  teamName: string;
  position: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

interface TeamStatsData {
  formation: string;
  avgGoalsScoredHome: string;
  avgGoalsScoredAway: string;
  avgGoalsConcededHome: string;
  avgGoalsConcededAway: string;
  cleanSheets: number;
  failedToScore: number;
  bttsRate: string;
  winRate: string;
}

interface EnrichedGame extends GameInfo {
  homeForm: TeamFormData | null;
  awayForm: TeamFormData | null;
  homeStanding: TeamStandingData | null;
  awayStanding: TeamStandingData | null;
  homeInjuries: string[];
  awayInjuries: string[];
  homeSuspensions: string[];
  awaySuspensions: string[];
  homeTeamStats: TeamStatsData | null;
  awayTeamStats: TeamStatsData | null;
  fixturePrediction: string | null;
  homeNews: string[];
  awayNews: string[];
  h2hSummary: string | null;
  homeLineup: string | null;
  awayLineup: string | null;
  referee: string | null;
  weatherForecast: string | null;
}

interface GameOdds {
  homeTeam: string;
  awayTeam: string;
  homeOdds?: number;
  awayOdds?: number;
  drawOdds?: number;
  spread?: string;
  total?: number;
  homeOddsRange?: string;
  awayOddsRange?: string;
  drawOddsRange?: string;
  lineMovementSignal?: string;
  bookmakerCount?: number;
  bookmakerBreakdown?: string;
  bestHomeDecimal?: number;
  bestAwayDecimal?: number;
  bestDrawDecimal?: number;
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
  trapGameReason?: string | null;
  avoidMatch?: boolean;
  avoidReason?: string | null;
  reasoning: string;
  keyFactors?: string[];
  againstFactors?: string[];
  weatherImpact?: string | null;
  injuryImpact?: string | null;
  sharpMoneySignal?: string | null;
  aiProbability: number;
  bookmakerProbability?: number;
  valueDetected?: boolean;
  valuePercentage?: number;
  recommendedStake?: string;
  bestMarket?: string;
  alternativeMarkets?: string[];
  modelAgreement?: {
    statistical?: string;
    form?: string;
    market?: string;
    overallAgreement?: boolean;
  };
  agentScores?: {
    injury?: number;
    tactical?: number;
    odds?: number;
    sentiment?: number;
    referee?: number;
    weather?: number;
    form?: number;
    h2h?: number;
  };
  publicBacking?: {
    homePercent?: number;
    awayPercent?: number;
    drawPercent?: number;
    contrarian?: boolean;
    contrarianNote?: string | null;
  };
  simulationData?: {
    scorelineProbabilities?: Array<{ home: number; away: number; probability: number }>;
    homeMean?: number;
    awayMean?: number;
    bttsProb?: number;
    over25Prob?: number;
  };
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
      // Do NOT pass league or season filter — API-Sports free plan blocks specific season
      // queries for recent seasons. The date-only query returns all available fixtures.
      url = `${base}${path}?date=${today}`;
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

    const now2 = new Date();
    const season = now2.getMonth() >= 6 ? now2.getFullYear() : now2.getFullYear() - 1;

    if (sport === "soccer") {
      return (items as Record<string, unknown>[]).slice(0, 6).map((g) => {
        const fixture = g.fixture as Record<string, unknown> | undefined;
        const teams = g.teams as Record<string, unknown> | undefined;
        const venue = (fixture?.venue as Record<string, unknown> | undefined) ?? {};
        const homeT = teams?.home as Record<string, unknown> | undefined;
        const awayT = teams?.away as Record<string, unknown> | undefined;
        return {
          homeTeam: (homeT?.name as string) ?? "Home",
          awayTeam: (awayT?.name as string) ?? "Away",
          date: (fixture?.date as string) ?? today,
          venue: venue.name as string | undefined,
          city: venue.city as string | undefined,
          fixtureId: fixture?.id != null ? String(fixture.id) : undefined,
          homeApiSportsId: homeT?.id as number | undefined,
          awayApiSportsId: awayT?.id as number | undefined,
          apiLeagueId: leagueId,
          apiSeason: season,
        };
      });
    }

    return (items as Record<string, unknown>[]).slice(0, 6).map((g) => {
      const teams = g.teams as Record<string, unknown> | undefined;
      const game = g.game as Record<string, unknown> | undefined;
      const homeT = teams?.home as Record<string, unknown> | undefined;
      const awayT = teams?.away as Record<string, unknown> | undefined;
      const venue = (g.venue ?? (game?.venue)) as Record<string, unknown> | undefined;
      const arena = g.arena as Record<string, unknown> | undefined;
      const fixtureId = g.id != null ? String(g.id) : undefined;
      return {
        homeTeam: (homeT?.name as string) ?? "Home",
        awayTeam: (awayT?.name as string) ?? "Away",
        date: (g.date as string) ?? today,
        venue: (arena?.name ?? venue?.name) as string | undefined,
        city: (arena?.city ?? venue?.city) as string | undefined,
        fixtureId,
        homeApiSportsId: homeT?.id as number | undefined,
        awayApiSportsId: awayT?.id as number | undefined,
        apiLeagueId: leagueId,
        apiSeason: season,
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
    id?: string;
    competitors: Array<{
      homeAway: "home" | "away";
      team: { id?: string; displayName: string };
      records?: Array<{ name: string; summary: string }>;
    }>;
    probables?: Array<{
      homeAway: "home" | "away";
      athlete?: {
        displayName?: string;
        throws?: { abbreviation?: string };
        statistics?: Array<{ name: string; displayValue: string }>;
      };
    }>;
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
      const home = comp?.competitors?.find((c) => c.homeAway === "home");
      const away = comp?.competitors?.find((c) => c.homeAway === "away");
      const homeRecord = home?.records?.find((r) => r.name === "overall")?.summary
        ?? home?.records?.[0]?.summary;
      const awayRecord = away?.records?.find((r) => r.name === "overall")?.summary
        ?? away?.records?.[0]?.summary;

      // MLB probable pitchers
      const probables = comp?.probables ?? [];
      const homeProbable = probables.find((p) => p.homeAway === "home");
      const awayProbable = probables.find((p) => p.homeAway === "away");
      const getStat = (p: typeof homeProbable, name: string) =>
        p?.athlete?.statistics?.find((s) => s.name === name)?.displayValue;

      // Day/night detection from UTC date (rough: before 19:00 UTC = day game)
      const gameHour = new Date(e.date).getUTCHours();
      const isDayGame = gameHour < 19;

      return {
        homeTeam: home?.team.displayName ?? "Home",
        awayTeam: away?.team.displayName ?? "Away",
        date: e.date,
        venue: comp?.venue?.fullName,
        city: comp?.venue?.address?.city,
        homeTeamId: home?.team.id,
        awayTeamId: away?.team.id,
        homeTeamRecord: homeRecord,
        awayTeamRecord: awayRecord,
        homePitcher: homeProbable?.athlete?.displayName,
        awayPitcher: awayProbable?.athlete?.displayName,
        homePitcherERA: getStat(homeProbable, "ERA") ?? getStat(homeProbable, "era"),
        awayPitcherERA: getStat(awayProbable, "ERA") ?? getStat(awayProbable, "era"),
        homePitcherHand: homeProbable?.athlete?.throws?.abbreviation,
        awayPitcherHand: awayProbable?.athlete?.throws?.abbreviation,
        isDayGame,
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

// ─── ESPN Team Form (last 10 completed games) ─────────────────────────────────

async function fetchESPNTeamForm(
  espnSport: string,
  espnLeague: string,
  teamId: string,
): Promise<TeamFormData | null> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/${espnLeague}/teams/${teamId}/schedule?limit=15`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return null;
    const data = (await resp.json()) as Record<string, unknown>;
    const events = (data.events as Record<string, unknown>[]) ?? [];

    const completed = events
      .filter((e) => {
        const comp = (e.competitions as Record<string, unknown>[])?.[0];
        return (comp?.status as Record<string, unknown> | undefined)?.type &&
          ((comp?.status as Record<string, unknown>).type as Record<string, unknown>)?.completed === true;
      })
      .slice(-10);

    if (completed.length === 0) return null;

    let wins = 0, draws = 0, losses = 0;
    let homeWins = 0, homeDraws = 0, homeLosses = 0;
    let awayWins = 0, awayDraws = 0, awayLosses = 0;
    let goalsScored = 0, goalsConceded = 0;
    const formLetters: string[] = [];
    let lastGameDate: string | null = null;

    for (const event of completed) {
      const comp = (event.competitions as Record<string, unknown>[])?.[0];
      const competitors = (comp?.competitors as Record<string, unknown>[]) ?? [];
      const mine = competitors.find(
        (c) => ((c.team as Record<string, unknown>)?.id as string) === teamId,
      );
      const opp = competitors.find(
        (c) => ((c.team as Record<string, unknown>)?.id as string) !== teamId,
      );
      if (!mine || !opp) continue;

      const myScore = parseFloat((mine.score as string) ?? "0");
      const oppScore = parseFloat((opp.score as string) ?? "0");
      const isHome = mine.homeAway === "home";
      const winner = mine.winner === true;
      const eventDate = event.date as string;

      goalsScored += isNaN(myScore) ? 0 : myScore;
      goalsConceded += isNaN(oppScore) ? 0 : oppScore;
      lastGameDate = eventDate;

      if (winner) {
        wins++; formLetters.push("W");
        if (isHome) homeWins++; else awayWins++;
      } else if (myScore === oppScore) {
        draws++; formLetters.push("D");
        if (isHome) homeDraws++; else awayDraws++;
      } else {
        losses++; formLetters.push("L");
        if (isHome) homeLosses++; else awayLosses++;
      }
    }

    const gamesPlayed = wins + draws + losses;
    const daysRest = lastGameDate
      ? Math.floor((Date.now() - new Date(lastGameDate).getTime()) / 86_400_000)
      : null;

    return {
      formString: formLetters.join(" "),
      formCompact: `${wins}W ${draws}D ${losses}L`,
      goalsScored,
      goalsConceded,
      gamesPlayed,
      homeRecord: `W${homeWins} D${homeDraws} L${homeLosses}`,
      awayRecord: `W${awayWins} D${awayDraws} L${awayLosses}`,
      daysRest,
      lastGameDate,
    };
  } catch {
    return null;
  }
}

// ─── ESPN Standings ────────────────────────────────────────────────────────────

async function fetchESPNStandings(
  espnSport: string,
  espnLeague: string,
): Promise<TeamStandingData[]> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/${espnLeague}/standings`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return [];
    const data = (await resp.json()) as Record<string, unknown>;

    const extractEntries = (obj: Record<string, unknown>): Record<string, unknown>[] => {
      if (Array.isArray(obj.entries)) return obj.entries as Record<string, unknown>[];
      if (Array.isArray(obj.children)) {
        for (const child of obj.children as Record<string, unknown>[]) {
          const found = extractEntries(child);
          if (found.length > 0) return found;
        }
      }
      return [];
    };

    const entries = extractEntries(data);
    const getStat = (stats: Record<string, unknown>[], name: string): number => {
      const s = stats.find((x) => x.name === name || x.abbreviation === name);
      return parseFloat((s?.value as string | number | undefined)?.toString() ?? "0") || 0;
    };

    return entries.slice(0, 25).map((entry, i) => {
      const team = entry.team as Record<string, unknown> | undefined;
      const stats = (entry.stats as Record<string, unknown>[]) ?? [];
      return {
        teamName: (team?.displayName as string) ?? `Team ${i + 1}`,
        position: i + 1,
        points: getStat(stats, "points") || getStat(stats, "pts"),
        wins: getStat(stats, "wins") || getStat(stats, "w"),
        draws: getStat(stats, "ties") || getStat(stats, "draws") || getStat(stats, "d"),
        losses: getStat(stats, "losses") || getStat(stats, "l"),
        goalsFor: getStat(stats, "pointsFor") || getStat(stats, "gf"),
        goalsAgainst: getStat(stats, "pointsAgainst") || getStat(stats, "ga"),
      };
    });
  } catch {
    return [];
  }
}

// ─── ESPN Injuries ─────────────────────────────────────────────────────────────

async function fetchESPNInjuries(
  espnSport: string,
  espnLeague: string,
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/${espnLeague}/injuries`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return result;
    const data = (await resp.json()) as Record<string, unknown>;
    const teams = (data.injuries as Record<string, unknown>[]) ?? [];

    for (const teamEntry of teams) {
      const teamName = ((teamEntry.team as Record<string, unknown>)?.displayName as string) ?? "";
      const injured = ((teamEntry.injuries as Record<string, unknown>[]) ?? [])
        .slice(0, 5)
        .map((inj) => {
          const athlete = (inj.athlete as Record<string, unknown>) ?? {};
          const type = (inj.type as Record<string, unknown>) ?? {};
          const pos = ((athlete.position as Record<string, unknown>)?.abbreviation as string) ?? "";
          return `${athlete.displayName as string}${pos ? ` (${pos})` : ""} — ${type.description as string ?? "injured"}`;
        });
      if (teamName && injured.length > 0) result.set(teamName, injured);
    }
  } catch { /* silent */ }
  return result;
}

// ─── API-Sports H2H ───────────────────────────────────────────────────────────

async function fetchApiSportsH2H(
  base: string,
  homeId: number,
  awayId: number,
): Promise<string | null> {
  if (!API_SPORTS_KEY) return null;
  try {
    const url = `${base}/fixtures/headtohead?h2h=${homeId}-${awayId}&last=5`;
    const resp = await fetch(url, {
      headers: { "x-apisports-key": API_SPORTS_KEY },
      signal: AbortSignal.timeout(6000),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { response?: Record<string, unknown>[] };
    const fixtures = data.response ?? [];
    if (fixtures.length === 0) return null;

    let homeWins = 0, awayWins = 0, draws = 0, totalGoals = 0;
    for (const f of fixtures) {
      const teams = f.teams as Record<string, unknown> | undefined;
      const goals = f.goals as Record<string, unknown> | undefined;
      const homeGoals = (goals?.home as number) ?? 0;
      const awayGoals = (goals?.away as number) ?? 0;
      totalGoals += homeGoals + awayGoals;
      const homeWinner = ((teams?.home as Record<string, unknown>)?.winner as boolean) === true;
      const awayWinner = ((teams?.away as Record<string, unknown>)?.winner as boolean) === true;
      if (homeWinner) homeWins++;
      else if (awayWinner) awayWins++;
      else draws++;
    }
    const avgGoals = fixtures.length > 0 ? (totalGoals / fixtures.length).toFixed(1) : "N/A";
    return `H2H last ${fixtures.length}: Home ${homeWins}W / ${draws}D / Away ${awayWins}W | Avg goals: ${avgGoals}`;
  } catch {
    return null;
  }
}

// ─── API-Sports Lineup + Referee ──────────────────────────────────────────────

async function fetchApiSportsFixtureDetails(
  base: string,
  fixtureId: string,
): Promise<{ homeLineup: string | null; awayLineup: string | null; referee: string | null }> {
  const empty = { homeLineup: null, awayLineup: null, referee: null };
  if (!API_SPORTS_KEY || !fixtureId) return empty;
  try {
    const [lineupResp, fixtureResp] = await Promise.all([
      fetch(`${base}/fixtures/lineups?fixture=${fixtureId}`, {
        headers: { "x-apisports-key": API_SPORTS_KEY },
        signal: AbortSignal.timeout(5000),
      }),
      fetch(`${base}/fixtures?id=${fixtureId}`, {
        headers: { "x-apisports-key": API_SPORTS_KEY },
        signal: AbortSignal.timeout(5000),
      }),
    ]);

    let homeLineup: string | null = null;
    let awayLineup: string | null = null;
    let referee: string | null = null;

    if (lineupResp.ok) {
      const lineupData = (await lineupResp.json()) as { response?: Record<string, unknown>[] };
      const lineups = lineupData.response ?? [];
      for (const lineup of lineups.slice(0, 2)) {
        const teamName = ((lineup.team as Record<string, unknown>)?.name as string) ?? "";
        const formation = (lineup.formation as string) ?? "";
        const startXI = (lineup.startXI as Record<string, unknown>[]) ?? [];
        const players = startXI
          .slice(0, 11)
          .map((p) => ((p.player as Record<string, unknown>)?.name as string) ?? "")
          .filter(Boolean)
          .join(", ");
        const summary = players ? `${formation}: ${players}` : null;
        if (lineups.indexOf(lineup) === 0) homeLineup = summary ? `${teamName}: ${summary}` : null;
        else awayLineup = summary ? `${teamName}: ${summary}` : null;
      }
    }

    if (fixtureResp.ok) {
      const fixData = (await fixtureResp.json()) as { response?: Record<string, unknown>[] };
      const fix = fixData.response?.[0];
      const fixture = fix?.fixture as Record<string, unknown> | undefined;
      referee = (fixture?.referee as string) ?? null;
    }

    return { homeLineup, awayLineup, referee };
  } catch {
    return empty;
  }
}

// ─── API-Sports: season team statistics (xG proxy, possession, clean sheets) ──

async function fetchApiSportsTeamStats(
  base: string,
  teamId: number,
  leagueId: number,
  season: number,
): Promise<TeamStatsData | null> {
  if (!API_SPORTS_KEY) return null;
  try {
    const url = `${base}/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`;
    const resp = await fetch(url, {
      headers: { "x-apisports-key": API_SPORTS_KEY },
      signal: AbortSignal.timeout(7000),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { response?: Record<string, unknown> };
    const r = data.response;
    if (!r) return null;

    const goals = r.goals as Record<string, unknown> | undefined;
    const forG = goals?.for as Record<string, unknown> | undefined;
    const againstG = goals?.against as Record<string, unknown> | undefined;
    const forAvg = forG?.average as Record<string, unknown> | undefined;
    const againstAvg = againstG?.average as Record<string, unknown> | undefined;
    const cleanSheet = r.clean_sheet as Record<string, unknown> | undefined;
    const failedToScore = r.failed_to_score as Record<string, unknown> | undefined;
    const fixtures = r.fixtures as Record<string, unknown> | undefined;
    const played = fixtures?.played as Record<string, unknown> | undefined;
    const wins = fixtures?.wins as Record<string, unknown> | undefined;
    const lineups = (r.lineups as Record<string, unknown>[]) ?? [];
    const topFormation = [...lineups].sort(
      (a, b) => ((b.played as number) ?? 0) - ((a.played as number) ?? 0),
    )[0];

    const totalPlayed = ((played?.home as number) ?? 0) + ((played?.away as number) ?? 0);
    const totalWins = ((wins?.home as number) ?? 0) + ((wins?.away as number) ?? 0);
    const totalClean = ((cleanSheet?.home as number) ?? 0) + ((cleanSheet?.away as number) ?? 0);
    const totalFailed = ((failedToScore?.home as number) ?? 0) + ((failedToScore?.away as number) ?? 0);
    const btts = totalPlayed > 0
      ? `${Math.round(((totalPlayed - totalClean) / totalPlayed) * 100)}%`
      : "N/A";
    const winRate = totalPlayed > 0
      ? `${Math.round((totalWins / totalPlayed) * 100)}%`
      : "N/A";

    return {
      formation: (topFormation?.formation as string) ?? "Unknown",
      avgGoalsScoredHome: (forAvg?.home as string) ?? "N/A",
      avgGoalsScoredAway: (forAvg?.away as string) ?? "N/A",
      avgGoalsConcededHome: (againstAvg?.home as string) ?? "N/A",
      avgGoalsConcededAway: (againstAvg?.away as string) ?? "N/A",
      cleanSheets: totalClean,
      failedToScore: totalFailed,
      bttsRate: btts,
      winRate,
    };
  } catch {
    return null;
  }
}

// ─── API-Sports: fixture predictions (expected goals, model comparison) ────────

async function fetchApiSportsFixturePredictions(
  base: string,
  fixtureId: string,
): Promise<string | null> {
  if (!API_SPORTS_KEY || !fixtureId) return null;
  try {
    const url = `${base}/predictions?fixture=${fixtureId}`;
    const resp = await fetch(url, {
      headers: { "x-apisports-key": API_SPORTS_KEY },
      signal: AbortSignal.timeout(7000),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { response?: Record<string, unknown>[] };
    const r = data.response?.[0];
    if (!r) return null;

    const preds = r.predictions as Record<string, unknown> | undefined;
    const comparison = r.comparison as Record<string, unknown> | undefined;
    const winner = preds?.winner as Record<string, unknown> | undefined;
    const goals = preds?.goals as Record<string, unknown> | undefined;
    const advice = preds?.advice as string | undefined;

    const parts: string[] = [];
    if (winner?.name) parts.push(`Predicted winner: ${winner.name as string}`);
    if (goals?.home !== undefined || goals?.away !== undefined) {
      parts.push(`Expected goals: Home ${goals?.home ?? "?"} / Away ${goals?.away ?? "?"}`);
    }
    if (advice) parts.push(`Model advice: ${advice}`);

    if (comparison) {
      const cp = (k: string) => {
        const v = comparison[k] as Record<string, unknown> | undefined;
        return v ? `${v.home ?? "?"}/${v.away ?? "?"}` : null;
      };
      const cParts = [
        cp("form") ? `Form ${cp("form")}` : null,
        cp("att") ? `Attack ${cp("att")}` : null,
        cp("def") ? `Defense ${cp("def")}` : null,
        cp("poisson_distribution") ? `Poisson ${cp("poisson_distribution")}` : null,
        cp("h2h") ? `H2H ${cp("h2h")}` : null,
      ].filter(Boolean);
      if (cParts.length > 0) parts.push(`Comparison (Home%/Away%): ${cParts.join(" | ")}`);
    }

    return parts.length > 0 ? parts.join("\n") : null;
  } catch {
    return null;
  }
}

// ─── API-Sports: fixture injuries + suspensions ────────────────────────────────

async function fetchApiSportsFixtureInjuries(
  base: string,
  fixtureId: string,
  homeId?: number,
  awayId?: number,
): Promise<{ homeInj: string[]; awayInj: string[]; homeSusp: string[]; awaySusp: string[] }> {
  const empty = { homeInj: [], awayInj: [], homeSusp: [], awaySusp: [] };
  if (!API_SPORTS_KEY || !fixtureId) return empty;
  try {
    const resp = await fetch(`${base}/injuries?fixture=${fixtureId}`, {
      headers: { "x-apisports-key": API_SPORTS_KEY },
      signal: AbortSignal.timeout(6000),
    });
    if (!resp.ok) return empty;
    const data = (await resp.json()) as { response?: Record<string, unknown>[] };
    const items = data.response ?? [];

    const homeInj: string[] = [];
    const awayInj: string[] = [];
    const homeSusp: string[] = [];
    const awaySusp: string[] = [];

    for (const item of items) {
      const player = item.player as Record<string, unknown> | undefined;
      const team = item.team as Record<string, unknown> | undefined;
      const name = (player?.name as string) ?? "";
      const type = ((player?.type as string) ?? "").toLowerCase();
      const teamId = team?.id as number | undefined;
      const isSusp = type.includes("suspend") || type.includes("yellow card");
      const isHome = homeId !== undefined ? teamId === homeId : true;
      const isAway = awayId !== undefined ? teamId === awayId : !isHome;

      if (isSusp) {
        if (isHome) homeSusp.push(name);
        else if (isAway) awaySusp.push(name);
      } else if (type.includes("injur") || type.includes("absent") || type.includes("missing")) {
        if (isHome) homeInj.push(name);
        else if (isAway) awayInj.push(name);
      }
    }

    return { homeInj, awayInj, homeSusp, awaySusp };
  } catch {
    return empty;
  }
}

// ─── NewsAPI: targeted 48h team news ─────────────────────────────────────────

async function fetchNewsApiTeamTargeted(teamName: string): Promise<string[]> {
  if (!NEWS_API_KEY) return [];
  try {
    const from = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const q = `"${teamName}" (injury OR injured OR suspended OR lineup OR "press conference" OR "manager" OR "coach")`;
    const url =
      `https://newsapi.org/v2/everything` +
      `?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&from=${encodeURIComponent(from)}&pageSize=5&apiKey=${NEWS_API_KEY}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { articles?: Array<{ title: string }> };
    return (data.articles ?? []).slice(0, 4).map((a) => a.title);
  } catch {
    return [];
  }
}

// ─── Enrich games with all additional context ─────────────────────────────────

async function enrichGames(
  games: GameInfo[],
  espnSport: string,
  espnLeague: string,
  apiSportsBase: string,
): Promise<EnrichedGame[]> {
  const [standings, espnInjuries] = await Promise.all([
    fetchESPNStandings(espnSport, espnLeague),
    fetchESPNInjuries(espnSport, espnLeague),
  ]);

  const normalized = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  const findStanding = (teamName: string): TeamStandingData | null =>
    standings.find(
      (s) =>
        normalized(s.teamName).includes(normalized(teamName)) ||
        normalized(teamName).includes(normalized(s.teamName)),
    ) ?? null;

  const findEspnInjuries = (teamName: string): string[] => {
    for (const [key, val] of espnInjuries.entries()) {
      if (
        normalized(key).includes(normalized(teamName)) ||
        normalized(teamName).includes(normalized(key))
      )
        return val;
    }
    return [];
  };

  const enriched = await Promise.all(
    games.slice(0, 6).map(async (game): Promise<EnrichedGame> => {
      const hasApiSports = !!API_SPORTS_KEY;
      const hasFixture = !!game.fixtureId;
      const hasTeamIds = !!(game.homeApiSportsId && game.awayApiSportsId);
      const hasSeasonData = !!(game.apiLeagueId && game.apiSeason);

      const [
        homeForm,
        awayForm,
        fixtureDetails,
        fixtureInjuries,
        homeTeamStats,
        awayTeamStats,
        fixturePrediction,
        h2h,
        homeNews,
        awayNews,
      ] = await Promise.all([
        game.homeTeamId
          ? fetchESPNTeamForm(espnSport, espnLeague, game.homeTeamId)
          : Promise.resolve(null),
        game.awayTeamId
          ? fetchESPNTeamForm(espnSport, espnLeague, game.awayTeamId)
          : Promise.resolve(null),
        hasFixture && hasApiSports
          ? fetchApiSportsFixtureDetails(apiSportsBase, game.fixtureId!)
          : Promise.resolve({ homeLineup: null, awayLineup: null, referee: null }),
        hasFixture && hasApiSports
          ? fetchApiSportsFixtureInjuries(
              apiSportsBase,
              game.fixtureId!,
              game.homeApiSportsId,
              game.awayApiSportsId,
            )
          : Promise.resolve({ homeInj: [], awayInj: [], homeSusp: [], awaySusp: [] }),
        hasTeamIds && hasSeasonData
          ? fetchApiSportsTeamStats(
              apiSportsBase,
              game.homeApiSportsId!,
              game.apiLeagueId!,
              game.apiSeason!,
            )
          : Promise.resolve(null),
        hasTeamIds && hasSeasonData
          ? fetchApiSportsTeamStats(
              apiSportsBase,
              game.awayApiSportsId!,
              game.apiLeagueId!,
              game.apiSeason!,
            )
          : Promise.resolve(null),
        hasFixture && hasApiSports
          ? fetchApiSportsFixturePredictions(apiSportsBase, game.fixtureId!)
          : Promise.resolve(null),
        hasTeamIds
          ? fetchApiSportsH2H(apiSportsBase, game.homeApiSportsId!, game.awayApiSportsId!)
          : Promise.resolve(null),
        fetchNewsApiTeamTargeted(game.homeTeam),
        fetchNewsApiTeamTargeted(game.awayTeam),
      ]);

      // Merge ESPN + API-Sports injuries (deduplicate)
      const espnHomeInj = findEspnInjuries(game.homeTeam);
      const espnAwayInj = findEspnInjuries(game.awayTeam);
      const mergeUnique = (a: string[], b: string[]) =>
        [...new Set([...a, ...b.filter((n) => !a.some((x) => x.includes(n.split(" ")[1] ?? n)))])];

      return {
        ...game,
        homeForm,
        awayForm,
        homeStanding: findStanding(game.homeTeam),
        awayStanding: findStanding(game.awayTeam),
        homeInjuries: mergeUnique(espnHomeInj, fixtureInjuries.homeInj),
        awayInjuries: mergeUnique(espnAwayInj, fixtureInjuries.awayInj),
        homeSuspensions: fixtureInjuries.homeSusp,
        awaySuspensions: fixtureInjuries.awaySusp,
        homeTeamStats,
        awayTeamStats,
        fixturePrediction,
        homeNews,
        awayNews,
        h2hSummary: h2h,
        homeLineup: fixtureDetails.homeLineup,
        awayLineup: fixtureDetails.awayLineup,
        referee: fixtureDetails.referee,
        weatherForecast: null, // filled by caller
      };
    }),
  );

  return enriched;
}

// ─── Format enriched game into comprehensive match brief ──────────────────────

function formatEnrichedGameBlock(
  g: EnrichedGame,
  odds: GameOdds[],
  weather: string | null,
): string {
  const o = findMatchingOdds(odds, g);
  const matchDate = new Date(g.date).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const lines: string[] = [
    `════ MATCH BRIEF ════`,
    `${g.homeTeam} vs ${g.awayTeam}`,
    `Date: ${matchDate}`,
    g.venue ? `Venue: ${g.venue}${g.city ? `, ${g.city}` : ""}` : "",
  ].filter(Boolean);

  // ── Market Intelligence ────────────────────────────────────────────────────
  lines.push(`\n── MARKET INTELLIGENCE ──`);
  if (o) {
    lines.push(
      `Consensus ML: Home ${o.homeOdds ?? "N/A"} / Away ${o.awayOdds ?? "N/A"}${o.drawOdds ? ` / Draw ${o.drawOdds}` : ""}`,
    );
    if (o.homeOddsRange) lines.push(`Home odds range: ${o.homeOddsRange}`);
    if (o.awayOddsRange) lines.push(`Away odds range: ${o.awayOddsRange}`);
    if (o.drawOddsRange) lines.push(`Draw odds range: ${o.drawOddsRange}`);
    if (o.spread) lines.push(`Spread: ${o.spread}`);
    if (o.total !== undefined) lines.push(`Over/Under: ${o.total}`);
    if (o.bookmakerBreakdown) lines.push(`Sources: ${o.bookmakerBreakdown}`);
    if (o.lineMovementSignal) lines.push(o.lineMovementSignal);

    // EV pre-computation — show break-even probability so Claude can compare to its aiProbability
    const evLines: string[] = [];
    const fmt = (d: number) => {
      const be = Math.round((1 / d) * 1000) / 10; // break-even %
      return `${d.toFixed(2)} decimal | break-even: ${be}%`;
    };
    if (o.bestHomeDecimal) evLines.push(`  Home win: best ${fmt(o.bestHomeDecimal)}`);
    if (o.bestAwayDecimal) evLines.push(`  Away win: best ${fmt(o.bestAwayDecimal)}`);
    if (o.bestDrawDecimal) evLines.push(`  Draw: best ${fmt(o.bestDrawDecimal)}`);
    if (evLines.length > 0) {
      lines.push(`EV ANALYSIS (compare your aiProbability to break-even to find +EV bets):`);
      lines.push(...evLines);
    }
  } else {
    lines.push(`Odds: Not available`);
  }

  // ── Form Analysis ─────────────────────────────────────────────────────────
  lines.push(`\n── FORM ANALYSIS ──`);
  if (g.homeTeamRecord || g.awayTeamRecord) {
    lines.push(`Season record: ${g.homeTeam} ${g.homeTeamRecord ?? "N/A"} | ${g.awayTeam} ${g.awayTeamRecord ?? "N/A"}`);
  }

  for (const [label, form] of [[g.homeTeam, g.homeForm], [g.awayTeam, g.awayForm]] as [string, TeamFormData | null][]) {
    if (!form) continue;
    const gpg = (n: number) => (n / Math.max(1, form.gamesPlayed)).toFixed(1);
    lines.push(`${label} (last ${form.gamesPlayed}): ${form.formString} → ${form.formCompact}`);
    lines.push(`  Avg goals: ${gpg(form.goalsScored)} scored / ${gpg(form.goalsConceded)} conceded`);
    lines.push(`  Home: ${form.homeRecord} | Away: ${form.awayRecord}`);
    if (form.daysRest !== null) lines.push(`  Rest: ${form.daysRest} days since last match`);
  }

  // ── League Standings ──────────────────────────────────────────────────────
  if (g.homeStanding || g.awayStanding) {
    lines.push(`\n── LEAGUE STANDINGS ──`);
    for (const [label, st] of [[g.homeTeam, g.homeStanding], [g.awayTeam, g.awayStanding]] as [string, TeamStandingData | null][]) {
      if (!st) continue;
      const gd = st.goalsFor - st.goalsAgainst;
      lines.push(
        `${label}: ${st.position}${ordinal(st.position)} | ${st.points} pts | ${st.wins}W ${st.draws}D ${st.losses}L | GD ${gd > 0 ? "+" : ""}${gd}`,
      );
    }
  }

  // ── Season Team Statistics ────────────────────────────────────────────────
  if (g.homeTeamStats || g.awayTeamStats) {
    lines.push(`\n── SEASON STATISTICS ──`);
    for (const [label, ts] of [[g.homeTeam, g.homeTeamStats], [g.awayTeam, g.awayTeamStats]] as [string, TeamStatsData | null][]) {
      if (!ts) continue;
      lines.push(`${label} [${ts.formation}]:`);
      lines.push(`  Goals scored avg — Home: ${ts.avgGoalsScoredHome} / Away: ${ts.avgGoalsScoredAway}`);
      lines.push(`  Goals conceded avg — Home: ${ts.avgGoalsConcededHome} / Away: ${ts.avgGoalsConcededAway}`);
      lines.push(`  Clean sheets: ${ts.cleanSheets} | Failed to score: ${ts.failedToScore}`);
      lines.push(`  BTTS rate: ${ts.bttsRate} | Win rate: ${ts.winRate}`);
    }
  }

  // ── Head to Head ──────────────────────────────────────────────────────────
  if (g.h2hSummary) {
    lines.push(`\n── HEAD-TO-HEAD ──`);
    lines.push(g.h2hSummary);
  }

  // ── Squad Status ──────────────────────────────────────────────────────────
  const hasSquadInfo =
    g.homeInjuries.length > 0 || g.awayInjuries.length > 0 ||
    g.homeSuspensions.length > 0 || g.awaySuspensions.length > 0 ||
    g.homeLineup || g.awayLineup;

  if (hasSquadInfo) {
    lines.push(`\n── SQUAD STATUS ──`);
    if (g.homeInjuries.length > 0) lines.push(`${g.homeTeam} injured: ${g.homeInjuries.join(", ")}`);
    if (g.homeSuspensions.length > 0) lines.push(`${g.homeTeam} suspended: ${g.homeSuspensions.join(", ")}`);
    if (g.awayInjuries.length > 0) lines.push(`${g.awayTeam} injured: ${g.awayInjuries.join(", ")}`);
    if (g.awaySuspensions.length > 0) lines.push(`${g.awayTeam} suspended: ${g.awaySuspensions.join(", ")}`);
    if (g.homeLineup) lines.push(`${g.homeTeam} XI: ${g.homeLineup}`);
    if (g.awayLineup) lines.push(`${g.awayTeam} XI: ${g.awayLineup}`);
  }

  // ── Model Comparison (API-Sports predictions) ─────────────────────────────
  if (g.fixturePrediction) {
    lines.push(`\n── STATISTICAL MODEL COMPARISON ──`);
    lines.push(g.fixturePrediction);
  }

  // ── MLB Pitching Matchup ──────────────────────────────────────────────────
  if (g.homePitcher || g.awayPitcher) {
    lines.push(`\n── PITCHING MATCHUP ──`);
    if (g.homePitcher) {
      const hand = g.homePitcherHand ? ` (${g.homePitcherHand}HP)` : "";
      const era = g.homePitcherERA ? ` ERA ${g.homePitcherERA}` : "";
      lines.push(`${g.homeTeam} SP: ${g.homePitcher}${hand}${era}`);
    }
    if (g.awayPitcher) {
      const hand = g.awayPitcherHand ? ` (${g.awayPitcherHand}HP)` : "";
      const era = g.awayPitcherERA ? ` ERA ${g.awayPitcherERA}` : "";
      lines.push(`${g.awayTeam} SP: ${g.awayPitcher}${hand}${era}`);
    }
    if (g.isDayGame !== undefined) lines.push(`Game time: ${g.isDayGame ? "Day game" : "Night game"}`);
  }

  // ── Match Official ────────────────────────────────────────────────────────
  if (g.referee) lines.push(`\nReferee: ${g.referee}`);

  // ── Weather Forecast ──────────────────────────────────────────────────────
  const wx = weather ?? g.weatherForecast;
  if (wx) {
    lines.push(`\n── WEATHER FORECAST ──`);
    lines.push(wx);
  }

  // ── Latest News (48h) ─────────────────────────────────────────────────────
  const allNews = [...g.homeNews.map((n) => `[${g.homeTeam}] ${n}`), ...g.awayNews.map((n) => `[${g.awayTeam}] ${n}`)];
  if (allNews.length > 0) {
    lines.push(`\n── LATEST NEWS (48h) ──`);
    for (const n of allNews) lines.push(`• ${n}`);
  }

  return lines.join("\n");
}

// ─── Sport-specific analysis frameworks for Claude ────────────────────────────

function getSportAnalysisPrompt(sport: string): string {
  switch (sport) {
    case "nfl":
      return `NFL SPECIFIC ANALYSIS FRAMEWORK — apply every factor below:

1. QUARTERBACK EFFICIENCY
   - Evaluate passer rating, completion %, sacks taken, pressure rate
   - Backup QB starting = adjust win probability −15 to −25%
   - Mobile QB in cold/wind conditions retains more value than pocket passer

2. OFFENSIVE LINE & RUN GAME
   - Strong O-line vs weak pass rush = QB protection and run game control
   - Teams that win the line of scrimmage cover ATS at 62%+ rate
   - Sack rate differential is a key predictor

3. WEATHER IMPACT (CRITICAL for outdoor games)
   - Wind >15mph: reduces passing efficiency, lean under on totals
   - Wind >25mph: heavily favours run-heavy teams, totals drop 4-6 pts
   - Rain/snow: increases fumbles and turnovers, unpredictable outcomes
   - Temperature <20°F: reduces field goal %, run-heavy script

4. HOME FIELD VALUE
   - Apply standard 3-point home field advantage in spread analysis
   - Divisional games: reduce to ~2 pts (familiarity reduces home edge)
   - Indoor stadiums (domes): eliminate weather factor entirely

5. DIVISIONAL GAME VARIANCE
   - Division opponents play 2x/year, know each other's tendencies
   - Historical ATS margins in divisional games are ~2pts tighter
   - Reduce confidence by 5% vs non-division predictions

6. SCHEDULE FATIGUE
   - Thursday game = only 72h rest if played Sunday → flag back-to-back
   - Monday Night = team's 17th hour from normal rhythm (travel disruption)
   - Teams on short week cover ATS only 43% of the time

7. VEGAS SHARP MOVEMENT
   - Line moved 2+ points OPPOSITE to public betting % → sharp money signal
   - Weight this signal heavily — sharps win long term at 54%+ rate
   - Reverse line movement = one of strongest value indicators

8. OFFICIAL INJURY REPORT
   - OUT: treat as full replacement value lost
   - DOUBTFUL (75% out): adjust probability proportionally
   - QUESTIONABLE (50/50): note uncertainty, flag risk
   - Skill positions ranked by impact: QB > LT > WR1 > RB1 > TE`;

    case "nba":
      return `NBA SPECIFIC ANALYSIS FRAMEWORK — apply every factor below:

1. REST ADVANTAGE (highest predictive value)
   - Back-to-back (0-1 days rest): team covers ATS only 42% — flag this every time
   - 3+ days rest advantage vs B2B opponent: covers at 58%+ — lean strongly
   - "Second night of B2B" on the road = among worst NBA bets statistically

2. HOME/AWAY PACE MATCHUP
   - Fast-paced team (top-10 pace) vs opponent on B2B = massive scoring edge
   - Slow teams (bottom-10 pace) neutralise pace advantage — lean under
   - Pace differential >5 possessions/game is significant

3. STAR PLAYER EFFICIENCY
   - Top-3 player out or doubtful = −12 to −20% win probability shift
   - Note recent PER trend (rising = hot hand, falling = regression warning)
   - Single-player teams (one star) are more volatile — higher riskLevel

4. ATS TREND & MOTIVATION
   - Teams covering ATS in 7+ of last 10 often regress — fade them
   - Teams NOT covering in 7+ of last 10 often bounce back — lean their side
   - Meaningless games (playoff-locked or eliminated) = motivation flag

5. REFEREE FOUL TENDENCY
   - High-foul referees: benefit foul-prone stars (more FT trips)
   - Stars averaging 8+ FTA per game in high-foul games = over value
   - Note if referee data is available in lineup section

6. ROSTER DISRUPTION
   - First 5 games after trade deadline acquisition = chemistry adjustment
   - Coach fired in last 30 days = team motivation spike (honeymoon effect, +5%)
   - Closing out season with playoff positioning locked = rest risk

7. TOTAL PREDICTION FORMULA
   - Sum team pace scores, apply B2B penalty (−6 pts per B2B team), adjust for defence rank
   - High total (225+) with two fast teams = lean over
   - Low total (<215) with two slow/defensive teams = lean under`;

    case "mlb":
      return `MLB SPECIFIC ANALYSIS FRAMEWORK — apply every factor below:

1. STARTING PITCHER (60% of prediction weight — most critical factor)
   - ERA ≤3.50 = ace level. ERA ≤2.80 = elite. ERA >5.00 = vulnerability
   - WHIP ≤1.10 = elite control. WHIP >1.40 = command issues
   - Pitcher's hand (L/R) vs opposing lineup handedness creates platoon edge
   - Short rest (<4 days) = performance drop of ~0.5 ERA equivalent
   - Pitcher vs THIS specific team's batting average if available

2. BULLPEN HEALTH
   - 4+ game series = cumulative bullpen fatigue, especially for closers
   - If team used 3+ relievers yesterday, bullpen is compromised
   - Bullpen ERA differential often separates close games in late innings

3. BATTING SPLITS (Handedness Matchup)
   - LHP vs predominantly RHH lineup = traditional L/R advantage
   - RHP vs heavy LHH lineup = platoon disadvantage for batting team
   - Note lineup construction against pitcher's hand

4. PARK FACTORS (adjust totals accordingly)
   - Coors Field (Colorado): add 1.5-2 runs to totals, lean over, reduce pitcher value
   - Petco Park (San Diego), Oracle Park (SF): pitcher-friendly, lean under
   - Wrigley Field (Chicago), Great American (Cincinnati): hitter-friendly, lean over
   - Tropicana Field, Rogers Centre (dome): neutralises wind/weather

5. DAY vs NIGHT SPLITS
   - Afternoon sun at certain parks (especially Wrigley) affects batter visibility
   - Day games on getaway day = fatigue factor for overnight travellers
   - Teams with day-game record significantly different from night = note it

6. TEMPERATURE IMPACT ON BALL TRAVEL
   - <50°F: ball travels ~3-5 feet shorter per degree drop → lean under, -0.5 runs
   - >80°F: ball carries, hitter-friendly → lean over
   - Humidity also affects carry (low humidity at altitude = ball carries)

7. UMPIRE HOME PLATE TENDENCIES
   - Tight zone umpires: benefit strikeout pitchers, lean under
   - Wide zone umpires: hitters see better pitches, lean over, more action
   - If umpire name available in game data, weight accordingly`;

    case "soccer":
      return `SOCCER SPECIFIC ANALYSIS FRAMEWORK — apply every factor below:

1. EXPECTED GOALS (xG) — PRIMARY METRIC
   - Use fixture prediction model xG data (home/away expected goals)
   - xG >2.0 for team = strong attacking threat
   - xG differential >0.8 = meaningful advantage, weight prediction accordingly
   - Season xG (from team stats) predicts future performance better than actual goals

2. BTTS (BOTH TEAMS TO SCORE) FREQUENCY
   - Use BTTS rate from season statistics section
   - If both teams have BTTS in 55%+ of games → BTTS is a value market
   - Clean sheet rate × failed-to-score rate determines BTTS probability

3. SET PIECE THREAT
   - Teams with tall target men + high corner frequency win 15-20% of goals from set pieces
   - Aerial duels won in defence are important for clean sheet probability
   - Note if lineup shows traditional set-piece threats (central defenders in attack)

4. HOME/AWAY GOAL DIFFERENCE SPLIT
   - Check if team's GD is heavily skewed home vs away
   - Some clubs are "fortress at home" but weak away — split matters enormously
   - Away team with positive away GD is undervalued by public

5. EUROPEAN COMPETITION FATIGUE
   - Champions League / Europa League midweek + weekend = 3 games in 7 days
   - Flag rotation risk: managers often rest key players in less critical fixtures
   - Teams in UCL knockouts may prioritise European legs → underperform league

6. TACTICAL MATCHUP
   - Use formation data from lineups section
   - High press (4-3-3, 4-2-3-1 aggressive) vs low block = transition danger
   - Possession teams struggle vs compact defensive blocks
   - Note if manager is known for tactical flexibility vs rigid system

7. VAR / REFEREE CARD TENDENCY
   - High card rate referees disrupt tactical fouling teams
   - VAR involvement increases in high-profile matches — late goal reversals
   - Yellow card accumulation suspensions create squad depth issues`;

    default:
      return `GENERAL ANALYSIS FRAMEWORK:
1. FORM: Recent results, momentum, scoring trend
2. H2H: Historical matchup record and patterns
3. SQUAD: Key injuries, suspensions, fatigue
4. CONTEXT: Motivation, schedule position, rivalry
5. MARKET: Odds movement, sharp money signals
6. EXTERNAL: Weather, travel, home advantage`;
  }
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0] ?? "th";
}

// ─── The Odds API (multi-bookmaker with line analysis) ───────────────────────

async function fetchOdds(oddsKey: string): Promise<GameOdds[]> {
  if (!ODDS_API_KEY) return [];
  try {
    const url =
      `https://api.the-odds-api.com/v4/sports/${oddsKey}/odds` +
      `?apiKey=${ODDS_API_KEY}&regions=us,uk,eu&markets=h2h,spreads,totals&oddsFormat=american`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) {
      logger.warn({ oddsKey, status: resp.status }, "Odds API non-OK");
      return [];
    }
    const data = (await resp.json()) as Record<string, unknown>[];

    return data.slice(0, 10).map((game) => {
      const bookmakers = (game.bookmakers as Record<string, unknown>[] | undefined) ?? [];
      const homeName = game.home_team as string;
      const awayName = game.away_team as string;

      const homeOddsAll: number[] = [];
      const awayOddsAll: number[] = [];
      const drawOddsAll: number[] = [];
      const bookmakerNames: string[] = [];
      let spread: string | undefined;
      let total: number | undefined;

      const americanToDecimal = (a: number) =>
        a > 0 ? a / 100 + 1 : 100 / Math.abs(a) + 1;

      let bestHomeDecimal = 0;
      let bestAwayDecimal = 0;
      let bestDrawDecimal = 0;

      for (const bk of bookmakers) {
        const title = (bk.title ?? bk.key) as string;
        bookmakerNames.push(title);
        const markets = (bk.markets as Record<string, unknown>[] | undefined) ?? [];
        const h2h = markets.find((m) => m.key === "h2h");
        const spreads = markets.find((m) => m.key === "spreads");
        const totals = markets.find((m) => m.key === "totals");

        const outcomes = (h2h?.outcomes as Record<string, unknown>[] | undefined) ?? [];
        const homeO = outcomes.find((o) => o.name === homeName);
        const awayO = outcomes.find((o) => o.name === awayName);
        const drawO = outcomes.find((o) => o.name === "Draw");
        if (typeof homeO?.price === "number") {
          homeOddsAll.push(homeO.price);
          const d = americanToDecimal(homeO.price);
          if (d > bestHomeDecimal) bestHomeDecimal = d;
        }
        if (typeof awayO?.price === "number") {
          awayOddsAll.push(awayO.price);
          const d = americanToDecimal(awayO.price);
          if (d > bestAwayDecimal) bestAwayDecimal = d;
        }
        if (typeof drawO?.price === "number") {
          drawOddsAll.push(drawO.price);
          const d = americanToDecimal(drawO.price);
          if (d > bestDrawDecimal) bestDrawDecimal = d;
        }

        if (!spread && spreads) {
          const sOut = (spreads.outcomes as Record<string, unknown>[] | undefined) ?? [];
          const hs = sOut.find((o) => o.name === homeName);
          if (hs && typeof hs.point === "number") {
            spread = `${homeName} ${hs.point > 0 ? "+" : ""}${hs.point}`;
          }
        }
        if (!total && totals) {
          const tOut = (totals.outcomes as Record<string, unknown>[] | undefined) ?? [];
          if (tOut[0] && typeof tOut[0].point === "number") total = tOut[0].point;
        }
      }

      const avg = (arr: number[]) =>
        arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : undefined;
      const range = (arr: number[]) =>
        arr.length > 1 ? `${Math.min(...arr)} to ${Math.max(...arr)}` : undefined;

      // Detect line disagreement — big spread across books signals sharp action
      let lineMovementSignal: string | undefined;
      if (homeOddsAll.length > 2) {
        const spread2 = Math.max(...homeOddsAll) - Math.min(...homeOddsAll);
        if (spread2 >= 20) {
          lineMovementSignal = `⚡ ${spread2}-pt home line spread across ${homeOddsAll.length} books — possible sharp money`;
        }
      }

      return {
        homeTeam: homeName,
        awayTeam: awayName,
        homeOdds: avg(homeOddsAll),
        awayOdds: avg(awayOddsAll),
        drawOdds: avg(drawOddsAll),
        spread,
        total,
        homeOddsRange: range(homeOddsAll),
        awayOddsRange: range(awayOddsAll),
        drawOddsRange: range(drawOddsAll),
        lineMovementSignal,
        bookmakerCount: bookmakers.length,
        bookmakerBreakdown: bookmakerNames.length > 0
          ? `${bookmakerNames.length} books: ${bookmakerNames.slice(0, 5).join(", ")}${bookmakerNames.length > 5 ? "…" : ""}`
          : undefined,
        bestHomeDecimal: bestHomeDecimal > 0 ? Math.round(bestHomeDecimal * 100) / 100 : undefined,
        bestAwayDecimal: bestAwayDecimal > 0 ? Math.round(bestAwayDecimal * 100) / 100 : undefined,
        bestDrawDecimal: bestDrawDecimal > 0 ? Math.round(bestDrawDecimal * 100) / 100 : undefined,
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

// ─── WeatherAPI (match-day forecast) ──────────────────────────────────────────

async function fetchWeather(city: string, matchDate?: string): Promise<string | null> {
  if (!WEATHER_API_KEY || !city) return null;
  try {
    const url =
      `https://api.weatherapi.com/v1/forecast.json` +
      `?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)}&days=2&aqi=no&alerts=no`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return null;
    const data = (await resp.json()) as Record<string, unknown>;

    const forecast = data.forecast as Record<string, unknown> | undefined;
    const days = (forecast?.forecastday as Record<string, unknown>[]) ?? [];
    const matchDay = matchDate ? new Date(matchDate).toISOString().split("T")[0] : null;
    const dayForecast = (matchDay ? days.find((d) => d.date === matchDay) : null) ?? days[0];

    if (dayForecast) {
      const day = dayForecast.day as Record<string, unknown> | undefined;
      const cond = ((day?.condition as Record<string, unknown> | undefined)?.text as string) ?? "";
      const maxTempF = day?.maxtemp_f ?? "";
      const minTempF = day?.mintemp_f ?? "";
      const maxWindMph = day?.maxwind_mph ?? "";
      const rainChance = (day?.daily_chance_of_rain as number) ?? 0;
      const snowChance = (day?.daily_chance_of_snow as number) ?? 0;
      const humidity = day?.avghumidity ?? "";
      return [
        `${cond}, ${minTempF}–${maxTempF}°F`,
        `Wind max: ${maxWindMph}mph`,
        `Rain: ${rainChance}%${snowChance > 0 ? `, Snow: ${snowChance}%` : ""}`,
        humidity ? `Humidity: ${humidity}%` : null,
      ].filter(Boolean).join(", ");
    }

    // Fallback to current conditions
    const current = data.current as Record<string, unknown> | undefined;
    const cond = ((current?.condition as Record<string, unknown> | undefined)?.text as string) ?? "";
    const tempF = current?.temp_f ?? "";
    const windMph = current?.wind_mph ?? "";
    const precipIn = (current?.precip_in as number) ?? 0;
    return `${cond}, ${tempF}°F, Wind ${windMph}mph${precipIn > 0 ? `, Rain likely` : ""}`;
  } catch {
    return null;
  }
}

// ─── Accuracy matrix + calibration feedback loop ──────────────────────────────

interface CalibrationAdjustment {
  bucket: string;
  label: string;
  actualRate: number;
  predictedRate: number;
  adjustment: number;
  sampleSize: number;
}

interface CalibrationCache {
  bySport: Map<string, CalibrationAdjustment[]>;
  total: number;
  computedAt: number;
}

let calibrationCache: CalibrationCache | null = null;
const CALIBRATION_TTL_MS = 60 * 60 * 1000; // recompute every hour

function confTier(c: number): string {
  if (c >= 90) return "90-100%";
  if (c >= 75) return "75-89%";
  if (c >= 60) return "60-74%";
  return "<60%";
}

function humanLabel(key: string): string {
  return key
    .replace(/^[^:]+:/, "")        // strip sport prefix
    .replace("type:", "")
    .replace("tier:", "conf ")
    .replace("risk:", "risk=")
    .replace("dow:", "day=")
    .replace(/_/g, " ");
}

async function computeAccuracyCalibration(): Promise<CalibrationCache> {
  if (calibrationCache && Date.now() - calibrationCache.computedAt < CALIBRATION_TTL_MS) {
    return calibrationCache;
  }

  try {
    const settled = await db
      .select({
        sport: predictionsTable.sport,
        prediction: predictionsTable.prediction,
        confidence: predictionsTable.confidence,
        riskLevel: predictionsTable.riskLevel,
        result: predictionsTable.result,
        matchDate: predictionsTable.matchDate,
        avoidMatch: predictionsTable.avoidMatch,
      })
      .from(predictionsTable)
      .where(
        and(
          isNotNull(predictionsTable.result),
          ne(predictionsTable.result, "push"),
          eq(predictionsTable.avoidMatch, false),
        ),
      )
      .orderBy(desc(predictionsTable.createdAt))
      .limit(500);

    const total = settled.length;

    // Need at least 20 settled predictions before calibration is meaningful
    if (total < 20) {
      calibrationCache = { bySport: new Map(), total, computedAt: Date.now() };
      return calibrationCache;
    }

    type Bucket = { wins: number; losses: number; totalConf: number; count: number };
    const buckets = new Map<string, Bucket>();

    const add = (key: string, win: boolean, conf: number) => {
      const b = buckets.get(key) ?? { wins: 0, losses: 0, totalConf: 0, count: 0 };
      b.count++;
      b.totalConf += conf;
      if (win) b.wins++; else b.losses++;
      buckets.set(key, b);
    };

    for (const p of settled) {
      const win = p.result === "win";
      const conf = p.confidence;
      const tier = confTier(conf);
      const dow = new Date(p.matchDate).toLocaleDateString("en-US", { weekday: "long" });

      // Buckets: sport:tier, sport:type, sport:type:tier, sport:risk, cross-sport:dow
      add(`${p.sport}:tier:${tier}`, win, conf);
      add(`${p.sport}:type:${p.prediction}`, win, conf);
      add(`${p.sport}:type:${p.prediction}:tier:${tier}`, win, conf);
      add(`${p.sport}:risk:${p.riskLevel}`, win, conf);
      add(`all:dow:${dow}`, win, conf);
    }

    const MIN_SAMPLES = 5;
    const SIGNAL_THRESHOLD = 8; // only flag gaps >= 8 percentage points

    const bySport = new Map<string, CalibrationAdjustment[]>();

    for (const [key, b] of buckets.entries()) {
      if (b.count < MIN_SAMPLES) continue;
      const actualRate = Math.round((b.wins / (b.wins + b.losses)) * 100);
      const predictedRate = Math.round(b.totalConf / b.count);
      const adjustment = actualRate - predictedRate;
      if (Math.abs(adjustment) < SIGNAL_THRESHOLD) continue;

      const sport = key.startsWith("all:") ? "all" : key.split(":")[0];
      const adj: CalibrationAdjustment = {
        bucket: key,
        label: humanLabel(key),
        actualRate,
        predictedRate,
        adjustment,
        sampleSize: b.count,
      };
      const list = bySport.get(sport) ?? [];
      list.push(adj);
      bySport.set(sport, list);
    }

    // Sort each sport's adjustments by largest absolute gap first
    for (const [sport, list] of bySport.entries()) {
      bySport.set(sport, list.sort((a, b) => Math.abs(b.adjustment) - Math.abs(a.adjustment)));
    }

    calibrationCache = { bySport, total, computedAt: Date.now() };
    logger.info({ total, sportCount: bySport.size }, "Accuracy calibration computed");
    return calibrationCache;
  } catch (err) {
    logger.warn({ err }, "Accuracy calibration failed — skipping");
    calibrationCache = { bySport: new Map(), total: 0, computedAt: Date.now() };
    return calibrationCache;
  }
}

function buildCalibrationSection(sport: string, cache: CalibrationCache): string {
  if (cache.total < 20) return "";

  const sportAdj = cache.bySport.get(sport) ?? [];
  const crossAdj = cache.bySport.get("all") ?? [];
  const all = [...sportAdj.slice(0, 6), ...crossAdj.slice(0, 3)];

  if (all.length === 0) return "";

  const lines = [
    `MANDATORY CALIBRATION (from ${cache.total} real settled predictions):`,
    `These adjustments MUST be applied to your confidence scores before finalising:`,
    "",
  ];

  for (const adj of all) {
    const sign = adj.adjustment > 0 ? "+" : "";
    const arrow = adj.adjustment > 0 ? "↑ INCREASE" : "↓ DECREASE";
    lines.push(
      `• ${adj.label} [n=${adj.sampleSize}]: actual ${adj.actualRate}% vs model ${adj.predictedRate}% → ${arrow} confidence by ${sign}${adj.adjustment}%`,
    );
  }

  lines.push("");
  lines.push(
    `Example: if your base confidence for a home_win is 75% but historical data shows home_wins ` +
    `at that tier win only 62%, your FINAL confidence must be 75% + (62-75) = 62%.`,
  );

  return lines.join("\n");
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

  // Enrich games with form, standings, injuries, H2H, lineup, referee — all in parallel
  const enrichedGames = await enrichGames(games, espnSport, espnLeague, apiSportsBase);

  // Weather per game for outdoor sports
  const weatherByGame = new Map<string, string | null>();
  if (outdoor && WEATHER_API_KEY && enrichedGames.length > 0) {
    await Promise.all(
      enrichedGames.slice(0, 4).map(async (g) => {
        if (!g.city) return;
        const w = await fetchWeather(g.city, g.date);
        weatherByGame.set(`${g.homeTeam}|${g.awayTeam}`, w);
      }),
    );
  }

  // Build rich per-game context blocks
  const gameBlocks = enrichedGames.map((g) => {
    const weather = weatherByGame.get(`${g.homeTeam}|${g.awayTeam}`) ?? null;
    return formatEnrichedGameBlock(g, odds, weather);
  });

  // News: prefer NewsAPI (richer), fall back to ESPN
  const newsLines = newsHeadlines.length > 0 ? newsHeadlines : espnNews;
  const hasGames = gameBlocks.length > 0;

  // Accuracy calibration — fetch from real settled predictions (cached 1h)
  const calibration = await computeAccuracyCalibration();
  const calibrationSection = buildCalibrationSection(sport, calibration);

  const todayISO = new Date().toISOString().split("T")[0]; // e.g. "2026-05-25"

  const prompt = `You are PrediQs AI, the world's most accurate sports prediction engine.
You think like a professional sports analyst and sharp bettor combined.
You are analysing ${league} games.

TODAY'S DATE: ${todayISO}
DATA SOURCE: ${dataSource}
ODDS SOURCE: ${odds.length > 0 ? "The Odds API (live)" : "Not available"}
NEWS SOURCE: ${newsHeadlines.length > 0 ? "NewsAPI (real-time)" : espnNews.length > 0 ? "ESPN headlines" : "Not available"}
ENRICHMENT: form, standings, injuries, H2H, lineup, referee fetched from ESPN + API-Sports

${hasGames ? `TODAY'S GAMES WITH FULL CONTEXT:\n\n${gameBlocks.join("\n\n---\n\n")}` : `No ${league} games scheduled today.`}

${newsLines.length > 0 ? `LATEST INJURIES & NEWS:\n${newsLines.join("\n")}` : ""}

${getSportAnalysisPrompt(sport)}

UNIVERSAL CROSS-SPORT FACTORS (also apply):
- HEAD-TO-HEAD: Historical matchup record, who wins this fixture, average scoring
- MOTIVATION: What does each team need from this game? Season position, rivalry, must-win
- SHARP MONEY: Reverse line movement and bookmaker disagreement (from market intelligence section)

MODEL AGREEMENT RULE (mandatory — apply before setting any confidence):
High confidence (≥75%) requires ALL THREE signal types to agree on the same outcome:
  1. STATISTICAL: form (last 5+ games), H2H record, standings position, xG differential
  2. MARKET: odds direction, sharp money signal, line movement vs. public
  3. CONTEXTUAL: injuries, motivation, weather, schedule/fatigue, tactics

  All 3 agree → max confidence 90% (with other strong evidence)
  Only 2 agree → max confidence 74% (60-74% tier)
  Only 1 agrees → max confidence 64%, or set avoidMatch=true
  0 agree (conflicting signals) → avoidMatch=true, confidence stays in record only

${calibrationSection ? calibrationSection + "\n\n" : ""}CONFIDENCE CALIBRATION (apply AFTER any historical adjustments above):
90-100%: ALL factors align perfectly + strong historical evidence + market confirms (VERY rare, 1-2% of picks)
75-89%: Most factors clearly align + historical pattern + some bookmaker value (strongest daily picks)
60-74%: Enough factors favour this outcome to publish — flag any concerns in againstFactors
Below 60%: Mark avoidMatch = true, avoidReason = "Insufficient confidence — too much uncertainty across key factors", tierRequired = "elite". Do NOT set this as a normal pick. Still include the prediction field for record-keeping but the pick must NOT be shown to users.

TRAP GAME DETECTION — flag isTrapGame = true when:
- Heavy favourite playing minor away game before major cup match
- Team just won/lost a big emotional game
- Key player returning from injury (rust factor)
- Historically upset-prone fixture
- Suspicious line movement opposite to public expectation

EXPECTED VALUE (EV) BETTING FRAMEWORK — apply to every prediction:

Professional bettors profit through positive EV, not just win rate. Even at 55% win rate,
consistent +EV betting is mathematically profitable over 100+ bets.

FORMULA (mandatory):
  EV = (aiProbability/100 × bestDecimalOdds) - 1

  Example: AI says Arsenal 72% | Best odds 2.40 decimal
  EV = (0.72 × 2.40) - 1 = 0.728  →  +72.8% EV  →  STRONG value bet

CLASSIFICATION:
  EV > 0.10  (+10%): Strong value → valueDetected=true, recommendedStake="high"
  EV 0.05–0.10: Moderate value → valueDetected=true, recommendedStake="medium"
  EV 0.02–0.05: Marginal value → valueDetected=true, recommendedStake="low"
  EV < 0.02: No edge — bookmaker has the advantage → valueDetected=false

HOW TO USE THE BREAK-EVEN % in the EV ANALYSIS section above:
  If your aiProbability EXCEEDS the break-even% for that outcome → POSITIVE EV → value bet
  If your aiProbability is BELOW break-even% → NEGATIVE EV → no value

OUTPUT FIELDS:
  bookmakerProbability = break-even probability of best available odds (1/bestDecimal × 100)
  valuePercentage = EV × 100  (e.g. 0.15 EV → valuePercentage = 15)
  valueDetected = true only if EV ≥ 0.02
  bestMarket = describe which outcome has highest +EV (e.g. "home win at 2.40 (+28% EV)")

${
  hasGames
    ? "Analyse each real game using the live odds, injury news, and weather data. Generate a prediction for every listed game."
    : `Generate 2 realistic fictional ${league} predictions for demonstration purposes (note them as simulated in reasoning).`
}

Return a JSON array ONLY — no markdown, no prose, no commentary. Each element:
{
  "homeTeam": string,
  "awayTeam": string,
  "matchDate": ISO-8601 datetime string,
  "prediction": "home_win"|"away_win"|"draw"|"over"|"under",
  "confidence": integer 0-100,
  "riskLevel": "low"|"medium"|"high",
  "volatilityScore": number 1-10,
  "isTrapGame": boolean,
  "trapGameReason": string|null,
  "avoidMatch": boolean,
  "avoidReason": string|null,
  "reasoning": "3-4 detailed sentences referencing real odds, news, and key factors",
  "keyFactors": ["Factor 1 with specific data", "Factor 2", "Factor 3", "Factor 4", "Factor 5"],
  "againstFactors": ["Risk 1 that could cause upset", "Risk 2"],
  "weatherImpact": string|null,
  "injuryImpact": string|null,
  "sharpMoneySignal": string|null,
  "aiProbability": integer 0-100,
  "bookmakerProbability": integer 0-100,
  "valueDetected": boolean,
  "valuePercentage": number 0-50,
  "recommendedStake": "low"|"medium"|"high",
  "bestMarket": "string describing the best bet type for this game",
  "alternativeMarkets": ["other good bet types for this game"],
  "modelAgreement": {
    "statistical": "home_win"|"away_win"|"draw",
    "form": "home_win"|"away_win"|"draw",
    "market": "home_win"|"away_win"|"draw",
    "overallAgreement": boolean
  },
  "agentScores": {
    "injury": 0-100 (100=heavily favours prediction, 0=injury crisis hurts),
    "tactical": 0-100 (system matchup, press vs. low-block, etc.),
    "odds": 0-100 (bookmaker line confidence in this outcome),
    "sentiment": 0-100 (media/social sentiment score for home team),
    "referee": 0-100 (referee tendency favours outcome),
    "weather": 0-100 (100=weather neutral/favours, 0=severely disrupts),
    "form": 0-100 (recent form strongly supports prediction),
    "h2h": 0-100 (head-to-head record supports prediction)
  },
  "publicBacking": {
    "homePercent": 0-100 (estimated % of public bets on home win),
    "awayPercent": 0-100,
    "drawPercent": 0-100,
    "contrarian": boolean (true if our prediction goes against the public majority),
    "contrarianNote": string|null (e.g. "83% backing Arsenal but value favours Spurs")
  },
  "simulationData": {
    "scorelineProbabilities": [
      {"home": 0, "away": 0, "probability": 0-100},
      ...top 5-6 most likely scorelines
    ],
    "homeMean": expected home goals (e.g. 1.6),
    "awayMean": expected away goals (e.g. 1.1),
    "bttsProb": 0-100 (both teams to score probability),
    "over25Prob": 0-100 (over 2.5 goals probability)
  },
  "tierRequired": "free"|"pro"|"elite"
}

tierRequired rules:
- "free"  → public-knowledge picks or avoid picks
- "pro"   → moderate confidence 55-74 or notable value bets
- "elite" → high confidence ≥75 or sharp-money value detected`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
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

  return parsed.map((p) => {
    // Hard server-side confidence filter — below 60% always becomes an avoid pick
    const lowConfidence = p.confidence < 60;
    const avoidMatch = p.avoidMatch ?? lowConfidence;
    const avoidReason = avoidMatch
      ? (p.avoidReason ?? p.trapGameReason ?? (lowConfidence ? "Insufficient confidence — too much uncertainty across key factors" : null))
      : null;
    const tierRequired = avoidMatch ? "elite" : (p.tierRequired ?? "free");

    return {
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
      avoidMatch,
      avoidReason,
      reasoning: p.reasoning,
      keyFactors: [
        ...(p.keyFactors ?? []),
        ...(p.againstFactors?.map((f) => `⚠️ ${f}`) ?? []),
      ],
      weatherImpact: p.weatherImpact ?? null,
      sharpMoneySignal: [
        p.sharpMoneySignal,
        p.injuryImpact ? `Injury: ${p.injuryImpact}` : null,
        p.bestMarket ? `Best market: ${p.bestMarket}` : null,
        p.recommendedStake ? `Stake: ${p.recommendedStake}` : null,
      ].filter(Boolean).join(" | ") || null,
      aiProbability: p.aiProbability,
      bookmakerProbability: p.bookmakerProbability ?? 50,
      valueDetected: p.valueDetected ?? false,
      tierRequired,
      expiresAt,
      simulationData: p.simulationData?.scorelineProbabilities?.length
        ? {
            iterations: 1000,
            scorelineProbabilities: p.simulationData.scorelineProbabilities,
            homeMean: p.simulationData.homeMean ?? 0,
            awayMean: p.simulationData.awayMean ?? 0,
            bttsProb: p.simulationData.bttsProb ?? 0,
            over25Prob: p.simulationData.over25Prob ?? 0,
          }
        : undefined,
      agentScores: p.agentScores
        ? {
            injury: p.agentScores.injury ?? 50,
            tactical: p.agentScores.tactical ?? 50,
            odds: p.agentScores.odds ?? 50,
            sentiment: p.agentScores.sentiment ?? 50,
            referee: p.agentScores.referee ?? 50,
            weather: p.agentScores.weather ?? 50,
            form: p.agentScores.form ?? 50,
            h2h: p.agentScores.h2h ?? 50,
          }
        : undefined,
      publicBacking: p.publicBacking?.homePercent != null
        ? {
            homePercent: p.publicBacking.homePercent,
            awayPercent: p.publicBacking.awayPercent ?? 33,
            drawPercent: p.publicBacking.drawPercent ?? 34,
            contrarian: p.publicBacking.contrarian ?? false,
            contrarianNote: p.publicBacking.contrarianNote ?? null,
          }
        : undefined,
    };
  });
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
    againstFactors: ((p.keyFactors as string[]) ?? [])
      .filter((f) => f.startsWith("⚠️"))
      .map((f) => f.replace(/^⚠️\s*/, "")),
    weatherImpact: p.weatherImpact,
    sharpMoneySignal: p.sharpMoneySignal,
    aiProbability: p.aiProbability,
    bookmakerProbability: p.bookmakerProbability,
    valueDetected: p.valueDetected,
    tierRequired: p.tierRequired,
    simulationData: p.simulationData ?? null,
    agentScores: p.agentScores ?? null,
    publicBacking: p.publicBacking ?? null,
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
