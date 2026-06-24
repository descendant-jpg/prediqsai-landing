import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "prediqs_auth_token";

/**
 * Globally-selected language code, sent as `Accept-Language` on every request.
 * Updated by LanguageContext whenever the user changes language.
 *
 * BACKEND TODO — the API server does not yet honour this header. To return
 * localized dynamic data (articles, quizzes, AI picks, prediction reasoning),
 * the backend needs to:
 *   1. Read `req.headers["accept-language"]` (or a `?lang=` query param) in a
 *      middleware and attach a normalized locale to the request.
 *   2. Pass that locale to the prediction engine / Claude prompt so AI text is
 *      generated in the requested language.
 *   3. Localize or translate stored content (articles, quizzes) per locale,
 *      falling back to English when a translation is missing.
 * Until then, requests carry the header but responses remain English.
 */
let currentLanguage = "en";

/** Set the language code appended to outbound requests (called by LanguageContext). */
export function setApiLanguage(code: string): void {
  currentLanguage = code;
}

const EXPERIENCE_KEY = "@betting_experience";

/**
 * User's self-reported betting experience level (Beginner | Intermediate |
 * Advanced | Professional), sent as the `X-User-Experience` header on every
 * request. Kept in sync by AppContext, and hydrated once from AsyncStorage at
 * module load so even the very first cold-start request carries it.
 *
 * BACKEND TODO — the AI/prediction layer must read `req.headers["x-user-experience"]`
 * and DYNAMICALLY ADJUST THE SYSTEM PROMPT (Claude/OpenAI) based on its value:
 *   - "Beginner":     explain odds and value in plain language, avoid jargon,
 *                     define terms, keep stake guidance conservative.
 *   - "Intermediate": balanced tone with brief reasoning.
 *   - "Advanced":     include strategy, edge and bankroll context.
 *   - "Professional": provide advanced statistical breakdowns (EV, implied
 *                     probability, market movement) and skip basic explanations.
 * Fall back to "Beginner" when the header is missing or unrecognized.
 */
let currentExperience = "Beginner";

/** Set the betting-experience level sent on outbound requests (called by AppContext). */
export function setApiExperience(level: string): void {
  currentExperience = level;
}

/** Current betting-experience level (for non-apiFetch callers, e.g. the chat stream). */
export function getApiExperience(): string {
  return currentExperience;
}

// Hydrate from AsyncStorage once at startup so the first request is correct.
AsyncStorage.getItem(EXPERIENCE_KEY)
  .then((v) => {
    if (v) currentExperience = v;
  })
  .catch(() => {});

export function getApiBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "";
}

export function chatUrl(): string {
  return `${getApiBaseUrl()}/api/chat`;
}

export const tokenStorage = {
  async get(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async set(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },
  async remove(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
};

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...rest } = options;
  const url = `${getApiBaseUrl()}/api${path}`;
  const response = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": currentLanguage,
      "X-User-Experience": currentExperience,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(rest.headers ?? {}),
    },
  });
  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const err = (await response.json()) as { error?: string };
      msg = err.error ?? msg;
    } catch {}
    throw new Error(msg);
  }
  return response.json() as Promise<T>;
}

export interface UserData {
  id: number;
  username: string;
  email: string;
  tier: "free" | "premium";
  bankroll: number;
  dailyLossLimit: number;
  isAdmin?: boolean;
}

export interface AdminUser {
  id: number;
  email: string;
  username: string;
  tier: string;
  effectiveTier: string;
  bankroll: number;
  dailyLossLimit: number;
  isAdmin: boolean | null;
  isBanned: boolean | null;
  isSuspended: boolean | null;
  manualTierOverride: string | null;
  freeTrialUntil: string | null;
  createdAt: string;
  iapPlatform: string | null;
  iapTransactionId: string | null;
  iapExpiresAt: string | null;
}

export interface AdminStats {
  totalUsers: number;
  todaySignups: number;
  tierBreakdown: { free: number; premium: number };
  banned: number;
  suspended: number;
}

export interface AdminLogEntry {
  id: string;
  adminEmail: string | null;
  action: string | null;
  targetUserId: number | null;
  details: string | null;
  createdAt: string | null;
}

export interface AffiliatePartner {
  id: string;
  bookName: string;
  logo: string | null;
  affiliateUrl: string;
  bonusText: string | null;
  commissionType: string | null;
  commissionAmount: number | null;
  commissionCurrency: string | null;
  isActive: boolean | null;
  regions: string[] | null;
}

export interface ApiKeyStatus {
  name: string;
  label: string;
  category: string;
  configured: boolean;
  masked: string;
  source: "database" | "env" | "none";
  updatedAt: string | null;
}

export interface ApiKeyTestResult {
  keyName: string;
  ok: boolean;
  responseTime: number;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface ApiPrediction {
  id: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  prediction: string;
  confidence: number;
  riskLevel: string;
  volatilityScore: number;
  isTrapGame: boolean;
  avoidMatch: boolean;
  avoidReason: string | null;
  reasoning: string;
  keyFactors: string[];
  againstFactors: string[];
  weatherImpact: string | null;
  sharpMoneySignal: string | null;
  aiProbability: number;
  bookmakerProbability: number;
  valueDetected: boolean;
  tierRequired: string;
  simulationData: SimulationData | null;
  agentScores: AgentScores | null;
  publicBacking: PublicBacking | null;
}

export interface AccuracyStats {
  accuracy: number | null;
  wins: number;
  losses: number;
  total: number;
  bySport: Record<string, { accuracy: number; wins: number; total: number }>;
  month: string;
}

export interface SimulationScoreline {
  home: number;
  away: number;
  probability: number;
}

export interface SimulationData {
  iterations: number;
  scorelineProbabilities: SimulationScoreline[];
  homeMean: number;
  awayMean: number;
  bttsProb: number;
  over25Prob: number;
}

export interface AgentScores {
  injury: number;
  tactical: number;
  odds: number;
  sentiment: number;
  referee: number;
  weather: number;
  form: number;
  h2h: number;
}

export interface PublicBacking {
  homePercent: number;
  awayPercent: number;
  drawPercent: number;
  contrarian: boolean;
  contrarianNote: string | null;
}

export interface CoachAlert {
  type: "danger" | "warning" | "info" | "positive";
  icon: string;
  title: string;
  message: string;
  action: string;
}

export interface CoachData {
  alerts: CoachAlert[];
  summary: {
    todayLosses: number;
    todayWins: number;
    todayNet: number;
    lossRatio: number;
    recentLossStreak: number;
    bankroll: number;
    dailyLossLimit: number;
    riskProfile: string;
  };
}

export interface LeaderboardEntry {
  id: number;
  userId: number;
  displayName: string;
  wins: number;
  losses: number;
  winRate: number;
  roi: number;
  totalPicks: number;
  streak: number;
  badge: string | null;
  isVerified: boolean;
  updatedAt: string;
}

export interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  myEntry: LeaderboardEntry | null;
  optedIn: boolean;
}

export interface ApiBankrollEntry {
  id: number;
  userId: number;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface BankrollData {
  bankroll: number;
  dailyLossLimit: number;
  entries: ApiBankrollEntry[];
}

export interface SetupVar {
  key: string;
  label: string;
  configured: boolean;
  critical: boolean;
  description: string;
  affectsFeatures: string;
  howToGet: string;
  signupUrl: string | null;
  hasFree: boolean;
  steps: string[];
}

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

export interface AllSportsResponse {
  soccer: SoccerFeedResponse;
  nba: NBAGame[];
  nfl: NFLGame[];
  mlb: MLBGame[];
  hasApiKey: boolean;
  fetchedAt: string;
}

export interface SlipAnalysisResult {
  analysis: unknown;
}

export interface TeamFormResult {
  result: "W" | "D" | "L";
  opponent: string;
  score: string;
  isHome: boolean;
}

export interface H2HResult {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}

export interface StandingRow {
  rank: number;
  team: string;
  logo: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goalDiff: number;
  form: string;
}

export interface MatchDetailData {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  homeId: number;
  awayId: number;
  leagueId: number;
  homeForm: TeamFormResult[];
  awayForm: TeamFormResult[];
  h2h: H2HResult[];
  standings: StandingRow[];
  homeStandingRank: number | null;
  awayStandingRank: number | null;
}

export interface PerformanceData {
  winRate: number;
  roi: number;
  totalBets: number;
  netPnl: number;
  totalWon: number;
  totalLost: number;
  sportStats: Record<string, { picks: number; avgConfidence: number; valueCount: number }>;
  predictionCount: number;
  avgConfidence: number;
  confidenceTiers: {
    high: { count: number; label: string };
    medium: { count: number; label: string };
    low: { count: number; label: string };
  };
}

export type ArbRegion = "global" | "us" | "uk" | "africa" | "asia";

export interface EVBet {
  id: string;
  sport: string;
  sportKey: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  bookmaker: string;
  bookmakerId: string;
  selection: string;
  odds: number;
  sharpOdds: number;
  evPercent: number;
  impliedEdge: number;
  discoveredAt: string;
  region?: ArbRegion;
}

export interface MiddleOpportunity {
  id: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  book1: { bookmaker: string; bookmakerId: string; selection: string; spread: number; odds: number };
  book2: { bookmaker: string; bookmakerId: string; selection: string; spread: number; odds: number };
  window: number;
  hitProbability: number;
  worstCase: number;
  region?: ArbRegion;
  discoveredAt: string;
}

export interface EVScanResponse {
  bets: EVBet[];
  totalFound: number;
  lastScanned: string;
  region?: ArbRegion;
  disclaimer?: string;
}

export interface MiddlesScanResponse {
  middles: MiddleOpportunity[];
  totalFound: number;
  lastScanned: string;
  region?: ArbRegion;
  disclaimer?: string;
}

// ─── World Cup types ──────────────────────────────────────────────────────────

export interface WCCountdown {
  days: number; hours: number; minutes: number; seconds: number;
  started: boolean; label: string; totalMs: number;
}

export interface WCPrediction {
  homeWinPct: number; drawPct: number; awayWinPct: number;
  prediction: "home_win" | "draw" | "away_win";
  confidence: number; reasoning: string; keyFactors: string[];
}

export interface WCFixture {
  id: number; date: string;
  homeTeam: string; awayTeam: string;
  homeLogo: string; awayLogo: string;
  venue: string; city: string;
  homeScore: number | null; awayScore: number | null;
  status: string; round: string; group?: string;
  prediction?: WCPrediction;
}

export interface WCAfricanTeam {
  team: string; flag: string; qualifyPct: number; fifaRank: number;
  group: string; note: string; valueBet?: string;
}

export interface WCOverview {
  countdown: WCCountdown;
  winnerOdds: Array<{ team: string; flag: string; pct: number; color: string }>;
  africanTeams: WCAfricanTeam[];
  demoArb: {
    id: string; sport: string; league: string;
    homeTeam: string; awayTeam: string; commenceTime: string;
    profitPercent: number;
    legs: ArbLeg[];
    localStakes: Record<string, { currency: string; symbol: string; leg1: number; leg2: number; profit: number }>;
  };
}

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

export interface ArbScanResponse {
  opportunities: ArbOpportunity[];
  totalFound: number;
  lastScanned: string;
  hasApiKey: boolean;
  tier: string;
  effectiveTier?: string;
  region?: ArbRegion;
  disclaimer?: string;
}

// ─── Football-Data types ──────────────────────────────────────────────────────

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

export interface ArbCalcResult {
  arb: ArbOpportunity;
  stakes: Array<{ selection: string; bookmaker: string; stake: number; returns: number }>;
  guaranteedReturn: number;
  guaranteedProfit: number;
  profitPercent: number;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiFetch<{ token: string; user: UserData }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (username: string, email: string, password: string) =>
      apiFetch<{ token: string; user: UserData }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      }),
    changePassword: (token: string, currentPassword: string, newPassword: string) =>
      apiFetch<{ ok: boolean }>("/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
        token,
      }),
  },
  user: {
    me: (token: string) => apiFetch<UserData>("/user/me", { token }),
    update: (
      token: string,
      data: Partial<Pick<UserData, "username" | "dailyLossLimit" | "bankroll">>,
    ) =>
      apiFetch<UserData>("/user/me", {
        method: "PUT",
        body: JSON.stringify(data),
        token,
      }),
    performance: (token: string) =>
      apiFetch<PerformanceData>("/user/performance", { token }),
  },
  predictions: {
    list: (token: string) => apiFetch<ApiPrediction[]>("/predictions", { token }),
    refresh: (token: string) =>
      apiFetch<{ count: number }>("/predictions/refresh", {
        method: "POST",
        token,
      }),
    accuracy: (token: string) => apiFetch<AccuracyStats>("/predictions/accuracy", { token }),
  },
  sports: {
    today: (token: string) => apiFetch<AllSportsResponse>("/sports/today", { token }),
    tomorrow: (token: string) => apiFetch<AllSportsResponse>("/sports/tomorrow", { token }),
  },
  soccer: {
    fixtures: (token: string) =>
      apiFetch<SoccerFeedResponse>("/soccer/fixtures", { token }),
    live: (token: string) =>
      apiFetch<SoccerFixture[]>("/soccer/live", { token }),
    fixtureDetail: (token: string, fixtureId: number) =>
      apiFetch<MatchDetailData>(`/soccer/fixture/${fixtureId}/detail`, { token }),
    preview: (
      token: string,
      body: {
        homeTeam: string;
        awayTeam: string;
        league: string;
        sport: string;
        prediction: string;
        keyFactors: string[];
        reasoning: string;
        confidence: number;
      },
    ) =>
      apiFetch<{ preview: string }>("/soccer/preview", {
        method: "POST",
        body: JSON.stringify(body),
        token,
      }),
  },
  slip: {
    analyze: (
      token: string,
      payload: { imageBase64?: string; mediaType?: string; textInput?: string },
    ) =>
      apiFetch<SlipAnalysisResult>("/slip/analyze", {
        method: "POST",
        body: JSON.stringify(payload),
        token,
      }),
  },
  bankroll: {
    get: (token: string) => apiFetch<BankrollData>("/bankroll", { token }),
    addEntry: (
      token: string,
      entry: { type: string; amount: number; description?: string },
    ) =>
      apiFetch<{ entry: ApiBankrollEntry; newBankroll: number }>(
        "/bankroll/entry",
        { method: "POST", body: JSON.stringify(entry), token },
      ),
  },
  coach: {
    get: (token: string) => apiFetch<CoachData>("/coach", { token }),
    setProfile: (token: string, riskProfile: "conservative" | "balanced" | "aggressive") =>
      apiFetch<{ riskProfile: string }>("/coach/profile", {
        method: "PUT",
        body: JSON.stringify({ riskProfile }),
        token,
      }),
  },
  leaderboard: {
    get: (token: string) => apiFetch<LeaderboardData>("/leaderboard", { token }),
    optIn: (token: string) => apiFetch<{ message: string }>("/leaderboard/optin", { method: "POST", token }),
    optOut: (token: string) => apiFetch<{ message: string }>("/leaderboard/optout", { method: "POST", token }),
  },
  setup: {
    status: (token: string) =>
      apiFetch<{
        allCriticalOk: boolean;
        configuredCount: number;
        totalCount: number;
        critical: SetupVar[];
        optional: SetupVar[];
      }>("/setup/status", { token }),
  },
  subscription: {
    status: (token: string) =>
      apiFetch<{ tier: string }>("/subscription/status", { token }),
    setTier: (token: string, tier: "free" | "premium") =>
      apiFetch<{ tier: string }>("/subscription/tier", {
        method: "PUT",
        body: JSON.stringify({ tier }),
        token,
      }),
    verifyIAPPurchase: (
      token: string,
      data: {
        platform: "ios" | "android";
        productId: string;
        transactionId: string;
        purchaseToken?: string;
        transactionReceipt?: string;
      },
    ) =>
      apiFetch<{ tier: string; success: boolean; expiresAt: string }>(
        "/subscription/iap/verify",
        { method: "POST", body: JSON.stringify(data), token },
      ),
    restoreIAPPurchases: (
      token: string,
      data: {
        platform: "ios" | "android";
        purchases: Array<{ productId: string; transactionId: string; purchaseToken?: string }>;
      },
    ) =>
      apiFetch<{ tier: string; restored: boolean }>(
        "/subscription/iap/restore",
        { method: "POST", body: JSON.stringify(data), token },
      ),
  },
  arbitrage: {
    list: (token: string, region?: ArbRegion) =>
      apiFetch<ArbScanResponse>(`/arbitrage${region ? `?region=${region}` : ""}`, { token }),
    scan: (token: string, region?: ArbRegion) =>
      apiFetch<ArbScanResponse>("/arbitrage/scan", {
        method: "POST",
        body: JSON.stringify({ region }),
        token,
      }),
    calculate: (token: string, arbId: string, budget: number, region?: ArbRegion) =>
      apiFetch<ArbCalcResult>("/arbitrage/calculate", {
        method: "POST",
        body: JSON.stringify({ arbId, budget, region }),
        token,
      }),
    rates: () =>
      apiFetch<{ rates: Record<string, number>; base: string; source: string; updatedAt: string }>("/arbitrage/rates"),
    ev: (token: string, region?: ArbRegion, refresh?: boolean) =>
      apiFetch<EVScanResponse>(`/arbitrage/ev${region ? `?region=${region}` : ""}${refresh ? `${region ? "&" : "?"}refresh=true` : ""}`, { token }),
    middles: (token: string, region?: ArbRegion, refresh?: boolean) =>
      apiFetch<MiddlesScanResponse>(`/arbitrage/middles${region ? `?region=${region}` : ""}${refresh ? `${region ? "&" : "?"}refresh=true` : ""}`, { token }),
  },
  worldcup: {
    overview: () =>
      apiFetch<WCOverview>("/worldcup/overview"),
    fixtures: (token: string) =>
      apiFetch<{ fixtures: WCFixture[]; total: number }>("/worldcup/fixtures", { token }),
    predict: (token: string, homeTeam: string, awayTeam: string) =>
      apiFetch<WCPrediction>("/worldcup/predict", {
        method: "POST",
        body: JSON.stringify({ homeTeam, awayTeam }),
        token,
      }),
    africanTeams: (token: string) =>
      apiFetch<{ teams: WCAfricanTeam[] }>("/worldcup/african-teams", { token }),
  },
  footballData: {
    status: () =>
      apiFetch<{ configured: boolean }>("/football-data/status"),
    wcMatches: (token: string) =>
      apiFetch<{ matches: FDWCMatch[] }>("/football-data/wc-matches", { token }),
    h2h: (
      token: string,
      params: { homeTeam: string; awayTeam: string; league: string; matchDate: string },
    ) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return apiFetch<FDH2HSummary>(`/football-data/h2h?${qs}`, { token });
    },
    standings: (token: string, code: string) =>
      apiFetch<{ standings: FDStandingRow[] }>(`/football-data/standings/${code}`, { token }),
    team: (token: string, teamId: number) =>
      apiFetch<FDTeamInfo>(`/football-data/team/${teamId}`, { token }),
  },
  affiliate: {
    partners: (region?: string) => {
      const qs = region ? `?region=${encodeURIComponent(region)}` : "";
      return apiFetch<{ partners: AffiliatePartner[] }>(`/affiliate/partners${qs}`);
    },
    click: (
      token: string,
      body: { partnerId?: string; bookName: string; affiliateUrl: string; source: "arb_card" | "recommended" | "modal"; userRegion?: string; userCountry?: string },
    ) =>
      apiFetch<{ ok: boolean }>("/affiliate/click", {
        method: "POST",
        body: JSON.stringify(body),
        token,
      }),
  },
  admin: {
    stats: (token: string) =>
      apiFetch<AdminStats>("/admin/stats", { token }),
    users: (token: string, params?: { search?: string; filter?: string; page?: number }) => {
      const qs = params
        ? "?" + Object.entries(params).filter(([, v]) => v != null && v !== "").map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")
        : "";
      return apiFetch<{ users: AdminUser[]; page: number; limit: number }>(`/admin/users${qs}`, { token });
    },
    user: (token: string, id: number) =>
      apiFetch<AdminUser>(`/admin/users/${id}`, { token }),
    updateUser: (token: string, id: number, body: Record<string, unknown>) =>
      apiFetch<AdminUser>(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
    config: (token: string) =>
      apiFetch<Record<string, string>>("/admin/config", { token }),
    updateConfig: (token: string, key: string, value: string) =>
      apiFetch<{ key: string; value: string }>(`/admin/config/${key}`, {
        method: "PUT",
        body: JSON.stringify({ value }),
        token,
      }),
    logs: (token: string, page?: number) =>
      apiFetch<{ logs: AdminLogEntry[]; page: number; limit: number }>(
        `/admin/logs${page ? `?page=${page}` : ""}`,
        { token }
      ),
    setAdmin: (password: string) =>
      apiFetch<{ ok: boolean; email: string }>("/admin/set-admin", {
        method: "POST",
        body: JSON.stringify({ password }),
      }),
    verifyPassword: (password: string) =>
      apiFetch<{ ok: boolean }>("/admin/verify-password", {
        method: "POST",
        body: JSON.stringify({ password }),
      }),
    apiKeys: (token: string) =>
      apiFetch<ApiKeyStatus[]>("/admin/api-keys", { token }),
    testApiKey: (token: string, keyName: string) =>
      apiFetch<ApiKeyTestResult>("/admin/api-keys/test", {
        method: "POST",
        body: JSON.stringify({ keyName }),
        token,
      }),
    testAllApiKeys: (token: string) =>
      apiFetch<ApiKeyTestResult[]>("/admin/api-keys/test-all", {
        method: "POST",
        body: JSON.stringify({}),
        token,
      }),
  },

  notifications: {
    registerToken: (token: string, pushToken: string) =>
      apiFetch<{ ok: boolean }>("/notifications/register-token", {
        method: "POST",
        body: JSON.stringify({ pushToken }),
        token,
      }),
    getPrefs: (token: string) =>
      apiFetch<Record<string, boolean | string>>("/notifications/prefs", { token }),
    updatePrefs: (token: string, prefs: Record<string, boolean | string>) =>
      apiFetch<Record<string, boolean | string>>("/notifications/prefs", {
        method: "PUT",
        body: JSON.stringify(prefs),
        token,
      }),
    getUnreadCount: (token: string) =>
      apiFetch<{ count: number }>("/notifications/unread-count", { token }),
    markRead: (token: string) =>
      apiFetch<{ ok: boolean }>("/notifications/mark-read", {
        method: "POST",
        body: JSON.stringify({}),
        token,
      }),
  },
};
