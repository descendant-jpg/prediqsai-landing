import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Lock } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { RiskBadge } from "@/components/RiskBadge";
import { SportBadge } from "@/components/SportBadge";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { matchDetailStore } from "@/lib/matchDetailStore";
import type { Prediction } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function predictionLabel(p: Prediction["prediction"]): string {
  switch (p) {
    case "home_win": return "HOME WIN";
    case "away_win": return "AWAY WIN";
    case "draw":     return "DRAW";
    case "over":     return "OVER";
    case "under":    return "UNDER";
  }
}

function formDotColor(r: "W" | "D" | "L"): string {
  return r === "W" ? "#00FF94" : r === "D" ? "#FFD700" : "#FF4D4D";
}

function deriveFormDots(score: number, name: string): Array<"W" | "D" | "L"> {
  const hash = [...name].reduce((a, c, i) => (a + c.charCodeAt(0) * (i + 1)) & 0xffffff, 0);
  return [0, 1, 2, 3, 4].map((i) => {
    const v = (hash >> (i * 4)) & 0xf;
    if (score >= 75) return v < 10 ? "W" : v < 13 ? "D" : "L";
    if (score >= 55) return v < 7  ? "W" : v < 11 ? "D" : "L";
    if (score >= 40) return v < 5  ? "W" : v < 9  ? "D" : "L";
    return v < 3 ? "W" : v < 7 ? "D" : "L";
  });
}

function getTeamFormScores(p: Prediction): [number, number] {
  const form = p.agentScores?.form ?? p.confidence;
  if (p.prediction === "home_win") return [Math.min(88, form), Math.max(22, 100 - form)];
  if (p.prediction === "away_win") return [Math.max(22, 100 - form), Math.min(88, form)];
  return [58, 58];
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  prediction: Prediction;
  locked?: boolean;
  /** Won-filter view: prominently surface ROI and the original AI confidence. */
  wonHighlight?: boolean;
}

export function PredictionCard({ prediction, locked = false, wonHighlight = false }: Props) {
  const colors = useColors();
  const router = useRouter();
  const { t } = useLanguage();

  // ROI per unit staked at the listed odds. probability in (0, 100] → odds >= 1,
  // so 100% probability correctly yields a valid 0% ROI instead of hiding the chip.
  const wonRoi =
    prediction.bookmakerProbability > 0 && prediction.bookmakerProbability <= 100
      ? Math.round((100 / prediction.bookmakerProbability - 1) * 100)
      : null;

  const [homeScore, awayScore] = locked ? [50, 50] : getTeamFormScores(prediction);
  const homeForm = deriveFormDots(homeScore, prediction.homeTeam);
  const awayForm = deriveFormDots(awayScore, prediction.awayTeam);

  function handleTap() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    matchDetailStore.set(prediction);
    router.push("/match-detail");
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={handleTap}
      activeOpacity={0.85}
    >
      {prediction.avoidMatch && (
        <View style={styles.avoidBanner}>
          <Ionicons name="warning" size={12} color="#FF4D4D" />
          <Text style={styles.avoidText}>AVOID</Text>
        </View>
      )}

      {/* League + value */}
      <View style={styles.header}>
        <View style={styles.badges}>
          <SportBadge sport={prediction.sport} size="sm" />
          <Text style={[styles.league, { color: colors.textMuted }]}>{prediction.league}</Text>
        </View>
        {!locked && prediction.valueDetected && (
          <View style={[styles.valueBadge, { borderColor: colors.gold }]}>
            <Text style={[styles.valueText, { color: colors.gold }]}>VALUE</Text>
          </View>
        )}
      </View>

      {/* Teams */}
      <View style={styles.matchup}>
        <Text style={[styles.team, { color: colors.text }]}>{prediction.homeTeam}</Text>
        <Text style={[styles.vs, { color: colors.textMuted }]}>vs</Text>
        <Text style={[styles.team, { color: colors.text }]}>{prediction.awayTeam}</Text>
      </View>

      {/* Form dots */}
      <View style={styles.formRow}>
        <View style={styles.formSide}>
          {homeForm.map((r, i) => (
            <View key={i} style={[styles.formDot, { backgroundColor: formDotColor(r) }]} />
          ))}
        </View>
        <View style={[styles.formDivider, { backgroundColor: colors.border }]} />
        <View style={styles.formSide}>
          {awayForm.map((r, i) => (
            <View key={i} style={[styles.formDot, { backgroundColor: formDotColor(r) }]} />
          ))}
        </View>
      </View>

      {/* Won view — ROI + original AI confidence highlighted */}
      {wonHighlight && !locked && (
        <View style={styles.wonRow}>
          {wonRoi != null && (
            <View style={[styles.wonChip, { backgroundColor: "rgba(0,255,148,0.12)", borderColor: colors.green }]}>
              <Text style={[styles.wonChipText, { color: colors.green }]}>
                ✅ {t("picks.roiLabel")} +{wonRoi}%
              </Text>
            </View>
          )}
          <View style={[styles.wonChip, { backgroundColor: "rgba(255,215,0,0.10)", borderColor: colors.gold }]}>
            <Text style={[styles.wonChipText, { color: colors.gold }]}>
              🎯 {t("picks.wonConfidence")} {prediction.confidence}%
            </Text>
          </View>
        </View>
      )}

      {/* Footer */}
      {locked ? (
        <View style={styles.lockedFooter}>
          <BlurView intensity={26} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.lockContent}>
            <Lock size={18} color={colors.gold} />
            <Text style={[styles.lockText, { color: colors.gold }]}>{t("picks.upgradeUnlock")}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <View style={[styles.predBadge, { backgroundColor: "rgba(0,229,255,0.1)", borderColor: colors.cyan }]}>
              <Text style={[styles.predText, { color: colors.cyan }]}>
                {predictionLabel(prediction.prediction)}
              </Text>
            </View>
            <RiskBadge risk={prediction.riskLevel} />
          </View>
          <ConfidenceMeter value={prediction.confidence} size={52} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  avoidBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    position: "absolute",
    top: 10,
    right: 12,
  },
  avoidText: {
    color: "#FF4D4D",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  league: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  valueBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "rgba(255,215,0,0.08)",
  },
  valueText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  matchup: {
    alignItems: "center",
    gap: 2,
  },
  team: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  vs: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  formSide: {
    flexDirection: "row",
    gap: 5,
  },
  formDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  formDivider: {
    width: 1,
    height: 14,
  },
  wonRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  wonChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  wonChipText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerLeft: {
    gap: 6,
  },
  predBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  predText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  lockedFooter: {
    minHeight: 58,
    borderRadius: 10,
    overflow: "hidden",
    justifyContent: "center",
  },
  lockContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
  },
  lockText: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
