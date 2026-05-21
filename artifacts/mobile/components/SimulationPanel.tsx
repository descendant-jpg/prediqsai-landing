import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { SimulationData } from "@/types";

interface Props {
  data: SimulationData;
  homeTeam: string;
  awayTeam: string;
}

export function SimulationPanel({ data, homeTeam, awayTeam }: Props) {
  const colors = useColors();

  const top = [...data.scorelineProbabilities]
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 6);

  const maxProb = top[0]?.probability ?? 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.cyan }]}>Match Simulation</Text>
        <Text style={[styles.iterations, { color: colors.textMuted }]}>
          1,000× runs
        </Text>
      </View>

      <View style={[styles.meansRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.meanItem}>
          <Text style={[styles.meanTeam, { color: colors.textSecondary }]} numberOfLines={1}>{homeTeam}</Text>
          <Text style={[styles.meanValue, { color: colors.text }]}>{data.homeMean.toFixed(1)}</Text>
          <Text style={[styles.meanLabel, { color: colors.textMuted }]}>xGoals</Text>
        </View>
        <Text style={[styles.meanVs, { color: colors.textMuted }]}>vs</Text>
        <View style={styles.meanItem}>
          <Text style={[styles.meanTeam, { color: colors.textSecondary }]} numberOfLines={1}>{awayTeam}</Text>
          <Text style={[styles.meanValue, { color: colors.text }]}>{data.awayMean.toFixed(1)}</Text>
          <Text style={[styles.meanLabel, { color: colors.textMuted }]}>xGoals</Text>
        </View>
      </View>

      <Text style={[styles.scorelineHeader, { color: colors.textSecondary }]}>Most likely scorelines</Text>
      <View style={styles.scorelineList}>
        {top.map((s, i) => {
          const barWidth = `${(s.probability / maxProb) * 100}%` as `${number}%`;
          const isTop = i === 0;
          return (
            <View key={i} style={styles.scorelineRow}>
              <Text style={[styles.scorelineLabel, { color: isTop ? colors.gold : colors.text }]}>
                {s.home}-{s.away}
              </Text>
              <View style={styles.scorelineBarWrap}>
                <View style={[styles.scorelineBarTrack, { backgroundColor: colors.border }]}>
                  <View style={[
                    styles.scorelineBarFill,
                    { width: barWidth, backgroundColor: isTop ? colors.gold : colors.cyan },
                  ]} />
                </View>
                <Text style={[styles.scorelinePct, { color: isTop ? colors.gold : colors.textSecondary }]}>
                  {s.probability.toFixed(0)}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statBubble, { backgroundColor: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.2)" }]}>
          <Text style={[styles.statValue, { color: colors.cyan }]}>{data.bttsProb.toFixed(0)}%</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>BTTS</Text>
        </View>
        <View style={[styles.statBubble, { backgroundColor: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.2)" }]}>
          <Text style={[styles.statValue, { color: colors.cyan }]}>{data.over25Prob.toFixed(0)}%</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Over 2.5</Text>
        </View>
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
  iterations: { fontSize: 11, fontFamily: "Inter_400Regular" },
  meansRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
  },
  meanItem: { alignItems: "center", flex: 1 },
  meanTeam: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  meanValue: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  meanLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  meanVs: { fontSize: 12 },
  scorelineHeader: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: -4,
  },
  scorelineList: { gap: 6 },
  scorelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scorelineLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    width: 36,
    textAlign: "center",
  },
  scorelineBarWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scorelineBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  scorelineBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  scorelinePct: { fontSize: 12, fontFamily: "Inter_700Bold", width: 32, textAlign: "right" },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  statBubble: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
  },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.4 },
});
