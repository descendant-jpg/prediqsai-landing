import { AlertCircle, ChevronRight, Settings, Trophy, TrendingDown, TrendingUp } from "lucide-react-native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { TierGate } from "@/components/TierGate";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { api, type PerformanceData } from "@/lib/api";

const SPORT_COLORS: Record<string, string> = {
  nfl: "#FF6B35",
  nba: "#00E5FF",
  mlb: "#FFD700",
  soccer: "#00FF94",
};

function getColor(sport: string): string {
  return SPORT_COLORS[sport.toLowerCase()] ?? "#A0AEC0";
}

export default function PerformanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  const [data, setData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + topPaddingWeb;

  const load = useCallback(async () => {
    if (!token) return;
    setError("");
    setIsLoading(true);
    try {
      const result = await api.user.performance(token);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("performance.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const hasActivity = (data?.totalBets ?? 0) > 0;

  const overallStats = data
    ? [
        {
          label: t("performance.winRate"),
          value: hasActivity ? `${data.winRate}%` : "—",
          sub: hasActivity ? t("performance.betsPlaced", { count: data.totalBets }) : t("performance.noBetsYet"),
          positive: hasActivity ? data.winRate > 50 : null,
        },
        {
          label: t("performance.roi"),
          value: hasActivity ? `${data.roi >= 0 ? "+" : ""}${data.roi}%` : "—",
          sub: t("performance.onDeposited"),
          positive: hasActivity ? data.roi > 0 : null,
        },
        {
          label: t("performance.aiPicks"),
          value: `${data.predictionCount}`,
          sub: t("performance.avgConfidence", { pct: data.avgConfidence }),
          positive: null,
        },
        {
          label: t("performance.netPnl"),
          value: hasActivity
            ? `${data.netPnl >= 0 ? "+" : ""}$${Math.abs(data.netPnl).toFixed(0)}`
            : "—",
          sub: hasActivity ? (data.netPnl >= 0 ? t("performance.inProfit") : t("performance.inLosses")) : t("performance.noActivity"),
          positive: hasActivity ? data.netPnl >= 0 : null,
        },
      ]
    : [];

  const sportEntries = data
    ? Object.entries(data.sportStats)
        .sort((a, b) => b[1].picks - a[1].picks)
        .slice(0, 5)
    : [];

  const tiers = data
    ? [
        { tier: data.confidenceTiers.high.label, count: data.confidenceTiers.high.count },
        { tier: data.confidenceTiers.medium.label, count: data.confidenceTiers.medium.count },
        { tier: data.confidenceTiers.low.label, count: data.confidenceTiers.low.count },
      ]
    : [];

  const totalTierPicks = tiers.reduce((s, t) => s + t.count, 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 16, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading && data !== null}
          onRefresh={load}
          tintColor={colors.cyan}
        />
      }
    >
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>{t("performance.title")}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t("performance.subtitle")}</Text>
        </View>
        <TouchableOpacity
          style={[styles.leaderboardBtn, { backgroundColor: "rgba(255,215,0,0.1)", borderColor: "rgba(255,215,0,0.35)" }]}
          onPress={() => router.push("/leaderboard" as any)}
          activeOpacity={0.8}
        >
          <Trophy size={14} color={colors.gold} />
          <Text style={[styles.leaderboardBtnText, { color: colors.gold }]}>{t("performance.leaderboard")}</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={[styles.errorCard, { backgroundColor: "rgba(255,77,77,0.08)", borderColor: "rgba(255,77,77,0.25)" }]}>
          <AlertCircle size={16} color={colors.red} />
          <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
        </View>
      ) : null}

      {isLoading && !data ? (
        <View style={styles.statsGrid}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.skeleton, { width: "60%", backgroundColor: colors.border }]} />
              <View style={[styles.skeleton, { width: "40%", height: 28, marginTop: 4, backgroundColor: colors.border }]} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.statsGrid}>
          {overallStats.map((stat, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      stat.positive === true
                        ? colors.green
                        : stat.positive === false
                          ? colors.red
                          : colors.text,
                  },
                ]}
              >
                {stat.value}
              </Text>
              {stat.sub ? (
                <Text style={[styles.statSub, { color: colors.textMuted }]}>{stat.sub}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {!hasActivity && !isLoading && (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("performance.noActivityTitle")}</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t("performance.noActivityText")}
          </Text>
          <View style={styles.emptyIcons}>
            <TrendingUp size={20} color={colors.green} />
            <TrendingDown size={20} color={colors.red} />
          </View>
        </View>
      )}

      {sportEntries.length > 0 && (
        <TierGate requiredTier="premium" customMessage={t("performance.bySportGate")}>
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("performance.bySport")}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {sportEntries.map(([sport, stats], i) => {
                const color = getColor(sport);
                const pct = totalTierPicks > 0 ? (stats.picks / Math.max(data!.predictionCount, 1)) * 100 : 40;
                return (
                  <View
                    key={sport}
                    style={[
                      styles.sportRow,
                      i < sportEntries.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                    ]}
                  >
                    <View style={[styles.sportDot, { backgroundColor: color }]} />
                    <Text style={[styles.sportName, { color: colors.text }]}>{sport.toUpperCase()}</Text>
                    <View style={styles.sportBarWrap}>
                      <View style={[styles.sportBarBg, { backgroundColor: colors.border }]}>
                        <View style={[styles.sportBarFill, { width: `${Math.min(pct, 100)}%` as never, backgroundColor: color }]} />
                      </View>
                      <Text style={[styles.sportWinRate, { color: color }]}>{t("performance.picksCount", { count: stats.picks })}</Text>
                    </View>
                    <Text style={[styles.sportConf, { color: colors.textSecondary }]}>{t("performance.avgShort", { pct: stats.avgConfidence })}</Text>
                  </View>
                );
              })}
            </View>
          </>
        </TierGate>
      )}

      {tiers.length > 0 && (
        <TierGate requiredTier="premium" customMessage={t("performance.confidenceTiersGate")}>
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("performance.confidenceTiers")}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.tableHeaderText, { color: colors.textMuted, flex: 2 }]}>{t("performance.colTier")}</Text>
                <Text style={[styles.tableHeaderText, { color: colors.textMuted }]}>{t("performance.colPicks")}</Text>
                <Text style={[styles.tableHeaderText, { color: colors.textMuted }]}>{t("performance.colShare")}</Text>
              </View>
              {tiers.map((row, i) => (
                <View
                  key={i}
                  style={[
                    styles.tableRow,
                    i < tiers.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                  ]}
                >
                  <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>{row.tier}</Text>
                  <Text style={[styles.tableCell, { color: colors.textSecondary }]}>{row.count}</Text>
                  <Text style={[styles.tableCell, { color: colors.textSecondary }]}>
                    {totalTierPicks > 0 ? `${Math.round((row.count / totalTierPicks) * 100)}%` : "—"}
                  </Text>
                </View>
              ))}
            </View>
          </>
        </TierGate>
      )}

      {user?.id === 1 && (
        <TouchableOpacity
          style={[styles.adminLink, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => router.push("/setup")}
          activeOpacity={0.8}
        >
          <Settings size={16} color={colors.textMuted} />
          <Text style={[styles.adminLinkText, { color: colors.textSecondary }]}>{t("performance.apiKeysGuide")}</Text>
          <ChevronRight size={14} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      <DisclaimerFooter />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  title: { fontSize: 24, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: -8 },
  errorCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 13 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { borderRadius: 14, padding: 14, borderWidth: 1, width: "47.5%", gap: 4 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 22, letterSpacing: -0.5 },
  statSub: { fontSize: 11 },
  skeleton: { height: 14, borderRadius: 7 },
  emptyCard: { borderRadius: 16, padding: 20, borderWidth: 1, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 16 },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  emptyIcons: { flexDirection: "row", gap: 12 },
  sectionTitle: { fontSize: 16, marginTop: 4 },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sportRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  sportDot: { width: 10, height: 10, borderRadius: 5 },
  sportName: { fontSize: 13, width: 40 },
  sportBarWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  sportBarBg: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  sportBarFill: { height: "100%", borderRadius: 3 },
  sportWinRate: { fontSize: 11, width: 52, textAlign: "right" },
  sportConf: { fontSize: 11, width: 52, textAlign: "right" },
  tableHeader: { flexDirection: "row", padding: 12, borderBottomWidth: 1, gap: 8 },
  tableHeaderText: { fontSize: 11, letterSpacing: 0.5, flex: 1, textTransform: "uppercase" },
  tableRow: { flexDirection: "row", padding: 14, alignItems: "center", gap: 8 },
  tableCell: { fontSize: 13, flex: 1 },
  adminLink: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  adminLinkText: { flex: 1, fontSize: 14 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  leaderboardBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  leaderboardBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
