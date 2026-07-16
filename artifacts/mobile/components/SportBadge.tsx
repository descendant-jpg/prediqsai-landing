import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { SportType } from "@/types";

const SPORT_CONFIG: Record<SportType, { label: string; color: string; bg: string }> = {
  nfl: { label: "NFL", color: "#FF6B35", bg: "rgba(255,107,53,0.15)" },
  nba: { label: "NBA", color: "#00E5FF", bg: "rgba(0,229,255,0.15)" },
  mlb: { label: "MLB", color: "#FFD700", bg: "rgba(255,215,0,0.15)" },
  soccer: { label: "SOCCER", color: "#00FF94", bg: "rgba(0,255,148,0.15)" },
  hockey: { label: "HOCKEY", color: "#7DD3FC", bg: "rgba(125,211,252,0.15)" },
  afl: { label: "AFL", color: "#F97316", bg: "rgba(249,115,22,0.15)" },
  rugby: { label: "RUGBY", color: "#A3E635", bg: "rgba(163,230,53,0.15)" },
  handball: { label: "HANDBALL", color: "#F472B6", bg: "rgba(244,114,182,0.15)" },
  volleyball: { label: "VOLLEYBALL", color: "#FACC15", bg: "rgba(250,204,21,0.15)" },
  mma: { label: "MMA", color: "#EF4444", bg: "rgba(239,68,68,0.15)" },
  formula1: { label: "F1", color: "#E11D48", bg: "rgba(225,29,72,0.15)" },
};

interface Props {
  sport: SportType;
  size?: "sm" | "md";
}

export function SportBadge({ sport, size = "md" }: Props) {
  const config = SPORT_CONFIG[sport] ?? {
    label: String(sport).toUpperCase(),
    color: "#94A3B8",
    bg: "rgba(148,163,184,0.15)",
  };
  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, borderColor: config.color },
        isSmall && styles.small,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: config.color },
          isSmall && styles.labelSmall,
        ]}
      >
        {config.label}
      </Text>
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
  small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontFamily: "Inter_700Bold",
  },
  labelSmall: {
    fontSize: 9,
  },
});
