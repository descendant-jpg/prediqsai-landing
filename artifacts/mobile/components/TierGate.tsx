import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import type { Tier } from "@/types";

const TIER_LEVELS: Record<Tier, number> = { free: 0, pro: 1, elite: 2 };

function canAccess(userTier: Tier, requiredTier: Tier): boolean {
  return TIER_LEVELS[userTier] >= TIER_LEVELS[requiredTier];
}

interface Props {
  requiredTier: Tier;
  children: React.ReactNode;
}

export function TierGate({ requiredTier, children }: Props) {
  const { profile } = useApp();
  const colors = useColors();
  const router = useRouter();

  if (canAccess(profile.tier, requiredTier)) {
    return <>{children}</>;
  }

  const tierLabel = requiredTier === "elite" ? "ELITE" : "PRO";
  const tierColor = requiredTier === "elite" ? colors.gold : colors.cyan;

  return (
    <View style={styles.container}>
      <View style={styles.blur} pointerEvents="none">
        {children}
      </View>
      <View style={[styles.overlay, { backgroundColor: "rgba(7,11,18,0.85)" }]}>
        <View style={[styles.badge, { backgroundColor: "rgba(0,229,255,0.08)", borderColor: tierColor }]}>
          <Ionicons
            name={requiredTier === "elite" ? "diamond" : "flash"}
            size={20}
            color={tierColor}
          />
          <Text style={[styles.tierLabel, { color: tierColor }]}>{tierLabel} Feature</Text>
        </View>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>
          Upgrade to unlock full analysis
        </Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.cyan }]}
          onPress={() => {}}
          activeOpacity={0.8}
        >
          <Text style={[styles.btnText, { color: colors.background }]}>Upgrade Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative" },
  blur: { opacity: 0.15 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tierLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  desc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  btn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  btnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
