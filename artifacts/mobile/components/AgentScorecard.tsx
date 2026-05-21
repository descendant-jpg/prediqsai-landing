import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { AgentScores } from "@/types";

const AGENTS: { key: keyof AgentScores; label: string; icon: string }[] = [
  { key: "form",     label: "Form",     icon: "📈" },
  { key: "h2h",      label: "H2H",      icon: "🔄" },
  { key: "injury",   label: "Injuries", icon: "🏥" },
  { key: "tactical", label: "Tactics",  icon: "🧠" },
  { key: "odds",     label: "Odds",     icon: "📊" },
  { key: "sentiment",label: "Sentiment",icon: "📰" },
  { key: "weather",  label: "Weather",  icon: "🌤️" },
  { key: "referee",  label: "Referee",  icon: "🟨" },
];

function scoreColor(score: number): string {
  if (score >= 75) return "#00FF94";
  if (score >= 55) return "#00E5FF";
  if (score >= 40) return "#FFD700";
  return "#FF4D4D";
}

interface Props {
  scores: AgentScores;
}

export function AgentScorecard({ scores }: Props) {
  const colors = useColors();
  const overall = Math.round(
    Object.values(scores).reduce((s, v) => s + v, 0) / Object.values(scores).length,
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.cyan }]}>Multi-Agent Analysis</Text>
        <View style={[styles.overallBadge, { backgroundColor: `${scoreColor(overall)}18`, borderColor: scoreColor(overall) }]}>
          <Text style={[styles.overallText, { color: scoreColor(overall) }]}>{overall}</Text>
        </View>
      </View>
      <Text style={[styles.sub, { color: colors.textMuted }]}>8 specialist AI agents scored this match</Text>

      <View style={styles.grid}>
        {AGENTS.map(({ key, label, icon }) => {
          const score = scores[key] ?? 50;
          const color = scoreColor(score);
          const barWidth = `${score}%` as `${number}%`;
          return (
            <View key={key} style={styles.agentRow}>
              <Text style={styles.agentIcon}>{icon}</Text>
              <View style={styles.agentInfo}>
                <View style={styles.agentLabelRow}>
                  <Text style={[styles.agentLabel, { color: colors.textSecondary }]}>{label}</Text>
                  <Text style={[styles.agentScore, { color }]}>{score}</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.barFill, { width: barWidth, backgroundColor: color }]} />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  overallBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  overallText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  sub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: -6,
  },
  grid: { gap: 8 },
  agentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  agentIcon: { fontSize: 14, width: 22, textAlign: "center" },
  agentInfo: { flex: 1, gap: 3 },
  agentLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  agentLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  agentScore: { fontSize: 12, fontFamily: "Inter_700Bold", width: 28, textAlign: "right" },
  barTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
  },
});
