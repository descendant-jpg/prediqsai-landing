import { useRouter } from "expo-router";
import { ArrowLeft, FileText, Settings2, Shield, Users } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api, type AdminStats } from "@/lib/api";

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[styles.statValue, { color: color ?? colors.cyan }]}>{String(value)}</Text>
      <Text style={[styles.statLabel, { color: colors.text }]}>{label}</Text>
      {sub ? <Text style={[styles.statSub, { color: colors.textMuted }]}>{sub}</Text> : null}
    </View>
  );
}

function QuickAction({ icon, label, onPress, color }: { icon: React.ReactNode; label: string; onPress: () => void; color?: string }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon}
      <Text style={[styles.quickLabel, { color: color ?? colors.text }]}>{label}</Text>
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
      const s = await api.admin.stats(token);
      setStats(s);
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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Shield size={40} color="#FF4D4D" />
        <Text style={[styles.accessDenied, { color: "#FF4D4D" }]}>Access Denied</Text>
        <Text style={[styles.accessSub, { color: colors.textMuted }]}>You don't have admin privileges.</Text>
        <TouchableOpacity style={[styles.backBtnSmall, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Text style={{ color: colors.text }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>🔐 PrediQs AI Admin</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            Welcome back, {user.username} · {dateStr} {timeStr}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.cyan} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.cyan} style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={[styles.error, { color: "#FF4D4D" }]}>{error}</Text>
        ) : stats ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>USER STATS</Text>
            <View style={styles.statsGrid}>
              <StatCard label="Total Users" value={stats.totalUsers} color={colors.cyan} />
              <StatCard label="Today's Signups" value={stats.todaySignups} color="#00FF94" />
              <StatCard label="Pro" value={stats.tierBreakdown.pro} color={colors.cyan} />
              <StatCard label="Elite" value={stats.tierBreakdown.elite} color="#FFD700" />
              <StatCard label="Free" value={stats.tierBreakdown.free} color={colors.textMuted} />
              <StatCard label="Banned" value={stats.banned} color="#FF4D4D" sub={stats.suspended > 0 ? `${stats.suspended} suspended` : undefined} />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>QUICK ACTIONS</Text>
            <View style={styles.quickActions}>
              <QuickAction
                icon={<Users size={20} color={colors.cyan} />}
                label="Manage Users"
                onPress={() => router.push("/admin/users")}
              />
              <QuickAction
                icon={<Settings2 size={20} color="#FFD700" />}
                label="Feature Flags"
                onPress={() => router.push("/admin/config")}
                color="#FFD700"
              />
              <QuickAction
                icon={<FileText size={20} color={colors.textSecondary} />}
                label="Audit Logs"
                onPress={() => router.push("/admin/logs")}
                color={colors.textSecondary}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  accessDenied: { fontSize: 20, fontWeight: "700" },
  accessSub: { fontSize: 14, textAlign: "center" },
  backBtnSmall: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 2 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSub: { fontSize: 12 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },
  sectionTitle: { fontSize: 11, letterSpacing: 1, marginTop: 8 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "30%", flexGrow: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 26, fontWeight: "700" },
  statLabel: { fontSize: 11, textAlign: "center" },
  statSub: { fontSize: 10, textAlign: "center" },
  quickActions: { gap: 10 },
  quickBtn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  quickLabel: { fontSize: 15, fontWeight: "600" },
  error: { textAlign: "center", marginTop: 40 },
});
