import { Inbox, RefreshCw, WifiOff } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { PredictionCard } from "@/components/PredictionCard";
import { SPORT_FILTERS } from "@/constants/mockData";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api, type AccuracyStats, type ApiPrediction } from "@/lib/api";
import type { Prediction } from "@/types";

type FilterKey = (typeof SPORT_FILTERS)[number]["key"];

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
    againstFactors: p.againstFactors ?? [],
    weatherImpact: p.weatherImpact,
    sharpMoneySignal: p.sharpMoneySignal,
    aiProbability: p.aiProbability,
    bookmakerProbability: p.bookmakerProbability,
    valueDetected: p.valueDetected,
    tierRequired: p.tierRequired as Prediction["tierRequired"],
    simulationData: p.simulationData ?? null,
    agentScores: p.agentScores ?? null,
    publicBacking: p.publicBacking ?? null,
  };
}

function applyFilter(predictions: Prediction[], filter: FilterKey): Prediction[] {
  switch (filter) {
    case "all": return predictions;
    case "nfl": return predictions.filter((p) => p.sport === "nfl");
    case "nba": return predictions.filter((p) => p.sport === "nba");
    case "mlb": return predictions.filter((p) => p.sport === "mlb");
    case "soccer": return predictions.filter((p) => p.sport === "soccer");
    case "value": return predictions.filter((p) => p.valueDetected);
    case "avoid": return predictions.filter((p) => p.avoidMatch);
    default: return predictions;
  }
}

export default function PicksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [accuracy, setAccuracy] = useState<AccuracyStats | null>(null);

  const fetchPredictions = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const [data, acc] = await Promise.all([
        api.predictions.list(token),
        api.predictions.accuracy(token).catch(() => null),
      ]);
      setPredictions(data.map(mapPrediction));
      setAccuracy(acc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load picks");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPredictions(); }, [fetchPredictions]);

  const filtered = applyFilter(predictions, activeFilter);
  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + topPaddingWeb;

  const monthLabel = accuracy?.month
    ? new Date(accuracy.month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Today's Picks</Text>
          <TouchableOpacity onPress={fetchPredictions} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <RefreshCw size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.count, { color: colors.textSecondary }]}>
          {isLoading ? "Loading…" : `${filtered.length} picks`}
        </Text>
        {accuracy?.accuracy != null && (
          <View style={[styles.accuracyBanner, { backgroundColor: "rgba(0,229,255,0.06)", borderColor: colors.cyan }]}>
            <View style={styles.accuracyLeft}>
              <Text style={[styles.accuracyLabel, { color: colors.textSecondary }]}>
                AI Accuracy · {monthLabel}
              </Text>
              <Text style={[styles.accuracyValue, { color: colors.cyan }]}>
                {accuracy.accuracy}%
              </Text>
            </View>
            <View style={styles.accuracyRight}>
              <Text style={[styles.accuracyRecord, { color: colors.green }]}>
                {accuracy.wins}W
              </Text>
              <Text style={[styles.accuracyDash, { color: colors.textMuted }]}> – </Text>
              <Text style={[styles.accuracyRecord, { color: colors.red }]}>
                {accuracy.losses}L
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={[styles.filterContainer, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {SPORT_FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterBtn, { backgroundColor: isActive ? colors.cyan : "transparent", borderColor: isActive ? colors.cyan : colors.border }]}
                onPress={() => setActiveFilter(f.key as FilterKey)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterText, { color: isActive ? colors.background : colors.textSecondary }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.cyan} size="large" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Fetching today's matches…</Text>
        </View>
      )}

      {error && !isLoading && (
        <TouchableOpacity style={styles.centered} onPress={fetchPredictions}>
          <WifiOff size={28} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
          <Text style={[styles.retryText, { color: colors.cyan }]}>Tap to retry</Text>
        </TouchableOpacity>
      )}

      {!isLoading && !error && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PredictionCard prediction={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Inbox size={28} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No picks for this filter</Text>
            </View>
          }
          ListFooterComponent={filtered.length > 0 ? <DisclaimerFooter /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 24, letterSpacing: -0.5 },
  count: { fontSize: 13, marginTop: 2 },
  accuracyBanner: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accuracyLeft: { gap: 1 },
  accuracyLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  accuracyValue: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  accuracyRight: { flexDirection: "row", alignItems: "center" },
  accuracyRecord: { fontSize: 14, fontFamily: "Inter_700Bold" },
  accuracyDash: { fontSize: 14 },
  filterContainer: { borderBottomWidth: 1 },
  filters: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  loadingText: { fontSize: 14 },
  errorText: { fontSize: 14, textAlign: "center" },
  retryText: { fontSize: 13 },
  list: { padding: 16 },
  empty: { paddingVertical: 60, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 15 },
});
