import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  RefreshCw,
  Shield,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
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
import { TierGate } from "@/components/TierGate";
import {
  api,
  type FDWCMatch,
  type WCAfricanTeam,
  type WCFixture,
  type WCOverview,
  type WCPrediction,
} from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const WC_START_MS = new Date("2026-06-11T21:00:00Z").getTime();
const WC_TOTAL_MS = new Date("2026-06-19T21:00:00Z").getTime(); // approx end
const TABS = [
  { id: "overview",  label: "Overview"   },
  { id: "schedule",  label: "📅 Schedule" },
  { id: "fixtures",  label: "AI Picks"   },
  { id: "africa",    label: "🌍 Africa"  },
  { id: "arb",       label: "⚡ ARB"     },
] as const;
type Tab = typeof TABS[number]["id"];

const BOOKMAKER_URLS: Record<string, string> = {
  draftkings: "https://www.draftkings.com",
  pinnacle:   "https://www.pinnacle.com",
  bet9ja:     "https://www.bet9ja.com",
  sportybet:  "https://www.sportybet.com",
  betway:     "https://www.betway.com",
  bet365:     "https://www.bet365.com",
};

// ─── Countdown hook ───────────────────────────────────────────────────────────

interface Countdown { days: number; hours: number; minutes: number; seconds: number; started: boolean }

function useCountdown(): Countdown {
  const calc = (): Countdown => {
    const diff = WC_START_MS - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, started: true };
    return {
      days:    Math.floor(diff / 86_400_000),
      hours:   Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000) / 60_000),
      seconds: Math.floor((diff % 60_000) / 1_000),
      started: false,
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => { const id = setInterval(() => setT(calc()), 1000); return () => clearInterval(id); }, []);
  return t;
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, color, height = 6 }: { pct: number; color: string; height?: number }) {
  const colors = useColors();
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: colors.border, overflow: "hidden" }}>
      <View style={{ height, width: `${Math.min(100, pct)}%`, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

// ─── Prediction bars ──────────────────────────────────────────────────────────

function PredictionBars({ pred, homeTeam, awayTeam }: { pred: WCPrediction; homeTeam: string; awayTeam: string }) {
  const colors = useColors();
  const rows: [string, number, string][] = [
    [homeTeam, pred.homeWinPct, "#00FF94"],
    ["Draw",   pred.drawPct,   "#FFD700"],
    [awayTeam, pred.awayWinPct,"#00E5FF"],
  ];
  return (
    <View style={{ gap: 5 }}>
      {rows.map(([label, pct, color]) => (
        <View key={label} style={styles.predRow}>
          <Text style={[styles.predLabel, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
          <ProgressBar pct={pct} color={color} height={5} />
          <Text style={[styles.predPct, { color }]}>{pct}%</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Fixture card ─────────────────────────────────────────────────────────────

function FixtureCard({ fixture, token }: { fixture: WCFixture; token: string }) {
  const colors = useColors();
  const [pred, setPred] = useState<WCPrediction | null>(fixture.prediction ?? null);
  const [loading, setLoading] = useState(false);

  async function loadPred() {
    if (pred || loading) return;
    setLoading(true);
    try {
      const p = await api.worldcup.predict(token, fixture.homeTeam, fixture.awayTeam);
      setPred(p);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  const dateStr = new Date(fixture.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const timeStr = new Date(fixture.date).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <View style={[styles.fixtureCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {fixture.group && (
        <View style={[styles.groupPill, { backgroundColor: "rgba(255,215,0,0.1)", borderColor: "rgba(255,215,0,0.3)" }]}>
          <Text style={{ fontSize: 10, color: "#FFD700" }}>{fixture.group}</Text>
        </View>
      )}
      <View style={styles.fixtureDateRow}>
        <MapPin size={11} color={colors.textMuted} />
        <Text style={[styles.fixtureDateText, { color: colors.textMuted }]}>{fixture.city} · {fixture.venue}</Text>
        <Text style={[styles.fixtureDateText, { color: colors.textMuted }]}>{dateStr} {timeStr}</Text>
      </View>

      <View style={styles.fixtureTeams}>
        <Text style={[styles.fixtureTeamName, { color: colors.text }]}>{fixture.homeTeam}</Text>
        {fixture.homeScore !== null
          ? <Text style={[styles.fixtureScore, { color: "#FFD700" }]}>{fixture.homeScore} – {fixture.awayScore}</Text>
          : <Text style={[styles.fixtureVs, { color: colors.textMuted }]}>vs</Text>
        }
        <Text style={[styles.fixtureTeamName, { color: colors.text }]}>{fixture.awayTeam}</Text>
      </View>

      {pred ? (
        <View style={{ gap: 8 }}>
          <PredictionBars pred={pred} homeTeam={fixture.homeTeam} awayTeam={fixture.awayTeam} />
          <View style={[styles.confBar, { backgroundColor: "rgba(0,229,255,0.06)", borderColor: "rgba(0,229,255,0.15)" }]}>
            <Zap size={10} color={colors.cyan} />
            <Text style={[styles.confText, { color: colors.cyan }]}>Confidence: {pred.confidence}%</Text>
          </View>
          {pred.reasoning && (
            <Text style={[styles.fixtureReasoning, { color: colors.textSecondary }]}>{pred.reasoning}</Text>
          )}
          {pred.keyFactors?.length > 0 && (
            <View style={{ gap: 3 }}>
              {pred.keyFactors.slice(0, 3).map((f, i) => (
                <Text key={i} style={[styles.keyFactor, { color: colors.textMuted }]}>• {f}</Text>
              ))}
            </View>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.loadPredBtn, { backgroundColor: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.2)" }]}
          onPress={loadPred}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Zap size={13} color={colors.cyan} />
          <Text style={{ color: colors.cyan, fontSize: 13 }}>
            {loading ? "Generating AI Prediction…" : "Get AI Prediction"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── African team row ─────────────────────────────────────────────────────────

function AfricanTeamRow({ team, onPress }: { team: WCAfricanTeam; onPress?: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.africanRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={{ fontSize: 24 }}>{team.flag}</Text>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={[styles.africanName, { color: colors.text }]}>{team.team}</Text>
          <Text style={[styles.africanGroup, { color: colors.cyan }]}>{team.group}</Text>
        </View>
        <Text style={[styles.africanNote, { color: colors.textSecondary }]}>{team.note}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
          <Text style={{ fontSize: 9, color: colors.textMuted }}>GROUP QUAL.</Text>
          <View style={{ flex: 1 }}>
            <ProgressBar pct={team.qualifyPct} color={team.qualifyPct >= 40 ? "#00FF94" : team.qualifyPct >= 30 ? "#FFD700" : "#FF6B6B"} height={4} />
          </View>
          <Text style={{ fontSize: 11, color: team.qualifyPct >= 40 ? "#00FF94" : team.qualifyPct >= 30 ? "#FFD700" : "#FF6B6B" }}>{team.qualifyPct}%</Text>
        </View>
        {team.valueBet && (
          <View style={[styles.valueBetPill, { backgroundColor: "rgba(255,215,0,0.08)", borderColor: "rgba(255,215,0,0.3)" }]}>
            <TrendingUp size={9} color="#FFD700" />
            <Text style={{ fontSize: 10, color: "#FFD700" }}>Value: {team.valueBet}</Text>
          </View>
        )}
      </View>
      <Text style={{ fontSize: 9, color: colors.textMuted, alignSelf: "flex-start", marginTop: 2 }}>FIFA #{team.fifaRank}</Text>
    </TouchableOpacity>
  );
}

// ─── WC Arb card ──────────────────────────────────────────────────────────────

function WCArbCard({ overview }: { overview: WCOverview }) {
  const colors = useColors();
  const arb = overview.demoArb;
  const localRows = Object.entries(arb.localStakes);

  return (
    <View style={[styles.wcArbCard, { backgroundColor: colors.card, borderColor: "#00E5FF", borderLeftColor: "#00FF94", borderLeftWidth: 3 }]}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={[styles.wcArbBadge, { backgroundColor: "rgba(0,255,148,0.1)", borderColor: "#00FF94" }]}>
          <TrendingUp size={11} color="#00FF94" />
          <Text style={{ fontSize: 12, color: "#00FF94" }}>+{arb.profitPercent}% ARB</Text>
        </View>
        <Text style={{ fontSize: 11, color: colors.textMuted }}>🏆 {arb.league}</Text>
      </View>

      <Text style={[styles.wcArbMatchup, { color: colors.text }]}>
        {arb.homeTeam} <Text style={{ color: colors.textMuted }}>vs</Text> {arb.awayTeam}
      </Text>

      {/* Legs */}
      {arb.legs.map((leg, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.wcLegRow, { backgroundColor: "rgba(255,255,255,0.03)", borderColor: colors.border }]}
          onPress={() => Linking.openURL(BOOKMAKER_URLS[leg.bookmakerId] ?? `https://google.com/search?q=${leg.bookmaker}+sports+bet`).catch(() => {})}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.wcLegBk, { color: colors.textSecondary }]}>{leg.bookmaker}</Text>
            <Text style={[styles.wcLegSel, { color: colors.text }]}>{leg.selection}</Text>
          </View>
          <Text style={[styles.wcLegOdds, { color: "#00E5FF" }]}>{leg.odds}</Text>
          <ExternalLink size={12} color={colors.textMuted} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      ))}

      {/* Multi-currency stakes */}
      <View style={[styles.currencySection, { borderTopColor: colors.border }]}>
        <Text style={[styles.currencySectionTitle, { color: colors.textMuted }]}>STAKE IN YOUR CURRENCY — {arb.profitPercent}% GUARANTEED</Text>
        {localRows.map(([region, s]) => (
          <View key={region} style={[styles.localStakeRow, { borderBottomColor: colors.border }]}>
            <Text style={{ fontSize: 14 }}>
              {region === "us" ? "🇺🇸" : region === "ng" ? "🇳🇬" : region === "ke" ? "🇰🇪" : region === "za" ? "🇿🇦" : "🇬🇧"}
            </Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                {s.symbol}{s.leg1.toLocaleString()} + {s.symbol}{s.leg2.toLocaleString()}
              </Text>
            </View>
            <Text style={{ fontSize: 14, color: "#00FF94" }}>+{s.symbol}{s.profit.toLocaleString()}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.wcArbNote, { color: colors.textMuted }]}>
        ⏱ Arb windows typically last 5–20 min. Amounts shown for reference only. Real opportunities vary.
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorldCupScreen() {
  const colors    = useColors();
  const insets    = useSafeAreaInsets();
  const router    = useRouter();
  const { token, user } = useAuth();
  const countdown = useCountdown();

  const [activeTab, setActiveTab]       = useState<Tab>("overview");
  const [overview, setOverview]         = useState<WCOverview | null>(null);
  const [fixtures, setFixtures]         = useState<WCFixture[]>([]);
  const [allAfrican, setAllAfrican]     = useState<WCAfricanTeam[]>([]);
  const [fdWCMatches, setFdWCMatches]   = useState<FDWCMatch[]>([]);
  const [fdLoading, setFdLoading]       = useState(false);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  // Pulse animation for live dot
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: Platform.OS !== "web" }),
      ]),
    ).start();
  }, [pulseAnim]);

  // Load overview (public)
  const loadOverview = useCallback(async () => {
    try {
      const data = await api.worldcup.overview();
      setOverview(data);
    } catch { /* use fallback */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load fixtures (auth)
  const loadFixtures = useCallback(async () => {
    if (!token) return;
    try {
      const { fixtures: f } = await api.worldcup.fixtures(token);
      setFixtures(f);
    } catch { /* ignore */ }
  }, [token]);

  // Load real WC matches from Football-Data
  const loadFDMatches = useCallback(async () => {
    if (!token || fdWCMatches.length > 0) return;
    setFdLoading(true);
    try {
      const { matches } = await api.footballData.wcMatches(token);
      setFdWCMatches(matches);
    } catch { /* ignore */ } finally {
      setFdLoading(false);
    }
  }, [token, fdWCMatches.length]);

  // Load African teams (auth)
  const loadAfricanTeams = useCallback(async () => {
    if (!token) return;
    try {
      const { teams } = await api.worldcup.africanTeams(token);
      setAllAfrican(teams);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  useEffect(() => {
    if (activeTab === "fixtures"  && fixtures.length === 0)    loadFixtures();
    if (activeTab === "africa"    && allAfrican.length === 0)  loadAfricanTeams();
    if (activeTab === "schedule"  && fdWCMatches.length === 0) loadFDMatches();
  }, [activeTab, fixtures.length, allAfrican.length, fdWCMatches.length, loadFixtures, loadAfricanTeams, loadFDMatches]);

  const daysProgress = countdown.started ? 100 : Math.max(0, Math.min(100, 100 - (countdown.days / 23) * 100));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12, gap: 2 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>🏆 FIFA World Cup 2026</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>USA · Canada · Mexico · 104 Matches</Text>
        </View>
        <TouchableOpacity onPress={() => { loadOverview(); if (activeTab === "fixtures") loadFixtures(); }} disabled={refreshing} activeOpacity={0.7} style={{ padding: 6 }}>
          <RefreshCw size={16} color={refreshing ? colors.textMuted : colors.cyan} />
        </TouchableOpacity>
      </View>

      {/* Live countdown hero */}
      <View style={[styles.countdownHero, { backgroundColor: "rgba(255,215,0,0.06)", borderBottomColor: "rgba(255,215,0,0.2)" }]}>
        {countdown.started ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
            <Text style={[styles.liveText, { color: "#00FF94" }]}>🔴 TOURNAMENT IS LIVE</Text>
          </View>
        ) : (
          <>
            <View style={styles.countdownRow}>
              {([
                [countdown.days,    "DAYS"],
                [countdown.hours,   "HRS"],
                [countdown.minutes, "MINS"],
                [countdown.seconds, "SECS"],
              ] as [number, string][]).map(([val, label]) => (
                <View key={label} style={styles.countdownUnit}>
                  <Text style={[styles.countdownVal, { color: "#FFD700" }]}>{String(val).padStart(2, "0")}</Text>
                  <Text style={[styles.countdownLabel, { color: colors.textMuted }]}>{label}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.countdownDate, { color: colors.textSecondary }]}>
              June 11 — July 19, 2026 · {countdown.days} days to kickoff
            </Text>
            <View style={{ marginTop: 4 }}>
              <ProgressBar pct={daysProgress} color="#FFD700" height={3} />
            </View>
          </>
        )}
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabScroll, { borderBottomColor: colors.border }]} contentContainerStyle={styles.tabContent}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabPill, {
                backgroundColor: active ? colors.cyan : colors.card,
                borderColor: active ? colors.cyan : colors.border,
              }]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabPillText, { color: active ? colors.background : colors.text }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tab content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOverview(); }} tintColor={colors.cyan} />}
      >
        {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            {/* "World Cup Ready" promo */}
            <View style={[styles.promoBanner, { backgroundColor: "rgba(0,229,255,0.06)", borderColor: "rgba(0,229,255,0.2)" }]}>
              <Shield size={16} color={colors.cyan} />
              <Text style={[styles.promoText, { color: colors.textSecondary }]}>
                PrediQs AI covers all <Text style={{ color: colors.cyan }}>104 World Cup matches</Text> with live AI predictions and real-time arbitrage scanning across 40+ global bookmakers.
              </Text>
            </View>

            {/* Tournament winner predictions */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.sectionCardHeader}>
                <Trophy size={15} color="#FFD700" />
                <Text style={[styles.sectionCardTitle, { color: colors.text }]}>AI Tournament Winner Predictions</Text>
              </View>
              {(overview?.winnerOdds ?? DEFAULT_WINNER_ODDS).map((w) => (
                <View key={w.team} style={styles.winnerRow}>
                  <Text style={{ fontSize: 14, width: 24 }}>{w.flag}</Text>
                  <Text style={[styles.winnerTeam, { color: colors.text }]}>{w.team}</Text>
                  <View style={{ flex: 1, marginHorizontal: 8 }}>
                    <ProgressBar pct={w.pct} color={w.color || "#FFD700"} height={6} />
                  </View>
                  <Text style={[styles.winnerPct, { color: "#FFD700" }]}>{w.pct}%</Text>
                </View>
              ))}
              <Text style={[styles.sectionNote, { color: colors.textMuted }]}>
                AI probability model based on FIFA rankings, squad depth, tournament form & historical World Cup data.
              </Text>
            </View>

            {/* African teams spotlight */}
            <View style={{ gap: 4 }}>
              <View style={styles.sectionHeader}>
                <Text style={{ fontSize: 16 }}>🌍</Text>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>African Teams</Text>
                <TouchableOpacity onPress={() => setActiveTab("africa")} activeOpacity={0.8} style={{ marginLeft: "auto" }}>
                  <Text style={{ color: colors.cyan, fontSize: 12 }}>See all →</Text>
                </TouchableOpacity>
              </View>
              {(overview?.africanTeams ?? DEFAULT_AFRICAN).map((t) => (
                <AfricanTeamRow key={t.team} team={t} />
              ))}
            </View>

            {/* ARB teaser */}
            <TouchableOpacity
              style={[styles.arbTeaser, { backgroundColor: "rgba(0,255,148,0.06)", borderColor: "rgba(0,255,148,0.3)" }]}
              onPress={() => setActiveTab("arb")}
              activeOpacity={0.85}
            >
              <TrendingUp size={18} color="#00FF94" />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.arbTeaserTitle, { color: "#00FF94" }]}>World Cup Creates Massive ARB Windows</Text>
                <Text style={[styles.arbTeaserSub, { color: colors.textSecondary }]}>
                  200+ bookmakers price every WC match — creating the largest arbitrage opportunities of the year. Tap to see live WC arb.
                </Text>
              </View>
              <ChevronRight size={18} color="#00FF94" />
            </TouchableOpacity>
          </>
        )}

        {/* ── SCHEDULE TAB (Football-Data real WC matches) ─────────────────── */}
        {activeTab === "schedule" && (
          <>
            {fdLoading && (
              <View style={{ alignItems: "center", paddingVertical: 40, gap: 12 }}>
                <ActivityIndicator size="large" color={colors.cyan} />
                <Text style={[styles.sectionNote, { color: colors.textMuted, textAlign: "center" }]}>
                  Loading official WC 2026 schedule…
                </Text>
              </View>
            )}
            {!fdLoading && fdWCMatches.length === 0 && (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, alignItems: "center", paddingVertical: 32 }]}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📅</Text>
                <Text style={[styles.sectionCardTitle, { color: colors.text, textAlign: "center" }]}>
                  Schedule not yet available
                </Text>
                <Text style={[styles.sectionNote, { color: colors.textMuted, textAlign: "center", marginTop: 4 }]}>
                  FIFA World Cup 2026 fixtures will appear here once Football-Data.org publishes the official schedule. Check back closer to the tournament.
                </Text>
              </View>
            )}
            {!fdLoading && fdWCMatches.length > 0 && (() => {
              const byStage: Record<string, FDWCMatch[]> = {};
              for (const m of fdWCMatches) {
                const key = m.stage.replace(/_/g, " ");
                if (!byStage[key]) byStage[key] = [];
                byStage[key].push(m);
              }
              return Object.entries(byStage).map(([stage, matches]) => (
                <View key={stage} style={{ gap: 6 }}>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 8 }]}>
                    {stage.toUpperCase()}
                  </Text>
                  {matches.map((m) => {
                    const d = new Date(m.utcDate);
                    const dateStr = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
                    const timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                    const isLive = m.status === "IN_PLAY" || m.status === "PAUSED";
                    const isFinished = m.status === "FINISHED";
                    const scoreStr = (m.homeScore !== null && m.awayScore !== null)
                      ? `${m.homeScore} – ${m.awayScore}`
                      : null;
                    return (
                      <View key={m.id} style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: isLive ? colors.cyan : colors.cardBorder, padding: 12, gap: 6 }]}>
                        {/* Date / Status row */}
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <Text style={[styles.sectionNote, { color: colors.textMuted, fontSize: 11 }]}>
                            {dateStr} · {timeStr} UTC{m.group ? `  ·  ${m.group}` : ""}
                          </Text>
                          {isLive && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cyan }} />
                              <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: colors.cyan }}>LIVE</Text>
                            </View>
                          )}
                          {isFinished && (
                            <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.textMuted }}>FT</Text>
                          )}
                        </View>
                        {/* Teams + Score */}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={{ fontSize: 22 }}>{m.homeCrest}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.text }} numberOfLines={1}>{m.homeTeam}</Text>
                          </View>
                          <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: scoreStr ? colors.text : colors.textMuted, minWidth: 52, textAlign: "center" }}>
                            {scoreStr ?? "vs"}
                          </Text>
                          <View style={{ flex: 1, alignItems: "flex-end" }}>
                            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.text }} numberOfLines={1}>{m.awayTeam}</Text>
                          </View>
                          <Text style={{ fontSize: 22 }}>{m.awayCrest}</Text>
                        </View>
                        {m.venue && (
                          <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.textMuted }}>📍 {m.venue}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ));
            })()}
            <Text style={[styles.sectionNote, { color: colors.textMuted, textAlign: "center", marginTop: 8 }]}>
              Powered by football-data.org
            </Text>
          </>
        )}

        {/* ── FIXTURES TAB ──────────────────────────────────────────────────── */}
        {activeTab === "fixtures" && (
          <TierGate requiredTier="premium" customMessage="World Cup AI Picks require Premium">
            <>
              <View style={[styles.fixturesHeader, { backgroundColor: "rgba(0,229,255,0.06)", borderColor: "rgba(0,229,255,0.2)" }]}>
                <Zap size={14} color={colors.cyan} />
                <Text style={[styles.fixturesHeaderText, { color: colors.textSecondary }]}>
                  Tap <Text style={{ color: colors.cyan }}>"Get AI Prediction"</Text> on any match to generate a PrediQs AI specialist analysis.
                </Text>
              </View>
              {(fixtures.length > 0 ? fixtures : DEFAULT_FIXTURES).map((f) => (
                <FixtureCard key={f.id} fixture={f} token={token ?? ""} />
              ))}
            </>
          </TierGate>
        )}

        {/* ── AFRICA TAB ────────────────────────────────────────────────────── */}
        {activeTab === "africa" && (
          <>
            {/* Nigeria hero card */}
            <View style={[styles.nigeriaHero, { backgroundColor: "rgba(0,128,0,0.08)", borderColor: "rgba(0,200,80,0.3)" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ fontSize: 36 }}>🇳🇬</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nigeriaTitle, { color: "#00C850" }]}>Super Eagles Tracker</Text>
                  <Text style={[styles.nigeriaSub, { color: colors.textSecondary }]}>Nigeria · FIFA #28 · Group F</Text>
                </View>
              </View>
              <View style={{ gap: 6, marginTop: 8 }}>
                {[
                  ["🎯 Group qualification", "35%"],
                  ["⚡ Key player", "Victor Osimhen (in form)"],
                  ["🏆 Best WC result", "2nd Round (1998, 2014)"],
                  ["💰 Value bet", "Nigeria 1st Match Win @ 4.80 — Bet9ja"],
                ].map(([k, v]) => (
                  <View key={String(k)} style={{ flexDirection: "row", gap: 8 }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>{k}</Text>
                    <Text style={{ fontSize: 12, color: colors.text }}>{v}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.bet9jaBtn, { backgroundColor: "rgba(0,200,80,0.1)", borderColor: "rgba(0,200,80,0.3)" }]}
                onPress={() => Linking.openURL("https://www.bet9ja.com").catch(() => {})}
                activeOpacity={0.8}
              >
                <ExternalLink size={13} color="#00C850" />
                <Text style={{ color: "#00C850", fontSize: 13 }}>Open Bet9ja for Nigeria bets</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ALL AFRICAN TEAMS — 2026 QUALIFICATION CHANCES</Text>
            {(allAfrican.length > 0 ? allAfrican : DEFAULT_ALL_AFRICAN).map((t) => (
              <AfricanTeamRow key={t.team} team={t} />
            ))}

            {/* CAF info */}
            <View style={[styles.cafInfo, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.cafTitle, { color: colors.text }]}>🌍 Africa at World Cup 2026</Text>
              <Text style={[styles.cafText, { color: colors.textSecondary }]}>
                Africa has <Text style={{ color: "#FFD700" }}>9 guaranteed spots</Text> (up from 5 in 2022), marking the biggest ever allocation for CAF nations. With Morocco's 2022 semi-final run, African football enters 2026 with historic momentum.
              </Text>
            </View>
          </>
        )}

        {/* ── ARB TAB ───────────────────────────────────────────────────────── */}
        {activeTab === "arb" && (
          <TierGate requiredTier="premium" customMessage="World Cup ARB scanner requires Premium">
          <>
            <View style={[styles.arbInfoBanner, { backgroundColor: "rgba(0,255,148,0.06)", borderColor: "rgba(0,255,148,0.25)" }]}>
              <TrendingUp size={14} color="#00FF94" />
              <Text style={[styles.arbInfoText, { color: colors.textSecondary }]}>
                <Text style={{ color: "#00FF94" }}>World Cup = peak arbitrage season.</Text> Every bookmaker globally prices these matches — creating the widest odds gaps of the year. Your local currency is shown automatically.
              </Text>
            </View>

            {/* Why WC = best arb */}
            <View style={[styles.whyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.whyTitle, { color: colors.text }]}>Why World Cup Creates Massive Arbs</Text>
              {[
                ["200+ bookmakers", "Every bookmaker globally prices WC matches"],
                ["Regional pricing gaps", "US, UK, African & Asian bookmakers price differently"],
                ["High liquidity", "Larger stakes accepted = bigger arb amounts possible"],
                ["5–20 min windows", "Longer than regular season arb windows"],
              ].map(([t, d]) => (
                <View key={String(t)} style={styles.whyRow}>
                  <Text style={{ fontSize: 14 }}>⚡</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.whyRowTitle, { color: colors.text }]}>{t}</Text>
                    <Text style={[styles.whyRowDesc, { color: colors.textSecondary }]}>{d}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Demo arb card */}
            {overview ? (
              <WCArbCard overview={overview} />
            ) : (
              <WCArbCard overview={FALLBACK_OVERVIEW} />
            )}

            {/* Full scanner CTA */}
            <TouchableOpacity
              style={[styles.fullScannerBtn, { backgroundColor: "rgba(0,229,255,0.08)", borderColor: colors.cyan }]}
              onPress={() => { router.back(); setTimeout(() => router.push("/arbitrage"), 50); }}
              activeOpacity={0.85}
            >
              <TrendingUp size={16} color={colors.cyan} />
              <Text style={[styles.fullScannerText, { color: colors.cyan }]}>Open Full ARB Scanner</Text>
              <ChevronRight size={16} color={colors.cyan} />
            </TouchableOpacity>

            <View style={[styles.arbDisclaimer, { backgroundColor: "rgba(255,165,0,0.06)", borderColor: "rgba(255,165,0,0.2)" }]}>
              <Text style={[styles.arbDisclaimerText, { color: colors.textSecondary }]}>
                ⚠️ Arbitrage opportunities shown are for illustration. Real arbs exist momentarily — use the live scanner for active opportunities. Always verify odds before placing bets. 18+ only.
              </Text>
            </View>
          </>
          </TierGate>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Default / fallback data ──────────────────────────────────────────────────

const DEFAULT_WINNER_ODDS = [
  { team: "Brazil",    flag: "🇧🇷", pct: 28, color: "#009C3B" },
  { team: "France",    flag: "🇫🇷", pct: 22, color: "#0055A4" },
  { team: "Argentina", flag: "🇦🇷", pct: 18, color: "#74ACDF" },
  { team: "Germany",   flag: "🇩🇪", pct: 12, color: "#888"    },
  { team: "Spain",     flag: "🇪🇸", pct: 10, color: "#C60B1E" },
  { team: "England",   flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", pct: 8,  color: "#CF091D" },
  { team: "Others",    flag: "🌍",  pct: 2,  color: "#555"    },
];

const DEFAULT_AFRICAN: WCAfricanTeam[] = [
  { team: "Morocco",    flag: "🇲🇦", qualifyPct: 42, fifaRank: 14, group: "Group D", note: "Quarter-final potential — Atlas Lions",  valueBet: "Morocco Top African @ 5.50" },
  { team: "Senegal",    flag: "🇸🇳", qualifyPct: 38, fifaRank: 20, group: "Group B", note: "AFCON champions with Diallo & Sarr",     valueBet: "Senegal Group Top 2 @ 3.40" },
  { team: "Nigeria",    flag: "🇳🇬", qualifyPct: 35, fifaRank: 28, group: "Group F", note: "Super Eagles — Osimhen in top form",     valueBet: "Nigeria 1st Match Win @ 4.80" },
  { team: "Ivory Coast",flag: "🇨🇮", qualifyPct: 30, fifaRank: 50, group: "Group E", note: "AFCON 2023 winners — experienced squad" },
  { team: "Cameroon",   flag: "🇨🇲", qualifyPct: 31, fifaRank: 43, group: "Group C", note: "Indomitable Lions — physical & direct"  },
  { team: "Egypt",      flag: "🇪🇬", qualifyPct: 25, fifaRank: 36, group: "Group I", note: "Salah's final World Cup",               valueBet: "Egypt 1st Match Win @ 4.20" },
];

const DEFAULT_ALL_AFRICAN: WCAfricanTeam[] = [
  ...DEFAULT_AFRICAN,
  { team: "Ghana",       flag: "🇬🇭", qualifyPct: 28, fifaRank: 66, group: "Group G", note: "Black Stars rebuild — young squad"     },
  { team: "Algeria",     flag: "🇩🇿", qualifyPct: 22, fifaRank: 55, group: "Group J", note: "Desert Foxes — CAF qualifying journey"  },
  { team: "South Africa",flag: "🇿🇦", qualifyPct: 18, fifaRank: 70, group: "Group K", note: "Bafana Bafana — first WC since 2010"    },
  { team: "Tunisia",     flag: "🇹🇳", qualifyPct: 20, fifaRank: 34, group: "Group L", note: "Eagles of Carthage — tactical solid"    },
  { team: "Mali",        flag: "🇲🇱", qualifyPct: 15, fifaRank: 58, group: "Group A", note: "Eagles — rising African force"          },
  { team: "Burkina Faso",flag: "🇧🇫", qualifyPct: 12, fifaRank: 64, group: "Group B", note: "Stallions — surprise package potential" },
];

const WC_START_DATE = new Date("2026-06-11T21:00:00Z");
const DEFAULT_FIXTURES: WCFixture[] = [
  { id: 1,  date: new Date(WC_START_DATE.getTime() + 0 * 86_400_000).toISOString(), homeTeam: "USA",       awayTeam: "Canada",     homeLogo: "", awayLogo: "", venue: "SoFi Stadium",    city: "Los Angeles", homeScore: null, awayScore: null, status: "NS", round: "Group Stage - 1", group: "Group B" },
  { id: 2,  date: new Date(WC_START_DATE.getTime() + 1 * 86_400_000).toISOString(), homeTeam: "Brazil",    awayTeam: "Cameroon",   homeLogo: "", awayLogo: "", venue: "AT&T Stadium",    city: "Dallas",      homeScore: null, awayScore: null, status: "NS", round: "Group Stage - 1", group: "Group C" },
  { id: 3,  date: new Date(WC_START_DATE.getTime() + 1 * 86_400_000).toISOString(), homeTeam: "France",    awayTeam: "Nigeria",    homeLogo: "", awayLogo: "", venue: "MetLife Stadium", city: "New York",    homeScore: null, awayScore: null, status: "NS", round: "Group Stage - 1", group: "Group F" },
  { id: 4,  date: new Date(WC_START_DATE.getTime() + 2 * 86_400_000).toISOString(), homeTeam: "Argentina", awayTeam: "Morocco",    homeLogo: "", awayLogo: "", venue: "Rose Bowl",       city: "Pasadena",    homeScore: null, awayScore: null, status: "NS", round: "Group Stage - 1", group: "Group D" },
  { id: 5,  date: new Date(WC_START_DATE.getTime() + 2 * 86_400_000).toISOString(), homeTeam: "Spain",     awayTeam: "Ghana",      homeLogo: "", awayLogo: "", venue: "Mercedes-Benz",   city: "Atlanta",     homeScore: null, awayScore: null, status: "NS", round: "Group Stage - 1", group: "Group G" },
  { id: 6,  date: new Date(WC_START_DATE.getTime() + 3 * 86_400_000).toISOString(), homeTeam: "England",   awayTeam: "Senegal",    homeLogo: "", awayLogo: "", venue: "Arrowhead",       city: "Kansas City", homeScore: null, awayScore: null, status: "NS", round: "Group Stage - 1", group: "Group B" },
  { id: 7,  date: new Date(WC_START_DATE.getTime() + 3 * 86_400_000).toISOString(), homeTeam: "Germany",   awayTeam: "South Korea",homeLogo: "", awayLogo: "", venue: "Lumen Field",     city: "Seattle",     homeScore: null, awayScore: null, status: "NS", round: "Group Stage - 1", group: "Group H" },
  { id: 8,  date: new Date(WC_START_DATE.getTime() + 4 * 86_400_000).toISOString(), homeTeam: "Portugal",  awayTeam: "Egypt",      homeLogo: "", awayLogo: "", venue: "BC Place",        city: "Vancouver",   homeScore: null, awayScore: null, status: "NS", round: "Group Stage - 1", group: "Group I" },
];

const FALLBACK_OVERVIEW: WCOverview = {
  countdown: { days: 23, hours: 0, minutes: 0, seconds: 0, started: false, label: "23 days remaining", totalMs: 23 * 86_400_000 },
  winnerOdds: DEFAULT_WINNER_ODDS,
  africanTeams: DEFAULT_AFRICAN,
  demoArb: {
    id: "wc-arb-demo", sport: "Soccer", league: "FIFA World Cup 2026",
    homeTeam: "Brazil", awayTeam: "Germany",
    commenceTime: new Date(WC_START_DATE.getTime() + 86_400_000).toISOString(),
    profitPercent: 3.8,
    legs: [
      { bookmaker: "DraftKings", bookmakerId: "draftkings", selection: "Brazil",  odds: 2.15, impliedProb: 0.465 },
      { bookmaker: "Pinnacle",   bookmakerId: "pinnacle",   selection: "Germany", odds: 2.45, impliedProb: 0.408 },
    ],
    localStakes: {
      us: { currency: "USD", symbol: "$",    leg1: 510,     leg2: 490,     profit: 38     },
      ng: { currency: "NGN", symbol: "₦",    leg1: 255_000, leg2: 245_000, profit: 19_000 },
      ke: { currency: "KES", symbol: "KES ", leg1: 33_150,  leg2: 31_850,  profit: 2_470  },
      za: { currency: "ZAR", symbol: "R",    leg1: 3_820,   leg2: 3_672,   profit: 285    },
      uk: { currency: "GBP", symbol: "£",    leg1: 403,     leg2: 387,     profit: 30     },
    },
  },
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 19, letterSpacing: -0.3 },
  headerSub: { fontSize: 11 },

  // Countdown
  countdownHero: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, gap: 6 },
  countdownRow: { flexDirection: "row", gap: 20 },
  countdownUnit: { alignItems: "center", gap: 2 },
  countdownVal: { fontSize: 32, letterSpacing: -1 },
  countdownLabel: { fontSize: 9, letterSpacing: 0.6 },
  countdownDate: { fontSize: 11 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#00FF94" },
  liveText: { fontSize: 14 },

  // Tabs
  tabScroll: { borderBottomWidth: 1, maxHeight: 50 },
  tabContent: { paddingHorizontal: 14, paddingVertical: 7, flexDirection: "row", gap: 8, alignItems: "center" },
  tabPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  tabPillText: { fontSize: 13 },

  // Content
  content: { padding: 16, gap: 14 },

  // Section cards
  sectionCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  sectionCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  sectionCardTitle: { fontSize: 15 },
  sectionNote: { fontSize: 10, lineHeight: 14, marginTop: 2 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontSize: 15 },
  sectionLabel: { fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 4 },

  // Winner predictions
  winnerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  winnerTeam: { fontSize: 13, width: 80 },
  winnerPct: { fontSize: 13, width: 32, textAlign: "right" },

  // Promo
  promoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  promoText: { flex: 1, fontSize: 12, lineHeight: 18 },

  // ARB teaser
  arbTeaser: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  arbTeaserTitle: { fontSize: 14 },
  arbTeaserSub: { fontSize: 12, lineHeight: 17, marginTop: 2 },

  // Fixtures
  fixturesHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  fixturesHeaderText: { flex: 1, fontSize: 12, lineHeight: 17 },
  fixtureCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  groupPill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  fixtureDateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  fixtureDateText: { fontSize: 10 },
  fixtureTeams: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fixtureTeamName: { fontSize: 14, flex: 1 },
  fixtureScore: { fontSize: 20, paddingHorizontal: 12 },
  fixtureVs: { fontSize: 12, paddingHorizontal: 12 },
  predRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  predLabel: { fontSize: 11, width: 80 },
  predPct: { fontSize: 11, width: 30, textAlign: "right" },
  confBar: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  confText: { fontSize: 11 },
  fixtureReasoning: { fontSize: 12, lineHeight: 18 },
  keyFactor: { fontSize: 11, lineHeight: 16 },
  loadPredBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 11, borderRadius: 10, borderWidth: 1 },

  // African teams
  africanRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  africanName: { fontSize: 14 },
  africanGroup: { fontSize: 11 },
  africanNote: { fontSize: 11, lineHeight: 15 },
  valueBetPill: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, marginTop: 2 },

  // Nigeria hero
  nigeriaHero: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  nigeriaTitle: { fontSize: 16 },
  nigeriaSub: { fontSize: 12, marginTop: 1 },
  bet9jaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 4 },

  // CAF
  cafInfo: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  cafTitle: { fontSize: 15 },
  cafText: { fontSize: 13, lineHeight: 20 },

  // ARB tab
  arbInfoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  arbInfoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  whyCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  whyTitle: { fontSize: 15, marginBottom: 4 },
  whyRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  whyRowTitle: { fontSize: 13 },
  whyRowDesc: { fontSize: 11, lineHeight: 16, marginTop: 1 },

  // WC Arb card
  wcArbCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  wcArbBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  wcArbMatchup: { fontSize: 18, letterSpacing: -0.3 },
  wcLegRow: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, borderWidth: 1 },
  wcLegBk: { fontSize: 11 },
  wcLegSel: { fontSize: 14, marginTop: 2 },
  wcLegOdds: { fontSize: 18 },
  currencySection: { borderTopWidth: 1, paddingTop: 12, gap: 8 },
  currencySectionTitle: { fontSize: 9, letterSpacing: 0.5 },
  localStakeRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 6, borderBottomWidth: 1 },
  wcArbNote: { fontSize: 10, lineHeight: 14 },

  fullScannerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 14, borderWidth: 1 },
  fullScannerText: { fontSize: 14 },
  arbDisclaimer: { borderRadius: 10, borderWidth: 1, padding: 12 },
  arbDisclaimerText: { fontSize: 11, lineHeight: 16 },
});
