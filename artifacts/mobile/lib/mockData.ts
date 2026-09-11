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
  | "hockey"
  | "afl"
  | "rugby"
  | "handball"
  | "volleyball"
  | "mma"
  | "formula1";

export type SportFilter = "all" | SportKey;

export const SPORT_ICONS: Record<SportKey, string> = {
  football: "⚽",
  basketball: "🏀",
  tennis: "🎾",
  nfl: "🏈",
  baseball: "⚾",
  hockey: "🏒",
  afl: "🏉",
  rugby: "🏉",
  handball: "🤾",
  volleyball: "🏐",
  mma: "🥊",
  formula1: "🏎️",
};

export interface SportChip {
  key: SportFilter;
  label: string;
  icon: string;
}

export const SPORT_CHIPS: SportChip[] = [
  { key: "all", label: "All", icon: "🌟" },
  { key: "football", label: "Football", icon: "⚽" },
  { key: "basketball", label: "NBA", icon: "🏀" },
  { key: "nfl", label: "NFL", icon: "🏈" },
  { key: "baseball", label: "Baseball", icon: "⚾" },
  { key: "hockey", label: "Hockey", icon: "🏒" },
  { key: "afl", label: "AFL", icon: "🏉" },
  { key: "rugby", label: "Rugby", icon: "🏉" },
  { key: "mma", label: "MMA", icon: "🥊" },
  { key: "formula1", label: "F1", icon: "🏎️" },
  { key: "handball", label: "Handball", icon: "🤾" },
  { key: "volleyball", label: "Volleyball", icon: "🏐" },
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
  /** Server-enforced paywall flag carried from the API prediction. */
  locked?: boolean;
  kickoffTime: string;
  homeForm: string; // last 5, e.g. "W W D W W"
  awayForm: string;
  headToHead: string; // e.g. "3W 1D 1L"
  avgGoals: string; // e.g. "3.2"
  bookmakerUrl: string;
  liveAnalysis: string; // extra reasoning shown only when live
}

export const PRO_PICK_FREE_LIMIT = 2;

export function bestBookmaker(odds: BookmakerOdd[]): BookmakerOdd {
  // Total function: real API picks may carry no per-bookmaker odds.
  if (odds.length === 0) return { name: "", odds: 0 };
  return odds.reduce((best, o) => (o.odds > best.odds ? o : best), odds[0]);
}
