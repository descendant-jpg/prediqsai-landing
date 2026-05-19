import { useRouter } from "expo-router";
import { ArrowLeft, RefreshCw } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminTabBar } from "@/components/AdminTabBar";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api, type AdminLogEntry } from "@/lib/api";

function actionColor(action: string | null): string {
  if (!action) return "#94A3B8";
  if (action.includes("banned")) return "#FF4D4D";
  if (action.includes("unban")) return "#00FF94";
  if (action.includes("suspend")) return "#FF9900";
  if (action.includes("unsuspend")) return "#00FF94";
  if (action.includes("tier")) return "#FFD700";
  if (action.includes("trial")) return "#A855F7";
  if (action.includes("config")) return "#00E5FF";
  return "#94A3B8";
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function LogCard({ log }: { log: AdminLogEntry }) {
  const colors = useColors();
  const aColor = actionColor(log.action);
  return (
    <View style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderLeftColor: aColor, borderLeftWidth: 3 }]}>
      <View style={styles.logHeader}>
        <View style={[styles.actionPill, { backgroundColor: `${aColor}18`, borderColor: `${aColor}44` }]}>
          <Text style={[styles.actionText, { color: aColor }]}>{log.action ?? "—"}</Text>
        </View>
        <Text style={[styles.timeText, { color: colors.textMuted }]}>{timeAgo(log.createdAt)}</Text>
      </View>
      <Text style={[styles.adminText, { color: colors.textSecondary }]}>
        By: <Text style={{ color: colors.text }}>{log.adminEmail ?? "—"}</Text>
        {log.targetUserId ? <Text style={{ color: colors.textMuted }}> → User #{log.targetUserId}</Text> : null}
      </Text>
      {log.details && (
        <Text style={[styles.detailsText, { color: colors.textMuted }]} numberOfLines={2}>
          {log.details}
        </Text>
      )}
      <Text style={[styles.isoTime, { color: colors.textMuted }]}>
        {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
      </Text>
    </View>
  );
}

export default function AdminLogsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const [logs, setLogs] = useState<AdminLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (p = 1) => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await api.admin.logs(token, p);
      if (p === 1) setLogs(r.logs);
      else setLogs((prev) => [...prev, ...r.logs]);
      setHasMore(r.logs.length === r.limit);
      setPage(p);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>📋 Audit Logs</Text>
        <TouchableOpacity onPress={() => load(1)} disabled={loading}>
          <RefreshCw size={18} color={loading ? colors.textMuted : colors.cyan} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {loading && logs.length === 0 ? (
          <ActivityIndicator color={colors.cyan} size="large" style={{ marginTop: 40 }} />
        ) : logs.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>No admin actions logged yet.</Text>
        ) : (
          <>
            {logs.map((log, i) => <LogCard key={log.id ?? i} log={log} />)}
            {hasMore && (
              <TouchableOpacity
                style={[styles.loadMore, { borderColor: colors.border }]}
                onPress={() => load(page + 1)}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator size="small" color={colors.cyan} />
                  : <Text style={{ color: colors.cyan }}>Load more</Text>}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
      <AdminTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1 },
  content: { padding: 12, gap: 10 },
  logCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  logHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  actionPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  actionText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  timeText: { fontSize: 11 },
  adminText: { fontSize: 12 },
  detailsText: { fontSize: 11, fontFamily: "monospace" },
  isoTime: { fontSize: 10 },
  empty: { textAlign: "center", marginTop: 60, fontSize: 14 },
  loadMore: { padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "center", marginTop: 8 },
});
