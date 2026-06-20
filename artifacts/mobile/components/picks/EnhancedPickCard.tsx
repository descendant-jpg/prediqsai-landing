import { BarChart3, Bookmark, PlusCircle, Share2 } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { bestBookmaker, confidenceColor, type ProPick } from "@/lib/mockData";

/**
 * Feature 4 — enhanced AI match card with confidence-tinted border,
 * pulsing LIVE badge (F10), confidence bar, odds-comparison strip (F8 preview),
 * and an action row: Save (F7), Add to Slip (F6), Share (F9), Analysis (F5).
 */
export function EnhancedPickCard({
  pick,
  saved,
  inSlip,
  onSave,
  onAddSlip,
  onShare,
  onAnalysis,
}: {
  pick: ProPick;
  saved: boolean;
  inSlip: boolean;
  onSave: () => void;
  onAddSlip: () => void;
  onShare: () => void;
  onAnalysis: () => void;
}) {
  const colors = useColors();
  const confColor = confidenceColor(pick.confidence, colors);
  const pulse = useRef(new Animated.Value(1)).current;
  const best = bestBookmaker(pick.bookmakerOdds);
  const strip = pick.bookmakerOdds.slice(0, 3);

  useEffect(() => {
    if (!pick.isLive) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== "web" }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pick.isLive, pulse]);

  return (
    <View style={[styles.card, { backgroundColor: "#121212", borderColor: colors.border, borderLeftColor: confColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.competition, { color: colors.textSecondary }]}>{pick.competition}</Text>
          <Text style={[styles.match, { color: colors.text }]}>
            {pick.homeTeam} <Text style={{ color: colors.textSecondary }}>vs</Text> {pick.awayTeam}
          </Text>
        </View>
        {pick.isLive ? (
          <Animated.View style={[styles.liveBadge, { opacity: pulse, backgroundColor: colors.red }]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </Animated.View>
        ) : (
          <Text style={[styles.kickoff, { color: colors.textSecondary }]}>{pick.kickoffTime}</Text>
        )}
      </View>

      {/* Live score */}
      {pick.isLive && pick.currentScore ? (
        <Text style={[styles.score, { color: colors.text }]}>{pick.currentScore}</Text>
      ) : null}

      {/* Pick + value badge */}
      <View style={styles.pickRow}>
        <View style={styles.pickLeft}>
          <Text style={[styles.pickValue, { color: colors.gold }]}>{pick.aiPick}</Text>
          {pick.isLive ? (
            <Text style={[styles.inPlay, { color: colors.cyan, borderColor: colors.cyan }]}>⚡ In-Play</Text>
          ) : null}
        </View>
        {pick.isValue ? (
          <Text style={[styles.valueBadge, { color: colors.green, borderColor: colors.green }]}>VALUE</Text>
        ) : null}
      </View>

      {/* Confidence bar */}
      <View style={styles.confHeader}>
        <Text style={[styles.confLabel, { color: colors.textSecondary }]}>AI Confidence</Text>
        <Text style={[styles.confValue, { color: confColor }]}>{pick.confidence}%</Text>
      </View>
      <View style={[styles.track, { backgroundColor: "#1f1f1f" }]}>
        <View style={[styles.fill, { width: `${pick.confidence}%`, backgroundColor: confColor }]} />
      </View>

      {/* Odds comparison strip */}
      <View style={styles.oddsStrip}>
        {strip.map((o) => {
          const isBest = o.name === best.name;
          return (
            <View
              key={o.name}
              style={[
                styles.oddsChip,
                { borderColor: isBest ? colors.gold : colors.border, backgroundColor: isBest ? "rgba(255,215,0,0.12)" : "#181818" },
              ]}
            >
              <Text style={[styles.oddsName, { color: colors.textSecondary }]} numberOfLines={1}>
                {o.name}
              </Text>
              <Text style={[styles.oddsNum, { color: isBest ? colors.gold : colors.text }]}>
                {o.odds.toFixed(2)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Action row */}
      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <Action
          icon={<Bookmark size={17} color={saved ? colors.gold : colors.textSecondary} fill={saved ? colors.gold : "transparent"} />}
          label="Save"
          color={saved ? colors.gold : colors.textSecondary}
          onPress={onSave}
        />
        <Action
          icon={<PlusCircle size={17} color={inSlip ? colors.green : colors.textSecondary} />}
          label={inSlip ? "Added" : "Slip"}
          color={inSlip ? colors.green : colors.textSecondary}
          onPress={onAddSlip}
        />
        <Action
          icon={<Share2 size={17} color={colors.textSecondary} />}
          label="Share"
          color={colors.textSecondary}
          onPress={onShare}
        />
        <Action
          icon={<BarChart3 size={17} color={colors.cyan} />}
          label="Analysis"
          color={colors.cyan}
          onPress={onAnalysis}
        />
      </View>
    </View>
  );
}

function Action({
  icon,
  label,
  color,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.action} activeOpacity={0.7} onPress={onPress}>
      {icon}
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  competition: { fontSize: 11, fontWeight: "600", marginBottom: 2 },
  match: { fontSize: 16, fontWeight: "800" },
  kickoff: { fontSize: 11, fontWeight: "600" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  score: { fontSize: 15, fontWeight: "900", marginTop: 8 },
  pickRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  pickLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  pickValue: { fontSize: 16, fontWeight: "900" },
  inPlay: { fontSize: 10, fontWeight: "800", borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  valueBadge: { fontSize: 10, fontWeight: "900", borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, overflow: "hidden" },
  confHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, marginBottom: 6 },
  confLabel: { fontSize: 11, fontWeight: "600" },
  confValue: { fontSize: 12, fontWeight: "900" },
  track: { height: 7, borderRadius: 4, overflow: "hidden" },
  fill: { height: 7, borderRadius: 4 },
  oddsStrip: { flexDirection: "row", gap: 8, marginTop: 12 },
  oddsChip: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 9, borderWidth: 1 },
  oddsName: { fontSize: 10, fontWeight: "600", marginBottom: 2 },
  oddsNum: { fontSize: 14, fontWeight: "900" },
  actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTopWidth: 1 },
  action: { flex: 1, alignItems: "center", gap: 4 },
  actionLabel: { fontSize: 11, fontWeight: "700" },
});
