import { RefreshCw } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdminTabBar } from "@/components/AdminTabBar";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api, type ApiKeyTestResult } from "@/lib/api";

const CATEGORY_COLOR: Record<string, string> = {
  AI: "#9B59B6", Sports: "#00E5FF", Betting: "#FFD700",
  Content: "#00FF94", Data: "#3498DB", Push: "#FF9900",
  Email: "#FF6B6B", Analytics: "#2ECC71", Finance: "#1ABC9C",
};

const KEY_META: { name: string; label: string; category: string }[] = [
  { name: "ANTHROPIC_API_KEY",    label: "PrediQs AI Engine",   category: "AI" },
  { name: "API_SPORTS_KEY",       label: "API-Sports",          category: "Sports" },
  { name: "ODDS_API_KEY",         label: "The Odds API",        category: "Betting" },
  { name: "NEWS_API_KEY",         label: "News API",            category: "Content" },
  { name: "WEATHER_API_KEY",      label: "Weather API",         category: "Data" },
  { name: "ONESIGNAL_APP_ID",     label: "OneSignal App ID",    category: "Push" },
  { name: "ONESIGNAL_API_KEY",    label: "OneSignal API Key",   category: "Push" },
  { name: "RESEND_API_KEY",       label: "Resend Email",        category: "Email" },
  { name: "GOOGLE_ANALYTICS_ID",  label: "Google Analytics",    category: "Analytics" },
  { name: "EXCHANGE_RATE_API_KEY",label: "Exchange Rate API",   category: "Finance" },
];

export default function AdminHealthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [results, setResults] = useState<Record<string, ApiKeyTestResult>>({});
  const [testing, setTesting] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const runAll = useCallback(async () => {
    if (!token) return;
    setTesting(true);
    try {
      const r = await api.admin.testAllApiKeys(token);
      const map: Record<string, ApiKeyTestResult> = {};
      for (const item of r) map[item.keyName] = item;
      setResults(map);
      setLastChecked(new Date());
    } catch { /* ignore */ } finally {
      setTesting(false);
    }
  }, [token]);

  useEffect(() => {
    runAll();
    timerRef.current = setInterval(runAll, 60_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [runAll]);

  const working = Object.values(results).filter((r) => r.ok).length;
  const failed = Object.values(results).filter((r) => !r.ok).length;
  const total = KEY_META.length;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>🏥 API Health Monitor</Text>
          <Text style={[s.headerSub, { color: colors.textMuted }]}>
            Auto-refresh every 60s
            {lastChecked ? ` · Last: ${lastChecked.toLocaleTimeString()}` : ""}
          </Text>
        </View>
        <TouchableOpacity
          style={[s.refreshBtn, { borderColor: colors.border }]}
          onPress={runAll}
          disabled={testing}
          activeOpacity={0.8}
        >
          {testing ? <ActivityIndicator size="small" color={colors.cyan} /> : <RefreshCw size={18} color={colors.cyan} />}
        </TouchableOpacity>
      </View>

      {/* Summary bar */}
      <View style={[s.summaryBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={s.summaryItem}>
          <Text style={[s.summaryNum, { color: "#00FF94" }]}>{working}</Text>
          <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Working</Text>
        </View>
        <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={s.summaryItem}>
          <Text style={[s.summaryNum, { color: "#FF4D4D" }]}>{failed}</Text>
          <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Failed</Text>
        </View>
        <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={s.summaryItem}>
          <Text style={[s.summaryNum, { color: colors.cyan }]}>{total - working - failed}</Text>
          <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Pending</Text>
        </View>
        <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={s.summaryItem}>
          <Text style={[s.summaryNum, { color: colors.text }]}>{total}</Text>
          <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Total APIs</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
        {KEY_META.map((k) => {
          const r = results[k.name];
          const catColor = CATEGORY_COLOR[k.category] ?? "#94A3B8";
          const statusColor = r ? (r.ok ? "#00FF94" : "#FF4D4D") : colors.textMuted;
          const statusIcon = r ? (r.ok ? "✅" : "❌") : "⏳";

          return (
            <View key={k.name} style={[s.card, { backgroundColor: colors.card, borderColor: r ? (r.ok ? "#00FF9422" : "#FF4D4D33") : colors.cardBorder }]}>
              <View style={s.cardTop}>
                <Text style={{ fontSize: 18 }}>{statusIcon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={s.cardTitleRow}>
                    <Text style={[s.cardLabel, { color: colors.text }]}>{k.label}</Text>
                    <View style={[s.catPill, { backgroundColor: `${catColor}20`, borderColor: `${catColor}44` }]}>
                      <Text style={[s.catText, { color: catColor }]}>{k.category}</Text>
                    </View>
                  </View>
                  <Text style={[s.cardKey, { color: colors.textMuted }]}>{k.name}</Text>
                </View>
              </View>

              {r ? (
                <View style={[s.resultRow, { backgroundColor: r.ok ? "#00FF9410" : "#FF4D4D10", borderColor: r.ok ? "#00FF9422" : "#FF4D4D22" }]}>
                  <Text style={[s.resultMsg, { color: statusColor }]}>{r.message}</Text>
                  <Text style={[s.resultMs, { color: colors.textMuted }]}>{r.responseTime}ms</Text>
                  {r.metadata && Object.keys(r.metadata).length > 0 && (
                    <Text style={[s.resultMeta, { color: colors.textMuted }]}>
                      {Object.entries(r.metadata).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                    </Text>
                  )}
                </View>
              ) : testing ? (
                <View style={[s.resultRow, { backgroundColor: `${colors.cyan}10`, borderColor: `${colors.cyan}22` }]}>
                  <ActivityIndicator size="small" color={colors.cyan} />
                  <Text style={[s.resultMsg, { color: colors.cyan, marginLeft: 8 }]}>Testing…</Text>
                </View>
              ) : null}
            </View>
          );
        })}
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
  refreshBtn: { padding: 10, borderRadius: 10, borderWidth: 1 },
  summaryBar: { flexDirection: "row", borderBottomWidth: 1, paddingVertical: 12 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryNum: { fontSize: 22, fontWeight: "800" },
  summaryLabel: { fontSize: 10, marginTop: 2 },
  summaryDivider: { width: 1, marginVertical: 4 },
  content: { padding: 14, gap: 10 },
  card: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
  cardTop: { flexDirection: "row", gap: 10, alignItems: "center" },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  cardLabel: { fontSize: 13, fontWeight: "700" },
  cardKey: { fontSize: 10, marginTop: 2 },
  catPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  catText: { fontSize: 9, fontWeight: "700" },
  resultRow: { borderRadius: 8, borderWidth: 1, padding: 10, gap: 2, flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  resultMsg: { fontSize: 12, fontWeight: "600", flex: 1 },
  resultMs: { fontSize: 11 },
  resultMeta: { fontSize: 11, width: "100%" },
});
