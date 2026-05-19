import { anthropic } from "@workspace/integrations-anthropic-ai";
import { logger } from "../lib/logger";

const API_SPORTS_KEY = process.env.API_SPORTS_KEY;
const FOOTBALL_BASE = "https://v3.football.api-sports.io";

interface LeagueMeta {
  name: string;
  country: string;
  flag: string;
  tier: number;
}

const LEAGUES: Record<number, LeagueMeta> = {
  // TIER 1 — Elite European
  2: { name: "Champions League", country: "Europe", flag: "🏆", tier: 1 },
  3: { name: "Europa League", country: "Europe", flag: "🇪🇺", tier: 1 },
  848: { name: "Conference League", country: "Europe", flag: "🇪🇺", tier: 1 },
  39: { name: "Premier League", country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", tier: 1 },
  140: { name: "La Liga", country: "Spain", flag: "🇪🇸", tier: 1 },
  78: { name: "Bundesliga", country: "Germany", flag: "🇩🇪", tier: 1 },
  135: { name: "Serie A", country: "Italy", flag: "🇮🇹", tier: 1 },
  61: { name: "Ligue 1", country: "France", flag: "🇫🇷", tier: 1 },
  94: { name: "Primeira Liga", country: "Portugal", flag: "🇵🇹", tier: 1 },
  88: { name: "Eredivisie", country: "Netherlands", flag: "🇳🇱", tier: 1 },
  // TIER 2 — Major National
  40: { name: "Championship", country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", tier: 2 },
  79: { name: "2. Bundesliga", country: "Germany", flag: "🇩🇪", tier: 2 },
  136: { name: "Serie B", country: "Italy", flag: "🇮🇹", tier: 2 },
  141: { name: "Segunda División", country: "Spain", flag: "🇪🇸", tier: 2 },
  62: { name: "Ligue 2", country: "France", flag: "🇫🇷", tier: 2 },
  253: { name: "MLS", country: "USA", flag: "🇺🇸", tier: 2 },
  71: { name: "Brasileirao", country: "Brazil", flag: "🇧🇷", tier: 2 },
  72: { name: "Série B", country: "Brazil", flag: "🇧🇷", tier: 2 },
  128: { name: "Liga Profesional", country: "Argentina", flag: "🇦🇷", tier: 2 },
  235: { name: "Russian Premier", country: "Russia", flag: "🇷🇺", tier: 2 },
  144: { name: "Pro League", country: "Belgium", flag: "🇧🇪", tier: 2 },
  179: { name: "Scottish Premiership", country: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", tier: 2 },
  203: { name: "Super League", country: "Greece", flag: "🇬🇷", tier: 2 },
  207: { name: "Super League", country: "Switzerland", flag: "🇨🇭", tier: 2 },
  119: { name: "Superliga", country: "Denmark", flag: "🇩🇰", tier: 2 },
  113: { name: "Allsvenskan", country: "Sweden", flag: "🇸🇪", tier: 2 },
  103: { name: "Eliteserien", country: "Norway", flag: "🇳🇴", tier: 2 },
  106: { name: "Veikkausliiga", country: "Finland", flag: "🇫🇮", tier: 2 },
  169: { name: "Süper Lig", country: "Turkey", flag: "🇹🇷", tier: 2 },
  // TIER 3 — African
  12: { name: "CAF Champions League", country: "Africa", flag: "🌍", tier: 3 },
  13: { name: "CAF Confederation Cup", country: "Africa", flag: "🌍", tier: 3 },
  6: { name: "AFCON", country: "Africa", flag: "🌍", tier: 3 },
  233: { name: "NPFL", country: "Nigeria", flag: "🇳🇬", tier: 3 },
  202: { name: "Egyptian Premier League", country: "Egypt", flag: "🇪🇬", tier: 3 },
  288: { name: "PSL", country: "South Africa", flag: "🇿🇦", tier: 3 },
  301: { name: "Kenya Premier League", country: "Kenya", flag: "🇰🇪", tier: 3 },
  299: { name: "Ghana Premier League", country: "Ghana", flag: "🇬🇭", tier: 3 },
  // TIER 4 — Asian
  292: { name: "K League 1", country: "South Korea", flag: "🇰🇷", tier: 4 },
  98: { name: "J1 League", country: "Japan", flag: "🇯🇵", tier: 4 },
  323: { name: "Indian Super League", country: "India", flag: "🇮🇳", tier: 4 },
  307: { name: "Saudi Pro League", country: "Saudi Arabia", flag: "🇸🇦", tier: 4 },
  197: { name: "UAE Pro League", country: "UAE", flag: "🇦🇪", tier: 4 },
  // TIER 5 — Cups & Tournaments
  45: { name: "FA Cup", country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", tier: 5 },
  48: { name: "EFL Cup", country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", tier: 5 },
  143: { name: "Copa del Rey", country: "Spain", flag: "🇪🇸", tier: 5 },
  137: { name: "Coppa Italia", country: "Italy", flag: "🇮🇹", tier: 5 },
  66: { name: "Coupe de France", country: "France", flag: "🇫🇷", tier: 5 },
  81: { name: "DFB Pokal", country: "Germany", flag: "🇩🇪", tier: 5 },
  1: { name: "FIFA World Cup", country: "World", flag: "🌍", tier: 5 },
  31: { name: "World Cup Qualifiers", country: "World", flag: "🌍", tier: 5 },
  4: { name: "Euro Championship", country: "Europe", flag: "🇪🇺", tier: 5 },
  5: { name: "UEFA Nations League", country: "Europe", flag: "🇪🇺", tier: 5 },
  9: { name: "Copa América", country: "Americas", flag: "🌎", tier: 5 },
  29: { name: "AFCON Qualifiers", country: "Africa", flag: "🌍", tier: 5 },
};

export interface SoccerFixture {
  id: number;
  leagueId: number;
  leagueName: string;
  leagueCountry: string;
  leagueFlag: string;
  leagueLogo: string;
  leagueTier: number;
  homeTeam: string;
  homeLogo: string;
  awayTeam: string;
  awayLogo: string;
  kickoff: string;
  statusShort: string;
  statusLong: string;
  elapsed: number | null;
  homeScore: number | null;
  awayScore: number | null;
  confidence: number;
  prediction: "home_win" | "away_win" | "draw";
  riskLevel: "low" | "medium" | "high";
  valueDetected: boolean;
}

export interface SoccerLeagueGroup {
  leagueId: number;
  leagueName: string;
  leagueCountry: string;
  leagueFlag: string;
  leagueLogo: string;
  leagueTier: number;
  fixtures: SoccerFixture[];
}

export interface SoccerFeedResponse {
  fixtures: SoccerFixture[];
  leagueGroups: SoccerLeagueGroup[];
  featuredMatch: SoccerFixture | null;
  lastUpdated: string;
  totalCount: number;
  liveCount: number;
  hasApiKey: boolean;
}

// ─── In-memory caches ─────────────────────────────────────────────────────────

const cache: {
  fixtures?: { data: SoccerFixture[]; expiresAt: number };
  live?: { data: SoccerFixture[]; expiresAt: number };
} = {};

const predCache: {
  predictions?: Map<number, ClaudePrediction>;
  expiresAt?: number;
} = {};

const FIXTURE_TTL = 30 * 60 * 1000;
const LIVE_TTL = 60 * 1000;
const PRED_TTL = 30 * 60 * 1000;

const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);

// ─── Derived prediction helpers (fallback) ────────────────────────────────────

function deriveConfidence(fixtureId: number, tier: number): number {
  const hash = Math.abs((fixtureId * 2654435769) % 100);
  const base = tier === 1 ? 62 : tier === 2 ? 56 : 50;
  const range = tier === 1 ? 22 : tier === 2 ? 16 : 12;
  return Math.min(90, Math.max(45, base + (hash % range)));
}

function derivePrediction(fixtureId: number): "home_win" | "away_win" | "draw" {
  const h = Math.abs(fixtureId % 10);
  if (h <= 4) return "home_win";
  if (h <= 7) return "away_win";
  return "draw";
}

function deriveRisk(confidence: number): "low" | "medium" | "high" {
  if (confidence >= 72) return "low";
  if (confidence >= 57) return "medium";
  return "high";
}

// ─── Claude batch predictions ─────────────────────────────────────────────────

interface ClaudePrediction {
  prediction: "home_win" | "away_win" | "draw";
  confidence: number;
  riskLevel: "low" | "medium" | "high";
  valueDetected: boolean;
}

async function batchSoccerPredictions(fixtures: SoccerFixture[]): Promise<Map<number, ClaudePrediction>> {
  const now = Date.now();
  if (predCache.predictions && predCache.expiresAt && predCache.expiresAt > now) {
    return predCache.predictions;
  }

  const top = fixtures
    .filter((f) => f.leagueTier <= 2)
    .sort((a, b) => a.leagueTier - b.leagueTier || new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
    .slice(0, 18);

  if (top.length === 0) return new Map();

  const gameLines = top
    .map((f) => `[ID:${f.id}] ${f.leagueFlag} ${f.leagueName}: ${f.homeTeam} vs ${f.awayTeam}`)
    .join("\n");

  const prompt = `You are an expert soccer betting analyst. Predict outcomes for today's fixtures.

FIXTURES:
${gameLines}

Return ONLY a JSON array — no markdown, no prose. Each object:
{
  "fixtureId": <number from ID:X>,
  "prediction": "home_win"|"away_win"|"draw",
  "confidence": <integer 45-88>,
  "riskLevel": "low"|"medium"|"high",
  "valueDetected": <boolean>
}

Apply standard football analysis:
- Home teams win ~52% in top leagues, draws ~24%, away wins ~24%
- UCL/UEL have higher draw rates due to tactical caution
- High confidence (70%+) = clear form advantage + historical h2h edge
- valueDetected = true when your implied probability meaningfully exceeds typical bookmaker prices
Return predictions for all ${top.length} listed fixtures.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "[]";
    const jsonStr = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    const parsed = JSON.parse(jsonStr) as Array<{
      fixtureId: number;
      prediction: "home_win" | "away_win" | "draw";
      confidence: number;
      riskLevel: "low" | "medium" | "high";
      valueDetected: boolean;
    }>;

    const map = new Map<number, ClaudePrediction>();
    for (const p of parsed) {
      if (p.fixtureId && p.prediction) {
        map.set(p.fixtureId, {
          prediction: p.prediction,
          confidence: Math.min(90, Math.max(45, p.confidence)),
          riskLevel: p.riskLevel ?? deriveRisk(p.confidence),
          valueDetected: p.valueDetected ?? false,
        });
      }
    }

    predCache.predictions = map;
    predCache.expiresAt = now + PRED_TTL;
    logger.info({ count: map.size, total: top.length }, "Claude soccer batch predictions cached");
    return map;
  } catch (err) {
    logger.warn({ err }, "Claude batch soccer predictions failed — falling back to derived");
    return new Map();
  }
}

// ─── Fixture parsing ──────────────────────────────────────────────────────────

function parseFixture(raw: Record<string, unknown>): SoccerFixture | null {
  const fixture = raw.fixture as Record<string, unknown> | undefined;
  const league = raw.league as Record<string, unknown> | undefined;
  const teams = raw.teams as Record<string, unknown> | undefined;
  const goals = raw.goals as Record<string, unknown> | undefined;
  if (!fixture || !league || !teams) return null;

  const leagueId = league.id as number;
  const meta = LEAGUES[leagueId];
  if (!meta) return null;

  const fixtureId = fixture.id as number;
  const status = fixture.status as Record<string, unknown> | undefined;
  const home = teams.home as Record<string, unknown> | undefined;
  const away = teams.away as Record<string, unknown> | undefined;
  const conf = deriveConfidence(fixtureId, meta.tier);

  return {
    id: fixtureId,
    leagueId,
    leagueName: meta.name,
    leagueCountry: meta.country,
    leagueFlag: meta.flag,
    leagueLogo: (league.logo as string) ?? "",
    leagueTier: meta.tier,
    homeTeam: (home?.name as string) ?? "Home",
    homeLogo: (home?.logo as string) ?? "",
    awayTeam: (away?.name as string) ?? "Away",
    awayLogo: (away?.logo as string) ?? "",
    kickoff: (fixture.date as string) ?? new Date().toISOString(),
    statusShort: (status?.short as string) ?? "NS",
    statusLong: (status?.long as string) ?? "Not Started",
    elapsed: (status?.elapsed as number | null) ?? null,
    homeScore: (goals?.home as number | null) ?? null,
    awayScore: (goals?.away as number | null) ?? null,
    confidence: conf,
    prediction: derivePrediction(fixtureId),
    riskLevel: deriveRisk(conf),
    valueDetected: conf >= 72,
  };
}

// ─── Sorting / grouping ───────────────────────────────────────────────────────

function sortByKickoff(a: SoccerFixture, b: SoccerFixture) {
  return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
}

function buildGroups(fixtures: SoccerFixture[]): SoccerLeagueGroup[] {
  const map = new Map<number, SoccerLeagueGroup>();
  for (const f of fixtures) {
    if (!map.has(f.leagueId)) {
      map.set(f.leagueId, {
        leagueId: f.leagueId,
        leagueName: f.leagueName,
        leagueCountry: f.leagueCountry,
        leagueFlag: f.leagueFlag,
        leagueLogo: f.leagueLogo,
        leagueTier: f.leagueTier,
        fixtures: [],
      });
    }
    map.get(f.leagueId)!.fixtures.push(f);
  }
  const groups = Array.from(map.values());
  groups.sort((a, b) => {
    if (a.leagueTier !== b.leagueTier) return a.leagueTier - b.leagueTier;
    if (a.leagueId === 2) return -1;
    if (b.leagueId === 2) return 1;
    return a.leagueName.localeCompare(b.leagueName);
  });
  return groups;
}

// ─── API fetch ────────────────────────────────────────────────────────────────

async function fetchFromApi(params: string): Promise<SoccerFixture[]> {
  if (!API_SPORTS_KEY) return [];
  const url = `${FOOTBALL_BASE}/fixtures?${params}`;
  const resp = await fetch(url, {
    headers: { "x-apisports-key": API_SPORTS_KEY },
    signal: AbortSignal.timeout(12000),
  });
  if (!resp.ok) {
    logger.warn({ status: resp.status, params }, "API-Sports football non-OK");
    return [];
  }
  const data = (await resp.json()) as { response?: unknown[] };
  const items = (data.response ?? []) as Record<string, unknown>[];
  const parsed = items.map(parseFixture).filter((f): f is SoccerFixture => f !== null);
  parsed.sort(sortByKickoff);
  return parsed;
}

// ─── Response builder ─────────────────────────────────────────────────────────

function buildResponse(fixtures: SoccerFixture[], lastUpdated: Date): SoccerFeedResponse {
  const leagueGroups = buildGroups(fixtures);
  const liveCount = fixtures.filter((f) => LIVE_STATUSES.has(f.statusShort)).length;

  const featuredMatch =
    fixtures.find((f) => LIVE_STATUSES.has(f.statusShort) && f.leagueTier === 1) ??
    fixtures.find((f) => f.leagueTier === 1) ??
    fixtures[0] ??
    null;

  return {
    fixtures,
    leagueGroups,
    featuredMatch,
    lastUpdated: lastUpdated.toISOString(),
    totalCount: fixtures.length,
    liveCount,
    hasApiKey: Boolean(API_SPORTS_KEY),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getTodaysFixtures(): Promise<SoccerFeedResponse> {
  const now = Date.now();
  if (cache.fixtures && cache.fixtures.expiresAt > now) {
    return buildResponse(cache.fixtures.data, new Date(cache.fixtures.expiresAt - FIXTURE_TTL));
  }

  const today = new Date().toISOString().split("T")[0];
  const fixtures = await fetchFromApi(`date=${today}`);

  // Enhance tier 1-2 fixtures with Claude AI predictions (30-min cache)
  if (fixtures.length > 0) {
    try {
      const claudePreds = await batchSoccerPredictions(fixtures);
      for (const f of fixtures) {
        const cp = claudePreds.get(f.id);
        if (cp) {
          f.prediction = cp.prediction;
          f.confidence = cp.confidence;
          f.riskLevel = cp.riskLevel;
          f.valueDetected = cp.valueDetected;
        }
      }
    } catch (err) {
      logger.warn({ err }, "Failed to apply Claude soccer predictions");
    }
  }

  cache.fixtures = { data: fixtures, expiresAt: now + FIXTURE_TTL };

  logger.info(
    { count: fixtures.length, leagues: new Set(fixtures.map((f) => f.leagueId)).size },
    "Soccer fixtures fetched, Claude-enhanced, and cached",
  );

  return buildResponse(fixtures, new Date());
}

export async function getLiveFixtures(): Promise<SoccerFixture[]> {
  const now = Date.now();
  if (cache.live && cache.live.expiresAt > now) return cache.live.data;

  const live = await fetchFromApi("live=all");
  const filtered = live.filter((f) => LIVE_STATUSES.has(f.statusShort));
  cache.live = { data: filtered, expiresAt: now + LIVE_TTL };
  return filtered;
}
