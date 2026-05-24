import { Lock, Star } from "lucide-react-native";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

// Accepts both old ("pro","elite") and new ("premium") tier names for backward compatibility
type RequiredTier = "free" | "premium" | "pro" | "elite";

function isPremiumRequired(requiredTier: RequiredTier): boolean {
  return requiredTier === "premium" || requiredTier === "pro" || requiredTier === "elite";
}

function hasAccess(userTier: string, requiredTier: RequiredTier): boolean {
  if (!isPremiumRequired(requiredTier)) return true;
  return userTier === "premium" || userTier === "pro" || userTier === "elite";
}

interface Props {
  requiredTier: RequiredTier;
  children: React.ReactNode;
  customMessage?: string;
}

export function TierGate({ requiredTier, children, customMessage }: Props) {
  const { profile } = useApp();
  const colors = useColors();
  const router = useRouter();

  if (hasAccess(profile.tier, requiredTier)) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.blur, { pointerEvents: "none" as const }]}>
        {children}
      </View>
      <View style={[styles.overlay, { backgroundColor: "rgba(7,11,18,0.92)" }]}>
        <View style={[styles.badge, { backgroundColor: "rgba(255,215,0,0.12)", borderColor: "#FFD700" }]}>
          <Star size={16} color="#FFD700" fill="#FFD700" />
          <Text style={[styles.tierLabel, { color: "#FFD700" }]}>Premium Feature</Text>
        </View>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>
          {customMessage ?? "Unlock full analysis with Premium"}
        </Text>
        <TouchableOpacity
          style={styles.btn}
          activeOpacity={0.8}
          onPress={() => router.push("/settings" as any)}
        >
          <Lock size={13} color="#070B12" />
          <Text style={styles.btnText}>Upgrade — $39.99/mo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative" },
  blur:    { opacity: 0.08 },
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
  tierLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  desc:      { fontSize: 12, textAlign: "center" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: "#FFD700",
  },
  btnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#070B12" },
});
