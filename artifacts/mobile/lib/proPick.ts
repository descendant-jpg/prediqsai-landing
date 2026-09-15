// ---------------------------------------------------------------------------
// Shared mapping helpers: real API predictions → UI shapes.
// No mock/fallback data anywhere — every card renders live backend data only.
// ---------------------------------------------------------------------------

import type { ApiPrediction } from "@/lib/api";
import type { ProPick, SportKey } from "@/lib/mockData";
import { pickLabel } from "@/lib/pickLabel";
import type { Prediction } from "@/types";

/** True when `dateStr` (UTC ISO from the API) falls on the LOCAL day `offset` days from now. */
export function isLocalDay(dateStr: string, offset: 0 | 1 = 0): boolean {
  const target = new Date();
  target.setDate(target.getDate() + offset);
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === target.getFullYear() &&
    d.getMonth() === target.getMonth() &&
    d.getDate() === target.getDate()
  );
}

/** Localized kickoff label: "Today · 20:45" in the device's own timezone, else "Sat, 14 Sep · 20:45". */
export function formatKickoffDay(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString()
    ? `Today · ${time}`
    : `${d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })} · ${time}`;
}

export function dbSportToSportKey(sport: string): SportKey {
  switch (sport.toLowerCase()) {
    case "soccer": case "football": return "football";
    case "nba": case "basketball": return "basketball";
    case "mlb": case "baseball": return "baseball";
    case "nfl": return "nfl";
    case "nhl": case "hockey": return "hockey";
    case "tennis": return "tennis";
    default: return "football";
  }
}

/** Map a raw API prediction onto the app's Prediction type. */
export function mapApiPrediction(p: ApiPrediction): Prediction {
  return {
    id: p.id, sport: p.sport as Prediction["sport"], league: p.league,
    homeTeam: p.homeTeam, awayTeam: p.awayTeam, matchDate: p.matchDate,
    prediction: p.prediction as Prediction["prediction"],
    confidence: p.confidence, riskLevel: p.riskLevel as Prediction["riskLevel"],
    volatilityScore: p.volatilityScore, isTrapGame: p.isTrapGame,
    avoidMatch: p.avoidMatch, avoidReason: p.avoidReason,
    reasoning: p.reasoning, keyFactors: p.keyFactors,
    againstFactors: p.againstFactors ?? [], weatherImpact: p.weatherImpact,
    sharpMoneySignal: p.sharpMoneySignal, aiProbability: p.aiProbability,
    bookmakerProbability: p.bookmakerProbability, valueDetected: p.valueDetected,
    tierRequired: p.tierRequired === "premium" ? "premium" : "free",
    simulationData: p.simulationData ?? null, agentScores: p.agentScores ?? null,
    publicBacking: p.publicBacking ?? null,
    result: p.result ?? null,
    locked: p.locked ?? false,
  };
}

/** Convert a real API prediction into the ProPick shape the pick cards render. */
export function predictionToProPick(p: Prediction): ProPick {
  const impliedOdds =
    p.bookmakerProbability > 0
      ? Math.round((100 / p.bookmakerProbability) * 100) / 100
      : 0;
  const risk = (p.riskLevel ?? "medium").toLowerCase();
  return {
    id: `api-${p.id}`,
    sport: dbSportToSportKey(p.sport),
    competition: p.league,
    homeTeam: p.homeTeam,
    awayTeam: p.awayTeam,
    aiPick: pickLabel(p.prediction, p.homeTeam, p.awayTeam),
    confidence: p.confidence,
    odds: impliedOdds,
    bookmaker: "Market consensus",
    isLive: false,
    currentScore: "",
    isValue: p.valueDetected,
    type: p.valueDetected ? "value" : "hot",
    reasoning: p.reasoning,
    keyStats: (p.keyFactors ?? []).slice(0, 4),
    riskLevel: risk === "low" ? "Low" : risk === "high" ? "High" : "Medium",
    proTip: p.sharpMoneySignal ?? "",
    // Derived from the real bookmaker probability — no fabricated book list.
    bookmakerOdds: impliedOdds > 0 ? [{ name: "Market consensus", odds: impliedOdds }] : [],
    kickoffTime: formatKickoffDay(p.matchDate),
    homeForm: "",
    awayForm: "",
    headToHead: "",
    avgGoals: "",
    bookmakerUrl: "",
    liveAnalysis: "",
    locked: p.locked ?? false,
  };
}
