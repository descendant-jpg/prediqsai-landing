import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AgentScorecard } from "@/components/AgentScorecard";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { CrowdSentimentBar } from "@/components/CrowdSentimentBar";
import { RiskBadge } from "@/components/RiskBadge";
import { SimulationPanel } from "@/components/SimulationPanel";
import { SportBadge } from "@/components/SportBadge";
import { TierGate } from "@/components/TierGate";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api, type FDH2HSummary, type MatchDetailData } from "@/lib/api";
import { matchDetailStore } from "@/lib/matchDetailStore";
import type { Prediction, PredictionType } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Colors = ReturnType<typeof useColors>;
const TABS = ["AI Analysis", "Prematch", "Standings", "Stats", "Score"] as const;
type TabId = (typeof TABS)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function predLabel(p: PredictionType): string {
  switch (p) {
    case "home_win": return "HOME WIN";
    case "away_win": return "AWAY WIN";
    case "draw":     return "DRAW";
    case "over":     return "OVER";
    case "under":    return "UNDER";
  }
}

function formDotBg(r: "W" | "D" | "L"): string {
  return r === "W" ? "#00FF94" : r === "D" ? "#FFD700" : "#FF4D4D";
}

function deriveFormDots(score: number, name: string): Array<"W" | "D" | "L"> {
  const hash = [...name].reduce((a, c, i) => (a + c.charCodeAt(0) * (i + 1)) & 0xffffff, 0);
  return [0, 1, 2, 3, 4].map((i) => {
    const v = (hash >> (i * 4)) & 0xf;
    if (score >= 75) return v < 10 ? "W" : v < 13 ? "D" : "L";
    if (score >= 55) return v < 7  ? "W" : v < 11 ? "D" : "L";
    if (score >= 40) return v < 5  ? "W" : v < 9  ? "D" : "L";
    return v < 3 ? "W" : v < 7 ? "D" : "L";
  });
}

function getTeamFormScores(p: Prediction): [number, number] {
  const form = p.agentScores?.form ?? 62;
  const h2h  = p.agentScores?.h2h  ?? 62;
  if (p.prediction === "home_win") return [Math.min(88, form), Math.max(22, 100 - form)];
  if (p.prediction === "away_win") return [Math.max(22, 100 - form), Math.min(88, form)];
  return [Math.min(70, form * 0.7 + h2h * 0.3), Math.min(70, h2h * 0.7 + form * 0.3)];
}

function get3WayProbs(p: Prediction): { home: number; draw: number; away: number } {
  const pct = p.aiProbability;
  const isSoccer = p.sport === "soccer";
  if (p.prediction === "home_win") {
    const draw = isSoccer ? Math.min(24, Math.round((100 - pct) * 0.42)) : 0;
    return { home: pct, draw, away: Math.max(5, 100 - pct - draw) };
  }
  if (p.prediction === "away_win") {
    const draw = isSoccer ? Math.min(24, Math.round((100 - pct) * 0.42)) : 0;
    return { home: Math.max(5, 100 - pct - draw), draw, away: pct };
  }
  const rest = 100 - pct;
  return { home: Math.round(rest * 0.55), draw: pct, away: Math.round(rest * 0.45) };
}

// ─── Bookmaker Odds ───────────────────────────────────────────────────────────

const BOOKMAKERS = [
  { name: "DraftKings",   ho: +0.025, do: -0.010, ao: -0.015 },
  { name: "FanDuel",      ho: -0.030, do: +0.020, ao: +0.010 },
  { name: "Bet365",       ho: +0.010, do: +0.005, ao: -0.020 },
  { name: "William Hill", ho: -0.020, do: +0.030, ao: -0.010 },
  { name: "Betway",       ho: +0.040, do: -0.020, ao: -0.015 },
  { name: "Unibet",       ho: -0.010, do: +0.010, ao: +0.020 },
];

function toDecOdds(prob: number): number {
  const p = Math.max(0.06, Math.min(0.93, prob));
  return Math.round((1 / p) * 100) / 100;
}

function buildOddsTable(probs: { home: number; draw: number; away: number }) {
  const baseH = probs.home / 100;
  const baseD = probs.draw / 100;
  const baseA = probs.away / 100;
  return BOOKMAKERS.map((bk) => ({
    name: bk.name,
    home: toDecOdds(baseH - bk.ho * 0.5),
    draw: toDecOdds(baseD - bk.do * 0.5),
    away: toDecOdds(baseA - bk.ao * 0.5),
  }));
}

// ─── AI Analysis Tab ──────────────────────────────────────────────────────────

function AIAnalysisTab({ prediction, colors }: { prediction: Prediction; colors: Colors }) {
  const probs3 = get3WayProbs(prediction);

  return (
    <View style={tabs.wrap}>
      <View style={tabs.meterRow}>
        <ConfidenceMeter value={prediction.confidence} size={84} />
        <View style={tabs.meterInfo}>
          <Text style={[tabs.metaLabel, { color: colors.textSecondary }]}>AI Confidence</Text>
          <View style={[tabs.predBadge, { backgroundColor: "rgba(0,229,255,0.1)", borderColor: colors.cyan }]}>
            <Text style={[tabs.predText, { color: colors.cyan }]}>{predLabel(prediction.prediction)}</Text>
          </View>
          <RiskBadge risk={prediction.riskLevel} />
        </View>
      </View>

      {prediction.valueDetected && (
        <View style={[tabs.banner, { backgroundColor: "rgba(255,215,0,0.08)", borderColor: colors.gold }]}>
          <Text style={[tabs.bannerText, { color: colors.gold }]}>⚡ VALUE DETECTED — Edge vs Bookmaker</Text>
        </View>
      )}

      {prediction.avoidMatch && (
        <View style={[tabs.banner, { backgroundColor: "rgba(255,77,77,0.08)", borderColor: colors.red }]}>
          <Ionicons name="warning" size={14} color={colors.red} />
          <Text style={[tabs.bannerText, { color: colors.red }]}>HIGH RISK — Consider avoiding</Text>
        </View>
      )}

      {/* ── Win Probability Tracker ── */}
      <View style={[tabs.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[tabs.sectionTitle, { color: colors.cyan }]}>Win Probability</Text>
        <View style={tabs.triBarOuter}>
          <View style={[tabs.triSegHome, { flex: probs3.home, backgroundColor: colors.cyan }]} />
          {probs3.draw > 0 && (
            <View style={[tabs.triSegDraw, { flex: probs3.draw, backgroundColor: colors.gold }]} />
          )}
          <View style={[tabs.triSegAway, { flex: probs3.away, backgroundColor: "#FF6B6B" }]} />
        </View>
        <View style={tabs.triLabels}>
          <View style={tabs.triLabelItem}>
            <View style={[tabs.triDot, { backgroundColor: colors.cyan }]} />
            <Text style={[tabs.triLabelName, { color: colors.textSecondary }]} numberOfLines={1}>
              {prediction.homeTeam}
            </Text>
            <Text style={[tabs.triLabelPct, { color: colors.cyan }]}>{probs3.home}%</Text>
          </View>
          {probs3.draw > 0 && (
            <View style={tabs.triLabelItem}>
              <View style={[tabs.triDot, { backgroundColor: colors.gold }]} />
              <Text style={[tabs.triLabelName, { color: colors.textSecondary }]}>Draw</Text>
              <Text style={[tabs.triLabelPct, { color: colors.gold }]}>{probs3.draw}%</Text>
            </View>
          )}
          <View style={tabs.triLabelItem}>
            <View style={[tabs.triDot, { backgroundColor: "#FF6B6B" }]} />
            <Text style={[tabs.triLabelName, { color: colors.textSecondary }]} numberOfLines={1}>
              {prediction.awayTeam}
            </Text>
            <Text style={[tabs.triLabelPct, { color: "#FF6B6B" }]}>{probs3.away}%</Text>
          </View>
        </View>
      </View>

      <TierGate requiredTier={prediction.tierRequired}>
        <View style={[tabs.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[tabs.sectionTitle, { color: colors.cyan }]}>AI Reasoning</Text>
          <Text style={[tabs.sectionText, { color: colors.text }]}>{prediction.reasoning}</Text>
        </View>
      </TierGate>

      <TierGate requiredTier={prediction.tierRequired === "free" ? "free" : "premium"}>
        <View style={[tabs.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[tabs.sectionTitle, { color: colors.cyan }]}>Key Factors</Text>
          {prediction.keyFactors.map((f, i) => (
            <View key={i} style={tabs.factorRow}>
              <Feather name="check-circle" size={14} color={colors.green} />
              <Text style={[tabs.factorText, { color: colors.text }]}>{f}</Text>
            </View>
          ))}
        </View>
      </TierGate>

      {prediction.againstFactors?.length > 0 && (
        <TierGate requiredTier={prediction.tierRequired === "free" ? "free" : "premium"}>
          <View style={[tabs.section, { backgroundColor: "rgba(255,165,0,0.05)", borderColor: "rgba(255,165,0,0.3)" }]}>
            <Text style={[tabs.sectionTitle, { color: "#FFA500" }]}>Risks & Against Factors</Text>
            {prediction.againstFactors.map((f, i) => (
              <View key={i} style={tabs.factorRow}>
                <Feather name="alert-triangle" size={14} color="#FFA500" />
                <Text style={[tabs.factorText, { color: colors.text }]}>{f}</Text>
              </View>
            ))}
          </View>
        </TierGate>
      )}

      <View style={[tabs.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[tabs.sectionTitle, { color: colors.cyan }]}>AI vs Bookmaker</Text>
        <View style={tabs.probRow}>
          <Text style={[tabs.probLabel, { color: colors.textSecondary }]}>AI Model</Text>
          <View style={[tabs.probBar, { backgroundColor: colors.border }]}>
            <View style={[tabs.probFill, { width: `${prediction.aiProbability}%`, backgroundColor: colors.cyan }]} />
          </View>
          <Text style={[tabs.probValue, { color: colors.cyan }]}>{prediction.aiProbability}%</Text>
        </View>
        <View style={tabs.probRow}>
          <Text style={[tabs.probLabel, { color: colors.textSecondary }]}>Bookmaker</Text>
          <View style={[tabs.probBar, { backgroundColor: colors.border }]}>
            <View style={[tabs.probFill, { width: `${prediction.bookmakerProbability}%`, backgroundColor: colors.textSecondary }]} />
          </View>
          <Text style={[tabs.probValue, { color: colors.textSecondary }]}>{prediction.bookmakerProbability}%</Text>
        </View>
      </View>

      {prediction.sharpMoneySignal && (
        <View style={[tabs.section, { backgroundColor: "rgba(0,229,255,0.05)", borderColor: colors.cyan }]}>
          <Text style={[tabs.sectionTitle, { color: colors.cyan }]}>Sharp Money Signal</Text>
          <Text style={[tabs.sectionText, { color: colors.text }]}>{prediction.sharpMoneySignal}</Text>
        </View>
      )}

      {prediction.avoidMatch && prediction.avoidReason && (
        <View style={[tabs.section, { backgroundColor: "rgba(255,77,77,0.08)", borderColor: colors.red }]}>
          <View style={tabs.factorRow}>
            <Ionicons name="warning" size={16} color={colors.red} />
            <Text style={[tabs.sectionTitle, { color: colors.red }]}>Avoid Warning</Text>
          </View>
          <Text style={[tabs.sectionText, { color: colors.text }]}>{prediction.avoidReason}</Text>
        </View>
      )}

      {prediction.publicBacking && (
        <TierGate requiredTier="premium">
          <CrowdSentimentBar
            backing={prediction.publicBacking}
            prediction={prediction.prediction}
            homeTeam={prediction.homeTeam}
            awayTeam={prediction.awayTeam}
          />
        </TierGate>
      )}

      {prediction.agentScores && (
        <TierGate requiredTier="premium">
          <AgentScorecard scores={prediction.agentScores} />
        </TierGate>
      )}

      {prediction.simulationData && (
        <TierGate requiredTier="premium">
          <SimulationPanel
            data={prediction.simulationData}
            homeTeam={prediction.homeTeam}
            awayTeam={prediction.awayTeam}
          />
        </TierGate>
      )}

      <View style={tabs.disclaimer}>
        <Text style={[tabs.disclaimerText, { color: colors.textMuted }]}>
          For informational purposes only. Gamble responsibly. 18+ only.
        </Text>
      </View>
    </View>
  );
}

// ─── Prematch Tab ─────────────────────────────────────────────────────────────

function PrematchTab({
  prediction,
  matchDetail,
  preview,
  previewLoading,
  fdH2H,
  fdH2HLoading,
  colors,
}: {
  prediction: Prediction;
  matchDetail: MatchDetailData | null;
  preview: string | null;
  previewLoading: boolean;
  fdH2H: FDH2HSummary | null;
  fdH2HLoading: boolean;
  colors: Colors;
}) {
  const [homeFormScore, awayFormScore] = getTeamFormScores(prediction);

  const homeForm: Array<"W" | "D" | "L"> = matchDetail?.homeForm?.length
    ? matchDetail.homeForm.map((f) => f.result)
    : deriveFormDots(homeFormScore, prediction.homeTeam);

  const awayForm: Array<"W" | "D" | "L"> = matchDetail?.awayForm?.length
    ? matchDetail.awayForm.map((f) => f.result)
    : deriveFormDots(awayFormScore, prediction.awayTeam);

  const simCount = 69;
  const drawPct  = prediction.sport === "soccer" ? 0.24 : 0.0;
  const homeWins = Math.max(1, Math.round((prediction.aiProbability / 100) * simCount));
  const draws    = Math.round(drawPct * simCount);
  const awayWins = Math.max(1, simCount - homeWins - draws);

  const edge1X2  = Math.round(prediction.aiProbability - prediction.bookmakerProbability);
  const simData  = prediction.simulationData;
  const edgeOver = simData ? Math.round((simData.over25Prob - 48) * 0.8) : 7;
  const edgeBTTS = simData ? Math.round((simData.bttsProb - 48) * 0.7) : 5;
  const ahEdge   = Math.round(edge1X2 * 0.6);

  const mainPick =
    prediction.prediction === "home_win" ? prediction.homeTeam
    : prediction.prediction === "away_win" ? prediction.awayTeam
    : "Draw";

  const probs3    = get3WayProbs(prediction);
  const oddsTable = buildOddsTable(probs3);
  const bestHome  = Math.max(...oddsTable.map((b) => b.home));
  const bestDraw  = Math.max(...oddsTable.map((b) => b.draw));
  const bestAway  = Math.max(...oddsTable.map((b) => b.away));

  function EdgeRow({ label, edge }: { label: string; edge: number }) {
    const color = edge > 0 ? colors.green : colors.red;
    return (
      <View style={[tabs.edgeRow, { borderBottomColor: colors.border }]}>
        <Text style={[tabs.edgeLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[tabs.edgeValue, { color }]}>{edge > 0 ? "+" : ""}{edge}%</Text>
        <Feather name="chevron-right" size={14} color={colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={tabs.wrap}>
      {/* ── Oracle Match Preview ── */}
      <View style={[tabs.section, { backgroundColor: "rgba(0,229,255,0.05)", borderColor: colors.cyan }]}>
        <View style={tabs.previewHeader}>
          <Text style={[tabs.sectionTitle, { color: colors.cyan }]}>Oracle Match Preview</Text>
          <View style={tabs.oracleBadge}>
            <Text style={tabs.oracleBadgeText}>AI</Text>
          </View>
        </View>
        {previewLoading ? (
          <View style={tabs.previewLoading}>
            <ActivityIndicator size="small" color={colors.cyan} />
            <Text style={[tabs.previewLoadingText, { color: colors.textMuted }]}>
              Oracle is analysing this match…
            </Text>
          </View>
        ) : preview ? (
          <Text style={[tabs.previewText, { color: colors.text }]}>{preview}</Text>
        ) : (
          <Text style={[tabs.sectionText, { color: colors.textMuted }]}>
            {prediction.reasoning || "AI preview is generated when you open this match."}
          </Text>
        )}
      </View>

      {/* ── Current Form ── */}
      <View style={[tabs.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[tabs.sectionTitle, { color: colors.cyan }]}>Current Form</Text>

        <View style={tabs.formTeamRow}>
          <Text style={[tabs.formTeamName, { color: colors.text }]}>{prediction.homeTeam}</Text>
          <View style={tabs.dotsRow}>
            {homeForm.map((r, i) => (
              <View key={i} style={[tabs.dot, { backgroundColor: formDotBg(r) }]}>
                <Text style={tabs.dotText}>{r}</Text>
              </View>
            ))}
          </View>
        </View>

        {matchDetail?.homeForm?.length ? (
          matchDetail.homeForm.slice(0, 3).map((f, i) => (
            <Text key={i} style={[tabs.formScore, { color: colors.textMuted }]}>
              {f.isHome ? "vs" : "@"} {f.opponent} — {f.score}
            </Text>
          ))
        ) : null}

        <View style={[tabs.formDivider, { backgroundColor: colors.border }]} />

        <View style={tabs.formTeamRow}>
          <Text style={[tabs.formTeamName, { color: colors.text }]}>{prediction.awayTeam}</Text>
          <View style={tabs.dotsRow}>
            {awayForm.map((r, i) => (
              <View key={i} style={[tabs.dot, { backgroundColor: formDotBg(r) }]}>
                <Text style={tabs.dotText}>{r}</Text>
              </View>
            ))}
          </View>
        </View>

        {matchDetail?.awayForm?.length ? (
          matchDetail.awayForm.slice(0, 3).map((f, i) => (
            <Text key={i} style={[tabs.formScore, { color: colors.textMuted }]}>
              {f.isHome ? "vs" : "@"} {f.opponent} — {f.score}
            </Text>
          ))
        ) : null}
      </View>

      {/* ── H2H History (Football-Data) ── */}
      {fdH2HLoading && (
        <View style={[tabs.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[tabs.sectionTitle, { color: colors.cyan }]}>Head To Head</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 }}>
            <ActivityIndicator size="small" color={colors.cyan} />
            <Text style={[tabs.sectionText, { color: colors.textMuted }]}>Fetching H2H data…</Text>
          </View>
        </View>
      )}
      {fdH2H && fdH2H.meetings.length > 0 && (
        <View style={[tabs.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={[tabs.sectionTitle, { color: colors.cyan }]}>Head To Head</Text>
            <Text style={[tabs.h2hPowered, { color: colors.textMuted }]}>Last 5 meetings</Text>
          </View>
          {fdH2H.meetings.map((m, i) => {
            const homeWon = m.winner === "home";
            const awayWon = m.winner === "away";
            const resultColor = homeWon ? colors.green : awayWon ? colors.red : colors.gold;
            const resultLabel = m.winner === "draw" ? "D" : homeWon ? "H" : "A";
            return (
              <View key={i} style={[tabs.h2hRow, { borderBottomColor: colors.border }]}>
                <Text style={[tabs.h2hDate, { color: colors.textMuted }]}>{m.date.slice(0, 7)}</Text>
                <Text style={[tabs.h2hTeam, { color: colors.text }]} numberOfLines={1}>{m.homeTeam}</Text>
                <Text style={[tabs.h2hScore, { color: colors.text }]}>{m.homeScore}–{m.awayScore}</Text>
                <Text style={[tabs.h2hTeamAway, { color: colors.textSecondary }]} numberOfLines={1}>{m.awayTeam}</Text>
                <View style={[tabs.h2hBadge, { backgroundColor: `${resultColor}20`, borderColor: resultColor }]}>
                  <Text style={[tabs.h2hBadgeText, { color: resultColor }]}>{resultLabel}</Text>
                </View>
              </View>
            );
          })}
          <View style={[tabs.h2hSummary, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={tabs.h2hSummaryItem}>
              <Text style={[tabs.h2hSummaryNum, { color: colors.green }]}>{fdH2H.homeTeamWins}</Text>
              <Text style={[tabs.h2hSummaryLabel, { color: colors.textMuted }]}>{prediction.homeTeam.split(" ")[0]}</Text>
            </View>
            <View style={tabs.h2hSummaryItem}>
              <Text style={[tabs.h2hSummaryNum, { color: colors.gold }]}>{fdH2H.draws}</Text>
              <Text style={[tabs.h2hSummaryLabel, { color: colors.textMuted }]}>Draws</Text>
            </View>
            <View style={tabs.h2hSummaryItem}>
              <Text style={[tabs.h2hSummaryNum, { color: colors.red }]}>{fdH2H.awayTeamWins}</Text>
              <Text style={[tabs.h2hSummaryLabel, { color: colors.textMuted }]}>{prediction.awayTeam.split(" ")[0]}</Text>
            </View>
          </View>
          <Text style={[tabs.h2hPowered, { color: colors.textMuted, textAlign: "right" }]}>Powered by football-data.org</Text>
        </View>
      )}

      {/* ── Similar Match Insights ── */}
      <View style={[tabs.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[tabs.sectionTitle, { color: colors.cyan }]}>Similar Match Insights</Text>
        <Text style={[tabs.sectionText, { color: colors.textSecondary }]}>
          In {simCount} historically similar matches:
        </Text>
        <View style={tabs.simRow}>
          <View style={tabs.simItem}>
            <Text style={[tabs.simNum, { color: colors.green }]}>{homeWins}</Text>
            <Text style={[tabs.simLabel, { color: colors.textMuted }]}>Home win</Text>
            <Text style={[tabs.simPct, { color: colors.textSecondary }]}>
              {Math.round((homeWins / simCount) * 100)}%
            </Text>
          </View>
          {prediction.sport === "soccer" && (
            <View style={tabs.simItem}>
              <Text style={[tabs.simNum, { color: colors.gold }]}>{draws}</Text>
              <Text style={[tabs.simLabel, { color: colors.textMuted }]}>Draw</Text>
              <Text style={[tabs.simPct, { color: colors.textSecondary }]}>
                {Math.round((draws / simCount) * 100)}%
              </Text>
            </View>
          )}
          <View style={tabs.simItem}>
            <Text style={[tabs.simNum, { color: colors.red }]}>{awayWins}</Text>
            <Text style={[tabs.simLabel, { color: colors.textMuted }]}>Away win</Text>
            <Text style={[tabs.simPct, { color: colors.textSecondary }]}>
              {Math.round((awayWins / simCount) * 100)}%
            </Text>
          </View>
        </View>
        <View style={[tabs.probCompare, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[tabs.probCompareText, { color: colors.textSecondary }]}>
            AI probability: <Text style={{ color: colors.cyan }}>{prediction.aiProbability}%</Text>
            {"   "}Bookmaker implies: <Text style={{ color: colors.textSecondary }}>{prediction.bookmakerProbability}%</Text>
          </Text>
          <Text style={[tabs.edgeNote, { color: edge1X2 > 0 ? colors.green : colors.red }]}>
            {edge1X2 > 0 ? `+${edge1X2}% edge detected` : `${edge1X2}% vs bookmaker`}
          </Text>
        </View>
      </View>

      {/* ── Outcomes Report ── */}
      <View style={[tabs.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[tabs.sectionTitle, { color: colors.cyan }]}>Outcomes Report</Text>
        <EdgeRow label={`1X2 — ${mainPick}`} edge={edge1X2} />
        <EdgeRow label="Over 2.5 Goals" edge={edgeOver} />
        <EdgeRow label="Both Teams to Score" edge={edgeBTTS} />
        <EdgeRow
          label={`Asian Handicap — ${prediction.prediction === "away_win" ? prediction.awayTeam : prediction.homeTeam}`}
          edge={ahEdge}
        />
      </View>

      {/* ── Odds Comparison ── */}
      <TierGate requiredTier="premium">
        <View style={[tabs.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={tabs.oddsHeader}>
            <Text style={[tabs.sectionTitle, { color: colors.cyan }]}>Odds Comparison</Text>
            <Text style={[tabs.oddsBestNote, { color: colors.green }]}>Best in green</Text>
          </View>
          {/* column headers */}
          <View style={[tabs.oddsRow, { borderBottomColor: colors.border, paddingBottom: 6, marginBottom: 2 }]}>
            <Text style={[tabs.oddsBook, { color: colors.textMuted }]}>Bookmaker</Text>
            <Text style={[tabs.oddsVal, { color: colors.textMuted, textAlign: "center" }]}>Home</Text>
            {prediction.sport === "soccer" && (
              <Text style={[tabs.oddsVal, { color: colors.textMuted, textAlign: "center" }]}>Draw</Text>
            )}
            <Text style={[tabs.oddsVal, { color: colors.textMuted, textAlign: "center" }]}>Away</Text>
          </View>
          {oddsTable.map((bk) => (
            <View key={bk.name} style={[tabs.oddsRow, { borderBottomColor: colors.border }]}>
              <Text style={[tabs.oddsBook, { color: colors.textSecondary }]}>{bk.name}</Text>
              <Text style={[tabs.oddsVal, {
                color: bk.home === bestHome ? colors.green : colors.text,
                fontFamily: bk.home === bestHome ? "Inter_700Bold" : "Inter_400Regular",
              }]}>{bk.home.toFixed(2)}</Text>
              {prediction.sport === "soccer" && (
                <Text style={[tabs.oddsVal, {
                  color: bk.draw === bestDraw ? colors.green : colors.text,
                  fontFamily: bk.draw === bestDraw ? "Inter_700Bold" : "Inter_400Regular",
                }]}>{bk.draw.toFixed(2)}</Text>
              )}
              <Text style={[tabs.oddsVal, {
                color: bk.away === bestAway ? colors.green : colors.text,
                fontFamily: bk.away === bestAway ? "Inter_700Bold" : "Inter_400Regular",
              }]}>{bk.away.toFixed(2)}</Text>
            </View>
          ))}
          <Text style={[tabs.oddsDisclaimer, { color: colors.textMuted }]}>
            Indicative odds · Always verify on bookmaker site
          </Text>
        </View>
      </TierGate>
    </View>
  );
}

// ─── Standings Tab ────────────────────────────────────────────────────────────

function StandingsTab({
  prediction,
  matchDetail,
  loading,
  colors,
}: {
  prediction: Prediction;
  matchDetail: MatchDetailData | null;
  loading: boolean;
  colors: Colors;
}) {
  if (loading) {
    return (
      <View style={[tabs.wrap, tabs.centered]}>
        <ActivityIndicator color={colors.cyan} />
        <Text style={[tabs.metaLabel, { color: colors.textMuted }]}>Loading standings…</Text>
      </View>
    );
  }

  if (!matchDetail?.standings?.length) {
    return (
      <View style={[tabs.wrap, tabs.centered]}>
        <Text style={{ fontSize: 36 }}>📊</Text>
        <Text style={[tabs.sectionTitle, { color: colors.textSecondary }]}>Live Standings</Text>
        <Text style={[tabs.sectionText, { color: colors.textMuted, textAlign: "center" }]}>
          League table is available for soccer fixtures when the API-Sports key is configured.
        </Text>
      </View>
    );
  }

  const homeKey = prediction.homeTeam.toLowerCase().split(" ")[0];
  const awayKey = prediction.awayTeam.toLowerCase().split(" ")[0];

  return (
    <View style={tabs.wrap}>
      <View style={[tabs.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[tabs.sectionTitle, { color: colors.cyan }]}>League Table</Text>
        <View style={tabs.standingHeader}>
          <Text style={[tabs.standRank, { color: colors.textMuted }]}>#</Text>
          <Text style={[tabs.standTeam, { color: colors.textMuted }]}>Team</Text>
          <Text style={[tabs.standStat, { color: colors.textMuted }]}>P</Text>
          <Text style={[tabs.standStat, { color: colors.textMuted }]}>W</Text>
          <Text style={[tabs.standStat, { color: colors.textMuted }]}>D</Text>
          <Text style={[tabs.standStat, { color: colors.textMuted }]}>L</Text>
          <Text style={[tabs.standStat, { color: colors.textMuted }]}>GD</Text>
          <Text style={[tabs.standPts,  { color: colors.textMuted }]}>Pts</Text>
        </View>
        {matchDetail.standings.slice(0, 20).map((row) => {
          const isHome = row.team.toLowerCase().includes(homeKey);
          const isAway = row.team.toLowerCase().includes(awayKey);
          const hl = isHome ? colors.cyan : isAway ? colors.gold : "transparent";
          const textColor = isHome || isAway ? hl : colors.textSecondary;
          return (
            <View
              key={row.rank}
              style={[
                tabs.standRow,
                {
                  backgroundColor: isHome || isAway ? `${hl}15` : "transparent",
                  borderLeftColor: hl,
                  borderLeftWidth: isHome || isAway ? 3 : 0,
                },
              ]}
            >
              <Text style={[tabs.standRank, { color: textColor }]}>{row.rank}</Text>
              <Text style={[tabs.standTeam, { color: isHome || isAway ? hl : colors.text }]} numberOfLines={1}>
                {row.team}
              </Text>
              <Text style={[tabs.standStat, { color: textColor }]}>{row.played}</Text>
              <Text style={[tabs.standStat, { color: textColor }]}>{row.won}</Text>
              <Text style={[tabs.standStat, { color: textColor }]}>{row.drawn}</Text>
              <Text style={[tabs.standStat, { color: textColor }]}>{row.lost}</Text>
              <Text style={[tabs.standStat, { color: row.goalDiff > 0 ? colors.green : row.goalDiff < 0 ? colors.red : textColor }]}>
                {row.goalDiff > 0 ? "+" : ""}{row.goalDiff}
              </Text>
              <Text style={[tabs.standPts, { color: isHome || isAway ? hl : colors.text }]}>{row.points}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────

function StatsTab({
  prediction,
  matchDetail,
  colors,
}: {
  prediction: Prediction;
  matchDetail: MatchDetailData | null;
  colors: Colors;
}) {
  const simData = prediction.simulationData;
  const agents  = prediction.agentScores;
  const hasH2H  = (matchDetail?.h2h?.length ?? 0) > 0;

  const homeXG = simData ? parseFloat(simData.homeMean.toFixed(2)) : null;
  const awayXG = simData ? parseFloat(simData.awayMean.toFixed(2)) : null;
  const maxXG  = homeXG !== null && awayXG !== null ? Math.max(homeXG, awayXG, 0.5) : 1;

  const homeXGbar = homeXG !== null ? (homeXG / (maxXG * 1.2)) * 100 : 0;
  const awayXGbar = awayXG !== null ? (awayXG / (maxXG * 1.2)) * 100 : 0;

  function xGLabel(xg: number): string {
    if (xg >= 2.0) return "High attacking threat";
    if (xg >= 1.4) return "Solid goal threat";
    if (xg >= 0.8) return "Moderate chance creation";
    return "Low attacking output";
  }

  return (
    <View style={tabs.wrap}>
      {/* ── xG Tracker ── */}
      {homeXG !== null && awayXG !== null && (
        <View style={[tabs.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={tabs.xgTitleRow}>
            <Text style={[tabs.sectionTitle, { color: colors.cyan }]}>xG Tracker</Text>
            <Text style={[tabs.xgSubtitle, { color: colors.textMuted }]}>Expected Goals</Text>
          </View>

          <View style={tabs.xgTeamRow}>
            <Text style={[tabs.xgTeamName, { color: colors.text }]} numberOfLines={1}>
              {prediction.homeTeam}
            </Text>
            <View style={tabs.xgBarWrap}>
              <View style={[tabs.xgBarBg, { backgroundColor: colors.border }]}>
                <View style={[tabs.xgBarFill, { width: `${homeXGbar}%`, backgroundColor: colors.cyan }]} />
              </View>
            </View>
            <Text style={[tabs.xgValue, { color: colors.cyan }]}>{homeXG.toFixed(2)}</Text>
          </View>
          <Text style={[tabs.xgLabel, { color: colors.textMuted }]}>{xGLabel(homeXG)}</Text>

          <View style={[tabs.formDivider, { backgroundColor: colors.border, marginVertical: 8 }]} />

          <View style={tabs.xgTeamRow}>
            <Text style={[tabs.xgTeamName, { color: colors.text }]} numberOfLines={1}>
              {prediction.awayTeam}
            </Text>
            <View style={tabs.xgBarWrap}>
              <View style={[tabs.xgBarBg, { backgroundColor: colors.border }]}>
                <View style={[tabs.xgBarFill, { width: `${awayXGbar}%`, backgroundColor: "#FF6B6B" }]} />
              </View>
            </View>
            <Text style={[tabs.xgValue, { color: "#FF6B6B" }]}>{awayXG.toFixed(2)}</Text>
          </View>
          <Text style={[tabs.xgLabel, { color: colors.textMuted }]}>{xGLabel(awayXG)}</Text>

          <View style={[tabs.xgNote, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Feather name="info" size={12} color={colors.textMuted} />
            <Text style={[tabs.xgNoteText, { color: colors.textMuted }]}>
              xG above 1.5 typically indicates a team is likely to score.{" "}
              {homeXG > awayXG
                ? `${prediction.homeTeam} hold the attacking edge.`
                : homeXG < awayXG
                ? `${prediction.awayTeam} have the stronger goal threat.`
                : "Both teams are evenly matched in attack."}
            </Text>
          </View>
        </View>
      )}

      {/* ── Head to Head ── */}
      <View style={[tabs.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[tabs.sectionTitle, { color: colors.cyan }]}>Head to Head</Text>
        {hasH2H ? (
          matchDetail!.h2h.map((m, i) => (
            <View key={i} style={[tabs.legacyH2hRow, { borderBottomColor: colors.border }]}>
              <Text style={[tabs.legacyH2hTeam, { color: colors.textSecondary }]} numberOfLines={1}>{m.homeTeam}</Text>
              <View style={[tabs.legacyH2hScore, { backgroundColor: colors.background }]}>
                <Text style={[tabs.legacyH2hScoreText, { color: colors.text }]}>{m.homeScore} – {m.awayScore}</Text>
              </View>
              <Text style={[tabs.legacyH2hTeam, { color: colors.textSecondary, textAlign: "right" }]} numberOfLines={1}>{m.awayTeam}</Text>
              {m.date ? (
                <Text style={[tabs.legacyH2hDate, { color: colors.textMuted }]}>
                  {new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={[tabs.sectionText, { color: colors.textMuted }]}>
            H2H data is available for soccer matches with API-Sports configured.
          </Text>
        )}
      </View>

      {/* ── Key Statistics ── */}
      <View style={[tabs.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[tabs.sectionTitle, { color: colors.cyan }]}>Key Statistics</Text>
        {simData ? (
          <>
            <StatRow label="Avg Goals Per Game" value={(simData.homeMean + simData.awayMean).toFixed(1)} colors={colors} />
            <StatRow label="Both Teams to Score" value={`${Math.round(simData.bttsProb)}%`} colors={colors} />
            <StatRow label="Over 2.5 Goals"      value={`${Math.round(simData.over25Prob)}%`} colors={colors} />
            <StatRow label="Predicted Home Goals" value={simData.homeMean.toFixed(1)} colors={colors} />
            <StatRow label="Predicted Away Goals" value={simData.awayMean.toFixed(1)} colors={colors} />
          </>
        ) : null}
        {agents ? (
          <>
            <StatRow label="Form Advantage"   value={`${Math.round(agents.form)}%`}     colors={colors} />
            <StatRow label="H2H Record"        value={`${Math.round(agents.h2h)}%`}      colors={colors} />
            <StatRow label="Tactical Edge"     value={`${Math.round(agents.tactical)}%`} colors={colors} />
            <StatRow label="Injury Impact"     value={`${Math.round(agents.injury)}%`}   colors={colors} />
          </>
        ) : null}
        {!simData && !agents && (
          <Text style={[tabs.sectionText, { color: colors.textMuted }]}>
            Detailed stats are available on Premium tier.
          </Text>
        )}
      </View>
    </View>
  );
}

function StatRow({ label, value, colors }: { label: string; value: string; colors: Colors }) {
  return (
    <View style={[tabs.statRow, { borderBottomColor: colors.border }]}>
      <Text style={[tabs.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[tabs.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

// ─── Correct Score Tab ────────────────────────────────────────────────────────

function ScoreTab({ prediction, colors }: { prediction: Prediction; colors: Colors }) {
  const simData = prediction.simulationData;

  if (!simData?.scorelineProbabilities?.length) {
    return (
      <View style={[tabs.wrap, tabs.centered]}>
        <Text style={{ fontSize: 36 }}>🎯</Text>
        <Text style={[tabs.sectionTitle, { color: colors.textSecondary }]}>Correct Score Predictor</Text>
        <Text style={[tabs.sectionText, { color: colors.textMuted, textAlign: "center" }]}>
          Scoreline probabilities are available on Premium tier with Monte Carlo simulation data.
        </Text>
      </View>
    );
  }

  const sorted = [...simData.scorelineProbabilities].sort((a, b) => b.probability - a.probability);
  const top    = sorted[0];
  const top9   = sorted.slice(0, 9);

  return (
    <View style={tabs.wrap}>
      <View style={[tabs.section, { backgroundColor: "rgba(0,229,255,0.06)", borderColor: colors.cyan }]}>
        <Text style={[tabs.sectionTitle, { color: colors.cyan }]}>AI Predicted Score</Text>
        <Text style={[tabs.topScoreText, { color: colors.text }]}>{top.home} – {top.away}</Text>
        <Text style={[tabs.topScorePct, { color: colors.cyan }]}>{Math.round(top.probability)}% probability</Text>
        <Text style={[tabs.topScoreSub, { color: colors.textMuted }]}>
          {prediction.homeTeam} {top.home > top.away ? "wins" : top.home < top.away ? "loses" : "draws"}
        </Text>
      </View>

      <TierGate requiredTier="premium">
        <View style={[tabs.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[tabs.sectionTitle, { color: colors.cyan }]}>Score Probability Grid</Text>
          <View style={tabs.scoreGrid}>
            {top9.map((s, i) => {
              const isTop = s === top;
              return (
                <View
                  key={i}
                  style={[
                    tabs.scoreCell,
                    {
                      backgroundColor: isTop ? "rgba(0,229,255,0.12)" : colors.background,
                      borderColor:     isTop ? colors.cyan : colors.border,
                    },
                  ]}
                >
                  <Text style={[tabs.scoreCellScore, { color: isTop ? colors.cyan : colors.text }]}>
                    {s.home}-{s.away}
                  </Text>
                  <Text style={[tabs.scoreCellPct, { color: colors.textMuted }]}>
                    {Math.round(s.probability)}%
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </TierGate>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MatchDetailScreen() {
  const router  = useRouter();
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { token } = useAuth();

  const [activeTab,      setActiveTab]      = useState<TabId>("AI Analysis");
  const [matchDetail,    setMatchDetail]    = useState<MatchDetailData | null>(null);
  const [detailLoading,  setDetailLoading]  = useState(false);
  const [preview,        setPreview]        = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [fdH2H,          setFdH2H]          = useState<FDH2HSummary | null>(null);
  const [fdH2HLoading,   setFdH2HLoading]   = useState(false);
  const [fdH2HFetched,   setFdH2HFetched]   = useState(false);

  const { prediction, soccerFixtureId } = matchDetailStore.get();

  useEffect(() => {
    if (!soccerFixtureId || !token) return;
    setDetailLoading(true);
    api.soccer
      .fixtureDetail(token, soccerFixtureId)
      .then((d) => setMatchDetail(d))
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }, [soccerFixtureId, token]);

  // Lazy-load H2H from Football-Data when Prematch tab is opened (soccer only)
  useEffect(() => {
    if (
      activeTab !== "Prematch" ||
      !prediction ||
      !token ||
      fdH2HFetched ||
      prediction.sport !== "soccer"
    ) return;
    setFdH2HFetched(true);
    setFdH2HLoading(true);
    api.footballData
      .h2h(token, {
        homeTeam:  prediction.homeTeam,
        awayTeam:  prediction.awayTeam,
        league:    prediction.league,
        matchDate: prediction.matchDate,
      })
      .then((data) => setFdH2H(data))
      .catch(() => {})
      .finally(() => setFdH2HLoading(false));
  }, [activeTab, prediction, token, fdH2HFetched]);

  useEffect(() => {
    if (!prediction || !token) return;
    setPreviewLoading(true);
    api.soccer
      .preview(token, {
        homeTeam:   prediction.homeTeam,
        awayTeam:   prediction.awayTeam,
        league:     prediction.league,
        sport:      prediction.sport,
        prediction: prediction.prediction,
        keyFactors: prediction.keyFactors ?? [],
        reasoning:  prediction.reasoning ?? "",
        confidence: prediction.confidence,
      })
      .then((r) => setPreview(r.preview))
      .catch(() => {})
      .finally(() => setPreviewLoading(false));
  }, [prediction?.id, token]);

  if (!prediction) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { paddingTop: insets.top + 16, paddingHorizontal: 16 }]}
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.centered}>
          <Text style={{ color: colors.textMuted }}>No match selected</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <SportBadge sport={prediction.sport} size="sm" />
          <Text style={[styles.headerLeague, { color: colors.textMuted }]} numberOfLines={1}>
            {prediction.league}
          </Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <View style={[styles.matchTitle, { borderBottomColor: colors.border }]}>
        <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
          {prediction.homeTeam}
        </Text>
        <Text style={[styles.vsText, { color: colors.textMuted }]}>vs</Text>
        <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
          {prediction.awayTeam}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab(tab);
            }}
            style={[styles.tab, { borderBottomColor: activeTab === tab ? colors.cyan : "transparent" }]}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.cyan : colors.textMuted }]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentPad, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "AI Analysis" && (
          <AIAnalysisTab prediction={prediction} colors={colors} />
        )}
        {activeTab === "Prematch" && (
          <PrematchTab
            prediction={prediction}
            matchDetail={matchDetail}
            preview={preview}
            previewLoading={previewLoading}
            fdH2H={fdH2H}
            fdH2HLoading={fdH2HLoading}
            colors={colors}
          />
        )}
        {activeTab === "Standings" && (
          <StandingsTab prediction={prediction} matchDetail={matchDetail} loading={detailLoading} colors={colors} />
        )}
        {activeTab === "Stats" && (
          <StatsTab prediction={prediction} matchDetail={matchDetail} colors={colors} />
        )}
        {activeTab === "Score" && (
          <ScoreTab prediction={prediction} colors={colors} />
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1 },
  centered:     { flex: 1, alignItems: "center", justifyContent: "center" },
  header:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn:      {},
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" },
  headerLeague: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, textAlign: "center" },
  matchTitle:   {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  teamName:     { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  vsText:       { fontSize: 11, fontFamily: "Inter_400Regular" },
  tabBar:       { flexGrow: 0, borderBottomWidth: 1 },
  tabBarContent:{ paddingHorizontal: 8, flexDirection: "row" },
  tab:          { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2 },
  tabText:      { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
  content:      { flex: 1 },
  contentPad:   { padding: 16 },
});

const tabs = StyleSheet.create({
  wrap:       { gap: 12 },
  centered:   { alignItems: "center", justifyContent: "center", gap: 14, paddingVertical: 60 },
  meterRow:   { flexDirection: "row", alignItems: "center", gap: 20, marginBottom: 4 },
  meterInfo:  { flex: 1, gap: 10 },
  metaLabel:  { fontSize: 12, fontFamily: "Inter_400Regular" },
  predBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, alignSelf: "flex-start" },
  predText:   { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  banner:     { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  bannerText: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },
  section:    { borderRadius: 14, padding: 14, borderWidth: 1, gap: 8 },
  sectionTitle:{ fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8, textTransform: "uppercase" },
  sectionText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  factorRow:  { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  factorText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  probRow:    { flexDirection: "row", alignItems: "center", gap: 10 },
  probLabel:  { fontSize: 12, fontFamily: "Inter_500Medium", width: 72 },
  probBar:    { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  probFill:   { height: "100%", borderRadius: 3 },
  probValue:  { fontSize: 12, fontFamily: "Inter_700Bold", width: 36, textAlign: "right" },
  // Win Probability 3-way bar
  triBarOuter:   { flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden", marginTop: 4 },
  triSegHome:    { height: "100%" },
  triSegDraw:    { height: "100%", marginHorizontal: 2 },
  triSegAway:    { height: "100%" },
  triLabels:     { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  triLabelItem:  { alignItems: "center", gap: 2, flex: 1 },
  triDot:        { width: 8, height: 8, borderRadius: 4 },
  triLabelName:  { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  triLabelPct:   { fontSize: 13, fontFamily: "Inter_700Bold" },
  // Oracle Preview
  previewHeader:    { flexDirection: "row", alignItems: "center", gap: 8 },
  oracleBadge:      { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: "rgba(0,229,255,0.15)" },
  oracleBadgeText:  { fontSize: 9, fontFamily: "Inter_700Bold", color: "#00E5FF", letterSpacing: 0.5 },
  previewLoading:   { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  previewLoadingText:{ fontSize: 13, fontFamily: "Inter_400Regular" },
  previewText:      { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  // Form
  formTeamRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  formTeamName: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  dotsRow:      { flexDirection: "row", gap: 5 },
  dot:          { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dotText:      { fontSize: 9, fontFamily: "Inter_700Bold", color: "#070B12" },
  formDivider:  { height: 1, marginVertical: 6 },
  formScore:    { fontSize: 12, fontFamily: "Inter_400Regular" },
  // Similar
  simRow:         { flexDirection: "row", justifyContent: "space-around", paddingVertical: 8 },
  simItem:        { alignItems: "center", gap: 2 },
  simNum:         { fontSize: 28, fontFamily: "Inter_700Bold" },
  simLabel:       { fontSize: 11, fontFamily: "Inter_400Regular" },
  simPct:         { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  probCompare:    { borderRadius: 10, padding: 10, borderWidth: 1, gap: 4 },
  probCompareText:{ fontSize: 12, fontFamily: "Inter_400Regular" },
  edgeNote:       { fontSize: 13, fontFamily: "Inter_700Bold" },
  // Outcomes
  edgeRow:   { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  edgeLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  edgeValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  // Odds Comparison
  oddsHeader:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  oddsBestNote:    { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  oddsRow:         { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, gap: 4 },
  oddsBook:        { flex: 1.4, fontSize: 12, fontFamily: "Inter_400Regular" },
  oddsVal:         { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  oddsDisclaimer:  { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  // Standings
  standingHeader: { flexDirection: "row", paddingVertical: 6, paddingLeft: 4, gap: 2 },
  standRow:       { flexDirection: "row", alignItems: "center", paddingVertical: 7, paddingLeft: 4, gap: 2 },
  standRank:      { width: 22, fontSize: 11, fontFamily: "Inter_700Bold", textAlign: "center" },
  standTeam:      { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  standStat:      { width: 22, fontSize: 11, textAlign: "center", fontFamily: "Inter_400Regular" },
  standPts:       { width: 28, fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "center" },
  // H2H
  h2hRow:          { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, gap: 5 },
  h2hDate:         { width: 44, fontSize: 10, fontFamily: "Inter_400Regular" },
  h2hTeam:         { flex: 1, fontSize: 11, fontFamily: "Inter_500Medium" },
  h2hTeamAway:     { flex: 1, fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "right" },
  h2hScore:        { fontSize: 14, fontFamily: "Inter_700Bold", paddingHorizontal: 6, minWidth: 40, textAlign: "center" },
  h2hBadge:        { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  h2hBadgeText:    { fontSize: 9, fontFamily: "Inter_700Bold" },
  h2hSummary:      { flexDirection: "row", justifyContent: "space-around", borderRadius: 10, padding: 10, marginTop: 6, borderWidth: 1 },
  h2hSummaryItem:  { alignItems: "center", gap: 2 },
  h2hSummaryNum:   { fontSize: 22, fontFamily: "Inter_700Bold" },
  h2hSummaryLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  h2hPowered:      { fontSize: 9, fontFamily: "Inter_400Regular", marginTop: 4 },
  // xG Tracker
  xgTitleRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  xgSubtitle:  { fontSize: 11, fontFamily: "Inter_400Regular" },
  xgTeamRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  xgTeamName:  { width: 90, fontSize: 12, fontFamily: "Inter_500Medium" },
  xgBarWrap:   { flex: 1 },
  xgBarBg:     { height: 8, borderRadius: 4, overflow: "hidden" },
  xgBarFill:   { height: "100%", borderRadius: 4 },
  xgValue:     { width: 36, fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "right" },
  xgLabel:     { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  xgNote:      { flexDirection: "row", alignItems: "flex-start", gap: 6, padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 4 },
  xgNoteText:  { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  // Stats (legacy H2H from API-Sports stats tab)
  legacyH2hRow:       { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, gap: 6 },
  legacyH2hTeam:      { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  legacyH2hScore:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  legacyH2hScoreText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  legacyH2hDate:      { fontSize: 10, fontFamily: "Inter_400Regular", width: 40, textAlign: "right" },
  statRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1 },
  statLabel:    { fontSize: 13, fontFamily: "Inter_400Regular" },
  statValue:    { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  // Score
  topScoreText: { fontSize: 52, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -1 },
  topScorePct:  { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  topScoreSub:  { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  scoreGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
  scoreCell:    { width: "30%", padding: 10, borderRadius: 10, borderWidth: 1, alignItems: "center", gap: 2 },
  scoreCellScore:{ fontSize: 15, fontFamily: "Inter_700Bold" },
  scoreCellPct: { fontSize: 11, fontFamily: "Inter_400Regular" },
  // Disclaimer
  disclaimer:     { paddingVertical: 20, alignItems: "center" },
  disclaimerText: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 16 },
});
