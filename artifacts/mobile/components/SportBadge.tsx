import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { SportType } from "@/types";

const SPORT_CONFIG: Record<SportType, { label: string; color: string; bg: string }> = {
  nfl: { label: "NFL", color: "#FF6B35", bg: "rgba(255,107,53,0.15)" },
  nba: { label: "NBA", color: "#00E5FF", bg: "rgba(0,229,255,0.15)" },
  mlb: { label: "MLB", color: "#FFD700", bg: "rgba(255,215,0,0.15)" },
  soccer: { label: "SOCCER", color: "#00FF94", bg: "rgba(0,255,148,0.15)" },
};

interface Props {
  sport: SportType;
  size?: "sm" | "md";
}

export function SportBadge({ sport, size = "md" }: Props) {
  const config = SPORT_CONFIG[sport];
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
