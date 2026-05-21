import { useRouter } from "expo-router";
import { Trophy, Users, X } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api, type LeaderboardData, type LeaderboardEntry } from "@/lib/api";

const MEDAL = ["🥇", "🥈", "🥉"];

function RankRow({ entry, rank, isMe }: { entry: LeaderboardEntry; rank: number; isMe: boolean }) {
  const colors = useColors();
  const medal = rank <= 3 ? MEDAL[rank - 1] : null;

  return (
    <View style={[
      styles.row,
      {
        backgroundColor: isMe ? "rgba(0,229,255,0.06)" : colors.card,
        borderColor: isMe ? colors.cyan : colors.cardBorder,
      },
    ]}>
      <View style={styles.rankCol}>
        {medal ? (
          <Text style={styles.medal}>{medal}</Text>
        ) : (
          <Text style={[styles.rankNum, { color: colors.textMuted }]}>#{rank}</Text>
        )}
      </View>

      <View style={styles.nameCol}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: isMe ? colors.cyan : colors.text }]} numberOfLines={1}>
            {entry.displayName}
          </Text>
          {entry.badge && <Text style={styles.badge}>{entry.badge}</Text>}
          {entry.isVerified && <Text style={styles.verified}>✓</Text>}
        </View>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {entry.totalPicks} picks · {entry.streak > 0 ? `🔥${entry.streak} streak` : ""}
        </Text>
      </View>

      <View style={styles.statsCol}>
        <Text style={[styles.winRate, { color: entry.winRate >= 60 ? colors.green : colors.textSecondary }]}>
          {entry.winRate.toFixed(0)}%
        </Text>
        <Text style={[styles.record, { color: colors.textMuted }]}>
          {entry.wins}W/{entry.losses}L
        </Text>
      </View>

      <View style={styles.roiCol}>
        <Text style={[styles.roi, { color: entry.roi >= 0 ? colors.green : colors.red }]}>
          {entry.roi >= 0 ? "+" : ""}{entry.roi.toFixed(0)}%
        </Text>
        <Text style={[styles.roiLabel, { color: colors.textMuted }]}>ROI</Text>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isToggling, setIsToggling] = useState(false);

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + topPaddingWeb;

  const load = useCallback(async () => {
    if (!token) return;
    setError("");
    setIsLoading(true);
    try {
      const result = await api.leaderboard.get(token);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function handleToggleOptIn() {
    if (!token || !data) return;
    setIsToggling(true);
    try {
      if (data.optedIn) {
        Alert.alert(
          "Leave Leaderboard",
          "Your stats will be removed. You can re-join anytime.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Leave",
              style: "destructive",
              onPress: async () => {
                await api.leaderboard.optOut(token);
                await load();
              },
            },
          ],
        );
      } else {
        await api.leaderboard.optIn(token);
        await load();
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update leaderboard status");
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={[styles.headerIcon, { backgroundColor: "rgba(255,215,0,0.12)" }]}>
            <Trophy size={18} color={colors.gold} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Leaderboard</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Top verified bettors this month</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.optBtn,
            {
              backgroundColor: data?.optedIn ? "rgba(255,77,77,0.1)" : "rgba(0,229,255,0.1)",
              borderColor: data?.optedIn ? colors.red : colors.cyan,
            },
          ]}
          onPress={handleToggleOptIn}
          disabled={isToggling || isLoading}
        >
          <Text style={[styles.optBtnText, { color: data?.optedIn ? colors.red : colors.cyan }]}>
            {data?.optedIn ? "Leave" : "Join"}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.cyan} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.cyan} />}
          contentContainerStyle={styles.list}
        >
          {!data?.optedIn && (
            <View style={[styles.joinBanner, { backgroundColor: "rgba(0,229,255,0.05)", borderColor: "rgba(0,229,255,0.2)" }]}>
              <Users size={16} color={colors.cyan} />
              <Text style={[styles.joinText, { color: colors.textSecondary }]}>
                Track your results in the Bankroll tab, then tap Join to appear here. Your display name is your username.
              </Text>
            </View>
          )}

          {data?.myEntry && (
            <View style={styles.myEntrySection}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>YOUR RANKING</Text>
              <RankRow
                entry={data.myEntry}
                rank={(data.leaderboard.findIndex((e) => e.userId === data.myEntry?.userId) ?? -1) + 1 || 99}
                isMe
              />
            </View>
          )}

          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TOP BETTORS</Text>

          {data?.leaderboard.length === 0 ? (
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No one on the leaderboard yet. Be the first to join!
              </Text>
            </View>
          ) : (
            data?.leaderboard.map((entry, i) => (
              <RankRow
                key={entry.id}
                entry={entry}
                rank={i + 1}
                isMe={entry.userId === user?.id}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  headerIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  optBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  optBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  list: { padding: 16, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorText: { fontSize: 14, textAlign: "center" },
  emptyText: { fontSize: 14, textAlign: "center" },
  joinBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  joinText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  myEntrySection: { marginBottom: 8 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 10,
  },
  rankCol: { width: 30, alignItems: "center" },
  medal: { fontSize: 18 },
  rankNum: { fontSize: 13, fontFamily: "Inter_700Bold" },
  nameCol: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  badge: { fontSize: 10 },
  verified: { fontSize: 12, color: "#00E5FF" },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statsCol: { alignItems: "flex-end", gap: 1 },
  winRate: { fontSize: 15, fontFamily: "Inter_700Bold" },
  record: { fontSize: 10, fontFamily: "Inter_400Regular" },
  roiCol: { alignItems: "flex-end", minWidth: 40 },
  roi: { fontSize: 13, fontFamily: "Inter_700Bold" },
  roiLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
});
