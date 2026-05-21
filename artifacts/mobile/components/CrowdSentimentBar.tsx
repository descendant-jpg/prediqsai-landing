import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { PublicBacking, PredictionType } from "@/types";

interface Props {
  backing: PublicBacking;
  prediction: PredictionType;
  homeTeam: string;
  awayTeam: string;
}

export function CrowdSentimentBar({ backing, prediction, homeTeam, awayTeam }: Props) {
  const colors = useColors();

  const homeW = backing.homePercent;
  const drawW = backing.drawPercent;
  const awayW = backing.awayPercent;

  const isContrarian = backing.contrarian;

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: isContrarian ? "rgba(255,215,0,0.05)" : colors.card,
        borderColor: isContrarian ? colors.gold : colors.cardBorder,
      },
    ]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isContrarian ? colors.gold : colors.cyan }]}>
          {isContrarian ? "⚡ Contrarian Play" : "Public Sentiment"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Est. public backing %</Text>
      </View>

      <View style={styles.teamsRow}>
        <Text style={[styles.teamLabel, { color: colors.textSecondary }]} numberOfLines={1}>{homeTeam}</Text>
        <Text style={[styles.drawLabel, { color: colors.textMuted }]}>Draw</Text>
        <Text style={[styles.teamLabel, { color: colors.textSecondary }]} numberOfLines={1}>{awayTeam}</Text>
      </View>

      <View style={styles.barRow}>
        <View style={[styles.homeBar, { flex: homeW, backgroundColor: "#00E5FF" }]} />
        <View style={[styles.drawBar, { flex: drawW, backgroundColor: "#A0AEC0" }]} />
        <View style={[styles.awayBar, { flex: awayW, backgroundColor: "#FF6B35" }]} />
      </View>

      <View style={styles.pctRow}>
        <Text style={[styles.pct, { color: "#00E5FF" }]}>{homeW.toFixed(0)}%</Text>
        <Text style={[styles.pct, { color: "#A0AEC0" }]}>{drawW.toFixed(0)}%</Text>
        <Text style={[styles.pct, { color: "#FF6B35" }]}>{awayW.toFixed(0)}%</Text>
      </View>

      {isContrarian && backing.contrarianNote && (
        <View style={[styles.contrarianBox, { backgroundColor: "rgba(255,215,0,0.08)", borderColor: "rgba(255,215,0,0.3)" }]}>
          <Text style={[styles.contrarianText, { color: colors.gold }]}>
            {backing.contrarianNote}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
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
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular" },
  teamsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teamLabel: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  drawLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", flex: 0.8 },
  barRow: {
    flexDirection: "row",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    gap: 2,
  },
  homeBar: { borderRadius: 5 },
  drawBar: { borderRadius: 5 },
  awayBar: { borderRadius: 5 },
  pctRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -2,
  },
  pct: { fontSize: 12, fontFamily: "Inter_700Bold" },
  contrarianBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginTop: 4,
  },
  contrarianText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 19,
  },
});
