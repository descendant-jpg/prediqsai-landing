import { AlertTriangle, Bell, BookOpen, ChevronRight, Clock, Settings, TrendingDown, TrendingUp, WifiOff } from "lucide-react-native";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
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
import { SkeletonCard, SkeletonStatRow } from "@/components/SkeletonLoader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { SportBadge } from "@/components/SportBadge";
import { AchievementsRow } from "@/components/dashboard/AchievementsRow";
import { BankrollTracker } from "@/components/dashboard/BankrollTracker";
import { MatchOfTheDay } from "@/components/dashboard/MatchOfTheDay";
import { OddsTicker } from "@/components/dashboard/OddsTicker";
import { PredictionFeedCard } from "@/components/dashboard/PredictionFeedCard";
import { SportFilterChips } from "@/components/dashboard/SportFilterChips";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { api, type ApiPrediction, type MatchOfDayData } from "@/lib/api";
import {
  FREE_FEED_LIMIT,
  NOTIFICATIONS,
  SIMULATED_NEW_IDS,
  type MatchOfDay,
  type MockPrediction,
  type SportFilter,
  type SportKey,
} from "@/lib/mockData";
import { pickLabel } from "@/lib/pickLabel";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";
import type { Prediction } from "@/types";

const DEFAULT_NOTIF_READ = NOTIFICATIONS.filter((n) => !SIMULATED_NEW_IDS.includes(n.id)).map((n) => n.id);

const ORANGE = "#FF6B35";

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

function dbSportToKey(sport: string): SportKey {
  switch (sport.toLowerCase()) {
    case "soccer": case "football": return "football";
    case "nba": case "basketball": return "basketball";
    case "mlb": case "baseball": return "baseball";
    case "nfl": return "nfl";
    case "nhl": case "hockey": return "hockey";
    case "tennis": return "tennis";
    case "afl": return "afl";
    case "rugby": return "rugby";
    case "handball": return "handball";
    case "volleyball": return "volleyball";
    case "mma": return "mma";
    case "formula1": case "f1": return "formula1";
    default: return "football";
  }
}

/** Decimal odds implied by the bookmaker probability (e.g. 54% → 1.85). */
function impliedOdds(bookmakerProbability: number): number {
  if (!bookmakerProbability || bookmakerProbability <= 0) return 0;
  return Math.round((100 / bookmakerProbability) * 100) / 100;
}

function formatMatchTime(iso: string): string {
  try {
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (sameDay) return `Today · ${time}`;
    return `${d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })} · ${time}`;
  } catch {
    return "";
  }
}

/** Map a real API prediction onto the shape the feed card renders. */
function toFeedItem(p: Prediction): MockPrediction {
  return {
    id: p.id,
    match: `${p.homeTeam} vs ${p.awayTeam}`,
    homeTeam: p.homeTeam,
    awayTeam: p.awayTeam,
    sport: dbSportToKey(p.sport),
    league: p.league,
    pick: pickLabel(p.prediction, p.homeTeam, p.awayTeam),
    confidence: p.confidence,
    bookmaker: "Market consensus",
    odds: impliedOdds(p.bookmakerProbability),
    time: formatMatchTime(p.matchDate),
    analysis: p.reasoning,
    keyStats: (p.keyFactors ?? []).slice(0, 3),
  };
}

function motdFromApi(m: MatchOfDayData): MatchOfDay {
  return {
    id: m.id,
    sport: dbSportToKey(m.sport),
    match: m.match,
    competition: m.competition,
    time: formatMatchTime(m.matchDate),
    pick: pickLabel(m.pick, m.homeTeam, m.awayTeam),
    confidence: m.confidence,
    analysis: m.analysis,
    keyStats: m.keyStats,
    bookmaker: "Live market consensus",
  };
}

function MiniStat({ label, value, sub, valueColor }: { label: string; value: string; sub?: string; valueColor: string }) {
  const colors = useColors();
  return (
    <View style={[miniStyles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[miniStyles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[miniStyles.value, { color: valueColor }]}>{value}</Text>
      {sub ? <Text style={[miniStyles.sub, { color: colors.textMuted }]}>{sub}</Text> : null}
    </View>
  );
}

const miniStyles = StyleSheet.create({
  card: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, gap: 2 },
  label: { fontSize: 10, letterSpacing: 0.3 },
  value: { fontSize: 18, letterSpacing: -0.5 },
  sub: { fontSize: 10 },
});

function Countdown({ isoDate }: { isoDate: string }) {
  const colors = useColors();
  const { t } = useLanguage();
  const [label, setLabel] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(isoDate).getTime() - Date.now();
      if (diff <= 0) { setLabel(t("dashboard.countdownStarted")); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLabel(h > 0 ? `${h}h ${m}m` : `${m}m`);
    }
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [isoDate, t]);

  return (
    <View style={[countdownStyles.badge, { backgroundColor: "rgba(0,229,255,0.08)", borderColor: colors.border }]}>
      <Clock size={11} color={colors.textMuted} />
      <Text style={[countdownStyles.text, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const countdownStyles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  text: { fontSize: 11 },
});

function PulseDot({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.2, duration: 600, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== "web" }),
      ]),
    ).start();
  }, [anim]);
  return <Animated.View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color, opacity: anim }} />;
}

function MarketMoverCard({ mover }: { mover: { team: string; move: string; direction: "up" | "down" } }) {
  const colors = useColors();
  const isUp = mover.direction === "up";
  return (
    <View style={[mmStyles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {isUp ? <TrendingUp size={14} color={colors.green} /> : <TrendingDown size={14} color={colors.red} />}
      <View style={{ flex: 1 }}>
        <Text style={[mmStyles.team, { color: colors.text }]}>{mover.team}</Text>
        <Text style={[mmStyles.move, { color: isUp ? colors.green : colors.red }]}>{mover.move}</Text>
      </View>
    </View>
  );
}

const mmStyles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, flex: 1 },
  team: { fontSize: 12 },
  move: { fontSize: 11, marginTop: 2 },
});

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const { token, user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [setupMissing, setSetupMissing] = useState(false);
  const [sportFilter, setSportFilter] = useState<SportFilter>("all");
  const [unreadCount, setUnreadCount] = useState(SIMULATED_NEW_IDS.length);

  const isPro = profile.tier === "premium";

  // Load the saved sport filter once on mount.
  useEffect(() => {
    (async () => {
      const saved = await getItem<SportFilter>(STORAGE_KEYS.sportFilter, "all");
      setSportFilter(saved);
    })();
  }, []);

  const handleSelectSport = useCallback((key: SportFilter) => {
    setSportFilter(key);
    void setItem(STORAGE_KEYS.sportFilter, key);
  }, []);

  // Recompute the unread notification badge whenever the dashboard regains focus.
  const refreshUnread = useCallback(async () => {
    const stored = await getItem<string[] | null>(STORAGE_KEYS.notificationsRead, null);
    const readIds = stored ?? DEFAULT_NOTIF_READ;
    setUnreadCount(NOTIFICATIONS.filter((n) => !readIds.includes(n.id)).length);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshUnread();
    }, [refreshUnread]),
  );

  // Live daily prediction feed, driven by the real API data.
  const feedPredictions = (
    sportFilter === "all"
      ? predictions
      : predictions.filter((p) => dbSportToKey(p.sport) === sportFilter)
  )
    .filter((p) => !p.avoidMatch)
    .map(toFeedItem);

  // Global FREE unlock policy: the first FREE_FEED_LIMIT predictions overall are
  // free. Lock state is keyed by prediction id so switching sport chips can never
  // reveal more than the daily limit of free cards.
  const unlockedIds = new Set(predictions.slice(0, FREE_FEED_LIMIT).map((p) => p.id));

  // Match of the Day, fetched from the live API per selected sport.
  const [matchOfDay, setMatchOfDay] = useState<MatchOfDay | null>(null);
  useEffect(() => {
    if (!token) return;
    let active = true;
    api.predictions
      .matchOfDay(token, sportFilter)
      .then((m) => { if (active) setMatchOfDay(m ? motdFromApi(m) : null); })
      .catch(() => { if (active) setMatchOfDay(null); });
    return () => { active = false; };
  }, [token, sportFilter]);

  const fetchPredictions = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await api.predictions.list(token);
      setPredictions(data.map(mapPrediction));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dashboard.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPredictions(); }, [fetchPredictions]);

  useEffect(() => {
    if (user?.id !== 1 || !token) return;
    api.setup.status(token).then((s) => setSetupMissing(!s.allCriticalOk)).catch(() => {});
  }, [user, token]);

  const todayPicks = predictions.filter((p) => !p.avoidMatch);
  const avoidPicks = predictions.filter((p) => p.avoidMatch);
  const valuePicks = predictions.filter((p) => p.valueDetected);
  const featuredPick = todayPicks.sort((a, b) => b.confidence - a.confidence)[0] ?? predictions[0];
  const winRate = predictions.length
    ? Math.round((todayPicks.filter((p) => p.confidence >= 65).length / Math.max(1, predictions.length)) * 100)
    : 67;
  const streakCount = todayPicks.filter((p) => p.confidence >= 70).length;
  const marketMovers = todayPicks
    .filter((p) => p.sharpMoneySignal)
    .slice(0, 3)
    .map((p) => ({ team: p.homeTeam, move: p.sharpMoneySignal!, direction: (p.valueDetected ? "up" : "down") as "up" | "down" }));

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + topPaddingWeb + 8;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPadding, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {new Date().getHours() < 12 ? t("dashboard.greetingMorning") : new Date().getHours() < 17 ? t("dashboard.greetingAfternoon") : t("dashboard.greetingEvening")},{" "}
            <Text style={{ color: colors.text }}>{profile.username}</Text>
          </Text>
          <Text style={[styles.appName, { color: colors.cyan }]}>PrediQs AI</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.tierBadge, { backgroundColor: "rgba(0,229,255,0.1)", borderColor: colors.cyan }]}
            onPress={() => router.push("/settings")}
          >
            <Text style={[styles.tierText, { color: colors.cyan }]}>{profile.tier.toUpperCase()}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/journal")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <BookOpen size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/notifications")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View>
              <Bell size={18} color={unreadCount > 0 ? colors.gold : colors.textMuted} />
              {unreadCount > 0 && (
                <View style={[styles.notifBadge, { backgroundColor: colors.gold }]}>
                  <Text style={styles.notifBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/settings")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Settings size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Admin setup banner */}
      {user?.id === 1 && setupMissing && (
        <TouchableOpacity
          style={[styles.setupBanner, { backgroundColor: `${ORANGE}18`, borderColor: `${ORANGE}50` }]}
          onPress={() => router.push("/setup")}
          activeOpacity={0.85}
        >
          <AlertTriangle size={14} color={ORANGE} />
          <Text style={[styles.setupBannerText, { color: ORANGE }]}>{t("dashboard.setupIncomplete")}</Text>
          <ChevronRight size={14} color={ORANGE} />
        </TouchableOpacity>
      )}

      {(new Date().getHours() >= 22 || new Date().getHours() < 6) && (
        <View style={[styles.setupBanner, { backgroundColor: "rgba(255,165,0,0.1)", borderColor: "rgba(255,165,0,0.3)", marginBottom: 12 }]}>
          <AlertTriangle size={14} color="#FFA500" />
          <Text style={[styles.setupBannerText, { color: "#FFA500", flex: 1 }]}>
            {t("dashboard.lateNightAlert")}
          </Text>
        </View>
      )}

      {/* World Cup 2026 countdown banner */}
      {(() => {
        const wcStart = new Date("2026-06-11T21:00:00Z").getTime();
        const diff = wcStart - Date.now();
        if (diff <= 0) return null;
        const days  = Math.floor(diff / 86_400_000);
        const hours = Math.floor((diff % 86_400_000) / 3_600_000);
        const mins  = Math.floor((diff % 3_600_000) / 60_000);
        return (
          <TouchableOpacity
            style={[styles.wcBanner, { backgroundColor: "rgba(255,215,0,0.07)", borderColor: "rgba(255,215,0,0.4)" }]}
            onPress={() => router.push("/worldcup")}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.wcBannerTitle, { color: "#FFD700" }]}>{t("dashboard.wcTitle")}</Text>
              <Text style={[styles.wcBannerSub, { color: colors.textSecondary }]}>{t("dashboard.wcSub")}</Text>
              <View style={{ flexDirection: "row", gap: 16, marginTop: 4 }}>
                {([[days, t("dashboard.wcDays")], [hours, t("dashboard.wcHrs")], [mins, t("dashboard.wcMins")]] as [number, string][]).map(([val, label]) => (
                  <View key={label} style={{ alignItems: "center", gap: 1 }}>
                    <Text style={{ fontSize: 22, color: "#FFD700", letterSpacing: -0.5 }}>{val}</Text>
                    <Text style={{ fontSize: 8, color: colors.textMuted, letterSpacing: 0.5 }}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <View style={{ backgroundColor: "rgba(255,215,0,0.15)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: "#FFD700", fontSize: 9, letterSpacing: 0.5 }}>{t("dashboard.wcMatches")}</Text>
              </View>
              <Text style={{ color: "#FFD700", fontSize: 13 }}>{t("dashboard.wcPreview")}</Text>
            </View>
          </TouchableOpacity>
        );
      })()}

      {/* 4-stat row */}
      {isLoading ? (
        <SkeletonStatRow />
      ) : (
        <View style={styles.statsRow}>
          <MiniStat label={t("dashboard.statTodayPicks")} value={String(todayPicks.length)} sub={t("dashboard.statAvailable")} valueColor={colors.cyan} />
          <MiniStat label={t("dashboard.statWinRate")} value={`${winRate}%`} sub={t("dashboard.stat30Days")} valueColor={colors.green} />
          <MiniStat label={t("dashboard.statStreak")} value={`🔥${streakCount}`} sub={t("dashboard.statHighConf")} valueColor={colors.orange} />
          <MiniStat label={t("dashboard.statValue")} value={`+${valuePicks.length}`} sub={t("dashboard.statFound")} valueColor={colors.gold} />
        </View>
      )}

      {/* Analyze My Slip button */}
      <TouchableOpacity
        style={[styles.slipBtn, { backgroundColor: "rgba(0,229,255,0.1)", borderColor: colors.cyan + "55" }]}
        onPress={() => router.push("/slip-analysis")}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 20 }}>🎟️</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.slipBtnTitle, { color: colors.cyan }]}>{t("dashboard.analyzeSlip")}</Text>
          <Text style={[styles.slipBtnSub, { color: colors.textSecondary }]}>{t("dashboard.analyzeSlipSub")}</Text>
        </View>
        <ChevronRight size={18} color={colors.cyan} />
      </TouchableOpacity>

      {/* Arbitrage quick-access */}
      <TouchableOpacity
        style={[styles.slipBtn, { backgroundColor: "rgba(0,255,148,0.07)", borderColor: "#00FF9455" }]}
        onPress={() => router.push("/arbitrage")}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 20 }}>🔄</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.slipBtnTitle, { color: "#00FF94" }]}>{t("dashboard.arbScanner")}</Text>
          <Text style={[styles.slipBtnSub, { color: colors.textSecondary }]}>{t("dashboard.arbScannerSub")}</Text>
        </View>
        <ChevronRight size={18} color="#00FF94" />
      </TouchableOpacity>

      {/* Live Odds Ticker (Feature 2) */}
      <OddsTicker />

      {/* Match of the Day (Feature 6) — live data only */}
      {matchOfDay && (
        <MatchOfTheDay motd={matchOfDay} isPro={isPro} onUpgrade={() => router.push("/subscription")} />
      )}

      {/* Achievements (Feature 4) */}
      <AchievementsRow />

      {/* Daily Prediction Feed (Features 1 + 3 + 10) */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("dashboard.dailyPredictions")}</Text>
        <PulseDot color={colors.gold} />
        <Text style={[styles.liveText, { color: colors.gold }]}>{t("dashboard.aiFeed")}</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => router.push("/rankings")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.seeAll, { color: colors.cyan }]}>{t("dashboard.ranks")}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: 12 }}>
        <SportFilterChips selected={sportFilter} onSelect={handleSelectSport} />
      </View>

      {feedPredictions.length === 0 ? (
        <View style={[styles.avoidBanner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.avoidBannerText, { color: colors.textMuted }]}>
            {t("dashboard.noPredictions")}
          </Text>
        </View>
      ) : (
        feedPredictions.map((p) => (
          <PredictionFeedCard
            key={p.id}
            prediction={p}
            locked={!isPro && !unlockedIds.has(p.id)}
            onUpgrade={() => router.push("/subscription")}
          />
        ))
      )}

      {/* Bankroll Tracker (Feature 5) */}
      <BankrollTracker />

      {/* Error */}
      {error && !isLoading && (
        <TouchableOpacity
          style={[styles.errorBanner, { backgroundColor: "rgba(255,77,77,0.08)", borderColor: "rgba(255,77,77,0.25)" }]}
          onPress={fetchPredictions}
          activeOpacity={0.8}
        >
          <WifiOff size={14} color={colors.red} />
          <Text style={[styles.errorText, { color: colors.red }]}>{error} — {t("dashboard.tapToRetry")}</Text>
        </TouchableOpacity>
      )}

      {/* Featured Pick */}
      {isLoading ? (
        <>
          <View style={[styles.sectionHeader, { marginTop: 8 }]}>
            <View style={{ width: 120, height: 16, borderRadius: 8, backgroundColor: colors.muted }} />
          </View>
          <SkeletonCard />
        </>
      ) : featuredPick ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("dashboard.featuredPick")}</Text>
            <PulseDot color={colors.green} />
            <Text style={[styles.liveText, { color: colors.green }]}>{t("dashboard.liveAi")}</Text>
            <View style={{ flex: 1 }} />
            <Countdown isoDate={featuredPick.matchDate} />
          </View>

          <View style={[styles.featuredCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.featuredHeader}>
              <SportBadge sport={featuredPick.sport} />
              <Text style={[styles.featuredLeague, { color: colors.textMuted }]}>{featuredPick.league}</Text>
              {featuredPick.valueDetected && (
                <View style={[styles.valueBadge, { borderColor: colors.gold }]}>
                  <Text style={[styles.valueText, { color: colors.gold }]}>
                    {t("dashboard.valueBadge")} +{featuredPick.aiProbability - featuredPick.bookmakerProbability}%
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.featuredMatchup}>
              <Text style={[styles.featuredTeam, { color: colors.text }]}>{featuredPick.homeTeam}</Text>
              <Text style={[styles.featuredVs, { color: colors.textMuted }]}>{t("dashboard.vs")}</Text>
              <Text style={[styles.featuredTeam, { color: colors.text }]}>{featuredPick.awayTeam}</Text>
            </View>

            <View style={styles.featuredStats}>
              <ConfidenceMeter value={featuredPick.confidence} size={90} />
              <View style={styles.featuredInfo}>
                <RiskBadge risk={featuredPick.riskLevel} />
                <Text style={[styles.featuredReasoning, { color: colors.textSecondary }]} numberOfLines={3}>
                  {featuredPick.reasoning}
                </Text>
                {featuredPick.sharpMoneySignal && (
                  <View style={[styles.sharpRow, { backgroundColor: "rgba(0,229,255,0.06)" }]}>
                    <TrendingUp size={12} color={colors.cyan} />
                    <Text style={[styles.sharpText, { color: colors.cyan }]} numberOfLines={1}>
                      {featuredPick.sharpMoneySignal}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.viewAnalysisBtn, { borderColor: colors.border }]}
              onPress={() => router.push("/(tabs)/picks")}
              activeOpacity={0.8}
            >
              <Text style={[styles.viewAnalysisText, { color: colors.cyan }]}>{t("dashboard.viewFullAnalysis")}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      {/* Market Movers */}
      {!isLoading && marketMovers.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <TrendingUp size={15} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("dashboard.sharpMoneyMoves")}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
            {marketMovers.map((m, i) => <MarketMoverCard key={i} mover={m} />)}
          </ScrollView>
        </>
      )}

      {/* Avoid Warning */}
      {!isLoading && avoidPicks.length > 0 && (
        <>
          <View style={[styles.sectionHeader, { marginTop: 8 }]}>
            <AlertTriangle size={16} color={colors.red} />
            <Text style={[styles.sectionTitle, { color: colors.red }]}>{t("dashboard.highRiskAvoid", { count: avoidPicks.length })}</Text>
          </View>
          <View style={[styles.avoidBanner, { backgroundColor: "rgba(255,77,77,0.04)", borderColor: "rgba(255,77,77,0.15)" }]}>
            <Text style={[styles.avoidBannerText, { color: colors.textMuted }]}>
              {t("dashboard.avoidFlagged", { count: avoidPicks.length })}
            </Text>
          </View>
          {avoidPicks.map((p) => (
            <View key={p.id} style={[styles.avoidCard, { backgroundColor: "rgba(255,77,77,0.06)", borderColor: "rgba(255,77,77,0.25)" }]}>
              <View style={styles.avoidCardHeader}>
                <SportBadge sport={p.sport} size="sm" />
                <Text style={[styles.avoidTeams, { color: colors.text }]}>{p.homeTeam} {t("dashboard.vs")} {p.awayTeam}</Text>
              </View>
              <Text style={[styles.avoidReason, { color: colors.red }]}>{p.avoidReason}</Text>
            </View>
          ))}
        </>
      )}

      {/* Today's Picks preview */}
      {!isLoading && todayPicks.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("dashboard.todaysPicks")}</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/picks")}>
              <Text style={[styles.seeAll, { color: colors.cyan }]}>{t("dashboard.seeAll")}</Text>
            </TouchableOpacity>
          </View>
          {todayPicks.slice(0, 3).map((p) => <PredictionCard key={p.id} prediction={p} />)}
        </>
      )}

      <DisclaimerFooter />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 0 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  greeting: { fontSize: 13 },
  appName: { fontSize: 26, letterSpacing: -0.5 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  tierBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  tierText: { fontSize: 11, letterSpacing: 1 },
  notifBadge: { position: "absolute", top: -6, right: -7, minWidth: 15, height: 15, borderRadius: 7.5, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  notifBadgeText: { color: "#0a0a0a", fontSize: 9, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  setupBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  setupBannerText: { fontSize: 13, flex: 1 },
  slipBtn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  slipBtnTitle: { fontSize: 14 },
  slipBtnSub: { fontSize: 12, marginTop: 1 },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  errorText: { fontSize: 13, flex: 1 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 16 },
  liveText: { fontSize: 11, letterSpacing: 0.5 },
  seeAll: { fontSize: 13, marginLeft: "auto" },
  featuredCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 20, gap: 14 },
  featuredHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  featuredLeague: { fontSize: 11, flex: 1 },
  valueBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, backgroundColor: "rgba(255,215,0,0.08)" },
  valueText: { fontSize: 10, letterSpacing: 0.5 },
  featuredMatchup: { alignItems: "center", gap: 2 },
  featuredTeam: { fontSize: 17, textAlign: "center" },
  featuredVs: { fontSize: 12 },
  featuredStats: { flexDirection: "row", alignItems: "center", gap: 16 },
  featuredInfo: { flex: 1, gap: 8 },
  featuredReasoning: { fontSize: 13, lineHeight: 19 },
  sharpRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  sharpText: { fontSize: 11, flex: 1 },
  viewAnalysisBtn: { borderTopWidth: 1, paddingTop: 12, alignItems: "center" },
  viewAnalysisText: { fontSize: 13 },
  avoidBanner: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
  avoidBannerText: { fontSize: 12 },
  avoidCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10, gap: 6 },
  avoidCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  avoidTeams: { fontSize: 14, flex: 1 },
  avoidReason: { fontSize: 12 },
  wcBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  wcBannerTitle: { fontSize: 14 },
  wcBannerSub: { fontSize: 11, marginTop: 1 },
  disclaimer: { fontSize: 11, textAlign: "center", lineHeight: 16, paddingTop: 12, paddingBottom: 4 },
});
