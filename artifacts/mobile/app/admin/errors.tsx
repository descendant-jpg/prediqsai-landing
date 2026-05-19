import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdminTabBar } from "@/components/AdminTabBar";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

type ErrorLog = {
  id: string; errorType: string; message: string; screen: string | null;
  userId: number | null; device: string | null; os: string | null;
  stackTrace: string | null; resolved: boolean | null;
  resolvedAt: string | null; createdAt: string;
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unresolved", label: "Unresolved" },
  { id: "resolved", label: "Resolved" },
];

function errorTypeColor(type: string): string {
  if (type.toLowerCase().includes("crash")) return "#FF4D4D";
  if (type.toLowerCase().includes("api")) return "#FF9900";
  if (type.toLowerCase().includes("auth")) return "#A855F7";
  return "#00E5FF";
}

export default function AdminErrorsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("unresolved");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (p = 1, f = filter) => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/errors?page=${p}&filter=${f}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json() as { errors: ErrorLog[]; limit: number };
      if (p === 1) setErrors(data.errors);
      else setErrors((prev) => [...prev, ...data.errors]);
      setHasMore(data.errors.length === data.limit);
      setPage(p);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => { load(1, filter); }, [filter]); // eslint-disable-line

  async function resolve(id: string) {
    if (!token) return;
    setResolvingId(id);
    try {
      const r = await fetch(`/api/admin/errors/${id}/resolve`, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
      const updated = await r.json() as ErrorLog;
      setErrors((prev) => prev.map((e) => e.id === id ? updated : e));
    } catch {
      Alert.alert("Error", "Failed to resolve");
    } finally {
      setResolvingId(null);
    }
  }

  const unresolvedCount = errors.filter((e) => !e.resolved).length;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>⚠️ Error Log</Text>
          {unresolvedCount > 0 && <Text style={[s.headerSub, { color: "#FF4D4D" }]}>{unresolvedCount} unresolved errors</Text>}
        </View>
        <TouchableOpacity onPress={() => load(1, filter)} disabled={loading} style={{ padding: 8 }}>
          <RefreshCw size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.filterBar, { borderBottomColor: colors.border }]} contentContainerStyle={s.filterContent}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f.id} style={[s.pill, { backgroundColor: filter === f.id ? colors.cyan : colors.card, borderColor: filter === f.id ? colors.cyan : colors.border }]}
            onPress={() => setFilter(f.id)}>
            <Text style={[s.pillText, { color: filter === f.id ? colors.background : colors.text }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.list} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
        {loading && errors.length === 0 ? (
          <ActivityIndicator color={colors.cyan} style={{ marginTop: 40 }} />
        ) : errors.length === 0 ? (
          <View style={s.emptyState}>
            <CheckCircle2 size={40} color="#00FF94" />
            <Text style={[s.emptyTitle, { color: colors.text }]}>No errors logged</Text>
            <Text style={[s.emptySub, { color: colors.textMuted }]}>
              {filter === "unresolved" ? "All errors resolved 🎉" : "No errors found for this filter"}
            </Text>
          </View>
        ) : (
          <>
            {errors.map((e) => {
              const typeColor = errorTypeColor(e.errorType);
              const isExpanded = expanded === e.id;
              return (
                <TouchableOpacity key={e.id} style={[s.card, { backgroundColor: colors.card, borderColor: e.resolved ? colors.cardBorder : "#FF4D4D33" }]}
                  onPress={() => setExpanded(isExpanded ? null : e.id)} activeOpacity={0.85}>
                  <View style={s.cardHeader}>
                    <View style={[s.typePill, { backgroundColor: `${typeColor}20`, borderColor: `${typeColor}44` }]}>
                      <AlertTriangle size={10} color={typeColor} />
                      <Text style={[s.typePillText, { color: typeColor }]}>{e.errorType}</Text>
                    </View>
                    {e.resolved ? (
                      <View style={[s.statusPill, { backgroundColor: "#00FF9415", borderColor: "#00FF9433" }]}>
                        <Text style={{ fontSize: 9, color: "#00FF94", fontWeight: "700" }}>RESOLVED</Text>
                      </View>
                    ) : (
                      <View style={[s.statusPill, { backgroundColor: "#FF4D4D15", borderColor: "#FF4D4D33" }]}>
                        <Text style={{ fontSize: 9, color: "#FF4D4D", fontWeight: "700" }}>OPEN</Text>
                      </View>
                    )}
                  </View>

                  <Text style={[s.errorMsg, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 2}>{e.message}</Text>

                  <View style={s.metaRow}>
                    {e.screen && <Text style={[s.metaChip, { color: colors.textMuted }]}>📱 {e.screen}</Text>}
                    {e.os && <Text style={[s.metaChip, { color: colors.textMuted }]}>{e.os}</Text>}
                    {e.userId && <Text style={[s.metaChip, { color: colors.textMuted }]}>User #{e.userId}</Text>}
                    <Text style={[s.metaChip, { color: colors.textMuted }]}>{new Date(e.createdAt).toLocaleDateString()}</Text>
                  </View>

                  {isExpanded && e.stackTrace && (
                    <View style={[s.stackBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[s.stackText, { color: colors.textSecondary }]} selectable>{e.stackTrace}</Text>
                    </View>
                  )}

                  {!e.resolved && (
                    <TouchableOpacity
                      style={[s.resolveBtn, { borderColor: "#00FF9444" }]}
                      onPress={(ev) => { ev.stopPropagation?.(); resolve(e.id); }}
                      disabled={resolvingId === e.id}
                      activeOpacity={0.8}
                    >
                      {resolvingId === e.id ? <ActivityIndicator size="small" color="#00FF94" /> : <CheckCircle2 size={13} color="#00FF94" />}
                      <Text style={{ color: "#00FF94", fontSize: 12, fontWeight: "600" }}>Mark Resolved</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
            {hasMore && (
              <TouchableOpacity style={[s.loadMore, { borderColor: colors.border }]} onPress={() => load(page + 1)}>
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerSub: { fontSize: 11, marginTop: 2 },
  filterBar: { maxHeight: 48, borderBottomWidth: 1 },
  filterContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: "row" },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 12, fontWeight: "600" },
  list: { flex: 1 },
  content: { padding: 12, gap: 10 },
  card: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 8 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  typePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  typePillText: { fontSize: 10, fontWeight: "700" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  errorMsg: { fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaChip: { fontSize: 10 },
  stackBox: { borderRadius: 8, borderWidth: 1, padding: 10, maxHeight: 160 },
  stackText: { fontSize: 10, fontFamily: "monospace", lineHeight: 14 },
  resolveBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, alignSelf: "flex-start" },
  emptyState: { alignItems: "center", marginTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySub: { fontSize: 13, textAlign: "center" },
  loadMore: { padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "center", marginTop: 8 },
});
