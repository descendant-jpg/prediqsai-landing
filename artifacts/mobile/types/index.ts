export type Tier = "free" | "premium";
export type SportType =
  | "nfl"
  | "nba"
  | "mlb"
  | "soccer"
  | "hockey"
  | "afl"
  | "rugby"
  | "handball"
  | "volleyball"
  | "mma"
  | "formula1";
export type RiskLevel = "low" | "medium" | "high";
export type PredictionType = "home_win" | "away_win" | "draw" | "over" | "under";
export type EntryType = "deposit" | "withdrawal" | "win" | "loss";

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
  simulationData: SimulationData | null;
  agentScores: AgentScores | null;
  publicBacking: PublicBacking | null;
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
