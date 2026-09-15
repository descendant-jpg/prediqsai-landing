import { X } from "lucide-react-native";
import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import type { AccuracyStats } from "@/lib/api";

interface Props {
  visible: boolean;
  accuracy: AccuracyStats | null;
  pending: number;
  onClose: () => void;
}

/** Bottom-sheet style "AI Accuracy Report" — trust-building breakdown of this month's hit rates. */
export function AccuracyReportModal({ visible, accuracy, pending, onClose }: Props) {
  const colors = useColors();
  const { t } = useLanguage();

  const sports = Object.entries(accuracy?.bySport ?? {}).sort((a, b) => b[1].total - a[1].total);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>📊 {t("picks.accuracyReportTitle")}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t("picks.accuracyReportSubtitle")}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Overall headline */}
            <View style={[styles.overall, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.overallLabel, { color: colors.textMuted }]}>{t("picks.reportOverall")}</Text>
              <Text style={[styles.overallValue, { color: colors.green }]}>
                {accuracy?.accuracy != null ? `${accuracy.accuracy}%` : "—"}
              </Text>
              <View style={styles.recordRow}>
                <Text style={[styles.record, { color: colors.green }]}>{accuracy?.wins ?? 0}W</Text>
                <Text style={[styles.record, { color: colors.textMuted }]}> · </Text>
                <Text style={[styles.record, { color: colors.red }]}>{accuracy?.losses ?? 0}L</Text>
                <Text style={[styles.record, { color: colors.textMuted }]}> · </Text>
                <Text style={[styles.record, { color: colors.gold }]}>{pending}P</Text>
              </View>
              {accuracy?.accuracy == null && (
                <Text style={[styles.noData, { color: colors.textMuted }]}>{t("picks.reportNoData")}</Text>
              )}
            </View>

            {/* Per-sport breakdown */}
            {sports.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t("picks.reportBySport")}</Text>
                {sports.map(([sport, s]) => (
                  <View key={sport} style={[styles.sportRow, { borderColor: colors.border }]}>
                    <View style={styles.sportInfo}>
                      <Text style={[styles.sportName, { color: colors.text }]}>{sport.toUpperCase()}</Text>
                      <Text style={[styles.sportRecord, { color: colors.textSecondary }]}>
                        {s.wins}W / {s.total}
                      </Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${Math.min(100, s.accuracy)}%`, backgroundColor: s.accuracy >= 55 ? colors.green : s.accuracy >= 40 ? colors.gold : colors.red },
                        ]}
                      />
                    </View>
                    <Text style={[styles.sportPct, { color: colors.text }]}>{s.accuracy}%</Text>
                  </View>
                ))}
              </>
            )}

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: "rgba(0,229,255,0.1)", borderColor: colors.cyan }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.closeText, { color: colors.cyan }]}>{t("picks.reportClose")}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    maxHeight: "80%",
  },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16, gap: 12 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  overall: { borderRadius: 14, borderWidth: 1, padding: 16, alignItems: "center", gap: 4 },
  overallLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6 },
  overallValue: { fontSize: 40, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  recordRow: { flexDirection: "row", alignItems: "center" },
  record: { fontSize: 14, fontFamily: "Inter_700Bold" },
  noData: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 6, textAlign: "center" },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, marginTop: 18, marginBottom: 8 },
  sportRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  sportInfo: { width: 90 },
  sportName: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sportRecord: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  sportPct: { width: 38, fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "right" },
  closeBtn: { marginTop: 20, borderRadius: 12, borderWidth: 1, paddingVertical: 12, alignItems: "center" },
  closeText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
