import { boolean, jsonb, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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

export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  sport: text("sport").notNull(),
  league: text("league").notNull(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  matchDate: timestamp("match_date", { withTimezone: true }).notNull(),
  prediction: text("prediction").notNull(),
  confidence: real("confidence").notNull(),
  riskLevel: text("risk_level").notNull(),
  volatilityScore: real("volatility_score").notNull().default(5.0),
  isTrapGame: boolean("is_trap_game").notNull().default(false),
  avoidMatch: boolean("avoid_match").notNull().default(false),
  avoidReason: text("avoid_reason"),
  reasoning: text("reasoning").notNull(),
  keyFactors: jsonb("key_factors").$type<string[]>().notNull().default([]),
  weatherImpact: text("weather_impact"),
  sharpMoneySignal: text("sharp_money_signal"),
  aiProbability: real("ai_probability").notNull(),
  bookmakerProbability: real("bookmaker_probability").notNull().default(50),
  valueDetected: boolean("value_detected").notNull().default(false),
  tierRequired: text("tier_required").notNull().default("free"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  result: text("result"),
  simulationData: jsonb("simulation_data").$type<SimulationData>(),
  agentScores: jsonb("agent_scores").$type<AgentScores>(),
  publicBacking: jsonb("public_backing").$type<PublicBacking>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertPredictionSchema = createInsertSchema(predictions).omit({
  id: true,
  createdAt: true,
});

export type DbPrediction = typeof predictions.$inferSelect;
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
