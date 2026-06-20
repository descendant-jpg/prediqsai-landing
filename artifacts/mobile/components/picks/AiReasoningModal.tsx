import { Lock, X } from "lucide-react-native";
import React from "react";
import { Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { bestBookmaker, confidenceColor, type ProPick, type RiskLevel } from "@/lib/mockData";

/**
 * Feature 5 — AI reasoning modal. Also surfaces the full bookmaker odds
 * comparison (F8), live analysis (F10), and is gated for FREE users.
 */
export function AiReasoningModal({
  pick,
  isPro,
  onClose,
  onUpgrade,
}: {
  pick: ProPick | null;
  isPro: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}) {
  const colors = useColors();
  if (!pick) return null;
  const confColor = confidenceColor(pick.confidence, colors);
  const best = bestBookmaker(pick.bookmakerOdds);

  const riskColor: Record<RiskLevel, string> = {
    Low: colors.green,
    Medium: colors.orange,
    High: colors.red,
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: "#0f0f0f", borderColor: colors.border }]}>
          {/* Handle + close */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.competition, { color: colors.textSecondary }]}>{pick.competition}</Text>
              <Text style={[styles.match, { color: colors.text }]}>
                {pick.homeTeam} vs {pick.awayTeam}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
            {/* Pick + confidence */}
            <View style={[styles.pickBanner, { borderColor: colors.gold, backgroundColor: "rgba(255,215,0,0.08)" }]}>
              <Text style={[styles.pickValue, { color: colors.gold }]}>{pick.aiPick}</Text>
              <Text style={[styles.confChip, { color: confColor }]}>{pick.confidence}% Confidence</Text>
            </View>

            {!isPro ? (
              <View style={styles.lockWrap}>
                <View style={[styles.lockBox, { borderColor: colors.gold }]}>
                  <Lock size={26} color={colors.gold} />
                  <Text style={[styles.lockTitle, { color: colors.text }]}>Full Analysis is Pro-Only</Text>
                  <Text style={[styles.lockSub, { color: colors.textSecondary }]}>
                    Unlock AI reasoning, key stats, full odds comparison and pro tips.
                  </Text>
                  <TouchableOpacity onPress={onUpgrade} activeOpacity={0.9} style={[styles.upgradeBtn, { backgroundColor: colors.gold }]}>
                    <Text style={styles.upgradeText}>Upgrade to Pro</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {/* Live analysis */}
                {pick.isLive && pick.liveAnalysis ? (
                  <Section title="⚡ Live Analysis" colors={colors}>
                    {pick.currentScore ? (
                      <Text style={[styles.scoreLine, { color: colors.red }]}>{pick.currentScore}</Text>
                    ) : null}
                    <Text style={[styles.body, { color: colors.textSecondary }]}>{pick.liveAnalysis}</Text>
                  </Section>
                ) : null}

                {/* Reasoning */}
                <Section title="Why AI Recommends This" colors={colors}>
                  <Text style={[styles.body, { color: colors.textSecondary }]}>{pick.reasoning}</Text>
                </Section>

                {/* Key stats */}
                <Section title="Key Stats" colors={colors}>
                  <StatRow label={`${pick.homeTeam} form`} value={pick.homeForm} colors={colors} />
                  <StatRow label={`${pick.awayTeam} form`} value={pick.awayForm} colors={colors} />
                  <StatRow label="Head-to-head" value={pick.headToHead} colors={colors} />
                  <StatRow label="Avg goals (fixture)" value={pick.avgGoals} colors={colors} />
                  <View style={styles.bullets}>
                    {pick.keyStats.map((s) => (
                      <Text key={s} style={[styles.bullet, { color: colors.textSecondary }]}>
                        • {s}
                      </Text>
                    ))}
                  </View>
                </Section>

                {/* Risk level */}
                <Section title="Risk Level" colors={colors}>
                  <View style={[styles.riskChip, { borderColor: riskColor[pick.riskLevel] }]}>
                    <Text style={[styles.riskText, { color: riskColor[pick.riskLevel] }]}>{pick.riskLevel} Risk</Text>
                  </View>
                </Section>

                {/* Odds comparison (Feature 8) */}
                <Section title="Odds Comparison" colors={colors}>
                  {pick.bookmakerOdds.map((o) => {
                    const isBest = o.name === best.name;
                    return (
                      <View
                        key={o.name}
                        style={[
                          styles.oddsRow,
                          { borderColor: isBest ? colors.gold : colors.border, backgroundColor: isBest ? "rgba(255,215,0,0.10)" : "transparent" },
                        ]}
                      >
                        <Text style={[styles.oddsName, { color: isBest ? colors.gold : colors.text }]}>
                          {o.name} {isBest ? "· Best" : ""}
                        </Text>
                        <Text style={[styles.oddsNum, { color: isBest ? colors.gold : colors.text }]}>{o.odds.toFixed(2)}</Text>
                      </View>
                    );
                  })}
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => Linking.openURL(pick.bookmakerUrl).catch(() => {})}
                    style={[styles.betNow, { backgroundColor: colors.gold }]}
                  >
                    <Text style={styles.betNowText}>Bet Now on {best.name} @ {best.odds.toFixed(2)}</Text>
                  </TouchableOpacity>
                </Section>

                {/* Pro tip */}
                <Section title="💡 Pro Tip" colors={colors}>
                  <Text style={[styles.proTip, { color: colors.gold }]}>{pick.proTip}</Text>
                </Section>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, colors, children }: { title: string; colors: ReturnType<typeof useColors>; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function StatRow({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.statRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "90%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    ...(Platform.OS === "web" ? { paddingBottom: 12 } : {}),
  },
  handleRow: { alignItems: "center", paddingVertical: 8 },
  handle: { width: 42, height: 5, borderRadius: 3 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  competition: { fontSize: 12, fontWeight: "600", marginBottom: 2 },
  match: { fontSize: 19, fontWeight: "900" },
  closeBtn: { padding: 4 },
  pickBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
    marginBottom: 4,
  },
  pickValue: { fontSize: 17, fontWeight: "900" },
  confChip: { fontSize: 13, fontWeight: "800" },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 15, fontWeight: "800", marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 21 },
  scoreLine: { fontSize: 15, fontWeight: "900", marginBottom: 6 },
  bullets: { marginTop: 10, gap: 5 },
  bullet: { fontSize: 13, lineHeight: 19 },
  statRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: 1 },
  statLabel: { fontSize: 13, fontWeight: "600" },
  statValue: { fontSize: 13, fontWeight: "800" },
  riskChip: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 6 },
  riskText: { fontSize: 13, fontWeight: "800" },
  oddsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 8,
  },
  oddsName: { fontSize: 14, fontWeight: "700" },
  oddsNum: { fontSize: 15, fontWeight: "900" },
  betNow: { borderRadius: 11, paddingVertical: 13, alignItems: "center", marginTop: 4 },
  betNowText: { color: "#0a0a0a", fontSize: 14, fontWeight: "900" },
  proTip: { fontSize: 14, lineHeight: 21, fontStyle: "italic", fontWeight: "600" },
  lockWrap: { paddingVertical: 30, alignItems: "center" },
  lockBox: { alignItems: "center", borderWidth: 1, borderRadius: 16, padding: 24, marginHorizontal: 8 },
  lockTitle: { fontSize: 17, fontWeight: "900", marginTop: 10 },
  lockSub: { fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 6 },
  upgradeBtn: { borderRadius: 11, paddingHorizontal: 22, paddingVertical: 12, marginTop: 16 },
  upgradeText: { color: "#0a0a0a", fontSize: 14, fontWeight: "900" },
});
