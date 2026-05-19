import { RefreshCw, Search, WifiOff, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api, type SoccerFixture, type SoccerLeagueGroup } from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);

const FILTERS = [
  { key: "all", label: "All 🌍" },
  { key: "live", label: "Live 🔴" },
  { key: "ucl", label: "UCL 🏆" },
  { key: "pl", label: "Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { key: "laliga", label: "La Liga 🇪🇸" },
  { key: "bundesliga", label: "Bundesliga 🇩🇪" },
  { key: "seriea", label: "Serie A 🇮🇹" },
  { key: "ligue1", label: "Ligue 1 🇫🇷" },
  { key: "africa", label: "Africa 🌍" },
  { key: "asia", label: "Asia 🌏" },
  { key: "cups", label: "Cups 🏆" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const CREST_COLORS = [
  "#1A3A6B", "#2E5F4A", "#5F2E3A", "#3A2E6B",
  "#5F4A1A", "#1A5F5F", "#4A1A5F", "#5F3A1A",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCresterBg(name: string): string {
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return CREST_COLORS[hash % CREST_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatLastUpdated(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  return `${mins} mins ago`;
}

function getStatusDisplay(f: SoccerFixture): {
  timeText: string;
  scoreText: string | null;
  isLive: boolean;
  isFinished: boolean;
} {
  const { statusShort, elapsed, homeScore, awayScore, kickoff } = f;
  const score = `${homeScore ?? 0} - ${awayScore ?? 0}`;

  if (statusShort === "NS") {
    return { timeText: formatKickoff(kickoff), scoreText: null, isLive: false, isFinished: false };
  }
  if (statusShort === "HT") {
    return { timeText: "HT", scoreText: score, isLive: true, isFinished: false };
  }
  if (["FT", "AET", "PEN", "AWD", "WO"].includes(statusShort)) {
    return { timeText: "FT", scoreText: score, isLive: false, isFinished: true };
  }
  if (LIVE_STATUSES.has(statusShort)) {
    return { timeText: `${elapsed ?? 0}'`, scoreText: score, isLive: true, isFinished: false };
  }
  return { timeText: statusShort, scoreText: null, isLive: false, isFinished: false };
}

function predictLabel(pred: string): string {
  if (pred === "home_win") return "Home Win";
  if (pred === "away_win") return "Away Win";
  return "Draw";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TeamCrest({ name, size = 38 }: { name: string; size?: number }) {
  return (
    <View
      style={[
        styles.crest,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: getCresterBg(name) },
      ]}
    >
      <Text style={[styles.crestText, { fontSize: size * 0.28 }]}>{getInitials(name)}</Text>
    </View>
  );
}

function LiveBadge({ elapsed }: { elapsed: number | null }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);
  return (
    <View style={styles.liveBadge}>
      <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
      <Text style={styles.liveText}>LIVE {elapsed ? `${elapsed}'` : ""}</Text>
    </View>
  );
}

function GameCard({ fixture, showLeague = false }: { fixture: SoccerFixture; showLeague?: boolean }) {
  const colors = useColors();
  const { timeText, scoreText, isLive, isFinished } = getStatusDisplay(fixture);

  return (
    <View style={[styles.gameCard, { backgroundColor: colors.card, borderColor: isLive ? "#FF4D4D33" : colors.cardBorder }]}>
      {showLeague && (
        <View style={styles.gameLeagueRow}>
          <Text style={[styles.gameLeagueText, { color: colors.textMuted }]}>
            {fixture.leagueFlag}  {fixture.leagueName}
          </Text>
          {isLive && <LiveBadge elapsed={fixture.elapsed} />}
        </View>
      )}

      {/* Teams + Score */}
      <View style={styles.teamsRow}>
        {/* Home */}
        <View style={styles.teamSide}>
          <TeamCrest name={fixture.homeTeam} />
          <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={2}>
            {fixture.homeTeam}
          </Text>
        </View>

        {/* Centre */}
        <View style={styles.scoreCentre}>
          {scoreText ? (
            <Text style={[styles.scoreText, { color: isLive ? "#FF4D4D" : isFinished ? colors.textSecondary : colors.text }]}>
              {scoreText}
            </Text>
          ) : (
            <Text style={[styles.vsText, { color: colors.textSecondary }]}>vs</Text>
          )}
          <Text style={[styles.timeText, { color: isLive ? "#FF4D4D" : colors.textMuted }]}>{timeText}</Text>
        </View>

        {/* Away */}
        <View style={[styles.teamSide, styles.teamSideRight]}>
          <TeamCrest name={fixture.awayTeam} />
          <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={2}>
            {fixture.awayTeam}
          </Text>
        </View>
      </View>

      {/* AI Bar */}
      <View style={styles.aiBar}>
        <ConfidenceMeter value={fixture.confidence} size={40} />
        <View style={styles.aiInfo}>
          <Text style={[styles.predText, { color: colors.cyan }]}>
            {predictLabel(fixture.prediction)}
          </Text>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.riskPill,
                {
                  backgroundColor:
                    fixture.riskLevel === "low"
                      ? "rgba(0,255,148,0.12)"
                      : fixture.riskLevel === "medium"
                      ? "rgba(255,215,0,0.12)"
                      : "rgba(255,77,77,0.12)",
                  borderColor:
                    fixture.riskLevel === "low" ? "#00FF94" : fixture.riskLevel === "medium" ? "#FFD700" : "#FF4D4D",
                },
              ]}
            >
              <Text
                style={[
                  styles.riskText,
                  {
                    color:
                      fixture.riskLevel === "low" ? "#00FF94" : fixture.riskLevel === "medium" ? "#FFD700" : "#FF4D4D",
                  },
                ]}
              >
                {fixture.riskLevel.toUpperCase()} RISK
              </Text>
            </View>
            {fixture.valueDetected && (
              <View style={styles.valuePill}>
                <Text style={styles.valueText}>VALUE</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function FeaturedCard({ fixture }: { fixture: SoccerFixture }) {
  const colors = useColors();
  const { timeText, scoreText, isLive } = getStatusDisplay(fixture);

  return (
    <View style={[styles.featuredCard, { backgroundColor: colors.card, borderColor: colors.cyan + "44" }]}>
      <View style={styles.featuredHeader}>
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredBadgeText}>⭐ FEATURED MATCH</Text>
        </View>
        <Text style={[styles.featuredLeague, { color: colors.textSecondary }]}>
          {fixture.leagueFlag}  {fixture.leagueName}
        </Text>
      </View>
      <View style={styles.featuredTeams}>
        <View style={styles.featuredTeam}>
          <TeamCrest name={fixture.homeTeam} size={52} />
          <Text style={[styles.featuredTeamName, { color: colors.text }]}>{fixture.homeTeam}</Text>
        </View>
        <View style={styles.featuredScore}>
          {scoreText ? (
            <Text style={[styles.featuredScoreText, { color: isLive ? "#FF4D4D" : colors.text }]}>{scoreText}</Text>
          ) : (
            <Text style={[styles.featuredVs, { color: colors.textSecondary }]}>vs</Text>
          )}
          <Text style={[styles.featuredTime, { color: isLive ? "#FF4D4D" : colors.textMuted }]}>{timeText}</Text>
        </View>
        <View style={[styles.featuredTeam, { alignItems: "flex-end" }]}>
          <TeamCrest name={fixture.awayTeam} size={52} />
          <Text style={[styles.featuredTeamName, { color: colors.text }]}>{fixture.awayTeam}</Text>
        </View>
      </View>
      <View style={[styles.featuredAiRow, { borderTopColor: colors.border }]}>
        <ConfidenceMeter value={fixture.confidence} size={56} />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={[styles.featuredPredLabel, { color: colors.textMuted }]}>AI Prediction</Text>
          <Text style={[styles.featuredPred, { color: colors.cyan }]}>{predictLabel(fixture.prediction)}</Text>
          <Text style={[styles.featuredConf, { color: colors.textSecondary }]}>
            {fixture.confidence}% confidence
          </Text>
        </View>
        {isLive && <LiveBadge elapsed={fixture.elapsed} />}
      </View>
    </View>
  );
}

function LeagueSectionHeader({ group }: { group: SoccerLeagueGroup }) {
  const colors = useColors();
  return (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <Text style={[styles.sectionFlag]}>{group.leagueFlag}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionLeague, { color: colors.text }]}>{group.leagueName}</Text>
        <Text style={[styles.sectionCountry, { color: colors.textMuted }]}>{group.leagueCountry}</Text>
      </View>
      <View style={[styles.sectionCount, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.sectionCountText, { color: colors.textSecondary }]}>{group.fixtures.length}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type SoccerSection = {
  leagueId: number;
  leagueName: string;
  leagueCountry: string;
  leagueFlag: string;
  leagueTier: number;
  data: SoccerFixture[];
};

export default function SoccerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [fixtures, setFixtures] = useState<SoccerFixture[]>([]);
  const [liveFixtures, setLiveFixtures] = useState<SoccerFixture[]>([]);
  const [featuredMatch, setFeaturedMatch] = useState<SoccerFixture | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [liveCount, setLiveCount] = useState(0);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + topPaddingWeb;

  const loadFixtures = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setIsLoading(true);
      setError("");
      try {
        const data = await api.soccer.fixtures(token);
        setFixtures(data.fixtures);
        setFeaturedMatch(data.featuredMatch);
        setLastUpdated(data.lastUpdated);
        setTotalCount(data.totalCount);
        setLiveCount(data.liveCount);
        setHasApiKey(data.hasApiKey);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load fixtures");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token],
  );

  const pollLive = useCallback(async () => {
    if (!token) return;
    try {
      const live = await api.soccer.live(token);
      setLiveFixtures(live);
      setLiveCount(live.length);
    } catch {}
  }, [token]);

  useEffect(() => {
    loadFixtures();
  }, [loadFixtures]);

  // Poll live scores every 60 seconds
  useEffect(() => {
    const interval = setInterval(pollLive, 60000);
    return () => clearInterval(interval);
  }, [pollLive]);

  // Merge live updates into base fixtures
  const mergedFixtures = useMemo(() => {
    if (liveFixtures.length === 0) return fixtures;
    const liveMap = new Map(liveFixtures.map((f) => [f.id, f]));
    return fixtures.map((f) => liveMap.get(f.id) ?? f);
  }, [fixtures, liveFixtures]);

  // Apply search + filter → build sections
  const sections = useMemo<SoccerSection[]>(() => {
    let list = mergedFixtures;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.homeTeam.toLowerCase().includes(q) ||
          f.awayTeam.toLowerCase().includes(q) ||
          f.leagueName.toLowerCase().includes(q),
      );
    }

    switch (activeFilter) {
      case "live":
        list = list.filter((f) => LIVE_STATUSES.has(f.statusShort));
        break;
      case "ucl":
        list = list.filter((f) => f.leagueId === 2);
        break;
      case "pl":
        list = list.filter((f) => f.leagueId === 39);
        break;
      case "laliga":
        list = list.filter((f) => f.leagueId === 140);
        break;
      case "bundesliga":
        list = list.filter((f) => f.leagueId === 78);
        break;
      case "seriea":
        list = list.filter((f) => f.leagueId === 135);
        break;
      case "ligue1":
        list = list.filter((f) => f.leagueId === 61);
        break;
      case "africa":
        list = list.filter((f) => f.leagueTier === 3);
        break;
      case "asia":
        list = list.filter((f) => f.leagueTier === 4);
        break;
      case "cups":
        list = list.filter((f) => f.leagueTier === 5);
        break;
    }

    const map = new Map<number, SoccerSection>();
    for (const f of list) {
      if (!map.has(f.leagueId)) {
        map.set(f.leagueId, {
          leagueId: f.leagueId,
          leagueName: f.leagueName,
          leagueCountry: f.leagueCountry,
          leagueFlag: f.leagueFlag,
          leagueTier: f.leagueTier,
          data: [],
        });
      }
      map.get(f.leagueId)!.data.push(f);
    }

    const result = Array.from(map.values());
    result.sort((a, b) => {
      if (a.leagueTier !== b.leagueTier) return a.leagueTier - b.leagueTier;
      if (a.leagueId === 2) return -1;
      if (b.leagueId === 2) return 1;
      return a.leagueName.localeCompare(b.leagueName);
    });
    return result;
  }, [mergedFixtures, searchQuery, activeFilter]);

  const totalFiltered = sections.reduce((s, sec) => s + sec.data.length, 0);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 40 }}>⚽</Text>
        <Text style={[styles.loadingTitle, { color: colors.text }]}>Football Today</Text>
        <Text style={[styles.loadingSubtitle, { color: colors.textSecondary }]}>
          Fetching matches from worldwide leagues…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <WifiOff size={32} color={colors.textMuted} />
        <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.cyan }]} onPress={() => loadFixtures()}>
          <Text style={[styles.retryBtnText, { color: colors.background }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!hasApiKey) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 40 }}>⚽</Text>
        <Text style={[styles.loadingTitle, { color: colors.text }]}>API Key Required</Text>
        <Text style={[styles.loadingSubtitle, { color: colors.textSecondary, textAlign: "center" }]}>
          Add API_SPORTS_KEY to Replit Secrets to see live football fixtures from 50+ leagues worldwide.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Football Today</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {liveCount > 0 && (
              <View style={styles.liveCountBadge}>
                <Text style={styles.liveCountText}>{liveCount} LIVE</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => { setIsRefreshing(true); loadFixtures(true); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <RefreshCw size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        {lastUpdated && (
          <Text style={[styles.lastUpdated, { color: colors.textMuted }]}>
            {totalCount} matches · Updated {formatLastUpdated(lastUpdated)}
          </Text>
        )}
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <Search size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search teams or leagues…"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={15} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive ? colors.cyan : "transparent",
                    borderColor: isActive ? colors.cyan : colors.border,
                  },
                ]}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterPillText, { color: isActive ? colors.background : colors.textSecondary }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { setIsRefreshing(true); loadFixtures(true); }}
            tintColor={colors.cyan}
          />
        }
        ListHeaderComponent={
          featuredMatch && activeFilter === "all" && !searchQuery ? (
            <View style={styles.featuredWrapper}>
              <FeaturedCard fixture={featuredMatch} />
            </View>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <LeagueSectionHeader
            group={{
              leagueId: section.leagueId,
              leagueName: section.leagueName,
              leagueCountry: section.leagueCountry,
              leagueFlag: section.leagueFlag,
              leagueLogo: "",
              leagueTier: section.leagueTier,
              fixtures: section.data,
            }}
          />
        )}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <GameCard fixture={item} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 36 }}>⚽</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeFilter === "live" ? "No live games right now" : "No matches found"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {activeFilter === "live"
                ? "Check back when games kick off"
                : searchQuery
                ? `No results for "${searchQuery}"`
                : "No fixtures scheduled for this filter today"}
            </Text>
          </View>
        }
        ListFooterComponent={
          totalFiltered > 0 ? (
            <View style={{ paddingBottom: 8 }}>
              <Text style={[styles.footer, { color: colors.textMuted }]}>
                Showing {totalFiltered} of {totalCount} matches today
              </Text>
              <DisclaimerFooter />
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        stickySectionHeadersEnabled
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 40 },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  headerTitle: { fontSize: 22, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  lastUpdated: { fontSize: 11, marginTop: 6 },
  liveCountBadge: {
    backgroundColor: "#FF4D4D22",
    borderColor: "#FF4D4D",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveCountText: { color: "#FF4D4D", fontSize: 10 },

  // Search
  searchRow: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  // Filters
  filterBar: { borderBottomWidth: 1 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: { fontSize: 12 },

  // Featured
  featuredWrapper: { padding: 16, paddingBottom: 8 },
  featuredCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  featuredHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  featuredBadge: {
    backgroundColor: "#FFD70022",
    borderColor: "#FFD700",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featuredBadgeText: { color: "#FFD700", fontSize: 10 },
  featuredLeague: { fontSize: 12 },
  featuredTeams: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  featuredTeam: { alignItems: "center", gap: 8, flex: 1 },
  featuredTeamName: { fontSize: 13, textAlign: "center" },
  featuredScore: { alignItems: "center", gap: 4 },
  featuredScoreText: { fontSize: 28 },
  featuredVs: { fontSize: 20 },
  featuredTime: { fontSize: 12 },
  featuredAiRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 14,
    borderTopWidth: 1,
  },
  featuredPredLabel: { fontSize: 11 },
  featuredPred: { fontSize: 16 },
  featuredConf: { fontSize: 12, marginTop: 2 },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  sectionFlag: { fontSize: 20 },
  sectionLeague: { fontSize: 13 },
  sectionCountry: { fontSize: 11, marginTop: 1 },
  sectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sectionCountText: { fontSize: 11 },

  // Game Card
  cardWrapper: { paddingHorizontal: 16, paddingVertical: 6 },
  gameCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  gameLeagueRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  gameLeagueText: { fontSize: 11 },

  teamsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  teamSide: { flex: 1, alignItems: "center", gap: 6 },
  teamSideRight: { alignItems: "center" },
  teamName: { fontSize: 12, textAlign: "center" },

  scoreCentre: { alignItems: "center", width: 64, gap: 2 },
  scoreText: { fontSize: 20 },
  vsText: { fontSize: 16 },
  timeText: { fontSize: 11 },

  aiBar: { flexDirection: "row", alignItems: "center", gap: 12 },
  aiInfo: { flex: 1, gap: 4 },
  predText: { fontSize: 13 },
  badgeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  riskPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  riskText: { fontSize: 10, letterSpacing: 0.4 },
  valuePill: {
    backgroundColor: "rgba(0,229,255,0.12)",
    borderColor: "#00E5FF",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  valueText: { color: "#00E5FF", fontSize: 10 },

  // Crest
  crest: { alignItems: "center", justifyContent: "center" },
  crestText: { color: "#FFFFFF" },

  // Live badge
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FF4D4D22", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF4D4D" },
  liveText: { color: "#FF4D4D", fontSize: 10 },

  // Loading / error / empty
  loadingTitle: { fontSize: 20, marginTop: 8 },
  loadingSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  errorText: { fontSize: 14, textAlign: "center" },
  retryBtn: { borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  retryBtnText: { fontSize: 14 },
  emptyContainer: { alignItems: "center", gap: 10, paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18 },
  emptySubtitle: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  footer: { textAlign: "center", fontSize: 12, paddingVertical: 20 },
});
