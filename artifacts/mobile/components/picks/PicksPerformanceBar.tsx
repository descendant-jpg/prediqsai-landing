import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { TODAY_PERFORMANCE } from "@/lib/mockData";

/** Feature 1 — slim "today's performance" tracker bar shown under the header. */
export function PicksPerformanceBar() {
  const colors = useColors();
  const { won, lost, pending } = TODAY_PERFORMANCE;
  const settled = won + lost;
  const winRate = settled > 0 ? Math.round((won / settled) * 100) : 0;

  return (
    <View style={[styles.bar, { backgroundColor: "#121212", borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>Today</Text>
      <View style={styles.stats}>
        <Stat value={`${won}W`} color={colors.green} />
        <Dot color={colors.textMuted} />
        <Stat value={`${lost}L`} color={colors.red} />
        <Dot color={colors.textMuted} />
        <Stat value={`${pending}P`} color={colors.gold} />
      </View>
      <View style={[styles.rate, { backgroundColor: "rgba(255,215,0,0.12)" }]}>
        <Text style={[styles.rateText, { color: colors.gold }]}>{winRate}% Win</Text>
      </View>
    </View>
  );
}

function Stat({ value, color }: { value: string; color: string }) {
  return <Text style={[styles.statText, { color }]}>{value}</Text>;
}

function Dot({ color }: { color: string }) {
  return <Text style={[styles.dot, { color }]}>•</Text>;
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  label: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  stats: { flexDirection: "row", alignItems: "center", gap: 8 },
  statText: { fontSize: 14, fontWeight: "800" },
  dot: { fontSize: 12 },
  rate: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  rateText: { fontSize: 12, fontWeight: "800" },
});
