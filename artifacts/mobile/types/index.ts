export type Tier = "free" | "pro" | "elite";
export type SportType = "nfl" | "nba" | "mlb" | "soccer";
export type RiskLevel = "low" | "medium" | "high";
export type PredictionType = "home_win" | "away_win" | "draw" | "over" | "under";
export type EntryType = "deposit" | "withdrawal" | "win" | "loss";

export interface Prediction {
  id: string;
  sport: SportType;
  league: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  prediction: PredictionType;
  confidence: number;
  riskLevel: RiskLevel;
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
  tierRequired: Tier;
}

export interface BankrollEntry {
  id: string;
  type: EntryType;
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface UserProfile {
  tier: Tier;
  bankroll: number;
  dailyLossLimit: number;
  username: string;
}

export interface PerformanceStat {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}
