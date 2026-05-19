import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdminTabBar } from "@/components/AdminTabBar";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

type Match = {
  id: number; homeTeam: string; awayTeam: string; prediction: string;
  confidence: number; matchDate: string; result?: string | null;
  league: string; valueDetected: boolean; avoidMatch: boolean;
};

function confidenceColor(c: number) {
  if (c >= 70) return "#00FF94";
  if (c >= 50) return "#FFD700";
  return "#FF4D4D";
}

const RESULT_FILTERS = ["all", "pending", "win", "loss"];

export default function AdminWorldCupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [matches, setMatches] = useState<Match[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState("all");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch("/api/admin/worldcup", { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json() as { matches: Match[]; total: number };
      setMatches(data.matches);
      setTotal(data.total);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const filtered = matches.filter((m) => {
    if (resultFilter === "all") return true;
    if (resultFilter === "pending") return !m.result;
    return m.result === resultFilter;
  });

  const wins = matches.filter((m) => m.result === "win").length;
  const losses = matches.filter((m) => m.result === "loss").length;
  const accuracy = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(0) : "–";

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>🏆 World Cup Admin</Text>
          <Text style={[s.headerSub, { color: "#FFD700" }]}>FIFA 2026 · {total} Soccer predictions</Text>
        </View>
        <View style={s.headerStats}>
          <Text style={[s.statPill, { backgroundColor: "#00FF9420", color: "#00FF94" }]}>{wins}W</Text>
          <Text style={[s.statPill, { backgroundColor: "#FF4D4D20", color: "#FF4D4D" }]}>{losses}L</Text>
          <Text style={[s.statPill, { backgroundColor: `${colors.cyan}20`, color: colors.cyan }]}>{accuracy}%</Text>
        </View>
      </View>

      {/* Result filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.filterBar, { borderBottomColor: colors.border }]} contentContainerStyle={s.filterContent}>
        {RESULT_FILTERS.map((f) => (
          <TouchableOpacity key={f} style={[s.pill, {
            backgroundColor: resultFilter === f ? "#FFD700" : colors.card,
            borderColor: resultFilter === f ? "#FFD700" : colors.border,
          }]} onPress={() => setResultFilter(f)}>
            <Text style={[s.pillText, { color: resultFilter === f ? colors.background : colors.text }]}>{f[0]!.toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.cyan} style={{ marginTop: 60 }} />
      ) : filtered.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={{ fontSize: 40 }}>⚽</Text>
          <Text style={[s.emptyText, { color: colors.textMuted }]}>No soccer predictions yet. Predictions are generated every 6 hours from the live ESPN feed.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
          {/* Stats row */}
          <View style={[s.statsRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: colors.cyan }]}>{total}</Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>Total</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: colors.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: "#00FF94" }]}>{wins}</Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>Wins</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: colors.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: "#FF4D4D" }]}>{losses}</Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>Losses</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: colors.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: "#FFD700" }]}>{matches.filter((m) => !m.result).length}</Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>Pending</Text>
            </View>
          </View>

          {filtered.map((m) => (
            <View key={m.id} style={[s.card, { backgroundColor: colors.card, borderColor: m.result === "win" ? "#00FF9433" : m.result === "loss" ? "#FF4D4D33" : colors.cardBorder }]}>
              <View style={s.cardHeader}>
                <Text style={{ fontSize: 22 }}>⚽</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.matchTitle, { color: colors.text }]} numberOfLines={1}>{m.homeTeam} vs {m.awayTeam}</Text>
                  <Text style={[s.matchLeague, { color: colors.textMuted }]}>{m.league}</Text>
                </View>
                <View style={[s.confBadge, { backgroundColor: `${confidenceColor(m.confidence)}20`, borderColor: `${confidenceColor(m.confidence)}44` }]}>
                  <Text style={[s.confText, { color: confidenceColor(m.confidence) }]}>{m.confidence}%</Text>
                </View>
              </View>

              <Text style={[s.prediction, { color: colors.textSecondary }]} numberOfLines={2}>{m.prediction}</Text>

              <View style={s.cardFooter}>
                <Text style={[s.date, { color: colors.textMuted }]}>{new Date(m.matchDate).toLocaleDateString()}</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {m.valueDetected && <View style={[s.tag, { backgroundColor: "#00FF9415", borderColor: "#00FF9433" }]}><Text style={{ fontSize: 9, color: "#00FF94", fontWeight: "700" }}>VALUE</Text></View>}
                  {m.avoidMatch && <View style={[s.tag, { backgroundColor: "#FF4D4D15", borderColor: "#FF4D4D33" }]}><Text style={{ fontSize: 9, color: "#FF4D4D", fontWeight: "700" }}>AVOID</Text></View>}
                  {m.result && (
                    <View style={[s.tag, { backgroundColor: m.result === "win" ? "#00FF9420" : m.result === "loss" ? "#FF4D4D20" : "#FFD70020" }]}>
                      <Text style={{ fontSize: 9, fontWeight: "700", color: m.result === "win" ? "#00FF94" : m.result === "loss" ? "#FF4D4D" : "#FFD700" }}>{m.result.toUpperCase()}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <AdminTabBar />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerSub: { fontSize: 11, marginTop: 2 },
  headerStats: { flexDirection: "row", gap: 6 },
  statPill: { fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  filterBar: { maxHeight: 48, borderBottomWidth: 1 },
  filterContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: "row" },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 12, fontWeight: "600" },
  content: { padding: 12, gap: 10 },
  statsRow: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 4 },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statNum: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 10 },
  statDivider: { width: 1, marginVertical: 4 },
  card: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 8 },
  cardHeader: { flexDirection: "row", gap: 10, alignItems: "center" },
  matchTitle: { fontSize: 13, fontWeight: "700" },
  matchLeague: { fontSize: 11, marginTop: 1 },
  confBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  confText: { fontSize: 12, fontWeight: "700" },
  prediction: { fontSize: 12, lineHeight: 17 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  date: { fontSize: 11 },
  tag: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 20 },
});
