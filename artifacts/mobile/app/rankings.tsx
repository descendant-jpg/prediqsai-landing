import { useRouter } from "expo-router";
import { ArrowLeft, Trophy } from "lucide-react-native";
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  currentUserRow,
  LEADERBOARDS,
  type LeaderboardPeriod,
  type LeaderboardUser,
} from "@/lib/mockData";

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "allTime", label: "All Time" },
];

const MEDALS = ["🥇", "🥈", "🥉"];
const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function RankingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useApp();
  const [period, setPeriod] = React.useState<LeaderboardPeriod>("weekly");

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const ranked = useMemo(() => {
    const me = currentUserRow(profile.username, period);
    const combined = [...LEADERBOARDS[period], me].sort((a, b) => b.winRate - a.winRate);
    return combined.map((u, i) => ({ user: u, rank: i + 1 }));
  }, [period, profile.username]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 14, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Trophy size={18} color={colors.gold} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Leaderboard</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {PERIODS.map((p) => {
          const active = p.key === period;
          return (
            <TouchableOpacity
              key={p.key}
              activeOpacity={0.8}
              onPress={() => setPeriod(p.key)}
              style={[
                styles.tab,
                { backgroundColor: active ? colors.gold : colors.card, borderColor: active ? colors.gold : colors.cardBorder },
              ]}
            >
              <Text style={[styles.tabText, { color: active ? "#0a0a0a" : colors.textSecondary }]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 8 }}>
        {ranked.map(({ user, rank }, index) => (
          <RankRow key={`${period}-${user.id}`} user={user} rank={rank} index={index} />
        ))}
      </ScrollView>
    </View>
  );
}

function RankRow({ user, rank, index }: { user: LeaderboardUser; rank: number; index: number }) {
  const colors = useColors();
  const isMe = user.id === "me";
  const isTop3 = rank <= 3;

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 380,
      delay: Math.min(index * 55, 800),
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <Animated.View
      style={[
        styles.row,
        {
          backgroundColor: isMe ? "rgba(255,215,0,0.07)" : colors.card,
          borderColor: isMe ? colors.gold : isTop3 ? MEDAL_COLORS[rank - 1] : colors.cardBorder,
          borderWidth: isMe || isTop3 ? 1.5 : 1,
          opacity: anim,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.rankCol}>
        {isTop3 ? (
          <Text style={styles.medal}>{MEDALS[rank - 1]}</Text>
        ) : (
          <Text style={[styles.rankNum, { color: colors.textMuted }]}>#{rank}</Text>
        )}
      </View>

      <View
        style={[
          styles.avatar,
          { backgroundColor: isMe ? colors.gold : isTop3 ? `${MEDAL_COLORS[rank - 1]}22` : colors.background, borderColor: isTop3 ? MEDAL_COLORS[rank - 1] : colors.border },
        ]}
      >
        <Text style={[styles.avatarText, { color: isMe ? "#0a0a0a" : isTop3 ? MEDAL_COLORS[rank - 1] : colors.textSecondary }]}>
          {user.initials}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.username, { color: isMe ? colors.gold : colors.text }]} numberOfLines={1}>
          {user.username}{isMe ? " (You)" : ""}
        </Text>
        <Text style={[styles.picks, { color: colors.textMuted }]}>{user.picksFollowed} picks followed</Text>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.winRate, { color: user.winRate >= 70 ? colors.green : colors.textSecondary }]}>
          {user.winRate}%
        </Text>
        <Text style={[styles.winLabel, { color: colors.textMuted }]}>win rate</Text>
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
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  tabText: { fontSize: 13, ...semibold },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12 },
  rankCol: { width: 30, alignItems: "center" },
  medal: { fontSize: 18 },
  rankNum: { fontSize: 13, ...bold },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 13, ...bold },
  username: { fontSize: 14, ...semibold },
  picks: { fontSize: 11, marginTop: 2 },
  winRate: { fontSize: 16, ...bold },
  winLabel: { fontSize: 10 },
});
