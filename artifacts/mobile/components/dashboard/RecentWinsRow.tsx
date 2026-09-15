import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { api, type RecentWin } from "@/lib/api";

/** Convert decimal odds to American format, e.g. 2.5 -> "+150", 1.5 -> "-200". */
function formatAmericanOdds(decimal: number | null): string {
  if (!decimal || decimal <= 1) return "";
  const american =
    decimal >= 2 ? Math.round((decimal - 1) * 100) : Math.round(-100 / (decimal - 1));
  return american > 0 ? `+${american}` : `${american}`;
}

function pickLabel(win: RecentWin): string {
  switch (win.prediction) {
    case "home_win": return `${win.homeTeam} ML`;
    case "away_win": return `${win.awayTeam} ML`;
    case "draw":     return "Draw";
    case "over":     return "Over";
    case "under":    return "Under";
    default:         return win.prediction;
  }
}

function sportLabel(win: RecentWin): string {
  return win.sport === "soccer" ? win.league : win.sport.toUpperCase();
}

/**
 * "Recent Premium Wins" showcase — horizontally scrolling ticker of the latest
 * settled winning AI picks. Free users tapping a card hit the upgrade prompt.
 * Renders nothing when there are no settled wins yet.
 */
export function RecentWinsRow() {
  const colors = useColors();
  const { t } = useLanguage();
  const { profile } = useApp();
  const router = useRouter();
  const isPro = profile.tier === "premium";

  const [wins, setWins] = useState<RecentWin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.predictions
      .recentWins()
      .then((d) => { if (active) setWins(d.wins ?? []); })
      .catch(() => {})
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  function handleCardPress(win: RecentWin) {
    if (!isPro) {
      Alert.alert(
        t("dashboard.premiumWinAlertTitle"),
        t("dashboard.premiumWinAlertBody"),
        [
          { text: t("dashboard.premiumWinAlertDismiss"), style: "cancel" },
          { text: t("dashboard.premiumWinAlertUpgrade"), onPress: () => router.push("/subscription") },
        ],
      );
      return;
    }
    const odds = formatAmericanOdds(win.odds);
    Alert.alert(
      `${win.homeTeam} vs ${win.awayTeam}`,
      `${pickLabel(win)}${odds ? ` (${odds})` : ""}\n` +
        `${t("picks.wonConfidence")}: ${win.confidence}%\n` +
        new Date(win.matchDate).toLocaleDateString(),
    );
  }

  if (!isLoading && wins.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.gold }]}>🏆 {t("dashboard.recentWinsTitle")}</Text>
      </View>
      {isLoading ? (
        <View style={styles.skeletonRow}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.card, styles.skeletonCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            />
          ))}
        </View>
      ) : (
        <FlatList
          horizontal
          data={wins}
          keyExtractor={(item) => String(item.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const odds = formatAmericanOdds(item.odds);
            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderColor: "rgba(255,215,0,0.35)" }]}
                onPress={() => handleCardPress(item)}
                activeOpacity={0.8}
              >
                <View style={styles.cardTop}>
                  <Text style={[styles.league, { color: colors.textMuted }]} numberOfLines={1}>
                    🎯 {sportLabel(item)}
                  </Text>
                  <Text style={styles.check}>✅</Text>
                </View>
                <View style={styles.pickRow}>
                  <Text style={[styles.pick, { color: colors.text }]} numberOfLines={1}>
                    {pickLabel(item)}
                  </Text>
                  {odds ? (
                    <View style={[styles.oddsChip, { backgroundColor: "rgba(0,255,148,0.12)" }]}>
                      <Text style={[styles.oddsText, { color: colors.green }]}>{odds}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.matchup, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.homeTeam} vs {item.awayTeam}
                </Text>
                <Text style={[styles.meta, { color: colors.gold }]}>
                  {t("picks.wonConfidence")} {item.confidence}% ·{" "}
                  {new Date(item.matchDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 4, marginBottom: 12 },
  header: { paddingHorizontal: 16, marginBottom: 8 },
  title: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.6, textTransform: "uppercase" },
  listContent: { paddingHorizontal: 16, gap: 10 },
  card: {
    width: 210,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  skeletonRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10 },
  skeletonCard: { height: 96, opacity: 0.5 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  league: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4, textTransform: "uppercase", flex: 1 },
  check: { fontSize: 12 },
  pickRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pick: { fontSize: 14, fontFamily: "Inter_700Bold", flexShrink: 1 },
  oddsChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  oddsText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  matchup: { fontSize: 11, fontFamily: "Inter_400Regular" },
  meta: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
});
