import { ChevronRight } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  won: number;
  lost: number;
  pending: number;
  /** When provided, the bar becomes tappable (opens the AI Accuracy Report). */
  onPress?: () => void;
}

/** Feature 1 — slim performance tracker bar shown under the header. Driven by real accuracy stats. */
export function PicksPerformanceBar({ won, lost, pending, onPress }: Props) {
  const colors = useColors();
  const settled = won + lost;
  const winRate = settled > 0 ? Math.round((won / settled) * 100) : 0;

  return (
    <TouchableOpacity
      style={[styles.bar, { backgroundColor: "#121212", borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      disabled={!onPress}
    >
      <Text style={[styles.label, { color: colors.textMuted }]}>This month</Text>
      <View style={styles.stats}>
        <Stat value={`${won}W`} color={colors.green} />
        <Dot color={colors.textMuted} />
        <Stat value={`${lost}L`} color={colors.red} />
        <Dot color={colors.textMuted} />
        <Stat value={`${pending}P`} color={colors.gold} />
      </View>
      <View style={styles.rateWrap}>
        <View style={[styles.rate, { backgroundColor: "rgba(255,215,0,0.12)" }]}>
          <Text style={[styles.rateText, { color: colors.gold }]}>{winRate}% Win</Text>
        </View>
        {onPress ? <ChevronRight size={14} color={colors.textMuted} /> : null}
      </View>
    </TouchableOpacity>
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
  rateWrap: { flexDirection: "row", alignItems: "center", gap: 2 },
});
