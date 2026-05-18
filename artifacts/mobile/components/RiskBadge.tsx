import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { RiskLevel } from "@/types";

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  low: { label: "LOW RISK", color: "#00FF94", bg: "rgba(0,255,148,0.12)" },
  medium: { label: "MED RISK", color: "#FFD700", bg: "rgba(255,215,0,0.12)" },
  high: { label: "HIGH RISK", color: "#FF4D4D", bg: "rgba(255,77,77,0.12)" },
};

interface Props {
  risk: RiskLevel;
}

export function RiskBadge({ risk }: Props) {
  const config = RISK_CONFIG[risk];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.color }]}>
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontFamily: "Inter_700Bold",
  },
});
