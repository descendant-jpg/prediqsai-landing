import { useRouter } from "expo-router";
import { CheckCircle2, Filter, Trash2, XCircle } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdminTabBar } from "@/components/AdminTabBar";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

type Prediction = {
  id: number; sport: string; league: string; homeTeam: string; awayTeam: string;
  prediction: string; confidence: number; riskLevel: string; valueDetected: boolean;
  avoidMatch: boolean; matchDate: string; createdAt: string; result?: string | null;
};

const SPORTS = ["all", "NFL", "NBA", "MLB", "Soccer", "Tennis"];
const RESULTS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "win", label: "Wins" },
  { id: "loss", label: "Losses" },
  { id: "push", label: "Push" },
];

function confidenceColor(c: number) {
  if (c >= 70) return "#00FF94";
  if (c >= 50) return "#FFD700";
  return "#FF4D4D";
}

export default function AdminPredictionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const [preds, setPreds] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState("all");
  const [result, setResult] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  const load = useCallback(async (p = 1, s = sport, r = result) => {
    if (!token) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(p), sport: s, result: r }).toString();
      const data = await (api as unknown as { request: (path: string, opts: { token: string }) => Promise<{ predictions: Prediction[]; limit: number }> }).request(`/admin/predictions?${qs}`, { token });
      if (p === 1) setPreds(data.predictions);
      else setPreds((prev) => [...prev, ...data.predictions]);
      setHasMore(data.predictions.length === data.limit);
      setPage(p);
    } catch {
      Alert.alert("Error", "Failed to load predictions");
    } finally {
      setLoading(false);
    }
  }, [token, sport, result]);

  // Use fetch directly via the api apiFetch helper
  const loadDirect = useCallback(async (p = 1, s = sport, r = result) => {
    if (!token) return;
    setLoading(true);
    try {
      const base = (api as unknown as { _base?: string })._base ?? "";
      const url = `/api/admin/predictions?page=${p}&sport=${s}&result=${r}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json() as { predictions: Prediction[]; limit: number };
      if (p === 1) setPreds(data.predictions);
      else setPreds((prev) => [...prev, ...data.predictions]);
      setHasMore(data.predictions.length === data.limit);
      setPage(p);
    } catch {
      Alert.alert("Error", "Failed to load predictions");
    } finally {
      setLoading(false);
    }
  }, [token, sport, result]);

  useEffect(() => { loadDirect(1, sport, result); }, [sport, result]); // eslint-disable-line

  async function markResult(id: number, res: "win" | "loss" | "push") {
    if (!token) return;
    setActionId(id);
    try {
      await fetch(`/api/admin/predictions/${id}/result`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ result: res }),
      });
      setPreds((prev) => prev.map((p) => p.id === id ? { ...p, result: res } : p));
    } catch {
      Alert.alert("Error", "Failed to update result");
    } finally {
      setActionId(null);
    }
  }

  async function deletePred(id: number) {
    Alert.alert("Delete Prediction", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          if (!token) return;
          setActionId(id);
          try {
            await fetch(`/api/admin/predictions/${id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            setPreds((prev) => prev.filter((p) => p.id !== id));
          } catch {
            Alert.alert("Error", "Delete failed");
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  }

  const wins = preds.filter((p) => p.result === "win").length;
  const losses = preds.filter((p) => p.result === "loss").length;
  const accuracy = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(0) : "–";

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.text }]}>🎯 Predictions Manager</Text>
        <View style={s.headerStats}>
          <Text style={[s.statChip, { backgroundColor: "#00FF9420", color: "#00FF94" }]}>✓ {wins}W</Text>
          <Text style={[s.statChip, { backgroundColor: "#FF4D4D20", color: "#FF4D4D" }]}>✗ {losses}L</Text>
          <Text style={[s.statChip, { backgroundColor: `${colors.cyan}20`, color: colors.cyan }]}>{accuracy}%</Text>
        </View>
      </View>

      {/* Sport filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.filterBar, { borderBottomColor: colors.border }]} contentContainerStyle={s.filterContent}>
        {SPORTS.map((sp) => (
          <TouchableOpacity key={sp} style={[s.pill, { backgroundColor: sport === sp ? colors.cyan : colors.card, borderColor: sport === sp ? colors.cyan : colors.border }]}
            onPress={() => setSport(sp)}>
            <Text style={[s.pillText, { color: sport === sp ? colors.background : colors.text }]}>{sp}</Text>
          </TouchableOpacity>
        ))}
        <Filter size={14} color={colors.textMuted} style={{ alignSelf: "center", marginLeft: 4 }} />
        {RESULTS.map((r) => (
          <TouchableOpacity key={r.id} style={[s.pill, { backgroundColor: result === r.id ? "#FFD700" : colors.card, borderColor: result === r.id ? "#FFD700" : colors.border }]}
            onPress={() => setResult(r.id)}>
            <Text style={[s.pillText, { color: result === r.id ? colors.background : colors.text }]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.list} contentContainerStyle={[s.listContent, { paddingBottom: 80 }]}>
        {loading && preds.length === 0 ? (
          <ActivityIndicator color={colors.cyan} style={{ marginTop: 40 }} />
        ) : preds.length === 0 ? (
          <Text style={[s.empty, { color: colors.textMuted }]}>No predictions found</Text>
        ) : (
          <>
            {preds.map((p) => (
              <View key={p.id} style={[s.card, { backgroundColor: colors.card, borderColor: p.result === "win" ? "#00FF9444" : p.result === "loss" ? "#FF4D4D44" : colors.cardBorder }]}>
                <View style={s.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.matchTitle, { color: colors.text }]} numberOfLines={1}>{p.homeTeam} vs {p.awayTeam}</Text>
                    <Text style={[s.matchMeta, { color: colors.textMuted }]}>{p.sport} · {p.league}</Text>
                  </View>
                  <View style={[s.confBadge, { backgroundColor: `${confidenceColor(p.confidence)}20`, borderColor: `${confidenceColor(p.confidence)}44` }]}>
                    <Text style={[s.confText, { color: confidenceColor(p.confidence) }]}>{p.confidence}%</Text>
                  </View>
                </View>

                <Text style={[s.prediction, { color: colors.textSecondary }]} numberOfLines={2}>{p.prediction}</Text>

                <View style={s.cardFooter}>
                  <Text style={[s.date, { color: colors.textMuted }]}>{new Date(p.matchDate).toLocaleDateString()}</Text>
                  {p.result ? (
                    <View style={[s.resultBadge, { backgroundColor: p.result === "win" ? "#00FF9420" : p.result === "loss" ? "#FF4D4D20" : "#FFD70020" }]}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: p.result === "win" ? "#00FF94" : p.result === "loss" ? "#FF4D4D" : "#FFD700" }}>
                        {p.result.toUpperCase()}
                      </Text>
                    </View>
                  ) : (
                    <View style={s.resultActions}>
                      {actionId === p.id ? <ActivityIndicator size="small" color={colors.cyan} /> : (
                        <>
                          <TouchableOpacity style={[s.resultBtn, { backgroundColor: "#00FF9420", borderColor: "#00FF9444" }]} onPress={() => markResult(p.id, "win")}>
                            <CheckCircle2 size={12} color="#00FF94" /><Text style={{ fontSize: 10, color: "#00FF94", fontWeight: "700" }}>W</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[s.resultBtn, { backgroundColor: "#FF4D4D20", borderColor: "#FF4D4D44" }]} onPress={() => markResult(p.id, "loss")}>
                            <XCircle size={12} color="#FF4D4D" /><Text style={{ fontSize: 10, color: "#FF4D4D", fontWeight: "700" }}>L</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[s.resultBtn, { backgroundColor: "#FFD70020", borderColor: "#FFD70044" }]} onPress={() => markResult(p.id, "push")}>
                            <Text style={{ fontSize: 10, color: "#FFD700", fontWeight: "700" }}>~P</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity style={[s.resultBtn, { backgroundColor: "#FF4D4D10", borderColor: "#FF4D4D33" }]} onPress={() => deletePred(p.id)}>
                        <Trash2 size={12} color="#FF4D4D" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ))}
            {hasMore && (
              <TouchableOpacity style={[s.loadMore, { borderColor: colors.border }]} onPress={() => loadDirect(page + 1)}>
                <Text style={{ color: colors.cyan }}>Load more</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      <AdminTabBar />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerStats: { flexDirection: "row", gap: 8, marginTop: 6 },
  statChip: { fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  filterBar: { maxHeight: 48, borderBottomWidth: 1 },
  filterContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: "row", alignItems: "center" },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: "600" },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 10 },
  card: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 8 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  matchTitle: { fontSize: 13, fontWeight: "700" },
  matchMeta: { fontSize: 11, marginTop: 2 },
  confBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  confText: { fontSize: 12, fontWeight: "700" },
  prediction: { fontSize: 12, lineHeight: 17 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  date: { fontSize: 11 },
  resultBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  resultActions: { flexDirection: "row", gap: 6, alignItems: "center" },
  resultBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  empty: { textAlign: "center", marginTop: 60 },
  loadMore: { padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "center", marginTop: 8 },
});
