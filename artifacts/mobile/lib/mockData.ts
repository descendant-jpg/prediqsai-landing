// ---------------------------------------------------------------------------
// PrediQs AI — mock data for the 10 dashboard features.
// All dummy data lives here so it can be swapped for a real API later.
// ---------------------------------------------------------------------------

export type SportKey =
  | "football"
  | "basketball"
  | "tennis"
  | "nfl"
  | "baseball"
  | "hockey";

export type SportFilter = "all" | SportKey;

export const SPORT_ICONS: Record<SportKey, string> = {
  football: "⚽",
  basketball: "🏀",
  tennis: "🎾",
  nfl: "🏈",
  baseball: "⚾",
  hockey: "🏒",
};

export interface SportChip {
  key: SportFilter;
  label: string;
  icon: string;
}

export const SPORT_CHIPS: SportChip[] = [
  { key: "all", label: "All", icon: "🌟" },
  { key: "football", label: "Football", icon: "⚽" },
  { key: "basketball", label: "Basketball", icon: "🏀" },
  { key: "tennis", label: "Tennis", icon: "🎾" },
  { key: "nfl", label: "NFL", icon: "🏈" },
  { key: "baseball", label: "Baseball", icon: "⚾" },
  { key: "hockey", label: "Hockey", icon: "🏒" },
];

// ---------------------------------------------------------------------------
// Feature 1 + 3 — Daily Prediction Feed (each card has a confidence gauge)
// ---------------------------------------------------------------------------

export interface MockPrediction {
  id: string;
  match: string;
  homeTeam: string;
  awayTeam: string;
  sport: SportKey;
  league: string;
  pick: string;
  confidence: number; // 0-100
  bookmaker: string;
  odds: number;
  time: string;
  analysis: string;
  keyStats: string[];
}

export const PREDICTIONS: MockPrediction[] = [
  {
    id: "p1",
    match: "Man United vs Arsenal",
    homeTeam: "Man United",
    awayTeam: "Arsenal",
    sport: "football",
    league: "Premier League",
    pick: "Over 2.5 Goals",
    confidence: 88,
    bookmaker: "Bet365",
    odds: 1.85,
    time: "Today · 20:45",
    analysis:
      "Both sides average over 1.7 goals per game in their last 10 fixtures, and four of the last five meetings produced 3+ goals. Arsenal's high defensive line is repeatedly exploited on the counter, while United's full-backs push high creating end-to-end transitions. Expected goals (xG) models put the combined total at 3.1, comfortably above the 2.5 line. Weather is clear so no slowdown is expected.",
    keyStats: ["Combined xG 3.1", "4/5 H2H over 2.5", "United unbeaten home in 6"],
  },
  {
    id: "p2",
    match: "Lakers vs Celtics",
    homeTeam: "Lakers",
    awayTeam: "Celtics",
    sport: "basketball",
    league: "NBA",
    pick: "Celtics -4.5",
    confidence: 79,
    bookmaker: "DraftKings",
    odds: 1.91,
    time: "Today · 02:30",
    analysis:
      "Boston's net rating on the road is elite (+7.8) and the Lakers are on the second night of a back-to-back, historically a 9-point swing in efficiency. Boston's perimeter defense neutralises LA's primary scoring actions, and their pace control limits transition points. The spread of 4.5 sits below our projected margin of 7.",
    keyStats: ["Celtics net rating +7.8", "Lakers B2B fatigue", "Proj margin 7"],
  },
  {
    id: "p3",
    match: "Alcaraz vs Sinner",
    homeTeam: "Alcaraz",
    awayTeam: "Sinner",
    sport: "tennis",
    league: "ATP Masters",
    pick: "Over 22.5 Games",
    confidence: 72,
    bookmaker: "Pinnacle",
    odds: 1.95,
    time: "Tomorrow · 14:00",
    analysis:
      "Both players hold serve at over 88% on hard courts, which historically pushes matches to tiebreaks. Their last three meetings all went the distance with high game counts. With both returning well but serving better, expect long, competitive sets.",
    keyStats: ["Hold rate 88%+", "3/3 long H2H", "Hard-court specialists"],
  },
  {
    id: "p4",
    match: "Chiefs vs Bills",
    homeTeam: "Chiefs",
    awayTeam: "Bills",
    sport: "nfl",
    league: "NFL",
    pick: "Chiefs ML",
    confidence: 81,
    bookmaker: "FanDuel",
    odds: 1.74,
    time: "Sunday · 21:00",
    analysis:
      "Kansas City at home in primetime is 14-2 over two seasons. Buffalo's pass rush has dipped with two starters out, giving Mahomes a clean pocket. Our model gives the Chiefs a 64% win probability, well above the implied 57%.",
    keyStats: ["KC home primetime 14-2", "Model 64% win", "Buffalo DL depleted"],
  },
  {
    id: "p5",
    match: "Dodgers vs Yankees",
    homeTeam: "Dodgers",
    awayTeam: "Yankees",
    sport: "baseball",
    league: "MLB",
    pick: "Under 8.5 Runs",
    confidence: 68,
    bookmaker: "Bet365",
    odds: 1.88,
    time: "Today · 01:10",
    analysis:
      "Two ace pitchers face off with sub-3.00 ERAs. Wind is blowing in at 12mph, suppressing fly-ball carry. Both bullpens are rested and rank top-five in WHIP. The total of 8.5 looks inflated against the pitching matchup.",
    keyStats: ["Both ERAs <3.00", "Wind in 12mph", "Top-5 bullpens"],
  },
  {
    id: "p6",
    match: "Maple Leafs vs Bruins",
    homeTeam: "Maple Leafs",
    awayTeam: "Bruins",
    sport: "hockey",
    league: "NHL",
    pick: "Both Teams To Score",
    confidence: 75,
    bookmaker: "DraftKings",
    odds: 1.66,
    time: "Today · 00:00",
    analysis:
      "Both clubs convert at over 22% on the power play and concede regularly at even strength. Nine of the last ten head-to-heads saw both teams find the net. High-event hockey is expected with two offense-first systems.",
    keyStats: ["PP% 22+", "9/10 H2H BTTS", "High-event styles"],
  },
  {
    id: "p7",
    match: "Real Madrid vs Barcelona",
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    sport: "football",
    league: "La Liga",
    pick: "Both Teams To Score",
    confidence: 84,
    bookmaker: "William Hill",
    odds: 1.72,
    time: "Sunday · 20:00",
    analysis:
      "El Clásico almost always delivers goals at both ends — seven of the last eight saw BTTS. Both attacks rank top-three in the league for shots on target while neither defense has kept a clean sheet in their last five.",
    keyStats: ["7/8 H2H BTTS", "Top-3 attacks", "No clean sheets in 5"],
  },
  {
    id: "p8",
    match: "Warriors vs Nuggets",
    homeTeam: "Warriors",
    awayTeam: "Nuggets",
    sport: "basketball",
    league: "NBA",
    pick: "Over 228.5 Points",
    confidence: 66,
    bookmaker: "FanDuel",
    odds: 1.90,
    time: "Tomorrow · 03:00",
    analysis:
      "Two top-eight offenses meet with bottom-half defensive ratings. Both teams play at a high pace and the total has gone over in six of the last eight meetings. Expect a shootout with limited defensive resistance.",
    keyStats: ["Both top-8 offense", "6/8 overs", "High pace"],
  },
  {
    id: "p9",
    match: "Djokovic vs Medvedev",
    homeTeam: "Djokovic",
    awayTeam: "Medvedev",
    sport: "tennis",
    league: "ATP 500",
    pick: "Djokovic ML",
    confidence: 77,
    bookmaker: "Pinnacle",
    odds: 1.62,
    time: "Tomorrow · 16:30",
    analysis:
      "Djokovic leads the head-to-head 9-5 and has won the last three on hard court. His return game neutralises Medvedev's flat baseline rallies. Fresh off a week's rest, he is the clear value at these odds.",
    keyStats: ["H2H 9-5", "Won last 3", "Rested"],
  },
  {
    id: "p10",
    match: "49ers vs Cowboys",
    homeTeam: "49ers",
    awayTeam: "Cowboys",
    sport: "nfl",
    league: "NFL",
    pick: "Under 45.5 Points",
    confidence: 63,
    bookmaker: "Bet365",
    odds: 1.92,
    time: "Sunday · 18:00",
    analysis:
      "Two top-six scoring defenses meet with run-heavy game scripts likely. Cold weather and wind are forecast, historically dropping totals by 3-4 points. The line looks high for a defensive battle.",
    keyStats: ["Both top-6 defense", "Cold/wind forecast", "Run-heavy scripts"],
  },
  {
    id: "p11",
    match: "Liverpool vs Man City",
    homeTeam: "Liverpool",
    awayTeam: "Man City",
    sport: "football",
    league: "Premier League",
    pick: "Over 2.5 Goals",
    confidence: 80,
    bookmaker: "DraftKings",
    odds: 1.80,
    time: "Saturday · 17:30",
    analysis:
      "A meeting of the two highest xG teams in the league. Both press aggressively and concede chances in transition. Five of the last six between them produced three or more goals.",
    keyStats: ["Highest xG teams", "5/6 overs", "Aggressive press"],
  },
  {
    id: "p12",
    match: "Astros vs Braves",
    homeTeam: "Astros",
    awayTeam: "Braves",
    sport: "baseball",
    league: "MLB",
    pick: "Astros ML",
    confidence: 61,
    bookmaker: "FanDuel",
    odds: 1.96,
    time: "Tomorrow · 00:05",
    analysis:
      "Houston starts their ace with a sub-1.10 WHIP at home, where they are 31-18. The Braves bullpen has been overworked across a long road trip. A slight but real edge for the home side.",
    keyStats: ["Ace WHIP <1.10", "Home 31-18", "ATL pen tired"],
  },
];

// Free users see this many feed cards before the blur/lock kicks in.
export const FREE_FEED_LIMIT = 2;

// PrediQs AI benchmark ROI %, used by the Win/Loss Journal to compare a user's
// performance against the AI's track record.
export const AI_ROI_BENCHMARK = 34;

// ---------------------------------------------------------------------------
// Feature 2 — Live Odds Ticker
// ---------------------------------------------------------------------------

export interface OddsTickerItem {
  id: string;
  icon: string;
  match: string;
  market: string;
  odds: number;
  direction: "up" | "down";
  detail: string;
}

export const ODDS_TICKER: OddsTickerItem[] = [
  { id: "t1", icon: "⚽", match: "Man City vs Chelsea", market: "Over 2.5", odds: 2.1, direction: "down", detail: "Odds dropped from 2.30 → 2.10. Sharp money is backing goals — a strong signal that pros expect an open game." },
  { id: "t2", icon: "🏀", match: "Heat vs Knicks", market: "Knicks -3", odds: 1.95, direction: "up", detail: "Odds drifted from 1.83 → 1.95. The line is moving in your favour — potential value if you fancy New York." },
  { id: "t3", icon: "🎾", match: "Swiatek vs Gauff", market: "Over 21.5 Games", odds: 1.88, direction: "down", detail: "Steady steam from 2.00 → 1.88 suggests a tight, long match is expected by the market." },
  { id: "t4", icon: "⚽", match: "Bayern vs Dortmund", market: "BTTS", odds: 1.7, direction: "down", detail: "Klassiker BTTS shortened from 1.85 → 1.70. Goals at both ends heavily expected." },
  { id: "t5", icon: "🏈", match: "Eagles vs Giants", market: "Eagles -6.5", odds: 1.91, direction: "up", detail: "Line lengthened from 1.80 → 1.91 after injury news. Watch for further movement." },
  { id: "t6", icon: "⚾", match: "Mets vs Phillies", market: "Under 7.5", odds: 1.86, direction: "down", detail: "Pitching duel pushing the under from 1.98 → 1.86." },
  { id: "t7", icon: "🏒", match: "Rangers vs Devils", market: "Over 6.5", odds: 2.05, direction: "up", detail: "Total drifting 1.95 → 2.05 as goalies confirmed. Possible value on goals." },
  { id: "t8", icon: "⚽", match: "PSG vs Marseille", market: "PSG -1", odds: 1.78, direction: "down", detail: "Le Classique handicap shortened 1.90 → 1.78 on strong PSG form." },
  { id: "t9", icon: "🏀", match: "Bucks vs 76ers", market: "Over 224.5", odds: 1.92, direction: "up", detail: "Total nudging up 1.85 → 1.92 — slight value on the over." },
  { id: "t10", icon: "🎾", match: "Alcaraz vs Zverev", market: "Alcaraz ML", odds: 1.55, direction: "down", detail: "Favourite shortened 1.65 → 1.55 as confidence builds." },
];

// ---------------------------------------------------------------------------
// Feature 4 — Streak & Achievement Badges
// ---------------------------------------------------------------------------

export interface Badge {
  id: string;
  icon: string;
  name: string;
  description: string;
  howToUnlock: string;
}

export const BADGES: Badge[] = [
  { id: "streak7", icon: "🔥", name: "7 Day Streak", description: "Logged in 7 days in a row.", howToUnlock: "Open the app on 7 consecutive days." },
  { id: "firstWin", icon: "🏆", name: "First Win", description: "Logged your first winning bet.", howToUnlock: "Record a winning bet in your Journal." },
  { id: "arbMaster", icon: "⚡", name: "ARB Master", description: "Used the ARB scanner 5 times.", howToUnlock: "Run the Arbitrage Scanner 5 times." },
  { id: "scholar", icon: "📚", name: "Scholar", description: "Completed 3 lessons in the Learning Hub.", howToUnlock: "Finish 3 lessons in the Learning Hub." },
  { id: "sharpEye", icon: "🎯", name: "Sharp Eye", description: "Achieved a 70%+ win rate.", howToUnlock: "Keep your tracked win rate above 70%." },
  { id: "proMember", icon: "💎", name: "PRO Member", description: "Upgraded to premium.", howToUnlock: "Upgrade to a PRO subscription." },
  { id: "quizChamp", icon: "🧠", name: "Quiz Champ", description: "Scored 90%+ on any quiz.", howToUnlock: "Score 90% or higher on a Learning Hub quiz." },
  { id: "picksStreak", icon: "🌟", name: "7 Picks Streak", description: "Followed 7 winning AI picks in a row.", howToUnlock: "Follow 7 winning AI picks consecutively." },
];

// Unlocked by default to demonstrate the active state.
export const DEFAULT_UNLOCKED_BADGES: string[] = ["firstWin", "scholar"];

// ---------------------------------------------------------------------------
// Feature 5 — Bankroll Tracker (line graph mock points)
// ---------------------------------------------------------------------------

export interface BankrollPoint {
  day: string;
  value: number;
}

export const BANKROLL_START = 1000;

export const BANKROLL_HISTORY: BankrollPoint[] = [
  { day: "Mon", value: 1000 },
  { day: "Tue", value: 1080 },
  { day: "Wed", value: 1045 },
  { day: "Thu", value: 1180 },
  { day: "Fri", value: 1150 },
  { day: "Sat", value: 1260 },
  { day: "Sun", value: 1320 },
];

export interface BetEntry {
  id: string;
  match: string;
  stake: number;
  odds: number;
  result: "won" | "lost";
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Feature 6 — Match of the Day (one featured match per sport + default)
// ---------------------------------------------------------------------------

export interface MatchOfDay {
  id: string;
  sport: SportFilter;
  match: string;
  competition: string;
  time: string;
  pick: string;
  confidence: number;
  analysis: string;
  keyStats: string[];
  bookmaker: string;
}

export const MATCHES_OF_DAY: MatchOfDay[] = [
  { id: "motd_all", sport: "all", match: "Man United vs Arsenal", competition: "Premier League", time: "Today · 20:45", pick: "Over 2.5 Goals", confidence: 88, bookmaker: "Bet365", analysis: "The standout fixture of the day. Both attacks are firing and the defensive frailties on each side point to an open, high-scoring contest. Our model rates this the highest-confidence goals market on the card.", keyStats: ["Combined xG 3.1", "4/5 H2H over 2.5", "United unbeaten home in 6"] },
  { id: "motd_football", sport: "football", match: "Real Madrid vs Barcelona", competition: "La Liga", time: "Sunday · 20:00", pick: "Both Teams To Score", confidence: 84, bookmaker: "William Hill", analysis: "El Clásico rarely disappoints for goals. With both attacks in form and neither defense solid, both teams scoring is the strongest angle.", keyStats: ["7/8 H2H BTTS", "Top-3 attacks", "No clean sheets in 5"] },
  { id: "motd_basketball", sport: "basketball", match: "Lakers vs Celtics", competition: "NBA", time: "Today · 02:30", pick: "Celtics -4.5", confidence: 79, bookmaker: "DraftKings", analysis: "Boston's elite road form against a tired Lakers side on a back-to-back makes the spread the play of the night in the NBA.", keyStats: ["Celtics net rating +7.8", "Lakers B2B fatigue", "Proj margin 7"] },
  { id: "motd_tennis", sport: "tennis", match: "Djokovic vs Medvedev", competition: "ATP 500", time: "Tomorrow · 16:30", pick: "Djokovic ML", confidence: 77, bookmaker: "Pinnacle", analysis: "A dominant head-to-head and superior recent hard-court form make Djokovic the standout tennis selection.", keyStats: ["H2H 9-5", "Won last 3", "Rested"] },
  { id: "motd_nfl", sport: "nfl", match: "Chiefs vs Bills", competition: "NFL", time: "Sunday · 21:00", pick: "Chiefs ML", confidence: 81, bookmaker: "FanDuel", analysis: "Kansas City's primetime home record and Buffalo's depleted pass rush give the Chiefs a clear edge in the marquee NFL matchup.", keyStats: ["KC home primetime 14-2", "Model 64% win", "Buffalo DL depleted"] },
  { id: "motd_baseball", sport: "baseball", match: "Dodgers vs Yankees", competition: "MLB", time: "Today · 01:10", pick: "Under 8.5 Runs", confidence: 68, bookmaker: "Bet365", analysis: "Two aces and wind blowing in make the under the smart play in the day's premier baseball clash.", keyStats: ["Both ERAs <3.00", "Wind in 12mph", "Top-5 bullpens"] },
  { id: "motd_hockey", sport: "hockey", match: "Maple Leafs vs Bruins", competition: "NHL", time: "Today · 00:00", pick: "Both Teams To Score", confidence: 75, bookmaker: "DraftKings", analysis: "Two offense-first systems with strong power plays point to goals at both ends in the night's top hockey game.", keyStats: ["PP% 22+", "9/10 H2H BTTS", "High-event styles"] },
];

export function getMatchOfDay(filter: SportFilter): MatchOfDay {
  if (filter === "all") return MATCHES_OF_DAY[0];
  return (
    MATCHES_OF_DAY.find((m) => m.sport === filter) ?? MATCHES_OF_DAY[0]
  );
}

// ---------------------------------------------------------------------------
// Feature 8 — Leaderboard (20 mock users, three timeframes)
// ---------------------------------------------------------------------------

export interface LeaderboardUser {
  id: string;
  username: string;
  initials: string;
  winRate: number;
  picksFollowed: number;
}

export type LeaderboardPeriod = "weekly" | "monthly" | "allTime";

function initials(name: string): string {
  const parts = name.replace(/[^a-zA-Z ]/g, "").split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const RAW_USERS: { username: string; winRate: number; picksFollowed: number }[] = [
  { username: "SharpShark", winRate: 89, picksFollowed: 142 },
  { username: "ValueHunter", winRate: 86, picksFollowed: 130 },
  { username: "GoalMachine", winRate: 84, picksFollowed: 118 },
  { username: "OddsWizard", winRate: 82, picksFollowed: 156 },
  { username: "ParlayKing", winRate: 80, picksFollowed: 99 },
  { username: "ColdBlooded", winRate: 78, picksFollowed: 121 },
  { username: "EdgeFinder", winRate: 76, picksFollowed: 88 },
  { username: "TheProfessor", winRate: 74, picksFollowed: 134 },
  { username: "LineMover", winRate: 72, picksFollowed: 77 },
  { username: "BankrollBoss", winRate: 70, picksFollowed: 110 },
  { username: "CleanSheet", winRate: 68, picksFollowed: 64 },
  { username: "UpsetSpecial", winRate: 66, picksFollowed: 92 },
  { username: "FadeThePublic", winRate: 64, picksFollowed: 71 },
  { username: "HotStreak", winRate: 62, picksFollowed: 58 },
  { username: "SlowGrind", winRate: 60, picksFollowed: 103 },
  { username: "RookieRiser", winRate: 57, picksFollowed: 45 },
  { username: "WeekendWarrior", winRate: 54, picksFollowed: 66 },
  { username: "LongShotLou", winRate: 51, picksFollowed: 39 },
  { username: "CoinFlipKid", winRate: 48, picksFollowed: 52 },
  { username: "JustForFun", winRate: 45, picksFollowed: 31 },
];

function buildBoard(offset: number, pickScale: number): LeaderboardUser[] {
  return RAW_USERS.map((u, i) => {
    const wr = Math.max(45, Math.min(89, u.winRate + offset - (i % 3)));
    return {
      id: `u${i + 1}`,
      username: u.username,
      initials: initials(u.username),
      winRate: wr,
      picksFollowed: Math.round(u.picksFollowed * pickScale),
    };
  }).sort((a, b) => b.winRate - a.winRate);
}

export const LEADERBOARDS: Record<LeaderboardPeriod, LeaderboardUser[]> = {
  weekly: buildBoard(0, 0.3),
  monthly: buildBoard(1, 1),
  allTime: buildBoard(2, 3.2),
};

// Synthetic stats for the current (logged-in) user so they appear in the list.
export function currentUserRow(username: string, period: LeaderboardPeriod): LeaderboardUser {
  const base = period === "weekly" ? 63 : period === "monthly" ? 66 : 68;
  const picks = period === "weekly" ? 18 : period === "monthly" ? 61 : 184;
  return {
    id: "me",
    username,
    initials: initials(username),
    winRate: base,
    picksFollowed: picks,
  };
}

// ---------------------------------------------------------------------------
// Feature 9 — In-app Notifications
// ---------------------------------------------------------------------------

export interface MockNotification {
  id: string;
  icon: string;
  title: string;
  time: string;
  route?: string;
}

export const NOTIFICATIONS: MockNotification[] = [
  { id: "n1", icon: "🔥", title: "High confidence pick just dropped — 89% confidence", time: "2m ago", route: "/(tabs)" },
  { id: "n2", icon: "📊", title: "Your bankroll is up 12% this week!", time: "1h ago", route: "/journal" },
  { id: "n3", icon: "🏆", title: "New achievement unlocked: Scholar", time: "3h ago", route: "/(tabs)" },
  { id: "n4", icon: "⚡", title: "ARB opportunity detected — Act fast!", time: "5h ago", route: "/arbitrage" },
  { id: "n5", icon: "📅", title: "Daily picks are now available", time: "Today", route: "/(tabs)" },
];

// The 3 most recent notifications are simulated as "new" on app load.
export const SIMULATED_NEW_IDS: string[] = ["n1", "n2", "n3"];

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export function confidenceColor(value: number, colors: { red: string; orange: string; green: string }): string {
  if (value <= 50) return colors.red;
  if (value <= 75) return colors.orange;
  return colors.green;
}

// ---------------------------------------------------------------------------
// Picks screen — Enhanced AI picks (Features 1-10)
// ---------------------------------------------------------------------------

export type PickType = "hot" | "value" | "arb";
export type RiskLevel = "Low" | "Medium" | "High";

export interface BookmakerOdd {
  name: string;
  odds: number;
}

export interface ProPick {
  id: string;
  sport: SportKey;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  aiPick: string;
  confidence: number; // 0-100
  odds: number;
  bookmaker: string;
  isLive: boolean;
  currentScore: string; // e.g. "2 - 1 (67')" — empty when not live
  isValue: boolean;
  type: PickType;
  reasoning: string;
  keyStats: string[];
  riskLevel: RiskLevel;
  proTip: string;
  bookmakerOdds: BookmakerOdd[];
  kickoffTime: string;
  homeForm: string; // last 5, e.g. "W W D W W"
  awayForm: string;
  headToHead: string; // e.g. "3W 1D 1L"
  avgGoals: string; // e.g. "3.2"
  bookmakerUrl: string;
  liveAnalysis: string; // extra reasoning shown only when live
}

export const TODAY_PERFORMANCE = { won: 4, lost: 1, pending: 2 } as const;

export const PICK_OF_THE_DAY: ProPick = {
  id: "potd",
  sport: "football",
  competition: "UEFA Champions League",
  homeTeam: "Man City",
  awayTeam: "Real Madrid",
  aiPick: "Over 2.5 Goals",
  confidence: 91,
  odds: 1.85,
  bookmaker: "Bet365",
  isLive: false,
  currentScore: "",
  isValue: true,
  type: "hot",
  reasoning:
    "Man City have scored in 9 of their last 10 home games and average 2.4 goals at the Etihad this season. Real Madrid's defensive record away from home averages 1.8 goals conceded per game, and four of the last five meetings between these sides produced 3+ goals. Both managers favour attacking setups in two-legged ties.",
  keyStats: [
    "Man City scored in 9/10 home games",
    "Madrid concede 1.8/game away",
    "4/5 H2H over 2.5 goals",
    "Combined xG 3.3",
  ],
  riskLevel: "Low",
  proTip: "Consider the 'Over 2.5 + Both Teams to Score' combo for stronger value at 2.40.",
  bookmakerOdds: [
    { name: "Bet365", odds: 1.85 },
    { name: "1xBet", odds: 1.83 },
    { name: "Betway", odds: 1.80 },
    { name: "William Hill", odds: 1.82 },
    { name: "Pinnacle", odds: 1.84 },
  ],
  kickoffTime: "Today · 21:00",
  homeForm: "W W D W W",
  awayForm: "W L W W D",
  headToHead: "3W 1D 1L",
  avgGoals: "3.2",
  bookmakerUrl: "https://www.bet365.com",
  liveAnalysis: "",
};

export const PRO_PICKS: ProPick[] = [
  {
    id: "pp1",
    sport: "football",
    competition: "Premier League",
    homeTeam: "Liverpool",
    awayTeam: "Chelsea",
    aiPick: "Over 2.5 Goals",
    confidence: 88,
    odds: 1.90,
    bookmaker: "Bet365",
    isLive: true,
    currentScore: "2 - 1 (67')",
    isValue: true,
    type: "hot",
    reasoning:
      "Liverpool's high press forces turnovers in dangerous areas, and Chelsea's makeshift back line has conceded in 8 of 10 away games. Anfield fixtures average 3.4 goals this season.",
    keyStats: ["Anfield avg 3.4 goals", "Chelsea concede 8/10 away", "Liverpool xG 2.1"],
    riskLevel: "Low",
    proTip: "With 2 goals already in at 67', the Over 2.5 needs just one more — strong live position.",
    bookmakerOdds: [
      { name: "Bet365", odds: 1.90 },
      { name: "1xBet", odds: 1.88 },
      { name: "Betway", odds: 1.85 },
      { name: "William Hill", odds: 1.87 },
      { name: "Pinnacle", odds: 1.92 },
    ],
    kickoffTime: "Live now",
    homeForm: "W W W D W",
    awayForm: "L W D L W",
    headToHead: "2W 2D 1L",
    avgGoals: "3.4",
    bookmakerUrl: "https://www.bet365.com",
    liveAnalysis:
      "Liverpool lead 2-1 at 67 minutes with sustained pressure. One more goal completes Over 2.5 — also consider the Next Goal market for Liverpool at evens.",
  },
  {
    id: "pp2",
    sport: "basketball",
    competition: "NBA",
    homeTeam: "Celtics",
    awayTeam: "Bucks",
    aiPick: "Celtics -5.5",
    confidence: 84,
    odds: 1.91,
    bookmaker: "DraftKings",
    isLive: true,
    currentScore: "58 - 49 (Q3)",
    isValue: false,
    type: "hot",
    reasoning:
      "Boston's net rating at home is elite (+9.1) and Milwaukee are without their second scorer. Boston's perimeter defence limits Milwaukee's catch-and-shoot looks.",
    keyStats: ["Celtics home net +9.1", "Bucks missing key scorer", "Proj margin 9"],
    riskLevel: "Medium",
    proTip: "Boston covering comfortably at the half — live spread value has shortened.",
    bookmakerOdds: [
      { name: "DraftKings", odds: 1.91 },
      { name: "Bet365", odds: 1.90 },
      { name: "1xBet", odds: 1.89 },
      { name: "Betway", odds: 1.87 },
      { name: "Pinnacle", odds: 1.93 },
    ],
    kickoffTime: "Live now",
    homeForm: "W W L W W",
    awayForm: "W L W L W",
    headToHead: "3W 0D 2L",
    avgGoals: "221.5",
    bookmakerUrl: "https://www.draftkings.com",
    liveAnalysis:
      "Celtics lead by 9 in Q3 and controlling tempo. The -5.5 is tracking well; watch for garbage-time swings late in Q4.",
  },
  {
    id: "pp3",
    sport: "football",
    competition: "La Liga",
    homeTeam: "Barcelona",
    awayTeam: "Sevilla",
    aiPick: "Barcelona -1.5",
    confidence: 82,
    odds: 1.95,
    bookmaker: "1xBet",
    isLive: false,
    currentScore: "",
    isValue: true,
    type: "value",
    reasoning:
      "Barcelona have won by 2+ goals in 7 of 9 home league games. Sevilla's away form is poor with just one win in their last eight on the road.",
    keyStats: ["Barca 7/9 home wins by 2+", "Sevilla 1 away win in 8", "Barca xG 2.6"],
    riskLevel: "Medium",
    proTip: "The -1.5 handicap offers better value than the -1.0 Asian line at these odds.",
    bookmakerOdds: [
      { name: "1xBet", odds: 1.95 },
      { name: "Bet365", odds: 1.90 },
      { name: "Betway", odds: 1.88 },
      { name: "William Hill", odds: 1.91 },
      { name: "Pinnacle", odds: 1.93 },
    ],
    kickoffTime: "Today · 20:00",
    homeForm: "W W W L W",
    awayForm: "L D L W L",
    headToHead: "4W 1D 0L",
    avgGoals: "2.8",
    bookmakerUrl: "https://1xbet.com",
    liveAnalysis: "",
  },
  {
    id: "pp4",
    sport: "nfl",
    competition: "NFL",
    homeTeam: "Chiefs",
    awayTeam: "Ravens",
    aiPick: "Chiefs ML",
    confidence: 80,
    odds: 1.80,
    bookmaker: "FanDuel",
    isLive: false,
    currentScore: "",
    isValue: false,
    type: "hot",
    reasoning:
      "Kansas City are 8-1 at home over the last two seasons and have a decisive quarterback edge in clutch situations. The Ravens struggle on the road in cold-weather venues.",
    keyStats: ["Chiefs 8-1 at home", "QB clutch rating edge", "Ravens road struggles"],
    riskLevel: "Medium",
    proTip: "If you want more value, the Chiefs -3 alt line pays better than the moneyline.",
    bookmakerOdds: [
      { name: "FanDuel", odds: 1.80 },
      { name: "Bet365", odds: 1.78 },
      { name: "1xBet", odds: 1.79 },
      { name: "Betway", odds: 1.76 },
      { name: "Pinnacle", odds: 1.82 },
    ],
    kickoffTime: "Tomorrow · 18:30",
    homeForm: "W W L W W",
    awayForm: "W W L W L",
    headToHead: "3W 0D 2L",
    avgGoals: "48.5",
    bookmakerUrl: "https://www.fanduel.com",
    liveAnalysis: "",
  },
  {
    id: "pp5",
    sport: "tennis",
    competition: "ATP Masters",
    homeTeam: "Djokovic",
    awayTeam: "Medvedev",
    aiPick: "Djokovic to win",
    confidence: 77,
    odds: 1.70,
    bookmaker: "Pinnacle",
    isLive: false,
    currentScore: "",
    isValue: false,
    type: "hot",
    reasoning:
      "Djokovic leads the head-to-head 9-5 and has won the last four hard-court meetings. His return game neutralises Medvedev's biggest weapon, the first serve.",
    keyStats: ["H2H 9-5 Djokovic", "Won last 4 hard-court", "Return points won 42%"],
    riskLevel: "Low",
    proTip: "Djokovic -4.5 games is the sharper play if you expect a routine straight-sets win.",
    bookmakerOdds: [
      { name: "Pinnacle", odds: 1.70 },
      { name: "Bet365", odds: 1.67 },
      { name: "1xBet", odds: 1.68 },
      { name: "Betway", odds: 1.65 },
      { name: "William Hill", odds: 1.66 },
    ],
    kickoffTime: "Today · 16:00",
    homeForm: "W W W W L",
    awayForm: "W L W W W",
    headToHead: "9W 0D 5L",
    avgGoals: "22.5",
    bookmakerUrl: "https://www.pinnacle.com",
    liveAnalysis: "",
  },
  {
    id: "pp6",
    sport: "football",
    competition: "Serie A",
    homeTeam: "Inter Milan",
    awayTeam: "Napoli",
    aiPick: "Under 2.5 Goals",
    confidence: 74,
    odds: 2.05,
    bookmaker: "Betway",
    isLive: false,
    currentScore: "",
    isValue: true,
    type: "value",
    reasoning:
      "Both teams rank top-four defensively in Serie A and big matches between them are typically cagey — three of the last four meetings finished with under 2.5 goals.",
    keyStats: ["Both top-4 defences", "3/4 H2H under 2.5", "Low combined xG 2.0"],
    riskLevel: "Medium",
    proTip: "Odds of 2.05 on the Under offer genuine value against a true probability near 55%.",
    bookmakerOdds: [
      { name: "Betway", odds: 2.05 },
      { name: "Bet365", odds: 2.00 },
      { name: "1xBet", odds: 2.02 },
      { name: "William Hill", odds: 1.98 },
      { name: "Pinnacle", odds: 2.06 },
    ],
    kickoffTime: "Tomorrow · 19:45",
    homeForm: "W D W W D",
    awayForm: "D W W D L",
    headToHead: "1W 2D 1L",
    avgGoals: "2.1",
    bookmakerUrl: "https://www.betway.com",
    liveAnalysis: "",
  },
  {
    id: "pp7",
    sport: "football",
    competition: "Bundesliga",
    homeTeam: "Bayern Munich",
    awayTeam: "Dortmund",
    aiPick: "BTTS — Yes",
    confidence: 76,
    odds: 1.60,
    bookmaker: "William Hill",
    isLive: false,
    currentScore: "",
    isValue: false,
    type: "value",
    reasoning:
      "Der Klassiker almost always delivers goals at both ends — both teams have scored in 8 of the last 9 meetings, and each ranks in the league's top three for goals scored.",
    keyStats: ["BTTS in 8/9 H2H", "Both top-3 attacks", "Avg 3.6 goals in fixture"],
    riskLevel: "Low",
    proTip: "BTTS combined with Over 2.5 boosts the price to 2.10 with minimal added risk.",
    bookmakerOdds: [
      { name: "William Hill", odds: 1.60 },
      { name: "Bet365", odds: 1.57 },
      { name: "1xBet", odds: 1.58 },
      { name: "Betway", odds: 1.55 },
      { name: "Pinnacle", odds: 1.61 },
    ],
    kickoffTime: "Today · 17:30",
    homeForm: "W W W D W",
    awayForm: "W L W W D",
    headToHead: "5W 2D 2L",
    avgGoals: "3.6",
    bookmakerUrl: "https://www.williamhill.com",
    liveAnalysis: "",
  },
  {
    id: "pp8",
    sport: "basketball",
    competition: "NBA",
    homeTeam: "Nuggets",
    awayTeam: "Suns",
    aiPick: "Over 228.5 Points",
    confidence: 71,
    odds: 1.90,
    bookmaker: "DraftKings",
    isLive: false,
    currentScore: "",
    isValue: true,
    type: "value",
    reasoning:
      "Both teams play at a top-10 pace and rank bottom-half defensively this month. The total has gone Over in six of the last seven head-to-head matchups.",
    keyStats: ["Both top-10 pace", "6/7 H2H Over", "Combined 232 proj"],
    riskLevel: "Medium",
    proTip: "Live-bet the Over if the first quarter is high-scoring for an improved number.",
    bookmakerOdds: [
      { name: "DraftKings", odds: 1.90 },
      { name: "Bet365", odds: 1.88 },
      { name: "1xBet", odds: 1.91 },
      { name: "Betway", odds: 1.86 },
      { name: "Pinnacle", odds: 1.92 },
    ],
    kickoffTime: "Tomorrow · 03:00",
    homeForm: "W L W W L",
    awayForm: "L W L W W",
    headToHead: "4W 0D 3L",
    avgGoals: "229.0",
    bookmakerUrl: "https://www.draftkings.com",
    liveAnalysis: "",
  },
  {
    id: "pp9",
    sport: "football",
    competition: "Ligue 1",
    homeTeam: "PSG",
    awayTeam: "Marseille",
    aiPick: "PSG Win & Over 1.5 (arb)",
    confidence: 69,
    odds: 2.10,
    bookmaker: "1xBet",
    isLive: false,
    currentScore: "",
    isValue: true,
    type: "arb",
    reasoning:
      "Cross-bookmaker pricing on Le Classique has drifted: backing PSG to win on 1xBet while laying the draw and Marseille elsewhere locks in a small guaranteed margin.",
    keyStats: ["Arb margin ~2.4%", "PSG home 9-1", "Price drift across books"],
    riskLevel: "Low",
    proTip: "Arb windows close fast — stake proportionally across all three outcomes immediately.",
    bookmakerOdds: [
      { name: "1xBet", odds: 2.10 },
      { name: "Bet365", odds: 1.95 },
      { name: "Betway", odds: 2.00 },
      { name: "William Hill", odds: 1.98 },
      { name: "Pinnacle", odds: 2.05 },
    ],
    kickoffTime: "Today · 21:00",
    homeForm: "W W D W W",
    awayForm: "W L D W L",
    headToHead: "6W 1D 1L",
    avgGoals: "3.0",
    bookmakerUrl: "https://1xbet.com",
    liveAnalysis: "",
  },
  {
    id: "pp10",
    sport: "basketball",
    competition: "EuroLeague",
    homeTeam: "Real Madrid",
    awayTeam: "Olympiacos",
    aiPick: "Real Madrid ML (arb)",
    confidence: 68,
    odds: 1.75,
    bookmaker: "Pinnacle",
    isLive: false,
    currentScore: "",
    isValue: true,
    type: "arb",
    reasoning:
      "A pricing discrepancy between Pinnacle and Betway on the two-way moneyline creates a low-risk arbitrage opportunity on the EuroLeague clash.",
    keyStats: ["Arb margin ~1.8%", "Madrid home fortress", "Two-way price gap"],
    riskLevel: "Low",
    proTip: "Use the two-way (no draw) market for cleaner arbitrage maths in basketball.",
    bookmakerOdds: [
      { name: "Pinnacle", odds: 1.75 },
      { name: "Bet365", odds: 1.70 },
      { name: "1xBet", odds: 1.72 },
      { name: "Betway", odds: 1.68 },
      { name: "William Hill", odds: 1.71 },
    ],
    kickoffTime: "Tomorrow · 20:00",
    homeForm: "W W W L W",
    awayForm: "W L W W L",
    headToHead: "5W 0D 2L",
    avgGoals: "160.5",
    bookmakerUrl: "https://www.pinnacle.com",
    liveAnalysis: "",
  },
];

export const PRO_PICK_FREE_LIMIT = 2;

export function bestBookmaker(odds: BookmakerOdd[]): BookmakerOdd {
  return odds.reduce((best, o) => (o.odds > best.odds ? o : best), odds[0]);
}
