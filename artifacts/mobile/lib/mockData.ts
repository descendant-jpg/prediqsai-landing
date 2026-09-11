// ---------------------------------------------------------------------------
// PrediQs AI — shared types and helpers.
// All screen data comes from the backend API or the user's own records;
// no demo/template content lives here.
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
// Daily Prediction Feed — card shape used across dashboard/picks screens
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

// ---------------------------------------------------------------------------
// Match of the Day — featured match card shape
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
// Shared helpers
// ---------------------------------------------------------------------------

export function confidenceColor(value: number, colors: { red: string; orange: string; green: string }): string {
  if (value <= 50) return colors.red;
  if (value <= 75) return colors.orange;
  return colors.green;
}

// ---------------------------------------------------------------------------
// Picks screen — enhanced AI pick shape
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

// Fallback client-side free-pick allowance when the API predates the
// server-enforced locked flag.
export const PRO_PICK_FREE_LIMIT = 2;

export function bestBookmaker(odds: BookmakerOdd[]): BookmakerOdd {
  // Total function: real API picks may carry no per-bookmaker odds.
  if (odds.length === 0) return { name: "", odds: 0 };
  return odds.reduce((best, o) => (o.odds > best.odds ? o : best), odds[0]);
}
