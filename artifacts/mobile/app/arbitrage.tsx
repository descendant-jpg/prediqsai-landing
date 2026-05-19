import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  ChevronRight,
  Crown,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api, type ArbCalcResult, type ArbOpportunity, type ArbScanResponse } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function secondsUntil(iso: string): number {
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
}

function formatCountdown(secs: number): string {
  if (secs <= 0) return "EXPIRED";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function profitColor(pct: number): string {
  if (pct >= 3) return "#00FF94";
  if (pct >= 1.5) return "#FFD700";
  return "#00E5FF";
}

const BOOKMAKER_URLS: Record<string, string> = {
  bet365:      "https://www.bet365.com",
  williamhill: "https://www.williamhill.com",
  draftkings:  "https://www.draftkings.com",
  fanduel:     "https://www.fanduel.com",
  betmgm:      "https://www.betmgm.com",
  caesars:     "https://www.caesarssportsbook.com",
  unibet:      "https://www.unibet.com",
  betfair:     "https://www.betfair.com",
  pinnacle:    "https://www.pinnacle.com",
  betrivers:   "https://www.betrivers.com",
  pointsbet:   "https://www.pointsbet.com",
};

// ─── Countdown ticker ─────────────────────────────────────────────────────────

function Countdown({ isoDate }: { isoDate: string }) {
  const [secs, setSecs] = useState(() => secondsUntil(isoDate));
  const colors = useColors();
  useEffect(() => {
    const id = setInterval(() => setSecs(secondsUntil(isoDate)), 1000);
    return () => clearInterval(id);
  }, [isoDate]);
  const urgent = secs < 300;
  return (
    <Text style={[styles.countdown, { color: urgent ? "#FF4D4D" : colors.textMuted }]}>
      ⏱ Window: {formatCountdown(secs)}
    </Text>
  );
}

// ─── Stake Calculator Modal ───────────────────────────────────────────────────

function CalcModal({
  arb,
  visible,
  onClose,
  token,
}: {
  arb: ArbOpportunity | null;
  visible: boolean;
  onClose: () => void;
  token: string;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [budget, setBudget] = useState("1000");
  const [result, setResult] = useState<ArbCalcResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function calculate() {
    if (!arb) return;
    const b = parseFloat(budget);
    if (!b || b <= 0) return;
    setIsLoading(true);
    try {
      const r = await api.arbitrage.calculate(token, arb.id, b);
      setResult(r);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Calculation failed");
    } finally {
      setIsLoading(false);
    }
  }

  function openBookmaker(bookmakerId: string) {
    const url = BOOKMAKER_URLS[bookmakerId] ?? `https://www.google.com/search?q=${bookmakerId}+sportsbook`;
    Linking.openURL(url).catch(() => {});
  }

  if (!arb) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>ARB Calculator</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[{ color: colors.textMuted, fontSize: 14 }]}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.modalBody, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.calcMatchName, { color: colors.text }]}>
            {arb.homeTeam} vs {arb.awayTeam}
          </Text>
          <Text style={[styles.calcLeague, { color: colors.textSecondary }]}>
            {arb.league} · {arb.marketType === "3way" ? "3-Way" : "2-Way"} · +{arb.profitPercent}% guaranteed
          </Text>

          {/* Budget input */}
          <View style={[styles.budgetRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>Total Budget</Text>
            <View style={styles.budgetInputRow}>
              <Text style={[styles.budgetSymbol, { color: colors.cyan }]}>$</Text>
              <TextInput
                style={[styles.budgetInput, { color: colors.text }]}
                value={budget}
                onChangeText={setBudget}
                keyboardType="decimal-pad"
                placeholder="1000"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.calcBtn, { backgroundColor: colors.cyan, opacity: isLoading ? 0.7 : 1 }]}
            onPress={calculate}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <Calculator size={16} color={colors.background} />
            <Text style={[styles.calcBtnText, { color: colors.background }]}>
              {isLoading ? "Calculating…" : "Calculate Stakes"}
            </Text>
          </TouchableOpacity>

          {result && (
            <>
              <View style={[styles.stakesDivider, { borderTopColor: colors.border }]} />

              {result.stakes.map((stake, i) => {
                const leg = arb.legs[i];
                return (
                  <View
                    key={i}
                    style={[styles.stakeCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                  >
                    <View style={styles.stakeCardHeader}>
                      <Text style={[styles.stakeNum, { color: colors.cyan }]}>BET {i + 1}</Text>
                      <TouchableOpacity
                        style={styles.openBkBtn}
                        onPress={() => openBookmaker(leg?.bookmakerId ?? "")}
                        activeOpacity={0.8}
                      >
                        <ExternalLink size={12} color={colors.textMuted} />
                        <Text style={[styles.openBkText, { color: colors.textMuted }]}>{stake.bookmaker}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.stakeSelection, { color: colors.text }]}>{stake.selection}</Text>
                    <View style={styles.stakeDetailRow}>
                      <View style={styles.stakeDetailItem}>
                        <Text style={[styles.stakeDetailLabel, { color: colors.textMuted }]}>Odds</Text>
                        <Text style={[styles.stakeDetailVal, { color: colors.text }]}>{leg?.odds ?? "—"}</Text>
                      </View>
                      <View style={styles.stakeDetailItem}>
                        <Text style={[styles.stakeDetailLabel, { color: colors.textMuted }]}>Stake</Text>
                        <Text style={[styles.stakeDetailVal, { color: colors.cyan }]}>${stake.stake.toFixed(2)}</Text>
                      </View>
                      <View style={styles.stakeDetailItem}>
                        <Text style={[styles.stakeDetailLabel, { color: colors.textMuted }]}>Returns</Text>
                        <Text style={[styles.stakeDetailVal, { color: colors.green }]}>${stake.returns.toFixed(2)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              <View style={[styles.profitCard, { backgroundColor: "rgba(0,255,148,0.08)", borderColor: "rgba(0,255,148,0.3)" }]}>
                <View style={styles.profitRow}>
                  <Text style={[styles.profitLabel, { color: colors.textSecondary }]}>Guaranteed Return</Text>
                  <Text style={[styles.profitVal, { color: "#00FF94" }]}>${result.guaranteedReturn.toFixed(2)}</Text>
                </View>
                <View style={styles.profitRow}>
                  <Text style={[styles.profitLabel, { color: colors.textSecondary }]}>Guaranteed Profit</Text>
                  <Text style={[styles.profitVal, { color: "#00FF94", fontSize: 22 }]}>+${result.guaranteedProfit.toFixed(2)}</Text>
                </View>
                <View style={styles.profitRow}>
                  <Text style={[styles.profitLabel, { color: colors.textMuted }]}>Profit %</Text>
                  <Text style={[styles.profitVal, { color: "#00FF94" }]}>+{result.profitPercent}%</Text>
                </View>
                <View style={styles.profitRow}>
                  <Text style={[styles.profitLabel, { color: colors.textMuted }]}>ROI</Text>
                  <Text style={[styles.profitVal, { color: colors.textSecondary }]}>Instant (risk-free)</Text>
                </View>
              </View>

              <View style={styles.openBooksRow}>
                {arb.legs.map((leg, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.openBkFullBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    onPress={() => openBookmaker(leg.bookmakerId)}
                    activeOpacity={0.8}
                  >
                    <ExternalLink size={13} color={colors.cyan} />
                    <Text style={[styles.openBkFullText, { color: colors.cyan }]}>Open {leg.bookmaker}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Arb Opportunity Card ─────────────────────────────────────────────────────

function ArbCard({
  arb,
  onCalculate,
}: {
  arb: ArbOpportunity;
  onCalculate: (arb: ArbOpportunity) => void;
}) {
  const colors = useColors();
  const pColor = profitColor(arb.profitPercent);

  return (
    <View style={[styles.arbCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderLeftColor: pColor, borderLeftWidth: 3 }]}>
      {/* Header */}
      <View style={styles.arbCardHeader}>
        <View style={styles.arbCardHeaderLeft}>
          <View style={[styles.arbTypePill, { backgroundColor: arb.marketType === "3way" ? "rgba(255,215,0,0.12)" : "rgba(0,229,255,0.1)", borderColor: arb.marketType === "3way" ? "#FFD700" : colors.cyan }]}>
            <Text style={[styles.arbTypePillText, { color: arb.marketType === "3way" ? "#FFD700" : colors.cyan }]}>
              {arb.marketType === "3way" ? "3-WAY ⚡" : "2-WAY 🔄"}
            </Text>
          </View>
          <Text style={[styles.arbLeague, { color: colors.textMuted }]}>{arb.league}</Text>
        </View>
        <View style={[styles.profitBadge, { backgroundColor: `${pColor}18`, borderColor: `${pColor}55` }]}>
          <TrendingUp size={11} color={pColor} />
          <Text style={[styles.profitBadgeText, { color: pColor }]}>+{arb.profitPercent}%</Text>
        </View>
      </View>

      {/* Match */}
      <Text style={[styles.arbMatchup, { color: colors.text }]}>
        {arb.homeTeam} <Text style={{ color: colors.textMuted }}>vs</Text> {arb.awayTeam}
      </Text>
      <Countdown isoDate={arb.commenceTime} />

      {/* Legs table */}
      <View style={[styles.legsTable, { borderColor: colors.border }]}>
        <View style={[styles.legsHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.legHeaderText, { color: colors.textMuted, flex: 2 }]}>Bookmaker</Text>
          <Text style={[styles.legHeaderText, { color: colors.textMuted, flex: 2 }]}>Selection</Text>
          <Text style={[styles.legHeaderText, { color: colors.textMuted, flex: 1, textAlign: "right" }]}>Odds</Text>
        </View>
        {arb.legs.map((leg, i) => (
          <View key={i} style={[styles.legRow, i < arb.legs.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.legCell, { color: colors.textSecondary, flex: 2 }]} numberOfLines={1}>{leg.bookmaker}</Text>
            <Text style={[styles.legCell, { color: colors.text, flex: 2 }]} numberOfLines={1}>{leg.selection}</Text>
            <Text style={[styles.legCell, { color: pColor, flex: 1, textAlign: "right" }]}>{leg.odds}</Text>
          </View>
        ))}
      </View>

      {/* Profit on $1k */}
      <Text style={[styles.profitHint, { color: colors.textMuted }]}>
        On $1,000 stake: +${((arb.profitPercent / 100) * 1000).toFixed(0)} guaranteed
      </Text>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.calcArbBtn, { backgroundColor: "rgba(0,229,255,0.1)", borderColor: colors.cyan }]}
        onPress={() => onCalculate(arb)}
        activeOpacity={0.8}
      >
        <Calculator size={14} color={colors.cyan} />
        <Text style={[styles.calcArbBtnText, { color: colors.cyan }]}>Calculate Stakes</Text>
        <ChevronRight size={14} color={colors.cyan} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ArbitrageScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();

  const [data, setData] = useState<ArbScanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedArb, setSelectedArb] = useState<ArbOpportunity | null>(null);
  const [calcVisible, setCalcVisible] = useState(false);

  const scanAnim = useRef(new Animated.Value(0)).current;

  const tier = (user?.tier ?? "free") as "free" | "pro" | "elite";
  const isElite = tier === "elite";
  const isPro = tier === "pro" || isElite;

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + topPaddingWeb;

  // Scan animation for Elite
  useEffect(() => {
    if (!isElite) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
    ).start();
  }, [isElite, scanAnim]);

  const load = useCallback(
    async (force = false) => {
      if (!token) return;
      if (force) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError("");
      try {
        const result = force && isElite
          ? await api.arbitrage.scan(token)
          : await api.arbitrage.list(token);
        setData(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to scan");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, isElite],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Elite: auto-refresh every 30s
  useEffect(() => {
    if (!isElite) return;
    const id = setInterval(() => load(true), 30_000);
    return () => clearInterval(id);
  }, [isElite, load]);

  function openCalc(arb: ArbOpportunity) {
    setSelectedArb(arb);
    setCalcVisible(true);
  }

  const opps = data?.opportunities ?? [];
  const totalFound = data?.totalFound ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>🔄 ARB Scanner</Text>
          {isElite ? (
            <Animated.Text style={[styles.headerSub, { color: colors.green, opacity: scanAnim }]}>
              ⚡ LIVE — scanning 40+ bookmakers
            </Animated.Text>
          ) : (
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {isPro ? "Top 3 opportunities · Manual refresh" : "Arbitrage alerts — upgrade to view"}
            </Text>
          )}
        </View>
        {(isElite || isPro) && (
          <TouchableOpacity
            style={[styles.refreshBtn, { borderColor: colors.border }]}
            onPress={() => load(true)}
            disabled={isRefreshing}
            activeOpacity={0.7}
          >
            <RefreshCw size={16} color={isRefreshing ? colors.textMuted : colors.cyan} />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats bar */}
      {data && (
        <View style={[styles.statsBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: opps.length > 0 ? "#00FF94" : colors.textMuted }]}>{opps.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Live Arbs</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.text }]}>{totalFound}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Found</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.cyan }]}>
              {opps.length > 0 ? `+${Math.max(...opps.map((o) => o.profitPercent)).toFixed(1)}%` : "—"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Best Margin</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.textMuted, fontSize: 11 }]}>
              {data.lastScanned ? new Date(data.lastScanned).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Last Scan</Text>
          </View>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => load(true)} tintColor={colors.cyan} />
        }
      >
        {/* Loading */}
        {isLoading && !data && (
          <View style={styles.centered}>
            <Text style={{ fontSize: 32 }}>🔍</Text>
            <Text style={[styles.loadingTitle, { color: colors.text }]}>Scanning bookmakers…</Text>
            <Text style={[styles.loadingSub, { color: colors.textSecondary }]}>
              Comparing odds across 40+ bookmakers for guaranteed profit margins
            </Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={[styles.errorCard, { backgroundColor: "rgba(255,77,77,0.08)", borderColor: "rgba(255,77,77,0.25)" }]}>
            <AlertTriangle size={16} color={colors.red} />
            <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
          </View>
        )}

        {/* Free tier gate */}
        {!isPro && !isLoading && (
          <View style={[styles.gateCard, { backgroundColor: colors.card, borderColor: "#00E5FF" }]}>
            <Zap size={28} color="#00E5FF" />
            <Text style={[styles.gateTitle, { color: colors.text }]}>Basic Arbitrage Alerts</Text>
            <Text style={[styles.gateSub, { color: colors.textSecondary }]}>
              Pro tier: Top 3 arb opportunities per day with manual stake calculator.{"\n"}
              Elite tier: Real-time scanner, unlimited arbs, auto-calculator & instant alerts.
            </Text>
            {opps.length > 0 && (
              <View style={[styles.teaserCard, { backgroundColor: "rgba(0,229,255,0.06)", borderColor: "rgba(0,229,255,0.2)" }]}>
                <Text style={[styles.teaserText, { color: colors.textSecondary }]}>
                  🔄 {totalFound} arbitrage {totalFound === 1 ? "opportunity" : "opportunities"} found right now — upgrade to view
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: "#00E5FF" }]}
              onPress={() => router.push("/settings")}
              activeOpacity={0.85}
            >
              <Text style={[styles.upgradeBtnText, { color: colors.background }]}>🔒 Upgrade to Pro — $14.99/mo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: "rgba(255,215,0,0.12)", borderWidth: 1, borderColor: "#FFD700" }]}
              onPress={() => router.push("/settings")}
              activeOpacity={0.85}
            >
              <Crown size={14} color="#FFD700" />
              <Text style={[styles.upgradeBtnText, { color: "#FFD700" }]}>Upgrade to Elite — $39.99/mo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pro tier — show top 3 */}
        {isPro && !isLoading && (
          <>
            {!isElite && (
              <View style={[styles.proInfoBanner, { backgroundColor: "rgba(0,229,255,0.06)", borderColor: "rgba(0,229,255,0.2)" }]}>
                <Zap size={14} color="#00E5FF" />
                <Text style={[styles.proInfoText, { color: colors.textSecondary }]}>
                  Pro: Top 3 arbs (2-way only) · Tap Refresh to update
                </Text>
                <TouchableOpacity onPress={() => router.push("/settings")} activeOpacity={0.8}>
                  <Text style={{ color: "#FFD700", fontSize: 11 }}>👑 Elite</Text>
                </TouchableOpacity>
              </View>
            )}

            {isElite && (
              <View style={[styles.eliteBanner, { backgroundColor: "rgba(0,255,148,0.08)", borderColor: "rgba(0,255,148,0.3)" }]}>
                <View style={[styles.liveDot, { backgroundColor: "#00FF94" }]} />
                <Text style={[styles.eliteBannerText, { color: "#00FF94" }]}>
                  LIVE SCANNER — Auto-refreshes every 30s · {opps.length} active {opps.length === 1 ? "opportunity" : "opportunities"}
                </Text>
              </View>
            )}

            {opps.length === 0 && !isLoading && (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40 }}>📊</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No arbs right now</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  Bookmakers have closed the gaps. Refresh to keep scanning — arbitrage windows typically last 2–15 minutes.
                </Text>
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => load(true)}
                  activeOpacity={0.8}
                >
                  <RefreshCw size={14} color={colors.cyan} />
                  <Text style={[styles.retryText, { color: colors.cyan }]}>Scan Now</Text>
                </TouchableOpacity>
              </View>
            )}

            {opps.map((arb) => (
              <ArbCard key={arb.id} arb={arb} onCalculate={openCalc} />
            ))}

            {!isElite && opps.length > 0 && (
              <View style={[styles.eliteUpgradeCard, { backgroundColor: "rgba(255,215,0,0.06)", borderColor: "rgba(255,215,0,0.3)" }]}>
                <Crown size={18} color="#FFD700" />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.eliteUpgradeTitle, { color: "#FFD700" }]}>Unlock Full Scanner — Elite</Text>
                  <Text style={[styles.eliteUpgradeSub, { color: colors.textSecondary }]}>
                    Real-time 30s refresh · 3-way arbs · Unlimited opportunities · Push alerts · $39.99/mo
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push("/settings")} activeOpacity={0.8}>
                  <ChevronRight size={18} color="#FFD700" />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Disclaimer */}
        <View style={[styles.disclaimerCard, { backgroundColor: "rgba(255,165,0,0.06)", borderColor: "rgba(255,165,0,0.2)" }]}>
          <AlertTriangle size={14} color="#FFA500" />
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
            Arbitrage betting is legal but bookmakers may limit or close accounts of known arb bettors. Spread stakes across multiple bookmakers. Never exceed bookmaker limits. PrediQs AI is not responsible for account restrictions.
          </Text>
        </View>

        <DisclaimerFooter />
      </ScrollView>

      {/* Stake Calculator Modal */}
      {token && (
        <CalcModal
          arb={selectedArb}
          visible={calcVisible}
          onClose={() => setCalcVisible(false)}
          token={token}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 20, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, marginTop: 1 },
  refreshBtn: { padding: 8, borderRadius: 10, borderWidth: 1 },

  // Stats bar
  statsBar: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1 },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statVal: { fontSize: 16, letterSpacing: -0.3 },
  statLabel: { fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase" },
  statDivider: { width: 1, marginVertical: 4 },

  // Content
  content: { padding: 16, gap: 14 },
  centered: { alignItems: "center", gap: 12, paddingVertical: 60, paddingHorizontal: 24 },
  loadingTitle: { fontSize: 18, textAlign: "center" },
  loadingSub: { fontSize: 13, textAlign: "center", lineHeight: 19 },

  // Error
  errorCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 13 },

  // Gate card (free)
  gateCard: { padding: 20, borderRadius: 18, borderWidth: 2, alignItems: "center", gap: 12 },
  gateTitle: { fontSize: 20, letterSpacing: -0.3 },
  gateSub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  teaserCard: { width: "100%", padding: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  teaserText: { fontSize: 13, textAlign: "center" },
  upgradeBtn: { flexDirection: "row", alignItems: "center", gap: 6, width: "100%", justifyContent: "center", padding: 14, borderRadius: 14 },
  upgradeBtnText: { fontSize: 14 },

  // Pro info banner
  proInfoBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  proInfoText: { flex: 1, fontSize: 11 },

  // Elite banner
  eliteBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  eliteBannerText: { flex: 1, fontSize: 12 },

  // Empty state
  emptyState: { alignItems: "center", gap: 10, paddingVertical: 40 },
  emptyTitle: { fontSize: 18 },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  retryText: { fontSize: 13 },

  // Arb card
  arbCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  arbCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  arbCardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  arbTypePill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  arbTypePillText: { fontSize: 10, letterSpacing: 0.4 },
  arbLeague: { fontSize: 11 },
  profitBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  profitBadgeText: { fontSize: 13 },
  arbMatchup: { fontSize: 16, letterSpacing: -0.2 },
  countdown: { fontSize: 11 },
  legsTable: { borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  legsHeader: { flexDirection: "row", padding: 8, borderBottomWidth: 1 },
  legHeaderText: { fontSize: 10, letterSpacing: 0.3, textTransform: "uppercase" },
  legRow: { flexDirection: "row", padding: 10 },
  legCell: { fontSize: 12 },
  profitHint: { fontSize: 11 },
  calcArbBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  calcArbBtnText: { fontSize: 13 },

  // Elite upgrade card
  eliteUpgradeCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  eliteUpgradeTitle: { fontSize: 14 },
  eliteUpgradeSub: { fontSize: 11, lineHeight: 16 },

  // Disclaimer
  disclaimerCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  disclaimerText: { flex: 1, fontSize: 11, lineHeight: 16 },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, paddingTop: 24, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18 },
  modalBody: { padding: 20, gap: 14 },
  calcMatchName: { fontSize: 17, letterSpacing: -0.3 },
  calcLeague: { fontSize: 12, marginTop: -8 },
  budgetRow: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  budgetLabel: { fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" },
  budgetInputRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  budgetSymbol: { fontSize: 22 },
  budgetInput: { flex: 1, fontSize: 28, letterSpacing: -0.5 },
  calcBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 14 },
  calcBtnText: { fontSize: 15 },
  stakesDivider: { borderTopWidth: 1 },
  stakeCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  stakeCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stakeNum: { fontSize: 11, letterSpacing: 0.5 },
  openBkBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  openBkText: { fontSize: 11 },
  stakeSelection: { fontSize: 15 },
  stakeDetailRow: { flexDirection: "row", gap: 8 },
  stakeDetailItem: { flex: 1, gap: 2 },
  stakeDetailLabel: { fontSize: 10, letterSpacing: 0.3, textTransform: "uppercase" },
  stakeDetailVal: { fontSize: 15 },
  profitCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  profitRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  profitLabel: { fontSize: 13 },
  profitVal: { fontSize: 16 },
  openBooksRow: { gap: 8 },
  openBkFullBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 10, borderWidth: 1 },
  openBkFullText: { fontSize: 13 },
});
