import { RefreshCw } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdminTabBar } from "@/components/AdminTabBar";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

type RevenueData = {
  totalUsers: number; newToday: number; newWeek: number; newMonth: number;
  tierBreakdown: { free: number; premium: number };
  mrr: number; arr: number; totalDeposits: number; depositCount: number;
  recentDeposits: number; conversionRate: number;
  prices: { premium: number };
};

function MetricCard({ label, value, sub, color, prefix }: { label: string; value: string | number; sub?: string; color: string; prefix?: string }) {
  const colors = useColors();
  return (
    <View style={[s.metricCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[s.metricValue, { color }]}>{prefix ?? ""}{value}</Text>
      <Text style={[s.metricLabel, { color: colors.textMuted }]}>{label}</Text>
      {sub && <Text style={[s.metricSub, { color: colors.textMuted }]}>{sub}</Text>}
    </View>
  );
}

function TierBar({ free, premium, total }: { free: number; premium: number; total: number }) {
  const colors = useColors();
  if (total === 0) return null;
  return (
    <View style={[s.tierBarWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[s.sectionLabel, { color: colors.textMuted }]}>USER TIER BREAKDOWN</Text>
      <View style={s.tierBarRow}>
        {free > 0 && <View style={[s.tierSeg, { flex: free, backgroundColor: "#94A3B860" }]} />}
        {premium > 0 && <View style={[s.tierSeg, { flex: premium, backgroundColor: "#FFD70080" }]} />}
      </View>
      <View style={s.tierLegend}>
        <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: "#94A3B8" }]} /><Text style={[s.legendText, { color: colors.textMuted }]}>Free {free}</Text></View>
        <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: "#FFD700" }]} /><Text style={[s.legendText, { color: colors.textMuted }]}>Premium {premium}</Text></View>
      </View>
    </View>
  );
}

export default function AdminRevenueScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch("/api/admin/revenue", { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json() as RevenueData;
      setData(d);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>💰 Revenue Dashboard</Text>
          <Text style={[s.headerSub, { color: "#FFD700" }]}>Pre-launch mode — Stripe not yet connected</Text>
        </View>
        <TouchableOpacity onPress={load} disabled={loading} style={{ padding: 8 }}>
          {loading ? <ActivityIndicator size="small" color={colors.cyan} /> : <RefreshCw size={18} color={colors.textMuted} />}
        </TouchableOpacity>
      </View>

      {loading && !data ? (
        <ActivityIndicator color={colors.cyan} style={{ marginTop: 60 }} />
      ) : data ? (
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: 80 }]}>

          {/* Revenue metrics */}
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>PROJECTED MRR (Stripe not connected)</Text>
          <View style={s.metricsGrid}>
            <MetricCard label="MRR" value={data.mrr.toFixed(2)} prefix="$" color="#00FF94" sub="Monthly recurring" />
            <MetricCard label="ARR" value={data.arr.toFixed(2)} prefix="$" color="#00FF94" sub="Annual recurring" />
          </View>

          {/* Pricing reference */}
          <View style={[s.infoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[s.infoTitle, { color: colors.text }]}>💳 Pricing</Text>
            <View style={s.pricingRow}>
              <View style={[s.pricingItem, { borderColor: "#FFD70044" }]}>
                <Text style={[s.pricingTier, { color: "#FFD700" }]}>PREMIUM</Text>
                <Text style={[s.pricingAmount, { color: colors.text }]}>${data.prices.premium}/mo</Text>
                <Text style={[s.pricingCount, { color: colors.textMuted }]}>{data.tierBreakdown.premium} users</Text>
                <Text style={[s.pricingTotal, { color: "#FFD700" }]}>${(data.prices.premium * data.tierBreakdown.premium).toFixed(2)}/mo</Text>
              </View>
            </View>
          </View>

          {/* User growth */}
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>USER GROWTH</Text>
          <View style={s.metricsGrid}>
            <MetricCard label="Total Users" value={data.totalUsers} color={colors.cyan} />
            <MetricCard label="New Today" value={data.newToday} color="#00FF94" />
            <MetricCard label="New This Week" value={data.newWeek} color="#00FF94" />
            <MetricCard label="New This Month" value={data.newMonth} color="#00FF94" />
          </View>

          {/* Conversion */}
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>CONVERSION</Text>
          <View style={s.metricsGrid}>
            <MetricCard label="Conversion Rate" value={`${data.conversionRate}%`} color={data.conversionRate > 10 ? "#00FF94" : data.conversionRate > 5 ? "#FFD700" : "#FF4D4D"} sub="Free → Paid" />
            <MetricCard label="Paying Users" value={data.tierBreakdown.premium} color="#FFD700" />
          </View>

          {/* Tier breakdown */}
          <TierBar
            free={data.tierBreakdown.free}
            premium={data.tierBreakdown.premium}
            total={data.totalUsers}
          />

          {/* Bankroll deposits (proxy for engagement) */}
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>BANKROLL ACTIVITY</Text>
          <View style={s.metricsGrid}>
            <MetricCard label="Total Deposited" value={data.totalDeposits.toFixed(2)} prefix="$" color={colors.cyan} sub="Virtual bankroll" />
            <MetricCard label="Deposit Events" value={data.depositCount} color={colors.cyan} />
          </View>

          <View style={[s.stripeNote, { backgroundColor: "#FFD70010", borderColor: "#FFD70033" }]}>
            <Text style={[s.stripeNoteText, { color: "#FFD700" }]}>
              💡 Connect Stripe to see real revenue. Set{" "}
              <Text style={{ fontWeight: "700" }}>STRIPE_SECRET_KEY</Text> in API Keys to enable payments.
            </Text>
          </View>
        </ScrollView>
      ) : null}

      <AdminTabBar />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerSub: { fontSize: 11, marginTop: 2 },
  content: { padding: 14, gap: 14 },
  sectionLabel: { fontSize: 11, letterSpacing: 1, fontWeight: "700" },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: { flex: 1, minWidth: "44%", borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 4 },
  metricValue: { fontSize: 24, fontWeight: "800" },
  metricLabel: { fontSize: 11, textAlign: "center" },
  metricSub: { fontSize: 10, textAlign: "center" },
  infoCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  infoTitle: { fontSize: 14, fontWeight: "700" },
  pricingRow: { flexDirection: "row", gap: 10 },
  pricingItem: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 12, alignItems: "center", gap: 3 },
  pricingTier: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  pricingAmount: { fontSize: 16, fontWeight: "700" },
  pricingCount: { fontSize: 11 },
  pricingTotal: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  tierBarWrap: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  tierBarRow: { flexDirection: "row", height: 20, borderRadius: 10, overflow: "hidden", gap: 2 },
  tierSeg: { borderRadius: 4 },
  tierLegend: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11 },
  stripeNote: { borderRadius: 12, borderWidth: 1, padding: 14 },
  stripeNoteText: { fontSize: 12, lineHeight: 18 },
});
