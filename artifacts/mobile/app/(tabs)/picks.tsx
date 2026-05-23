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
import { LiveMatchCard } from "@/components/LiveMatchCard";
import { PredictionCard } from "@/components/PredictionCard";
import { SPORT_FILTERS } from "@/constants/mockData";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api, type AccuracyStats, type AllSportsResponse, type ApiPrediction, type NBAGame, type NFLGame, type MLBGame, type SoccerFixture, type SoccerLeagueGroup } from "@/lib/api";
import type { Prediction } from "@/types";

type FilterKey  = (typeof SPORT_FILTERS)[number]["key"];
type TopTab     = "PRE-MATCH" | "TODAY" | "LIVE" | "SEASON";
const TOP_TABS: TopTab[] = ["PRE-MATCH", "TODAY", "LIVE", "SEASON"];

// ── Helpers for TODAY tab ────────────────────────────────────────────────────

function formatKickoff(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

function MultiSportGameCard({
  homeTeam, awayTeam, homeScore, awayScore, status, meta, colors,
}: {
  homeTeam: string; awayTeam: string;
  homeScore: number | null; awayScore: number | null;
  status: string; meta: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const isLive = /in progress|live|Q[1-4]|1H|2H|halftime/i.test(status);
  return (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: isLive ? "rgba(255,77,77,0.4)" : colors.border,
    }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: "Inter_400Regular" }}>{meta}</Text>
        {isLive && (
          <View style={{ backgroundColor: "rgba(255,77,77,0.18)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ color: "#FF4D4D", fontSize: 11, fontFamily: "Inter_700Bold" }}>LIVE</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: colors.text, fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 }} numberOfLines={1}>{homeTeam}</Text>
        {homeScore != null && (
          <Text style={{ color: colors.text, fontSize: 18, fontFamily: "Inter_700Bold", marginHorizontal: 6 }}>{homeScore}</Text>
        )}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 15, fontFamily: "Inter_400Regular", flex: 1 }} numberOfLines={1}>{awayTeam}</Text>
        {awayScore != null && (
          <Text style={{ color: colors.textSecondary, fontSize: 18, fontFamily: "Inter_700Bold", marginHorizontal: 6 }}>{awayScore}</Text>
        )}
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 6 }}>{status}</Text>
    </View>
  );
}

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
    case "all":    return predictions;
    case "nfl":    return predictions.filter((p) => p.sport === "nfl");
    case "nba":    return predictions.filter((p) => p.sport === "nba");
    case "mlb":    return predictions.filter((p) => p.sport === "mlb");
    case "soccer": return predictions.filter((p) => p.sport === "soccer");
    case "value":  return predictions.filter((p) => p.valueDetected);
    case "avoid":  return predictions.filter((p) => p.avoidMatch);
    default:       return predictions;
  }
}

export default function PicksScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { token } = useAuth();

  const [topTab,        setTopTab]        = useState<TopTab>("PRE-MATCH");
  const [activeFilter,  setActiveFilter]  = useState<FilterKey>("all");
  const [predictions,   setPredictions]   = useState<Prediction[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState("");
  const [accuracy,      setAccuracy]      = useState<AccuracyStats | null>(null);
  const [liveFixtures,  setLiveFixtures]  = useState<SoccerFixture[]>([]);
  const [liveLoading,   setLiveLoading]   = useState(false);
  const [allSports,     setAllSports]     = useState<AllSportsResponse | null>(null);
  const [sportsLoading, setSportsLoading] = useState(false);

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

  useEffect(() => {
    if (topTab !== "LIVE" || !token) return;
    let active = true;
    setLiveLoading(true);

    async function loadLive() {
      try {
        const fixtures = await api.soccer.live(token!);
        if (active) setLiveFixtures(fixtures);
      } catch {}
      if (active) setLiveLoading(false);
    }

    loadLive();
    const interval = setInterval(loadLive, 60_000);
    return () => { active = false; clearInterval(interval); };
  }, [topTab, token]);

  useEffect(() => {
    if (topTab !== "TODAY" || !token) return;
    if (allSports) return; // cached
    let active = true;
    setSportsLoading(true);
    api.sports.today(token)
      .then((data) => { if (active) setAllSports(data); })
      .catch(() => {})
      .finally(() => { if (active) setSportsLoading(false); });
    return () => { active = false; };
  }, [topTab, token, allSports]);

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding    = insets.top + topPaddingWeb;
  const filtered    = applyFilter(predictions, activeFilter);
  const seasonPicks = predictions
    .filter((p) => p.valueDetected && !p.avoidMatch)
    .sort((a, b) => b.confidence - a.confidence);

  const monthLabel = accuracy?.month
    ? new Date(accuracy.month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  const listPad = [styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20 }];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPadding + 16, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Today's Picks</Text>
          <TouchableOpacity onPress={fetchPredictions} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <RefreshCw size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Top tab bar */}
        <View style={[styles.topTabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {TOP_TABS.map((tab) => {
            const active = topTab === tab;
            const isLive = tab === "LIVE";
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.topTab,
                  active && {
                    backgroundColor: isLive ? "rgba(255,77,77,0.18)" : colors.cyan,
                  },
                ]}
                onPress={() => setTopTab(tab)}
                activeOpacity={0.75}
              >
                {isLive && (
                  <View
                    style={[
                      styles.liveDot,
                      { backgroundColor: active ? "#FF4D4D" : colors.textMuted },
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.topTabText,
                    {
                      color: active
                        ? isLive
                          ? "#FF4D4D"
                          : colors.background
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── PRE-MATCH ── */}
      {topTab === "PRE-MATCH" && (
        <>
          {accuracy?.accuracy != null && (
            <View style={[styles.accuracyBanner, { backgroundColor: "rgba(0,229,255,0.06)", borderColor: colors.cyan, marginHorizontal: 16, marginTop: 12, borderRadius: 10, borderWidth: 1 }]}>
              <View style={styles.accuracyLeft}>
                <Text style={[styles.accuracyLabel, { color: colors.textSecondary }]}>
                  AI Accuracy · {monthLabel}
                </Text>
                <Text style={[styles.accuracyValue, { color: colors.cyan }]}>
                  {accuracy.accuracy}%
                </Text>
              </View>
              <View style={styles.accuracyRight}>
                <Text style={[styles.accuracyRecord, { color: colors.green }]}>{accuracy.wins}W</Text>
                <Text style={[styles.accuracyDash,   { color: colors.textMuted }]}> – </Text>
                <Text style={[styles.accuracyRecord, { color: colors.red }]}>{accuracy.losses}L</Text>
              </View>
            </View>
          )}

          <View style={[styles.filterContainer, { borderBottomColor: colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {SPORT_FILTERS.map((f) => {
                const isActive = activeFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      styles.filterBtn,
                      {
                        backgroundColor: isActive ? colors.cyan : "transparent",
                        borderColor:     isActive ? colors.cyan : colors.border,
                      },
                    ]}
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
              contentContainerStyle={listPad}
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
        </>
      )}

      {/* ── TODAY (all sports fixtures) ── */}
      {topTab === "TODAY" && (
        <>
          {sportsLoading && !allSports ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.cyan} size="large" />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading today's fixtures…</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
            >
              {/* Soccer section */}
              {(() => {
                const groups: SoccerLeagueGroup[] = allSports?.soccer?.leagueGroups ?? [];
                const total = allSports?.soccer?.totalCount ?? 0;
                return (
                  <>
                    <View style={styles.sportHeader}>
                      <Text style={[styles.sportEmoji]}>⚽</Text>
                      <Text style={[styles.sportName, { color: colors.text }]}>Soccer</Text>
                      <Text style={[styles.sportCount, { color: colors.textMuted }]}>{total} matches</Text>
                    </View>
                    {groups.length === 0 ? (
                      <Text style={[styles.noGamesText, { color: colors.textMuted }]}>
                        {allSports?.soccer?.hasApiKey === false
                          ? "API key required for live soccer fixtures"
                          : "No soccer fixtures today"}
                      </Text>
                    ) : (
                      groups.map((group) => (
                        <View key={group.leagueId} style={{ marginBottom: 12 }}>
                          <Text style={[styles.leagueHeader, { color: colors.textSecondary }]}>
                            {group.leagueFlag} {group.leagueName}
                            <Text style={{ color: colors.textMuted }}> · {group.leagueCountry}</Text>
                          </Text>
                          {group.fixtures.map((f) => (
                            <MultiSportGameCard
                              key={f.id}
                              homeTeam={f.homeTeam}
                              awayTeam={f.awayTeam}
                              homeScore={f.homeScore}
                              awayScore={f.awayScore}
                              status={f.statusShort === "NS" ? formatKickoff(f.kickoff) : f.statusLong}
                              meta={`${group.leagueFlag} ${group.leagueName}`}
                              colors={colors}
                            />
                          ))}
                        </View>
                      ))
                    )}
                  </>
                );
              })()}

              {/* NBA section */}
              {(() => {
                const games = allSports?.nba ?? [];
                return (
                  <>
                    <View style={[styles.sportHeader, { marginTop: 8 }]}>
                      <Text style={styles.sportEmoji}>🏀</Text>
                      <Text style={[styles.sportName, { color: colors.text }]}>NBA</Text>
                      <Text style={[styles.sportCount, { color: colors.textMuted }]}>{games.length} games</Text>
                    </View>
                    {games.length === 0 ? (
                      <Text style={[styles.noGamesText, { color: colors.textMuted }]}>No NBA games today</Text>
                    ) : (
                      games.map((g) => (
                        <MultiSportGameCard
                          key={g.id}
                          homeTeam={g.homeTeam}
                          awayTeam={g.awayTeam}
                          homeScore={g.homeScore}
                          awayScore={g.awayScore}
                          status={g.status}
                          meta={`🏀 NBA · ${g.arena || "Arena TBD"}`}
                          colors={colors}
                        />
                      ))
                    )}
                  </>
                );
              })()}

              {/* NFL section */}
              {(() => {
                const games = allSports?.nfl ?? [];
                return (
                  <>
                    <View style={[styles.sportHeader, { marginTop: 8 }]}>
                      <Text style={styles.sportEmoji}>🏈</Text>
                      <Text style={[styles.sportName, { color: colors.text }]}>NFL</Text>
                      <Text style={[styles.sportCount, { color: colors.textMuted }]}>{games.length} games</Text>
                    </View>
                    {games.length === 0 ? (
                      <Text style={[styles.noGamesText, { color: colors.textMuted }]}>No NFL games today</Text>
                    ) : (
                      games.map((g) => (
                        <MultiSportGameCard
                          key={g.id}
                          homeTeam={g.homeTeam}
                          awayTeam={g.awayTeam}
                          homeScore={g.homeScore}
                          awayScore={g.awayScore}
                          status={g.status}
                          meta={`🏈 NFL · ${g.week || "Week"}`}
                          colors={colors}
                        />
                      ))
                    )}
                  </>
                );
              })()}

              {/* MLB section */}
              {(() => {
                const games = allSports?.mlb ?? [];
                return (
                  <>
                    <View style={[styles.sportHeader, { marginTop: 8 }]}>
                      <Text style={styles.sportEmoji}>⚾</Text>
                      <Text style={[styles.sportName, { color: colors.text }]}>MLB</Text>
                      <Text style={[styles.sportCount, { color: colors.textMuted }]}>{games.length} games</Text>
                    </View>
                    {games.length === 0 ? (
                      <Text style={[styles.noGamesText, { color: colors.textMuted }]}>No MLB games today</Text>
                    ) : (
                      games.map((g) => (
                        <MultiSportGameCard
                          key={g.id}
                          homeTeam={g.homeTeam}
                          awayTeam={g.awayTeam}
                          homeScore={g.homeScore}
                          awayScore={g.awayScore}
                          status={g.status}
                          meta={`⚾ MLB · ${g.venue || "Venue TBD"}`}
                          colors={colors}
                        />
                      ))
                    )}
                  </>
                );
              })()}
            </ScrollView>
          )}
        </>
      )}

      {/* ── SEASON ── */}
      {topTab === "SEASON" && (
        <FlatList
          data={seasonPicks}
          keyExtractor={(item) => `season-${item.id}`}
          renderItem={({ item }) => <PredictionCard prediction={item} />}
          contentContainerStyle={[{ padding: 16, paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.seasonHeader}>
              <Text style={[styles.seasonTitle, { color: colors.text }]}>Season Best Bets</Text>
              <Text style={[styles.seasonSub, { color: colors.textSecondary }]}>
                Highest-value opportunities with detected bookmaker edge
              </Text>
            </View>
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator color={colors.cyan} size="large" />
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={{ fontSize: 32 }}>📈</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No value picks available yet
                </Text>
                <Text style={[styles.retryText, { color: colors.textMuted }]}>
                  Season picks appear as AI detects bookmaker edges
                </Text>
              </View>
            )
          }
          ListFooterComponent={seasonPicks.length > 0 ? <DisclaimerFooter /> : null}
        />
      )}

      {/* ── LIVE ── */}
      {topTab === "LIVE" && (
        <>
          {liveLoading && liveFixtures.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#FF4D4D" size="large" />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Fetching live matches…</Text>
            </View>
          ) : (
            <FlatList
              data={liveFixtures}
              keyExtractor={(item) => `live-${item.id}`}
              renderItem={({ item }) => <LiveMatchCard fixture={item} />}
              contentContainerStyle={[{ padding: 16, paddingBottom: insets.bottom + 40 }]}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={styles.liveHeader}>
                  <View style={styles.liveBadgeRow}>
                    <View style={styles.livePulse} />
                    <Text style={[styles.liveHeaderText, { color: "#FF4D4D" }]}>LIVE NOW</Text>
                  </View>
                  <Text style={[styles.liveRefreshText, { color: colors.textMuted }]}>
                    Auto-refreshes every 60s · {liveFixtures.length} matches
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={{ fontSize: 36 }}>⚽</Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No live matches right now</Text>
                  <Text style={[styles.retryText, { color: colors.textMuted }]}>
                    Refreshing every 60 seconds
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  header:         { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title:          { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  // Top tab bar
  topTabBar:      {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  topTab:         { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 9, gap: 5 },
  topTabText:     { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  liveDot:        { width: 6, height: 6, borderRadius: 3 },
  // Accuracy banner
  accuracyBanner: { paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  accuracyLeft:   { gap: 1 },
  accuracyLabel:  { fontSize: 11, fontFamily: "Inter_400Regular" },
  accuracyValue:  { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  accuracyRight:  { flexDirection: "row", alignItems: "center" },
  accuracyRecord: { fontSize: 14, fontFamily: "Inter_700Bold" },
  accuracyDash:   { fontSize: 14 },
  // Filter
  filterContainer:{ borderBottomWidth: 1 },
  filters:        { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterBtn:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterText:     { fontSize: 13, fontFamily: "Inter_400Regular" },
  // States
  centered:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  loadingText:    { fontSize: 14, fontFamily: "Inter_400Regular" },
  errorText:      { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  retryText:      { fontSize: 13, fontFamily: "Inter_400Regular" },
  list:           { padding: 16 },
  empty:          { paddingVertical: 60, alignItems: "center", gap: 12 },
  emptyText:      { fontSize: 15, fontFamily: "Inter_500Medium" },
  // Season
  seasonHeader:   { marginBottom: 16, gap: 4 },
  seasonTitle:    { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  seasonSub:      { fontSize: 13, fontFamily: "Inter_400Regular" },
  // Live
  liveHeader:     { marginBottom: 12, gap: 4 },
  liveBadgeRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  livePulse:      { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF4D4D" },
  liveHeaderText: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  liveRefreshText:{ fontSize: 12, fontFamily: "Inter_400Regular" },
  // TODAY
  sportHeader:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 4 },
  sportEmoji:     { fontSize: 20 },
  sportName:      { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  sportCount:     { fontSize: 12, fontFamily: "Inter_400Regular" },
  leagueHeader:   { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.2, marginBottom: 6, marginTop: 4 },
  noGamesText:    { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 16, paddingLeft: 4 },
});
