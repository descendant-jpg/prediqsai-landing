import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Lock } from "lucide-react-native";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { confidenceColor, type MatchOfDay } from "@/lib/mockData";

interface Props {
  motd: MatchOfDay;
  isPro: boolean;
  onUpgrade?: () => void;
}

export function MatchOfTheDay({ motd, isPro, onUpgrade }: Props) {
  const colors = useColors();
  const { t } = useLanguage();
  const confColor = confidenceColor(motd.confidence, colors);

  return (
    <LinearGradient
      colors={["#0d2e22", "#0a1f33", "#0a1228"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderColor: colors.gold }]}
    >
      <View style={[styles.topBadge, { backgroundColor: "rgba(255,215,0,0.16)" }]}>
        <Text style={[styles.topBadgeText, { color: colors.gold }]}>⭐ MATCH OF THE DAY</Text>
      </View>

      <Text style={[styles.competition, { color: colors.textSecondary }]}>
        {motd.competition} · {motd.time}
      </Text>
      <Text style={[styles.match, { color: "#fff" }]}>{motd.match}</Text>

      {/* AI pick + confidence — real data, blurred for free users */}
      <View style={styles.pickRowWrap}>
        <View style={styles.pickRow} pointerEvents={isPro ? "auto" : "none"}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pickLabel, { color: colors.textMuted }]}>AI PICK</Text>
            <Text style={[styles.pick, { color: colors.gold }]}>{motd.pick}</Text>
          </View>
          <View style={styles.confBox}>
            <Text style={[styles.confValue, { color: confColor }]}>{motd.confidence}%</Text>
            <Text style={[styles.confLabel, { color: colors.textMuted }]}>confidence</Text>
          </View>
        </View>
        {!isPro && (
          <Pressable style={styles.pickBlur} onPress={onUpgrade}>
            <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
            <Lock size={18} color={colors.gold} />
          </Pressable>
        )}
      </View>

      {isPro ? (
        <View style={styles.proContent}>
          {motd.analysis ? (
            <Text style={[styles.analysis, { color: colors.textSecondary }]}>{motd.analysis}</Text>
          ) : null}
          <View style={styles.statsRow}>
            {motd.keyStats.map((s, i) => (
              <View key={i} style={[styles.statChip, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
                <Text style={[styles.statText, { color: "#fff" }]}>{s}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.bookmaker, { color: colors.gold }]}>
            Recommended: {motd.bookmaker}
          </Text>
        </View>
      ) : (
        <View style={styles.lockedContent}>
          <TouchableOpacity
            style={[styles.unlockBtn, { backgroundColor: colors.gold }]}
            activeOpacity={0.85}
            onPress={onUpgrade}
          >
            <Lock size={15} color="#0a0a0a" />
            <Text style={styles.unlockText}>{t("picks.upgradeUnlock")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

const bold = Platform.OS === "web" ? ({ fontWeight: "700" } as const) : ({ fontFamily: "Inter_700Bold" } as const);
const semibold = Platform.OS === "web" ? ({ fontWeight: "600" } as const) : ({ fontFamily: "Inter_600SemiBold" } as const);

const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 18, borderWidth: 1.5, marginBottom: 16, gap: 6, overflow: "hidden" },
  topBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 6 },
  topBadgeText: { fontSize: 11, ...bold, letterSpacing: 0.5 },
  competition: { fontSize: 12 },
  match: { fontSize: 22, ...bold, letterSpacing: -0.5, marginBottom: 4 },
  pickRowWrap: { marginTop: 4, borderRadius: 10, overflow: "hidden" },
  pickRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  pickBlur: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,10,10,0.3)" },
  pickLabel: { fontSize: 10, letterSpacing: 0.5 },
  pick: { fontSize: 20, ...bold, marginTop: 2 },
  confBox: { alignItems: "flex-end" },
  confValue: { fontSize: 24, ...bold, letterSpacing: -0.5 },
  confLabel: { fontSize: 10 },
  proContent: { marginTop: 10, gap: 10 },
  analysis: { fontSize: 13, lineHeight: 20 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  statChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statText: { fontSize: 11, ...semibold },
  bookmaker: { fontSize: 13, ...bold },
  lockedContent: { marginTop: 12 },
  unlockBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  unlockText: { fontSize: 14, color: "#0a0a0a", ...bold },
});
