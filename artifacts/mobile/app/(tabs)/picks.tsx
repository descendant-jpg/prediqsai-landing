import { useFocusEffect, useRouter } from "expo-router";
import { Bookmark, Inbox, Lock, RefreshCw, WifiOff } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
import { AiReasoningModal } from "@/components/picks/AiReasoningModal";
import { BetSlipModal } from "@/components/picks/BetSlipModal";
import { EnhancedPickCard } from "@/components/picks/EnhancedPickCard";
import { FloatingSlipButton } from "@/components/picks/FloatingSlipButton";
import { PickOfTheDayCard } from "@/components/picks/PickOfTheDayCard";
import { PickTypeTabs } from "@/components/picks/PickTypeTabs";
import { PicksPerformanceBar } from "@/components/picks/PicksPerformanceBar";
import { Toast } from "@/components/picks/Toast";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import {
  api,
  type AccuracyStats,
  type AllSportsResponse,
  type ApiPrediction,
  type SoccerFixture,
  type SoccerLeagueGroup,
} from "@/lib/api";
import {
  PICK_OF_THE_DAY,
  PRO_PICK_FREE_LIMIT,
  PRO_PICKS,
  confidenceColor,
  type PickType,
  type ProPick,
  type SportKey,
} from "@/lib/mockData";
import { sharePick, shareSlip } from "@/lib/share";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";
import type { Prediction } from "@/types";

const ALL_PRO_PICKS: ProPick[] = [PICK_OF_THE_DAY, ...PRO_PICKS];

function proPickById(id: string): ProPick | undefined {
  return ALL_PRO_PICKS.find((p) => p.id === id);
}

function sportChipToKey(s: SportFilter): SportKey | "all" {
  switch (s) {
    case "soccer": return "football";
    case "nba":    return "basketball";
    case "nfl":    return "nfl";
    case "mlb":    return "baseball";
    default:       return "all";
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
type SportFilter  = "all"   | "soccer" | "nfl" | "nba" | "mlb";
type StatusFilter = "today" | "tomorrow" | "live" | "won" | "lost";

// ── Helpers ───────────────────────────────────────────────────────────────────
function mapPrediction(p: ApiPrediction): Prediction {
  return {
    id: p.id, sport: p.sport as Prediction["sport"], league: p.league,
    homeTeam: p.homeTeam, awayTeam: p.awayTeam, matchDate: p.matchDate,
    prediction: p.prediction as Prediction["prediction"],
    confidence: p.confidence, riskLevel: p.riskLevel as Prediction["riskLevel"],
    volatilityScore: p.volatilityScore, isTrapGame: p.isTrapGame,
    avoidMatch: p.avoidMatch, avoidReason: p.avoidReason,
    reasoning: p.reasoning, keyFactors: p.keyFactors,
    againstFactors: p.againstFactors ?? [], weatherImpact: p.weatherImpact,
    sharpMoneySignal: p.sharpMoneySignal, aiProbability: p.aiProbability,
    bookmakerProbability: p.bookmakerProbability, valueDetected: p.valueDetected,
    tierRequired: p.tierRequired === "premium" ? "premium" : "free",
    simulationData: p.simulationData ?? null, agentScores: p.agentScores ?? null,
    publicBacking: p.publicBacking ?? null,
  };
}

function formatKickoff(dateStr: string): string {
  try { return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return "--:--"; }
}

function isDateMatch(dateStr: string, offset: 0 | 1): boolean {
  const target = new Date();
  target.setDate(target.getDate() + offset);
  try {
    const d = new Date(dateStr);
    return (
      d.getFullYear() === target.getFullYear() &&
      d.getMonth()    === target.getMonth()    &&
      d.getDate()     === target.getDate()
    );
  } catch { return false; }
}

function filterBySport(list: Prediction[], sport: SportFilter): Prediction[] {
  if (sport === "all") return list;
  return list.filter((p) => p.sport === sport);
}

function filterByStatus(list: Prediction[], status: StatusFilter): Prediction[] {
  switch (status) {
    case "today":    return list.filter((p) => !p.avoidMatch);
    case "tomorrow": return list.filter((p) => !p.avoidMatch && isDateMatch(p.matchDate, 1));
    case "won":      return list.filter((p) => p.valueDetected && !p.avoidMatch).sort((a, b) => b.confidence - a.confidence);
    case "lost":     return list.filter((p) => p.avoidMatch);
    case "live":     return list; // handled separately
    default:         return list;
  }
}

// ── Multi-sport game card ─────────────────────────────────────────────────────
function MultiSportGameCard({
  homeTeam, awayTeam, homeScore, awayScore, status, meta,
}: {
  homeTeam: string; awayTeam: string;
  homeScore: number | null; awayScore: number | null;
  status: string; meta: string;
}) {
  const colors = useColors();
  const { t } = useLanguage();
  const isLive = /in progress|live|Q[1-4]|1H|2H|halftime/i.test(status);
  return (
    <View style={[
      styles.gameCard,
      { backgroundColor: colors.card, borderColor: isLive ? "rgba(255,77,77,0.4)" : colors.border },
    ]}>
      <View style={styles.gameCardHeader}>
        <Text style={[styles.gameMeta, { color: colors.textSecondary }]}>{meta}</Text>
        {isLive && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>{t("picks.live")}</Text>
          </View>
        )}
      </View>
      <View style={styles.teamRow}>
        <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>{homeTeam}</Text>
        {homeScore != null && <Text style={[styles.teamScore, { color: colors.text }]}>{homeScore}</Text>}
      </View>
      <View style={styles.teamRow}>
        <Text style={[styles.teamNameAway, { color: colors.textSecondary }]} numberOfLines={1}>{awayTeam}</Text>
        {awayScore != null && <Text style={[styles.teamScore, { color: colors.textSecondary }]}>{awayScore}</Text>}
      </View>
      <Text style={[styles.gameStatus, { color: colors.textMuted }]}>{status}</Text>
    </View>
  );
}

// ── Fixtures view (Today / Tomorrow + sport filter) ───────────────────────────
function FixturesView({ sport, allSports, loading, tomorrow, header }: { sport: SportFilter; allSports: AllSportsResponse | null; loading: boolean; tomorrow?: boolean; header?: React.ReactNode }) {
  const colors = useColors();
  const { t } = useLanguage();
  if (loading && !allSports) {
    return (
      <ScrollView contentContainerStyle={styles.fixtureList} showsVerticalScrollIndicator={false}>
        {header}
        <View style={[styles.centered, { paddingVertical: 60 }]}>
          <ActivityIndicator color={colors.cyan} size="large" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{tomorrow ? t("picks.loadingTomorrowFixtures") : t("picks.loadingTodayFixtures")}</Text>
        </View>
      </ScrollView>
    );
  }
  const showSoccer = sport === "all" || sport === "soccer";
  const showNBA    = sport === "all" || sport === "nba";
  const showNFL    = sport === "all" || sport === "nfl";
  const showMLB    = sport === "all" || sport === "mlb";

  const soccerGroups: SoccerLeagueGroup[] = allSports?.soccer?.leagueGroups ?? [];
  const soccerTotal  = allSports?.soccer?.totalCount ?? 0;
  const nbaGames     = allSports?.nba  ?? [];
  const nflGames     = allSports?.nfl  ?? [];
  const mlbGames     = allSports?.mlb  ?? [];

  return (
    <ScrollView contentContainerStyle={styles.fixtureList} showsVerticalScrollIndicator={false}>
      {header}
      {showSoccer && (
        <>
          <View style={styles.sportSection}>
            <Text style={styles.sportEmoji}>⚽</Text>
            <Text style={[styles.sportSectionName, { color: colors.text }]}>{t("picks.soccer")}</Text>
            <Text style={[styles.sportSectionCount, { color: colors.textMuted }]}>{t("picks.matchesCount", { count: soccerTotal })}</Text>
          </View>
          {soccerGroups.length === 0 ? (
            <Text style={[styles.noGamesText, { color: colors.textMuted }]}>
              {allSports?.soccer?.hasApiKey === false ? t("picks.soccerApiKey") : t("picks.noSoccer")}
            </Text>
          ) : (
            soccerGroups.map((group) => (
              <View key={group.leagueId} style={{ marginBottom: 12 }}>
                <Text style={[styles.leagueHeader, { color: colors.textSecondary }]}>
                  {group.leagueFlag} {group.leagueName}
                  <Text style={{ color: colors.textMuted }}> · {group.leagueCountry}</Text>
                </Text>
                {group.fixtures.map((f) => (
                  <MultiSportGameCard
                    key={f.id}
                    homeTeam={f.homeTeam} awayTeam={f.awayTeam}
                    homeScore={f.homeScore} awayScore={f.awayScore}
                    status={f.statusShort === "NS" ? formatKickoff(f.kickoff) : f.statusLong}
                    meta={`${group.leagueFlag} ${group.leagueName}`}
                  />
                ))}
              </View>
            ))
          )}
        </>
      )}

      {showNBA && (
        <>
          <View style={[styles.sportSection, showSoccer && { marginTop: 8 }]}>
            <Text style={styles.sportEmoji}>🏀</Text>
            <Text style={[styles.sportSectionName, { color: colors.text }]}>{t("picks.nba")}</Text>
            <Text style={[styles.sportSectionCount, { color: colors.textMuted }]}>{t("picks.gamesCount", { count: nbaGames.length })}</Text>
          </View>
          {nbaGames.length === 0
            ? (
              <View style={styles.offSeasonBox}>
                <Text style={[styles.offSeasonIcon]}>🏀</Text>
                <Text style={[styles.offSeasonTitle, { color: colors.textSecondary }]}>{t("picks.noNba")}</Text>
                <Text style={[styles.offSeasonText, { color: colors.textMuted }]}>
                  {t("picks.nbaSeason")}
                </Text>
              </View>
            )
            : nbaGames.map((g) => (
                <MultiSportGameCard key={g.id} homeTeam={g.homeTeam} awayTeam={g.awayTeam}
                  homeScore={g.homeScore} awayScore={g.awayScore} status={g.status}
                  meta={`🏀 NBA · ${g.arena || t("picks.arenaTbd")}`} />
              ))
          }
        </>
      )}

      {showNFL && (
        <>
          <View style={[styles.sportSection, { marginTop: 8 }]}>
            <Text style={styles.sportEmoji}>🏈</Text>
            <Text style={[styles.sportSectionName, { color: colors.text }]}>{t("picks.nfl")}</Text>
            <Text style={[styles.sportSectionCount, { color: colors.textMuted }]}>{t("picks.gamesCount", { count: nflGames.length })}</Text>
          </View>
          {nflGames.length === 0
            ? (
              <View style={styles.offSeasonBox}>
                <Text style={[styles.offSeasonIcon]}>🏈</Text>
                <Text style={[styles.offSeasonTitle, { color: colors.textSecondary }]}>{t("picks.nflOffSeason")}</Text>
                <Text style={[styles.offSeasonText, { color: colors.textMuted }]}>
                  {t("picks.nflSeason")}
                </Text>
              </View>
            )
            : nflGames.map((g) => (
                <MultiSportGameCard key={g.id} homeTeam={g.homeTeam} awayTeam={g.awayTeam}
                  homeScore={g.homeScore} awayScore={g.awayScore} status={g.status}
                  meta={`🏈 NFL · ${g.week || t("picks.week")}`} />
              ))
          }
        </>
      )}

      {showMLB && (
        <>
          <View style={[styles.sportSection, { marginTop: 8 }]}>
            <Text style={styles.sportEmoji}>⚾</Text>
            <Text style={[styles.sportSectionName, { color: colors.text }]}>{t("picks.mlb")}</Text>
            <Text style={[styles.sportSectionCount, { color: colors.textMuted }]}>{t("picks.gamesCount", { count: mlbGames.length })}</Text>
          </View>
          {mlbGames.length === 0
            ? <Text style={[styles.noGamesText, { color: colors.textMuted }]}>{t("picks.noMlb")}</Text>
            : mlbGames.map((g) => (
                <MultiSportGameCard key={g.id} homeTeam={g.homeTeam} awayTeam={g.awayTeam}
                  homeScore={g.homeScore} awayScore={g.awayScore} status={g.status}
                  meta={`⚾ MLB · ${g.venue || t("picks.venueTbd")}`} />
              ))
          }
        </>
      )}

      <DisclaimerFooter />
    </ScrollView>
  );
}

// ── Locked Pro pick teaser (FREE gating) ─────────────────────────────────────
function LockedProPickCard({ pick, onUpgrade }: { pick: ProPick; onUpgrade: () => void }) {
  const colors = useColors();
  const { t } = useLanguage();
  const confColor = confidenceColor(pick.confidence, colors);
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onUpgrade}
      style={[styles.lockedCard, { backgroundColor: "#121212", borderColor: colors.border, borderLeftColor: confColor }]}
    >
      <View style={styles.lockedBlurred}>
        <Text style={[styles.lockedComp, { color: colors.textMuted }]}>{pick.competition}</Text>
        <Text style={[styles.lockedMatch, { color: colors.textMuted }]}>
          {pick.homeTeam} vs {pick.awayTeam}
        </Text>
        <Text style={[styles.lockedPick, { color: colors.textMuted }]}>● ● ● ● ●</Text>
      </View>
      <View style={styles.lockedOverlay}>
        <Lock size={18} color={colors.gold} />
        <Text style={[styles.lockedText, { color: colors.gold }]}>{t("picks.upgradeUnlock")}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function PicksScreen() {
  const colors  = useColors();
  const { t, locale } = useLanguage();
  const insets  = useSafeAreaInsets();
  const { token } = useAuth();
  const router = useRouter();
  const { profile } = useApp();
  const isPro = profile.tier === "premium";

  const sportOptions: { key: SportFilter; label: string }[] = [
    { key: "all",    label: t("picks.all")  },
    { key: "soccer", label: `⚽ ${t("picks.soccer")}` },
    { key: "nfl",    label: `🏈 ${t("picks.nfl")}` },
    { key: "nba",    label: `🏀 ${t("picks.nba")}` },
    { key: "mlb",    label: `⚾ ${t("picks.mlb")}` },
  ];
  const statusOptions: { key: StatusFilter; label: string; live?: boolean }[] = [
    { key: "today",    label: t("picks.statusToday")    },
    { key: "tomorrow", label: t("picks.statusTomorrow") },
    { key: "live",     label: t("picks.statusLive"), live: true },
    { key: "won",      label: t("picks.statusWon")      },
    { key: "lost",     label: t("picks.statusLost")     },
  ];

  // ── Enhanced AI picks state (Features 1-10) ──
  const [picksFilter, setPicksFilter] = useState<PickType>("hot");
  const [slipIds, setSlipIds]   = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [slipOpen, setSlipOpen] = useState(false);
  const [reasoningPick, setReasoningPick] = useState<ProPick | null>(null);
  const [toast, setToast] = useState({ msg: "", nonce: 0 });
  const cardFade = useRef(new Animated.Value(1)).current;

  const showToast = useCallback((msg: string) => setToast({ msg, nonce: Date.now() }), []);

  // Load persisted filter + slip + saved on mount, and refresh on focus
  useEffect(() => {
    (async () => {
      const stored = await getItem<PickType>(STORAGE_KEYS.picksFilter, "hot");
      setPicksFilter(stored);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [slip, saved] = await Promise.all([
          getItem<string[]>(STORAGE_KEYS.betSlip, []),
          getItem<string[]>(STORAGE_KEYS.savedPicks, []),
        ]);
        if (!active) return;
        setSlipIds(slip);
        setSavedIds(saved);
      })();
      return () => { active = false; };
    }, []),
  );

  const changePicksFilter = useCallback((next: PickType) => {
    Animated.timing(cardFade, { toValue: 0, duration: 120, useNativeDriver: Platform.OS !== "web" }).start(() => {
      setPicksFilter(next);
      void setItem(STORAGE_KEYS.picksFilter, next);
      Animated.timing(cardFade, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== "web" }).start();
    });
  }, [cardFade]);

  const toggleSave = useCallback(async (id: string) => {
    const exists = savedIds.includes(id);
    const next = exists ? savedIds.filter((x) => x !== id) : [...savedIds, id];
    setSavedIds(next);
    await setItem(STORAGE_KEYS.savedPicks, next);
    showToast(exists ? t("picks.toastRemovedSaved") : t("picks.toastSaved"));
  }, [savedIds, showToast, t]);

  const addToSlip = useCallback(async (id: string) => {
    if (slipIds.includes(id)) {
      showToast(t("picks.toastInSlip"));
      return;
    }
    const next = [...slipIds, id];
    setSlipIds(next);
    await setItem(STORAGE_KEYS.betSlip, next);
    showToast(t("picks.toastAddedSlip"));
  }, [slipIds, showToast, t]);

  const removeFromSlip = useCallback(async (id: string) => {
    const next = slipIds.filter((x) => x !== id);
    setSlipIds(next);
    await setItem(STORAGE_KEYS.betSlip, next);
  }, [slipIds]);

  const clearSlip = useCallback(async () => {
    setSlipIds([]);
    await setItem(STORAGE_KEYS.betSlip, []);
    showToast(t("picks.toastSlipCleared"));
  }, [showToast, t]);

  const handleShare = useCallback(async (pick: ProPick) => {
    const result = await sharePick(pick);
    if (result === "copied") showToast(t("picks.toastPickCopied"));
  }, [showToast, t]);

  const handleShareSlip = useCallback(async () => {
    const picks = slipIds.map(proPickById).filter((p): p is ProPick => Boolean(p));
    if (picks.length === 0) return;
    const result = await shareSlip(picks);
    if (result === "copied") showToast(t("picks.toastSlipCopied"));
  }, [slipIds, showToast, t]);

  const handleAnalysis = useCallback((pick: ProPick) => {
    setReasoningPick(pick);
  }, []);

  const slipPicks = slipIds.map(proPickById).filter((p): p is ProPick => Boolean(p));

  const [sportFilter,  setSportFilter]  = useState<SportFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("today");
  const [predictions,  setPredictions]  = useState<Prediction[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState("");
  const [accuracy,     setAccuracy]     = useState<AccuracyStats | null>(null);
  const [liveFixtures, setLiveFixtures] = useState<SoccerFixture[]>([]);
  const [liveLoading,  setLiveLoading]  = useState(false);
  const [allSports,      setAllSports]      = useState<AllSportsResponse | null>(null);
  const [sportsLoading,  setSportsLoading]  = useState(false);
  const [tomorrowSports, setTomorrowSports] = useState<AllSportsResponse | null>(null);
  const [tomorrowLoading, setTomorrowLoading] = useState(false);

  const fetchPredictions = useCallback(async () => {
    if (!token) return;
    setIsLoading(true); setError("");
    try {
      const [data, acc] = await Promise.all([
        api.predictions.list(token),
        api.predictions.accuracy(token).catch(() => null),
      ]);
      setPredictions(data.map(mapPrediction));
      setAccuracy(acc);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("picks.failedLoad"));
    } finally {
      setIsLoading(false);
    }
  }, [token, t]);

  useEffect(() => { fetchPredictions(); }, [fetchPredictions]);

  // Load live fixtures when Live is selected
  useEffect(() => {
    if (statusFilter !== "live" || !token) return;
    let active = true;
    setLiveLoading(true);
    async function loadLive() {
      try { const f = await api.soccer.live(token!); if (active) setLiveFixtures(f); }
      catch {}
      if (active) setLiveLoading(false);
    }
    loadLive();
    const iv = setInterval(loadLive, 60_000);
    return () => { active = false; clearInterval(iv); };
  }, [statusFilter, token]);

  // Load all-sports fixtures when Today is selected
  useEffect(() => {
    if (statusFilter !== "today" || !token || allSports) return;
    let active = true;
    setSportsLoading(true);
    api.sports.today(token)
      .then((d) => { if (active) setAllSports(d); })
      .catch(() => {})
      .finally(() => { if (active) setSportsLoading(false); });
    return () => { active = false; };
  }, [statusFilter, token, allSports]);

  // Load tomorrow's fixtures when Tomorrow is selected
  useEffect(() => {
    if (statusFilter !== "tomorrow" || !token || tomorrowSports) return;
    let active = true;
    setTomorrowLoading(true);
    api.sports.tomorrow(token)
      .then((d) => { if (active) setTomorrowSports(d); })
      .catch(() => {})
      .finally(() => { if (active) setTomorrowLoading(false); });
    return () => { active = false; };
  }, [statusFilter, token, tomorrowSports]);

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding    = insets.top + topPaddingWeb;

  const byStatus  = filterByStatus(predictions, statusFilter);
  const displayed = filterBySport(byStatus, sportFilter);

  // ── Enhanced AI picks: filter by Hot/Value/ARB + sport chip, live first ──
  const sportKey = sportChipToKey(sportFilter);
  const filteredProPicks = PRO_PICKS
    .filter((p) => p.type === picksFilter)
    .filter((p) => sportKey === "all" || p.sport === sportKey)
    .sort((a, b) => Number(b.isLive) - Number(a.isLive));

  const aiPicksHeader = (
    <View style={styles.aiBlock}>
      <View style={styles.aiHeaderRow}>
        <Text style={[styles.aiTitle, { color: colors.text }]}>🎯 {t("picks.aiPicks")}</Text>
        <Text style={[styles.aiSubtitle, { color: colors.textSecondary }]}>{t("picks.poweredBy")}</Text>
      </View>

      <PickOfTheDayCard
        pick={PICK_OF_THE_DAY}
        isPro={isPro}
        onPress={() => setReasoningPick(PICK_OF_THE_DAY)}
        onUpgrade={() => router.push("/subscription")}
      />

      <View style={styles.tabsWrap}>
        <PickTypeTabs value={picksFilter} onChange={changePicksFilter} />
      </View>

      <Animated.View style={{ opacity: cardFade }}>
        {filteredProPicks.length === 0 ? (
          <View style={styles.aiEmpty}>
            <Text style={[styles.aiEmptyText, { color: colors.textMuted }]}>{t("picks.noTypePicks", { type: picksFilter })}</Text>
          </View>
        ) : (
          filteredProPicks.map((p, idx) => {
            const locked = !isPro && idx >= PRO_PICK_FREE_LIMIT;
            if (locked) {
              return <LockedProPickCard key={p.id} pick={p} onUpgrade={() => router.push("/subscription")} />;
            }
            return (
              <EnhancedPickCard
                key={p.id}
                pick={p}
                saved={savedIds.includes(p.id)}
                inSlip={slipIds.includes(p.id)}
                onSave={() => toggleSave(p.id)}
                onAddSlip={() => addToSlip(p.id)}
                onShare={() => handleShare(p)}
                onAnalysis={() => handleAnalysis(p)}
              />
            );
          })
        )}
      </Animated.View>

      {!isPro && filteredProPicks.length > PRO_PICK_FREE_LIMIT ? (
        <Text style={[styles.aiUpsell, { color: colors.textSecondary }]}>
          {t("picks.upsell", { shown: PRO_PICK_FREE_LIMIT, total: filteredProPicks.length })}
        </Text>
      ) : null}

      <View style={[styles.aiDivider, { backgroundColor: colors.border }]} />
    </View>
  );

  const monthLabel = accuracy?.month
    ? new Date(accuracy.month + "-01").toLocaleDateString(locale, { month: "long", year: "numeric" })
    : "";

  const listPad = { padding: 16, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20 };

  const emptyLabel: Record<StatusFilter, string> = {
    today:    t("picks.emptyToday"),
    tomorrow: t("picks.emptyTomorrow"),
    live:     t("picks.emptyLive"),
    won:      t("picks.emptyWon"),
    lost:     t("picks.emptyLost"),
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPadding + 16, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>{t("picks.title")}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push("/saved-picks")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View>
                <Bookmark size={18} color={savedIds.length > 0 ? colors.gold : colors.textSecondary} fill={savedIds.length > 0 ? colors.gold : "transparent"} />
                {savedIds.length > 0 ? (
                  <View style={[styles.savedBadge, { backgroundColor: colors.gold }]}>
                    <Text style={styles.savedBadgeText}>{savedIds.length}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={fetchPredictions} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <RefreshCw size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Sport filter ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {sportOptions.map((s) => {
            const active = sportFilter === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.filterChip, { backgroundColor: active ? "#00E5FF" : "transparent", borderColor: active ? "#00E5FF" : colors.border }]}
                onPress={() => setSportFilter(s.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterChipText, { color: active ? colors.background : colors.textSecondary }]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Status filter ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterRow, { paddingTop: 0, paddingBottom: 14 }]}>
          {statusOptions.map((s) => {
            const active = statusFilter === s.key;
            const isLive = s.live;
            return (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: active
                      ? isLive ? "rgba(255,77,77,0.18)" : "#00E5FF"
                      : "transparent",
                    borderColor: active
                      ? isLive ? "#FF4D4D" : "#00E5FF"
                      : colors.border,
                  },
                ]}
                onPress={() => setStatusFilter(s.key)}
                activeOpacity={0.75}
              >
                {isLive && (
                  <View style={[styles.liveDot, { backgroundColor: active ? "#FF4D4D" : colors.textMuted }]} />
                )}
                <Text
                  style={[
                    styles.statusChipText,
                    {
                      color: active
                        ? isLive ? "#FF4D4D" : colors.background
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Today's performance tracker (Feature 1) ── */}
      <PicksPerformanceBar />

      {/* ── Accuracy banner (Today / Tomorrow) ── */}
      {(statusFilter === "today" || statusFilter === "tomorrow") && accuracy?.accuracy != null && (
        <View style={[styles.accuracyBanner, { backgroundColor: "rgba(0,229,255,0.06)", borderColor: "#00E5FF" }]}>
          <View style={styles.accuracyLeft}>
            <Text style={[styles.accuracyLabel, { color: colors.textSecondary }]}>{t("picks.aiAccuracy", { month: monthLabel })}</Text>
            <Text style={[styles.accuracyValue, { color: "#00E5FF" }]}>{accuracy.accuracy}%</Text>
          </View>
          <View style={styles.accuracyRight}>
            <Text style={[styles.accuracyRecord, { color: colors.green }]}>{accuracy.wins}W</Text>
            <Text style={[styles.accuracyDash,   { color: colors.textMuted }]}> – </Text>
            <Text style={[styles.accuracyRecord, { color: colors.red }]}>{accuracy.losses}L</Text>
          </View>
        </View>
      )}

      {/* ── Content ── */}
      {statusFilter === "live" ? (
        /* LIVE */
        <>
          {liveLoading && liveFixtures.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#FF4D4D" size="large" />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t("picks.fetchingLive")}</Text>
            </View>
          ) : (
            <FlatList
              data={liveFixtures}
              keyExtractor={(item) => `live-${item.id}`}
              renderItem={({ item }) => <LiveMatchCard fixture={item} />}
              contentContainerStyle={listPad}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <>
                  {aiPicksHeader}
                  <View style={styles.liveHeader}>
                    <View style={styles.liveBadgeRow}>
                      <View style={styles.livePulse} />
                      <Text style={[styles.liveHeaderText, { color: "#FF4D4D" }]}>{t("picks.liveNow")}</Text>
                    </View>
                    <Text style={[styles.liveRefreshText, { color: colors.textMuted }]}>
                      {t("picks.autoRefresh", { count: liveFixtures.length })}
                    </Text>
                  </View>
                </>
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={{ fontSize: 36 }}>⚽</Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t("picks.noLive")}</Text>
                  <Text style={[styles.retryText,  { color: colors.textMuted }]}>{t("picks.refreshing60")}</Text>
                </View>
              }
            />
          )}
        </>
      ) : statusFilter === "today" && sportFilter !== "all" ? (
        /* TODAY: show AI picks for selected sport, then fixture sub-section */
        <>
          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.cyan} size="large" />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t("picks.loading")}</Text>
            </View>
          ) : (
            <FlatList
              data={displayed}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <PredictionCard prediction={item} />}
              contentContainerStyle={listPad}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={aiPicksHeader}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Inbox size={28} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{emptyLabel[statusFilter]}</Text>
                </View>
              }
              ListFooterComponent={displayed.length > 0 ? <DisclaimerFooter /> : null}
            />
          )}
        </>
      ) : statusFilter === "today" ? (
        /* TODAY ALL: show fixtures across all sports */
        <FixturesView sport={sportFilter} allSports={allSports} loading={sportsLoading} header={aiPicksHeader} />
      ) : statusFilter === "tomorrow" ? (
        /* TOMORROW: show tomorrow's fixture list */
        <FixturesView sport={sportFilter} allSports={tomorrowSports} loading={tomorrowLoading} tomorrow header={aiPicksHeader} />
      ) : (
        /* All other statuses: AI predictions list */
        <>
          {isLoading && (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.cyan} size="large" />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t("picks.fetchingPicks")}</Text>
            </View>
          )}
          {error && !isLoading && (
            <TouchableOpacity style={styles.centered} onPress={fetchPredictions}>
              <WifiOff size={28} color={colors.textMuted} />
              <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
              <Text style={[styles.retryText, { color: "#00E5FF" }]}>{t("picks.tapRetry")}</Text>
            </TouchableOpacity>
          )}
          {!isLoading && !error && (
            <FlatList
              data={displayed}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <PredictionCard prediction={item} />}
              contentContainerStyle={listPad}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <>
                  {aiPicksHeader}
                  {statusFilter === "won" ? (
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>{t("picks.topValueTitle")}</Text>
                      <Text style={[styles.sectionHeaderSub, { color: colors.textSecondary }]}>
                        {t("picks.topValueSub")}
                      </Text>
                    </View>
                  ) : statusFilter === "lost" ? (
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>{t("picks.avoidTitle")}</Text>
                      <Text style={[styles.sectionHeaderSub, { color: colors.textSecondary }]}>
                        {t("picks.avoidSub")}
                      </Text>
                    </View>
                  ) : statusFilter === "tomorrow" ? (
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>{t("picks.tomorrowTitle")}</Text>
                      <Text style={[styles.sectionHeaderSub, { color: colors.textSecondary }]}>
                        {t("picks.tomorrowSub")}
                      </Text>
                    </View>
                  ) : null}
                </>
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Inbox size={28} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{emptyLabel[statusFilter]}</Text>
                </View>
              }
              ListFooterComponent={displayed.length > 0 ? <DisclaimerFooter /> : null}
            />
          )}
        </>
      )}

      {/* ── Floating bet slip button (Feature 6) ── */}
      <FloatingSlipButton count={slipIds.length} onPress={() => setSlipOpen(true)} />

      {/* ── Bet slip modal (Feature 6) ── */}
      <BetSlipModal
        visible={slipOpen}
        slip={slipPicks}
        onClose={() => setSlipOpen(false)}
        onRemove={removeFromSlip}
        onClear={clearSlip}
        onShare={handleShareSlip}
      />

      {/* ── AI reasoning modal (Feature 5/8/10) ── */}
      <AiReasoningModal
        pick={reasoningPick}
        isPro={isPro}
        onClose={() => setReasoningPick(null)}
        onUpgrade={() => { setReasoningPick(null); router.push("/subscription"); }}
      />

      {/* ── Toast (save/slip/share feedback) ── */}
      <Toast message={toast.msg} nonce={toast.nonce} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1 },
  header:              { paddingHorizontal: 16, paddingBottom: 0, borderBottomWidth: 1 },
  headerRow:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title:               { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  filterRow:           { gap: 8, paddingVertical: 10 },
  filterChip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterChipText:      { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statusChip:          { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  statusChipText:      { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
  liveDot:             { width: 6, height: 6, borderRadius: 3 },
  // Accuracy banner
  accuracyBanner:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, marginTop: 10, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  accuracyLeft:        { gap: 1 },
  accuracyLabel:       { fontSize: 11, fontFamily: "Inter_400Regular" },
  accuracyValue:       { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  accuracyRight:       { flexDirection: "row", alignItems: "center" },
  accuracyRecord:      { fontSize: 14, fontFamily: "Inter_700Bold" },
  accuracyDash:        { fontSize: 14 },
  // States
  centered:            { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  loadingText:         { fontSize: 14, fontFamily: "Inter_400Regular" },
  errorText:           { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  retryText:           { fontSize: 13, fontFamily: "Inter_400Regular" },
  empty:               { paddingVertical: 60, alignItems: "center", gap: 12 },
  emptyText:           { fontSize: 15, fontFamily: "Inter_500Medium" },
  // Section headers
  sectionHeader:       { marginBottom: 14, gap: 4, padding: 16, paddingBottom: 0 },
  sectionHeaderTitle:  { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  sectionHeaderSub:    { fontSize: 13, fontFamily: "Inter_400Regular" },
  // Live
  liveHeader:          { marginBottom: 12, gap: 4 },
  liveBadgeRow:        { flexDirection: "row", alignItems: "center", gap: 8 },
  livePulse:           { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF4D4D" },
  liveHeaderText:      { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  liveRefreshText:     { fontSize: 12, fontFamily: "Inter_400Regular" },
  // Fixtures
  fixtureList:         { padding: 16, paddingBottom: 80 },
  sportSection:        { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 4 },
  sportEmoji:          { fontSize: 20 },
  sportSectionName:    { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  sportSectionCount:   { fontSize: 12, fontFamily: "Inter_400Regular" },
  leagueHeader:        { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.2, marginBottom: 6, marginTop: 4 },
  noGamesText:         { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 16, paddingLeft: 4 },
  gameCard:            { borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1 },
  gameCardHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  gameMeta:            { fontSize: 11, fontFamily: "Inter_400Regular" },
  liveBadge:           { backgroundColor: "rgba(255,77,77,0.18)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  liveBadgeText:       { color: "#FF4D4D", fontSize: 11, fontFamily: "Inter_700Bold" },
  teamRow:             { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  teamName:            { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  teamNameAway:        { fontSize: 15, fontFamily: "Inter_400Regular", flex: 1 },
  teamScore:           { fontSize: 18, fontFamily: "Inter_700Bold", marginHorizontal: 6 },
  gameStatus:          { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 6 },
  // Off-season
  offSeasonBox:        { paddingVertical: 16, paddingHorizontal: 12, marginBottom: 16, alignItems: "center", gap: 6 },
  offSeasonIcon:       { fontSize: 28, marginBottom: 2 },
  offSeasonTitle:      { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  offSeasonText:       { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  // Header actions
  headerActions:       { flexDirection: "row", alignItems: "center", gap: 16 },
  savedBadge:          { position: "absolute", top: -6, right: -8, minWidth: 15, height: 15, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  savedBadgeText:      { color: "#0a0a0a", fontSize: 9, fontFamily: "Inter_700Bold" },
  // AI Picks block
  aiBlock:             { marginBottom: 4 },
  aiHeaderRow:         { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 },
  aiTitle:             { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  aiSubtitle:          { fontSize: 12, fontFamily: "Inter_400Regular" },
  tabsWrap:            { marginTop: 14, marginBottom: 10 },
  aiEmpty:             { paddingVertical: 28, alignItems: "center" },
  aiEmptyText:         { fontSize: 13, fontFamily: "Inter_400Regular" },
  aiUpsell:            { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: 4, marginBottom: 8 },
  aiDivider:           { height: 1, marginTop: 16, marginBottom: 16 },
  // Locked pro pick
  lockedCard:          { borderRadius: 14, borderWidth: 1, borderLeftWidth: 3, padding: 14, marginBottom: 10, overflow: "hidden" },
  lockedBlurred:       { opacity: 0.25, gap: 6 },
  lockedComp:          { fontSize: 11, fontFamily: "Inter_500Medium" },
  lockedMatch:         { fontSize: 15, fontFamily: "Inter_700Bold" },
  lockedPick:          { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 4 },
  lockedOverlay:       { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  lockedText:          { fontSize: 13, fontFamily: "Inter_700Bold" },
});
