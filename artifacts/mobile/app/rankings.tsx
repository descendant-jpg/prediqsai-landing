import { useRouter } from "expo-router";
import { ArrowLeft, Trophy, Users } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { api, type LeaderboardData, type LeaderboardEntry } from "@/lib/api";

const MEDALS = ["🥇", "🥈", "🥉"];
const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function RankingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setError("");
    try {
      setData(await api.leaderboard.get(token));
    } catch {
      setError(t("rankings.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function join() {
    if (!token || joining) return;
    setJoining(true);
    try {
      await api.leaderboard.optIn(token);
      await load();
    } catch {
      setError(t("rankings.joinError"));
    } finally {
      setJoining(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 14, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Trophy size={18} color={colors.gold} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t("rankings.title")}</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.cyan} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.red }]}>{error}</Text>
          <TouchableOpacity onPress={load}><Text style={[styles.retry, { color: colors.cyan }]}>{t("rankings.retry")}</Text></TouchableOpacity>
        </View>
      ) : !data?.optedIn ? (
        <View style={styles.center}>
          <View style={[styles.promptIcon, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Users size={28} color={colors.cyan} />
          </View>
          <Text style={[styles.promptTitle, { color: colors.text }]}>{t("rankings.optInTitle")}</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t("rankings.optInText")}</Text>
          <TouchableOpacity disabled={joining} onPress={join} style={[styles.joinButton, { backgroundColor: colors.gold }]}>
            {joining ? <ActivityIndicator color="#0a0a0a" /> : <Text style={styles.joinButtonText}>{t("rankings.optInButton")}</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.cyan} />}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 8 }}
        >
          {data.leaderboard.length === 0 ? (
            <View style={styles.listEmpty}>
              <Trophy size={28} color={colors.textMuted} />
              <Text style={[styles.promptTitle, { color: colors.text }]}>{t("rankings.emptyTitle")}</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t("rankings.emptyText")}</Text>
            </View>
          ) : data.leaderboard.map((entry, index) => (
            <RankRow key={entry.id} entry={entry} rank={index + 1} index={index} isMe={entry.userId === user?.id} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function RankRow({ entry, rank, index, isMe }: { entry: LeaderboardEntry; rank: number; index: number; isMe: boolean }) {
  const colors = useColors();
  const { t } = useLanguage();
  const isTop3 = rank <= 3;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 380, delay: Math.min(index * 55, 800), useNativeDriver: true }).start();
  }, [anim, index]);

  return (
    <Animated.View style={[styles.row, {
      backgroundColor: isMe ? "rgba(255,215,0,0.07)" : colors.card,
      borderColor: isMe ? colors.gold : isTop3 ? MEDAL_COLORS[rank - 1] : colors.cardBorder,
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
    }]}>
      <View style={styles.rankCol}>
        {isTop3 ? <Text style={styles.medal}>{MEDALS[rank - 1]}</Text> : <Text style={[styles.rankNum, { color: colors.textMuted }]}>#{rank}</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.username, { color: isMe ? colors.gold : colors.text }]} numberOfLines={1}>
          {entry.displayName}{isMe ? ` ${t("rankings.you")}` : ""}
        </Text>
        <Text style={[styles.picks, { color: colors.textMuted }]}>{t("rankings.picks", { count: entry.totalPicks })}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.winRate, { color: entry.winRate >= 60 ? colors.green : colors.textSecondary }]}>{entry.winRate.toFixed(0)}%</Text>
        <Text style={[styles.winLabel, { color: colors.textMuted }]}>{t("rankings.winRate")}</Text>
      </View>
    </Animated.View>
  );
}

const bold = Platform.OS === "web" ? ({ fontWeight: "700" } as const) : ({ fontFamily: "Inter_700Bold" } as const);
const semibold = Platform.OS === "web" ? ({ fontWeight: "600" } as const) : ({ fontFamily: "Inter_600SemiBold" } as const);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 18, ...bold },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  listEmpty: { alignItems: "center", paddingVertical: 70, paddingHorizontal: 24, gap: 10 },
  promptIcon: { width: 62, height: 62, borderRadius: 31, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  promptTitle: { fontSize: 17, textAlign: "center", ...bold },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 320 },
  retry: { fontSize: 14, ...semibold },
  joinButton: { minWidth: 160, minHeight: 44, borderRadius: 12, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", marginTop: 4 },
  joinButtonText: { color: "#0a0a0a", fontSize: 14, ...bold },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  rankCol: { width: 30, alignItems: "center" },
  medal: { fontSize: 18 },
  rankNum: { fontSize: 13, ...bold },
  username: { fontSize: 14, ...semibold },
  picks: { fontSize: 11, marginTop: 2 },
  winRate: { fontSize: 16, ...bold },
  winLabel: { fontSize: 10 },
});