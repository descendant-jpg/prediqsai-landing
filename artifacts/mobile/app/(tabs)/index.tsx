import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { PredictionCard } from "@/components/PredictionCard";
import { RiskBadge } from "@/components/RiskBadge";
import { SportBadge } from "@/components/SportBadge";
import { StatsCard } from "@/components/StatsCard";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { api, type ApiPrediction } from "@/lib/api";
import type { Prediction } from "@/types";

function mapPrediction(p: ApiPrediction): Prediction {
  return {
    id: p.id,
    sport: p.sport as Prediction["sport"],
    league: p.league,
    homeTeam: p.homeTeam,
    awayTeam: p.awayTeam,
    matchDate: p.matchDate,
    prediction: p.prediction as Prediction["prediction"],
    confidence: p.confidence,
    riskLevel: p.riskLevel as Prediction["riskLevel"],
    volatilityScore: p.volatilityScore,
    isTrapGame: p.isTrapGame,
    avoidMatch: p.avoidMatch,
    avoidReason: p.avoidReason,
    reasoning: p.reasoning,
    keyFactors: p.keyFactors,
    weatherImpact: p.weatherImpact,
    sharpMoneySignal: p.sharpMoneySignal,
    aiProbability: p.aiProbability,
    bookmakerProbability: p.bookmakerProbability,
    valueDetected: p.valueDetected,
    tierRequired: p.tierRequired as Prediction["tierRequired"],
  };
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const { token } = useAuth();
  const router = useRouter();

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPredictions = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await api.predictions.list(token);
      setPredictions(data.map(mapPrediction));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load predictions");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const todayPicks = predictions.filter((p) => !p.avoidMatch);
  const avoidPicks = predictions.filter((p) => p.avoidMatch);
  const featuredPick = predictions[0];

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + topPaddingWeb + 8;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPadding,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
            <Text style={{ color: colors.text }}>{profile.username}</Text>
          </Text>
          <Text style={[styles.appName, { color: colors.cyan }]}>PrediQs AI</Text>
        </View>
        <View
          style={[
            styles.tierBadge,
            { backgroundColor: "rgba(0,229,255,0.1)", borderColor: colors.cyan },
          ]}
        >
          <Text style={[styles.tierText, { color: colors.cyan }]}>
            {profile.tier.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatsCard
          label="Today's Picks"
          value={isLoading ? "…" : String(todayPicks.length)}
          subtitle="available"
          valueColor={colors.cyan}
        />
        <StatsCard
          label="Win Rate"
          value="67.4%"
          subtitle="30 days"
          valueColor={colors.green}
        />
        <StatsCard
          label="Bankroll"
          value={`$${profile.bankroll.toLocaleString()}`}
          valueColor={colors.gold}
        />
      </View>

      {/* Loading / Error */}
      {isLoading && (
        <View style={styles.loadingSection}>
          <ActivityIndicator color={colors.cyan} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Generating AI predictions…
          </Text>
        </View>
      )}

      {error && !isLoading && (
        <TouchableOpacity
          style={[
            styles.errorBanner,
            {
              backgroundColor: "rgba(255,77,77,0.08)",
              borderColor: "rgba(255,77,77,0.25)",
            },
          ]}
          onPress={fetchPredictions}
          activeOpacity={0.8}
        >
          <Feather name="refresh-cw" size={14} color={colors.red} />
          <Text style={[styles.errorText, { color: colors.red }]}>
            {error} — tap to retry
          </Text>
        </TouchableOpacity>
      )}

      {/* Featured Pick */}
      {!isLoading && featuredPick && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Pick</Text>
            <View style={[styles.liveDot, { backgroundColor: colors.green }]} />
            <Text style={[styles.liveText, { color: colors.green }]}>LIVE AI</Text>
          </View>

          <View
            style={[
              styles.featuredCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.featuredHeader}>
              <SportBadge sport={featuredPick.sport} />
              {featuredPick.valueDetected && (
                <View style={[styles.valueBadge, { borderColor: colors.gold }]}>
                  <Text style={[styles.valueText, { color: colors.gold }]}>
                    VALUE +{featuredPick.aiProbability - featuredPick.bookmakerProbability}%
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.featuredMatchup}>
              <Text style={[styles.featuredTeam, { color: colors.text }]}>
                {featuredPick.homeTeam}
              </Text>
              <Text style={[styles.featuredVs, { color: colors.textMuted }]}>vs</Text>
              <Text style={[styles.featuredTeam, { color: colors.text }]}>
                {featuredPick.awayTeam}
              </Text>
            </View>

            <View style={styles.featuredStats}>
              <ConfidenceMeter value={featuredPick.confidence} size={90} />
              <View style={styles.featuredInfo}>
                <RiskBadge risk={featuredPick.riskLevel} />
                <Text
                  style={[styles.featuredReasoning, { color: colors.textSecondary }]}
                  numberOfLines={3}
                >
                  {featuredPick.reasoning}
                </Text>
                {featuredPick.sharpMoneySignal && (
                  <View
                    style={[
                      styles.sharpRow,
                      { backgroundColor: "rgba(0,229,255,0.06)" },
                    ]}
                  >
                    <Feather name="trending-up" size={12} color={colors.cyan} />
                    <Text
                      style={[styles.sharpText, { color: colors.cyan }]}
                      numberOfLines={1}
                    >
                      {featuredPick.sharpMoneySignal}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </>
      )}

      {/* Avoid Warning */}
      {!isLoading && avoidPicks.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning" size={16} color={colors.red} />
            <Text style={[styles.sectionTitle, { color: colors.red }]}>Avoid Today</Text>
          </View>
          {avoidPicks.map((p) => (
            <View
              key={p.id}
              style={[
                styles.avoidCard,
                {
                  backgroundColor: "rgba(255,77,77,0.06)",
                  borderColor: "rgba(255,77,77,0.25)",
                },
              ]}
            >
              <View style={styles.avoidCardHeader}>
                <SportBadge sport={p.sport} size="sm" />
                <Text style={[styles.avoidTeams, { color: colors.text }]}>
                  {p.homeTeam} vs {p.awayTeam}
                </Text>
              </View>
              <Text style={[styles.avoidReason, { color: colors.red }]}>
                {p.avoidReason}
              </Text>
            </View>
          ))}
        </>
      )}

      {/* Today's Picks */}
      {!isLoading && todayPicks.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Picks</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/picks")}>
              <Text style={[styles.seeAll, { color: colors.cyan }]}>See all →</Text>
            </TouchableOpacity>
          </View>
          {todayPicks.slice(0, 3).map((p) => (
            <PredictionCard key={p.id} prediction={p} />
          ))}
        </>
      )}

      {/* Responsible gambling */}
      <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
        PrediQs AI is for informational purposes only. Gamble responsibly. 18+. Call
        1-800-522-4700 if you need help.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 0 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  appName: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  tierBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  tierText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  loadingSection: { alignItems: "center", paddingVertical: 40, gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 1 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5 },
  liveText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium" },
  featuredCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 24, gap: 14 },
  featuredHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  valueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "rgba(255,215,0,0.08)",
  },
  valueText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  featuredMatchup: { alignItems: "center", gap: 2 },
  featuredTeam: { fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  featuredVs: { fontSize: 12, fontFamily: "Inter_400Regular" },
  featuredStats: { flexDirection: "row", alignItems: "center", gap: 16 },
  featuredInfo: { flex: 1, gap: 8 },
  featuredReasoning: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  sharpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sharpText: { fontSize: 11, fontFamily: "Inter_500Medium", flex: 1 },
  avoidCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10, gap: 6 },
  avoidCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  avoidTeams: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  avoidReason: { fontSize: 12, fontFamily: "Inter_400Regular" },
  disclaimer: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
});
