import {
  ChevronRight,
  Crown,
  HelpCircle,
  Info,
  LogOut,
  Settings,
  Shield,
  Trophy,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api, type PerformanceData } from "@/lib/api";

const TIER_COLORS: Record<string, string> = {
  free:  "#A0AEC0",
  pro:   "#00E5FF",
  elite: "#FFD700",
};

const TIER_LABELS: Record<string, string> = {
  free:  "Free",
  pro:   "Pro",
  elite: "Elite",
};

function Row({
  icon, label, onPress, color, colors,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  color?: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIcon, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
        {icon}
      </View>
      <Text style={[styles.rowLabel, { color: color ?? colors.text }]}>{label}</Text>
      {onPress && <ChevronRight size={16} color={colors.textMuted} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { user, token, logout } = useAuth();

  const [perf, setPerf] = useState<PerformanceData | null>(null);

  const loadPerf = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.user.performance(token);
      setPerf(data);
    } catch {}
  }, [token]);

  useEffect(() => { loadPerf(); }, [loadPerf]);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding    = insets.top + topPaddingWeb;
  const tier          = user?.tier ?? "free";
  const tierColor     = TIER_COLORS[tier] ?? "#A0AEC0";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPadding + 16, paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Avatar / Identity ── */}
      <View style={styles.hero}>
        <View style={[styles.avatar, { backgroundColor: colors.card, borderColor: tierColor }]}>
          <Text style={[styles.avatarInitial, { color: tierColor }]}>
            {(user?.username ?? "?")[0].toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.username, { color: colors.text }]}>{user?.username ?? "—"}</Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email ?? "—"}</Text>
        <View style={[styles.tierBadge, { backgroundColor: `${tierColor}22`, borderColor: tierColor }]}>
          <Crown size={12} color={tierColor} />
          <Text style={[styles.tierLabel, { color: tierColor }]}>{TIER_LABELS[tier] ?? tier}</Text>
        </View>
      </View>

      {/* ── Stats strip ── */}
      {perf && (
        <View style={[styles.statsStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.cyan }]}>{perf.winRate ?? 0}%</Text>
            <Text style={[styles.statKey, { color: colors.textSecondary }]}>Win Rate</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: perf.roi >= 0 ? colors.green : colors.red }]}>
              {perf.roi >= 0 ? "+" : ""}{perf.roi.toFixed(1)}%
            </Text>
            <Text style={[styles.statKey, { color: colors.textSecondary }]}>ROI</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{perf.totalBets}</Text>
            <Text style={[styles.statKey, { color: colors.textSecondary }]}>Total Bets</Text>
          </View>
        </View>
      )}

      {/* ── Account section ── */}
      <Text style={[styles.section, { color: colors.textMuted }]}>ACCOUNT</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row
          icon={<Settings size={16} color={colors.cyan} />}
          label="Settings"
          onPress={() => router.push("/settings")}
          colors={colors}
        />
        <Row
          icon={<Crown size={16} color={TIER_COLORS.elite} />}
          label="Upgrade Plan"
          onPress={() => router.push("/settings")}
          colors={colors}
        />
        <Row
          icon={<Trophy size={16} color={TIER_COLORS.pro} />}
          label="Leaderboard"
          onPress={() => router.push("/leaderboard")}
          colors={colors}
        />
      </View>

      {/* ── App section ── */}
      <Text style={[styles.section, { color: colors.textMuted }]}>APP</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row
          icon={<Shield size={16} color={colors.cyan} />}
          label="Responsible Gambling"
          onPress={() => router.push("/responsible-gambling")}
          colors={colors}
        />
        <Row
          icon={<HelpCircle size={16} color={colors.cyan} />}
          label="Privacy Policy"
          onPress={() => router.push("/privacy-policy")}
          colors={colors}
        />
        <Row
          icon={<Info size={16} color={colors.cyan} />}
          label="Terms of Service"
          onPress={() => router.push("/terms-of-service")}
          colors={colors}
        />
        <Row
          icon={<Info size={16} color={colors.cyan} />}
          label="About PrediQs AI"
          onPress={() => router.push("/about")}
          colors={colors}
        />
      </View>

      {/* ── Sign out ── */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 8 }]}>
        <Row
          icon={<LogOut size={16} color="#FF4D4D" />}
          label="Sign Out"
          onPress={handleLogout}
          color="#FF4D4D"
          colors={colors}
        />
      </View>

      <Text style={[styles.version, { color: colors.textMuted }]}>PrediQs AI · v1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  hero:           { alignItems: "center", paddingHorizontal: 24, paddingBottom: 24 },
  avatar:         { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", borderWidth: 2, marginBottom: 12 },
  avatarInitial:  { fontSize: 32, fontFamily: "Inter_700Bold" },
  username:       { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.4, marginBottom: 4 },
  email:          { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 12 },
  tierBadge:      { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  tierLabel:      { fontSize: 13, fontFamily: "Inter_700Bold" },
  statsStrip:     { flexDirection: "row", marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 24 },
  statItem:       { flex: 1, alignItems: "center", gap: 2 },
  statValue:      { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statKey:        { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider:    { width: 1, marginVertical: 4 },
  section:        { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.2, paddingHorizontal: 20, marginBottom: 8, marginTop: 4 },
  card:           { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: "hidden", marginBottom: 8 },
  row:            { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  rowIcon:        { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rowLabel:       { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  version:        { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 24 },
});
