import { ChevronRight, Settings } from "lucide-react-native";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const OVERALL_STATS = [
  { label: "Win Rate", value: "67.4%", change: "+2.1%", positive: true },
  { label: "ROI", value: "+18.3%", change: "+4.5%", positive: true },
  { label: "Total Picks", value: "142", change: null, positive: null },
  { label: "Net P&L", value: "+$843", change: "+$120", positive: true },
];

const SPORT_STATS = [
  { sport: "NFL", picks: 48, winRate: 72, roi: 22.4, color: "#FF6B35" },
  { sport: "NBA", picks: 38, winRate: 63, roi: 14.1, color: "#00E5FF" },
  { sport: "MLB", picks: 31, winRate: 68, roi: 19.8, color: "#FFD700" },
  { sport: "Soccer", picks: 25, winRate: 64, roi: 15.2, color: "#00FF94" },
];

const CONFIDENCE_ACCURACY = [
  { tier: "High (70%+)", picks: 45, accuracy: 78, roi: 31.2 },
  { tier: "Medium (50-69%)", picks: 62, accuracy: 63, roi: 12.5 },
  { tier: "Low (<50%)", picks: 35, accuracy: 51, roi: -4.3 },
];

export default function PerformanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + topPaddingWeb;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPadding + 16, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.text }]}>Performance</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Last 30 days · All sports</Text>

      <View style={styles.statsGrid}>
        {OVERALL_STATS.map((stat, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            <Text style={[styles.statValue, { color: stat.positive === true ? colors.green : stat.positive === false ? colors.red : colors.text }]}>
              {stat.value}
            </Text>
            {stat.change && (
              <Text style={[styles.statChange, { color: stat.positive ? colors.green : colors.red }]}>{stat.change}</Text>
            )}
          </View>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>By Sport</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {SPORT_STATS.map((s, i) => (
          <View key={i} style={[styles.sportRow, i < SPORT_STATS.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
            <View style={[styles.sportDot, { backgroundColor: s.color }]} />
            <Text style={[styles.sportName, { color: colors.text }]}>{s.sport}</Text>
            <View style={styles.sportBarWrap}>
              <View style={[styles.sportBarBg, { backgroundColor: colors.border }]}>
                <View style={[styles.sportBarFill, { width: `${s.winRate}%` as any, backgroundColor: s.color }]} />
              </View>
              <Text style={[styles.sportWinRate, { color: s.color }]}>{s.winRate}%</Text>
            </View>
            <Text style={[styles.sportRoi, { color: s.roi > 0 ? colors.green : colors.red }]}>
              {s.roi > 0 ? "+" : ""}{s.roi}%
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Confidence Accuracy</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.tableHeaderText, { color: colors.textMuted, flex: 2 }]}>Tier</Text>
          <Text style={[styles.tableHeaderText, { color: colors.textMuted }]}>Picks</Text>
          <Text style={[styles.tableHeaderText, { color: colors.textMuted }]}>Acc.</Text>
          <Text style={[styles.tableHeaderText, { color: colors.textMuted }]}>ROI</Text>
        </View>
        {CONFIDENCE_ACCURACY.map((row, i) => (
          <View key={i} style={[styles.tableRow, i < CONFIDENCE_ACCURACY.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>{row.tier}</Text>
            <Text style={[styles.tableCell, { color: colors.textSecondary }]}>{row.picks}</Text>
            <Text style={[styles.tableCell, { color: row.accuracy >= 70 ? colors.green : colors.text }]}>{row.accuracy}%</Text>
            <Text style={[styles.tableCell, { color: row.roi > 0 ? colors.green : colors.red }]}>
              {row.roi > 0 ? "+" : ""}{row.roi}%
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly ROI Trend</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.chart}>
          {[8.2, 12.5, -3.1, 18.9, 14.2, 22.4].map((val, i) => {
            const isPositive = val >= 0;
            const height = Math.abs(val) * 3;
            const months = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
            return (
              <View key={i} style={styles.chartBar}>
                <Text style={[styles.chartVal, { color: isPositive ? colors.green : colors.red }]}>
                  {isPositive ? "+" : ""}{val}%
                </Text>
                <View style={styles.chartBarWrap}>
                  <View style={[styles.chartBarFill, { height, backgroundColor: isPositive ? colors.cyan : colors.red, borderRadius: 4 }]} />
                </View>
                <Text style={[styles.chartMonth, { color: colors.textMuted }]}>{months[i]}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
        Performance stats are based on AI model predictions. Past performance does not guarantee future results.
      </Text>

      {user?.id === 1 && (
        <TouchableOpacity
          style={[styles.adminLink, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => router.push("/setup")}
          activeOpacity={0.8}
        >
          <Settings size={16} color={colors.textMuted} />
          <Text style={[styles.adminLinkText, { color: colors.textSecondary }]}>API Keys Setup Guide</Text>
          <ChevronRight size={14} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  title: { fontSize: 24, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: -8 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { borderRadius: 14, padding: 14, borderWidth: 1, width: "47.5%", gap: 4 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 22, letterSpacing: -0.5 },
  statChange: { fontSize: 12 },
  sectionTitle: { fontSize: 16, marginTop: 4 },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sportRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  sportDot: { width: 10, height: 10, borderRadius: 5 },
  sportName: { fontSize: 14, width: 56 },
  sportBarWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  sportBarBg: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  sportBarFill: { height: "100%", borderRadius: 3 },
  sportWinRate: { fontSize: 12, width: 34, textAlign: "right" },
  sportRoi: { fontSize: 12, width: 44, textAlign: "right" },
  tableHeader: { flexDirection: "row", padding: 12, borderBottomWidth: 1, gap: 8 },
  tableHeaderText: { fontSize: 11, letterSpacing: 0.5, flex: 1, textTransform: "uppercase" },
  tableRow: { flexDirection: "row", padding: 14, alignItems: "center", gap: 8 },
  tableCell: { fontSize: 13, flex: 1 },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", paddingHorizontal: 10, paddingVertical: 14, gap: 6 },
  chartBar: { alignItems: "center", gap: 4, flex: 1 },
  chartVal: { fontSize: 9, textAlign: "center" },
  chartBarWrap: { height: 80, justifyContent: "flex-end" },
  chartBarFill: { width: "100%", minWidth: 20 },
  chartMonth: { fontSize: 10 },
  disclaimer: { fontSize: 11, textAlign: "center", lineHeight: 16 },
  adminLink: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  adminLinkText: { flex: 1, fontSize: 14 },
});
