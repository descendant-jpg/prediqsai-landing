import { useRouter } from "expo-router";
import { AlertTriangle, BarChart3, DollarSign, FileText, Globe, Key, LayoutDashboard, MessageSquare, RefreshCw, Shield, Target, TrendingUp, Users } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdminTabBar } from "@/components/AdminTabBar";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api, type AdminStats } from "@/lib/api";

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors = useColors();
  return (
    <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[s.statValue, { color: color ?? colors.cyan }]}>{String(value)}</Text>
      <Text style={[s.statLabel, { color: colors.text }]}>{label}</Text>
      {sub ? <Text style={[s.statSub, { color: colors.textMuted }]}>{sub}</Text> : null}
    </View>
  );
}

function SectionTile({ icon, label, sub, onPress, color, badge }: {
  icon: React.ReactNode; label: string; sub?: string; onPress: () => void; color: string; badge?: number;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[s.tile, { backgroundColor: colors.card, borderColor: `${color}33` }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[s.tileIcon, { backgroundColor: `${color}18` }]}>{icon}</View>
      {badge !== undefined && badge > 0 && (
        <View style={s.badge}><Text style={s.badgeText}>{badge}</Text></View>
      )}
      <Text style={[s.tileLabel, { color: colors.text }]}>{label}</Text>
      {sub && <Text style={[s.tileSub, { color: colors.textMuted }]}>{sub}</Text>}
    </TouchableOpacity>
  );
}

export default function AdminOverviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const load = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const st = await api.admin.stats(token);
      setStats(st);
      setError("");
    } catch {
      setError("Failed to load stats. Are you an admin?");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (!user?.isAdmin) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Shield size={40} color="#FF4D4D" />
        <Text style={[s.accessDenied, { color: "#FF4D4D" }]}>Access Denied</Text>
        <Text style={[s.accessSub, { color: colors.textMuted }]}>You don't have admin privileges.</Text>
        <TouchableOpacity style={[s.backBtnSmall, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Text style={{ color: colors.text }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>🔐 PrediQs Admin</Text>
          <Text style={[s.headerSub, { color: colors.textMuted }]}>
            {user.username} · {dateStr} {timeStr}
          </Text>
        </View>
        <TouchableOpacity onPress={() => load(true)} disabled={refreshing} style={{ padding: 8 }}>
          {refreshing ? <ActivityIndicator size="small" color={colors.cyan} /> : <RefreshCw size={18} color={colors.textMuted} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: 80 }]}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.cyan} style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={[s.error, { color: "#FF4D4D" }]}>{error}</Text>
        ) : stats ? (
          <>
            <Text style={[s.sectionTitle, { color: colors.textMuted }]}>USER STATS</Text>
            <View style={s.statsGrid}>
              <StatCard label="Total Users" value={stats.totalUsers} color={colors.cyan} />
              <StatCard label="Today's Signups" value={stats.todaySignups} color="#00FF94" />
              <StatCard label="Premium" value={stats.tierBreakdown.premium} color="#FFD700" />
              <StatCard label="Free" value={stats.tierBreakdown.free} color={colors.textMuted} />
              <StatCard label="Banned" value={stats.banned} color="#FF4D4D" sub={stats.suspended > 0 ? `${stats.suspended} suspended` : undefined} />
            </View>
          </>
        ) : null}

        <Text style={[s.sectionTitle, { color: colors.textMuted }]}>ADMIN SECTIONS</Text>
        <View style={s.tilesGrid}>
          <SectionTile icon={<Users size={22} color="#00E5FF" />} label="Users" sub="Manage accounts" onPress={() => router.push("/admin/users")} color="#00E5FF" />
          <SectionTile icon={<Target size={22} color="#00FF94" />} label="Predictions" sub="Track results" onPress={() => router.push("/admin/predictions")} color="#00FF94" />
          <SectionTile icon={<Key size={22} color="#FF9900" />} label="API Keys" sub="Test & rotate" onPress={() => router.push("/admin/api-keys")} color="#FF9900" />
          <SectionTile icon={<TrendingUp size={22} color="#FFD700" />} label="Revenue" sub="Growth metrics" onPress={() => router.push("/admin/revenue")} color="#FFD700" />
          <SectionTile icon={<MessageSquare size={22} color="#9B59B6" />} label="Notifications" sub="Push to users" onPress={() => router.push("/admin/notifications")} color="#9B59B6" />
          <SectionTile icon={<AlertTriangle size={22} color="#FF4D4D" />} label="Error Log" sub="Bug tracker" onPress={() => router.push("/admin/errors")} color="#FF4D4D" badge={stats?.banned ?? 0} />
          <SectionTile icon={<Globe size={22} color="#FFD700" />} label="World Cup" sub="Soccer picks" onPress={() => router.push("/admin/worldcup")} color="#FFD700" />
          <SectionTile icon={<BarChart3 size={22} color="#2ECC71" />} label="Config" sub="Feature flags" onPress={() => router.push("/admin/config")} color="#2ECC71" />
          <SectionTile icon={<LayoutDashboard size={22} color="#3498DB" />} label="API Health" sub="Monitor APIs" onPress={() => router.push("/admin/health")} color="#3498DB" />
          <SectionTile icon={<DollarSign size={22} color="#00FF94" />} label="Affiliates" sub="Links & earnings" onPress={() => router.push("/admin/affiliates")} color="#00FF94" />
          <SectionTile icon={<FileText size={22} color="#94A3B8" />} label="Audit Logs" sub="All actions" onPress={() => router.push("/admin/logs")} color="#94A3B8" />
        </View>
      </ScrollView>

      <AdminTabBar />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  accessDenied: { fontSize: 20, fontWeight: "700" },
  accessSub: { fontSize: 14, textAlign: "center" },
  backBtnSmall: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 2 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: 18, gap: 12 },
  sectionTitle: { fontSize: 11, letterSpacing: 1, marginTop: 4, fontWeight: "700" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "30%", flexGrow: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 26, fontWeight: "700" },
  statLabel: { fontSize: 11, textAlign: "center" },
  statSub: { fontSize: 10, textAlign: "center" },
  tilesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "47%", flexGrow: 1, borderRadius: 16, borderWidth: 1, padding: 14, gap: 6, position: "relative" },
  tileIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tileLabel: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  tileSub: { fontSize: 11 },
  badge: { position: "absolute", top: 10, right: 10, backgroundColor: "#FF4D4D", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  error: { textAlign: "center", marginTop: 40 },
});
