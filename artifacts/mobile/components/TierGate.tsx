import { Crown, Lock, Zap } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import type { Tier } from "@/types";

const TIER_LEVELS: Record<Tier, number> = { free: 0, pro: 1, elite: 2 };

function canAccess(userTier: Tier, requiredTier: Tier): boolean {
  return TIER_LEVELS[userTier] >= TIER_LEVELS[requiredTier];
}

const TIER_CONFIG: Record<"pro" | "elite", { color: string; label: string; price: string; icon: "zap" | "crown" }> = {
  pro:   { color: "#00E5FF", label: "PRO",   price: "$14.99/mo", icon: "zap" },
  elite: { color: "#FFD700", label: "ELITE", price: "$39.99/mo", icon: "crown" },
};

interface Props {
  requiredTier: Tier;
  children: React.ReactNode;
}

export function TierGate({ requiredTier, children }: Props) {
  const { profile } = useApp();
  const colors = useColors();

  if (requiredTier === "free" || canAccess(profile.tier, requiredTier)) {
    return <>{children}</>;
  }

  const cfg = TIER_CONFIG[requiredTier as "pro" | "elite"];
  const userIsProSeeingElite = profile.tier === "pro" && requiredTier === "elite";

  const lockLabel = userIsProSeeingElite
    ? `👑 Upgrade to ${cfg.label} — ${cfg.price}`
    : `🔒 Upgrade to ${cfg.label} — ${cfg.price}`;

  return (
    <View style={styles.container}>
      <View style={[styles.blur, { pointerEvents: "none" } as any]}>
        {children}
      </View>
      <View style={[styles.overlay, { backgroundColor: "rgba(7,11,18,0.88)" }]}>
        <View style={[styles.badge, { backgroundColor: `${cfg.color}12`, borderColor: cfg.color }]}>
          {cfg.icon === "crown" ? (
            <Crown size={18} color={cfg.color} />
          ) : (
            <Zap size={18} color={cfg.color} />
          )}
          <Text style={[styles.tierLabel, { color: cfg.color }]}>{cfg.label} Feature</Text>
        </View>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>
          Upgrade to unlock full analysis
        </Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: cfg.color }]}
          activeOpacity={0.8}
        >
          <Lock size={13} color={colors.background} />
          <Text style={[styles.btnText, { color: colors.background }]}>{lockLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative" },
  blur: { opacity: 0.12 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 10,
    padding: 16,
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
  tierLabel: { fontSize: 14, letterSpacing: 0.5 },
  desc: { fontSize: 13 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  btnText: { fontSize: 13 },
});
