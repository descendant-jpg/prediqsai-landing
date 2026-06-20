import { Lock, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ConfidenceGauge } from "@/components/dashboard/ConfidenceGauge";
import { useColors } from "@/hooks/useColors";
import { confidenceColor, SPORT_ICONS, type MockPrediction } from "@/lib/mockData";

interface Props {
  prediction: MockPrediction;
  locked?: boolean;
  onUpgrade?: () => void;
}

export function PredictionFeedCard({ prediction, locked = false, onUpgrade }: Props) {
  const colors = useColors();
  const [modalOpen, setModalOpen] = useState(false);

  const conf = prediction.confidence;
  const barColor = confidenceColor(conf, colors);
  const highConfidence = conf >= 76;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: highConfidence ? colors.gold : colors.cardBorder,
          borderWidth: highConfidence ? 1.5 : 1,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.sportIcon}>{SPORT_ICONS[prediction.sport]}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.match, { color: colors.text }]} numberOfLines={1}>
            {prediction.match}
          </Text>
          <Text style={[styles.league, { color: colors.textMuted }]} numberOfLines={1}>
            {prediction.league} · {prediction.time}
          </Text>
        </View>
        {highConfidence && (
          <View style={[styles.hotBadge, { borderColor: colors.gold, backgroundColor: "rgba(255,215,0,0.08)" }]}>
            <Text style={[styles.hotText, { color: colors.gold }]}>HOT</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={{ flex: 1, gap: 10 }}>
          <View>
            <Text style={[styles.pickLabel, { color: colors.textMuted }]}>AI PICK</Text>
            <Text style={[styles.pick, { color: colors.text }]}>{prediction.pick}</Text>
          </View>

          {/* Confidence bar */}
          <View>
            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.barFill, { width: `${conf}%`, backgroundColor: barColor }]} />
            </View>
            <Text style={[styles.barLabel, { color: barColor }]}>{conf}% confidence</Text>
          </View>

          <View style={styles.oddsRow}>
            <Text style={[styles.bookmaker, { color: colors.textSecondary }]}>
              Best on {prediction.bookmaker}
            </Text>
            <View style={[styles.oddsPill, { borderColor: colors.cyan, backgroundColor: "rgba(0,229,255,0.08)" }]}>
              <Text style={[styles.oddsText, { color: colors.cyan }]}>{prediction.odds.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <ConfidenceGauge value={conf} size={104} />
      </View>

      <TouchableOpacity
        style={[styles.analysisBtn, { borderColor: colors.border }]}
        onPress={() => setModalOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.analysisBtnText, { color: colors.cyan }]}>View Analysis →</Text>
      </TouchableOpacity>

      {/* Locked overlay for FREE users */}
      {locked && (
        <Pressable style={styles.lockOverlay} onPress={onUpgrade}>
          <View style={[styles.lockInner, { backgroundColor: "rgba(10,10,10,0.82)" }]}>
            <View style={[styles.lockBadge, { backgroundColor: "rgba(255,215,0,0.14)" }]}>
              <Lock size={22} color={colors.gold} />
            </View>
            <Text style={[styles.lockTitle, { color: colors.gold }]}>Upgrade to PRO</Text>
            <Text style={[styles.lockSub, { color: colors.textSecondary }]}>
              Unlock unlimited daily predictions
            </Text>
          </View>
        </Pressable>
      )}

      {/* Analysis modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setModalOpen(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.sportIcon}>{SPORT_ICONS[prediction.sport]}</Text>
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                {prediction.match}
              </Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 8 }}>
              <View style={styles.modalGaugeRow}>
                <ConfidenceGauge value={conf} size={130} />
                <View style={{ flex: 1, gap: 8 }}>
                  <View>
                    <Text style={[styles.pickLabel, { color: colors.textMuted }]}>AI PICK</Text>
                    <Text style={[styles.modalPick, { color: colors.text }]}>{prediction.pick}</Text>
                  </View>
                  <View style={styles.oddsRow}>
                    <Text style={[styles.bookmaker, { color: colors.textSecondary }]}>
                      {prediction.bookmaker}
                    </Text>
                    <View style={[styles.oddsPill, { borderColor: colors.cyan, backgroundColor: "rgba(0,229,255,0.08)" }]}>
                      <Text style={[styles.oddsText, { color: colors.cyan }]}>{prediction.odds.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View>
                <Text style={[styles.sectionLabel, { color: colors.gold }]}>AI REASONING</Text>
                <Text style={[styles.analysisText, { color: colors.textSecondary }]}>{prediction.analysis}</Text>
              </View>

              <View>
                <Text style={[styles.sectionLabel, { color: colors.gold }]}>KEY STATS</Text>
                <View style={{ gap: 8 }}>
                  {prediction.keyStats.map((s, i) => (
                    <View key={i} style={[styles.statChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[styles.statDot, { color: colors.gold }]}>•</Text>
                      <Text style={[styles.statText, { color: colors.text }]}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const bold = Platform.OS === "web" ? ({ fontWeight: "700" } as const) : ({ fontFamily: "Inter_700Bold" } as const);
const semibold = Platform.OS === "web" ? ({ fontWeight: "600" } as const) : ({ fontFamily: "Inter_600SemiBold" } as const);

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 14, gap: 12, marginBottom: 12, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  sportIcon: { fontSize: 22 },
  match: { fontSize: 15, ...semibold },
  league: { fontSize: 11, marginTop: 1 },
  hotBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  hotText: { fontSize: 10, ...bold, letterSpacing: 0.5 },
  body: { flexDirection: "row", alignItems: "center", gap: 12 },
  pickLabel: { fontSize: 10, letterSpacing: 0.5 },
  pick: { fontSize: 18, ...bold, marginTop: 2, letterSpacing: -0.3 },
  barTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
  barLabel: { fontSize: 11, marginTop: 4, ...semibold },
  oddsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  bookmaker: { fontSize: 12, flex: 1 },
  oddsPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  oddsText: { fontSize: 14, ...bold },
  analysisBtn: { borderTopWidth: 1, paddingTop: 12, alignItems: "center" },
  analysisBtnText: { fontSize: 13, ...semibold },
  lockOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  lockInner: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 6 },
  lockBadge: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  lockTitle: { fontSize: 16, ...bold },
  lockSub: { fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, maxHeight: "86%" },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  modalTitle: { fontSize: 17, ...bold, flex: 1 },
  modalGaugeRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  modalPick: { fontSize: 20, ...bold, marginTop: 2 },
  sectionLabel: { fontSize: 11, ...bold, letterSpacing: 0.8, marginBottom: 8 },
  analysisText: { fontSize: 14, lineHeight: 21 },
  statChip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  statDot: { fontSize: 16 },
  statText: { fontSize: 13, flex: 1 },
});
