import { LinearGradient } from "expo-linear-gradient";
import { Lock } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { confidenceColor, type ProPick } from "@/lib/mockData";

/**
 * Feature 2 — "AI Pick of the Day" hero card.
 * FREE users see a locked teaser; PRO users can tap to open the reasoning modal.
 */
export function PickOfTheDayCard({
  pick,
  isPro,
  onPress,
  onUpgrade,
}: {
  pick: ProPick;
  isPro: boolean;
  onPress: () => void;
  onUpgrade: () => void;
}) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const confColor = confidenceColor(pick.confidence, colors);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(translateY, { toValue: 0, duration: 450, useNativeDriver: Platform.OS !== "web" }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={isPro ? onPress : onUpgrade}
        style={[styles.shadow, { shadowColor: colors.gold }]}
      >
        <LinearGradient
          colors={["#1a1505", "#0f0f0f", "#0a0a0a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { borderColor: colors.gold }]}
        >
          <View style={styles.badgeRow}>
            <Text style={[styles.badge, { backgroundColor: colors.gold }]}>⭐ AI PICK OF THE DAY</Text>
            <Text style={[styles.competition, { color: colors.textSecondary }]}>{pick.competition}</Text>
          </View>

          <Text style={[styles.match, { color: colors.text }]}>
            {pick.homeTeam} <Text style={{ color: colors.textSecondary }}>vs</Text> {pick.awayTeam}
          </Text>
          <Text style={[styles.kickoff, { color: colors.textSecondary }]}>{pick.kickoffTime}</Text>

          <View style={styles.pickRow}>
            <Text style={[styles.pickLabel, { color: colors.textSecondary }]}>AI Pick</Text>
            <Text style={[styles.pickValue, { color: colors.gold }]}>{pick.aiPick}</Text>
          </View>

          {/* Confidence bar */}
          <View style={styles.confHeader}>
            <Text style={[styles.confLabel, { color: colors.textSecondary }]}>Confidence</Text>
            <Text style={[styles.confValue, { color: confColor }]}>{pick.confidence}%</Text>
          </View>
          <View style={[styles.track, { backgroundColor: "#1f1f1f" }]}>
            <View style={[styles.fill, { width: `${pick.confidence}%`, backgroundColor: confColor }]} />
          </View>

          <View style={styles.footer}>
            <View>
              <Text style={[styles.oddsLabel, { color: colors.textSecondary }]}>Best Odds</Text>
              <Text style={[styles.oddsValue, { color: colors.text }]}>
                {pick.odds.toFixed(2)} <Text style={{ color: colors.textSecondary }}>· {pick.bookmaker}</Text>
              </Text>
            </View>
            {isPro ? (
              <View style={[styles.cta, { borderColor: colors.gold }]}>
                <Text style={[styles.ctaText, { color: colors.gold }]}>View Analysis →</Text>
              </View>
            ) : null}
          </View>

          {/* FREE lock overlay */}
          {!isPro ? (
            <View style={styles.lockOverlay}>
              <View style={[styles.lockBox, { borderColor: colors.gold }]}>
                <Lock size={22} color={colors.gold} />
                <Text style={[styles.lockTitle, { color: colors.text }]}>Pro Pick Locked</Text>
                <Text style={[styles.lockSub, { color: colors.textSecondary }]}>
                  Upgrade to unlock the Pick of the Day
                </Text>
                <Text style={[styles.lockBtn, { backgroundColor: colors.gold }]}>Upgrade to Pro</Text>
              </View>
            </View>
          ) : null}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  card: { borderRadius: 18, borderWidth: 1.5, padding: 18, overflow: "hidden" },
  badgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: {
    color: "#0a0a0a",
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    overflow: "hidden",
    letterSpacing: 0.3,
  },
  competition: { fontSize: 12, fontWeight: "600" },
  match: { fontSize: 21, fontWeight: "900", marginTop: 14 },
  kickoff: { fontSize: 12, marginTop: 3 },
  pickRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  pickLabel: { fontSize: 13, fontWeight: "600" },
  pickValue: { fontSize: 17, fontWeight: "900" },
  confHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, marginBottom: 6 },
  confLabel: { fontSize: 12, fontWeight: "600" },
  confValue: { fontSize: 13, fontWeight: "900" },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  oddsLabel: { fontSize: 11, fontWeight: "600" },
  oddsValue: { fontSize: 16, fontWeight: "800", marginTop: 2 },
  cta: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  ctaText: { fontSize: 13, fontWeight: "800" },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,10,0.82)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  lockBox: { alignItems: "center", borderWidth: 1, borderRadius: 14, padding: 18, marginHorizontal: 24 },
  lockTitle: { fontSize: 16, fontWeight: "900", marginTop: 8 },
  lockSub: { fontSize: 12, marginTop: 4, textAlign: "center" },
  lockBtn: {
    color: "#0a0a0a",
    fontSize: 13,
    fontWeight: "900",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9,
    overflow: "hidden",
    marginTop: 12,
  },
});
