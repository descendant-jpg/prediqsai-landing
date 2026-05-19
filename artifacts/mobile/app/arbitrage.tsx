import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  ChevronRight,
  Crown,
  ExternalLink,
  RefreshCw,
  Shield,
  ShieldAlert,
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
import { api, type ArbCalcResult, type ArbOpportunity, type ArbRegion, type ArbScanResponse } from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const REGIONS: { id: ArbRegion; label: string; flag: string }[] = [
  { id: "global", label: "Global",  flag: "🌐" },
  { id: "us",     label: "USA",     flag: "🇺🇸" },
  { id: "uk",     label: "UK/EU",   flag: "🇬🇧" },
  { id: "africa", label: "Africa",  flag: "🌍" },
  { id: "asia",   label: "Asia",    flag: "🌏" },
];

const REGION_DEFAULT_CURRENCY: Record<ArbRegion, string> = {
  global: "USD", us: "USD", uk: "GBP", africa: "NGN", asia: "USD",
};

interface CurrencyInfo { symbol: string; name: string; rate: number }
const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { symbol: "$",    name: "US Dollar",           rate: 1     },
  NGN: { symbol: "₦",    name: "Nigerian Naira",      rate: 1580  },
  KES: { symbol: "KES ", name: "Kenyan Shilling",     rate: 129   },
  GHS: { symbol: "GHS ", name: "Ghanaian Cedi",       rate: 15.5  },
  ZAR: { symbol: "R",    name: "South African Rand",  rate: 18.8  },
  UGX: { symbol: "UGX ", name: "Ugandan Shilling",    rate: 3720  },
  GBP: { symbol: "£",    name: "British Pound",       rate: 0.79  },
  EUR: { symbol: "€",    name: "Euro",                rate: 0.93  },
};

interface BkMeta { trustStars: number; license: string; mobileMoney: string[]; url: string }
const BK_META: Record<string, BkMeta> = {
  bet9ja:        { trustStars: 5, license: "Licensed NLRC ✅",       mobileMoney: ["OPay", "PalmPay"],      url: "https://www.bet9ja.com" },
  sportybet:     { trustStars: 5, license: "Trusted ✅",              mobileMoney: ["OPay", "PalmPay"],      url: "https://www.sportybet.com" },
  betking:       { trustStars: 5, license: "Licensed NLRC ✅",       mobileMoney: ["OPay"],                 url: "https://www.betking.com" },
  hollywoodbets: { trustStars: 5, license: "Licensed SA NGB ✅",     mobileMoney: ["FNB", "EFT"],           url: "https://www.hollywoodbets.net" },
  odibets:       { trustStars: 4, license: "Licensed BCLB ✅",       mobileMoney: ["M-Pesa"],               url: "https://www.odibets.com" },
  betway:        { trustStars: 5, license: "Multi-jurisdiction ✅",  mobileMoney: ["M-Pesa", "OPay"],       url: "https://www.betway.com" },
  "1xbet":       { trustStars: 3, license: "Use with caution ⚠️",   mobileMoney: ["M-Pesa", "MTN MoMo"],   url: "https://www.1xbet.com" },
  melbet:        { trustStars: 3, license: "Use with caution ⚠️",   mobileMoney: ["MTN MoMo"],             url: "https://www.melbet.com" },
  "22bet":       { trustStars: 3, license: "Use with caution ⚠️",   mobileMoney: [],                       url: "https://www.22bet.com" },
  draftkings:    { trustStars: 5, license: "Licensed US ✅",         mobileMoney: [],                       url: "https://www.draftkings.com" },
  fanduel:       { trustStars: 5, license: "Licensed US ✅",         mobileMoney: [],                       url: "https://www.fanduel.com" },
  betmgm:        { trustStars: 5, license: "Licensed US ✅",         mobileMoney: [],                       url: "https://www.betmgm.com" },
  caesars:       { trustStars: 5, license: "Licensed US ✅",         mobileMoney: [],                       url: "https://www.caesarssportsbook.com" },
  espnbet:       { trustStars: 5, license: "Licensed US ✅",         mobileMoney: [],                       url: "https://www.espnbet.com" },
  bet365:        { trustStars: 5, license: "Licensed UK GC ✅",      mobileMoney: [],                       url: "https://www.bet365.com" },
  williamhill:   { trustStars: 5, license: "Licensed UK GC ✅",      mobileMoney: [],                       url: "https://www.williamhill.com" },
  betfair:       { trustStars: 5, license: "Licensed UK GC ✅",      mobileMoney: [],                       url: "https://www.betfair.com" },
  unibet:        { trustStars: 5, license: "Licensed Malta ✅",      mobileMoney: [],                       url: "https://www.unibet.com" },
  pinnacle:      { trustStars: 5, license: "Licensed Curacao ✅",    mobileMoney: [],                       url: "https://www.pinnacle.com" },
  paddypower:    { trustStars: 5, license: "Licensed UK GC ✅",      mobileMoney: [],                       url: "https://www.paddypower.com" },
};

const AFRICA_CURRENCIES = ["NGN", "KES", "GHS", "ZAR", "UGX", "USD"];
const GLOBAL_CURRENCIES  = ["USD", "GBP", "EUR", "NGN", "KES", "GHS", "ZAR"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function secondsUntil(iso: string) { return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)); }
function formatCountdown(s: number) {
  if (s <= 0) return "EXPIRED";
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}
function profitColor(pct: number) { return pct >= 3 ? "#00FF94" : pct >= 1.5 ? "#FFD700" : "#00E5FF"; }
function toLocal(usd: number, rate: number) { return parseFloat((usd * rate).toFixed(2)); }
function formatLocal(amount: number, sym: string) {
  if (amount >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${sym}${(amount / 1_000).toFixed(1)}K`;
  return `${sym}${amount.toFixed(2)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Countdown({ iso }: { iso: string }) {
  const [secs, setSecs] = useState(() => secondsUntil(iso));
  const colors = useColors();
  useEffect(() => { const id = setInterval(() => setSecs(secondsUntil(iso)), 1000); return () => clearInterval(id); }, [iso]);
  const urgent = secs < 300;
  return <Text style={[styles.countdown, { color: urgent ? "#FF4D4D" : colors.textMuted }]}>⏱ Window: {formatCountdown(secs)}</Text>;
}

function TrustBadge({ bookmakerId, region }: { bookmakerId: string; region: ArbRegion }) {
  const colors = useColors();
  const meta = BK_META[bookmakerId];
  if (!meta) return null;
  const stars = "⭐".repeat(meta.trustStars) + (meta.trustStars < 5 ? "☆".repeat(5 - meta.trustStars) : "");
  const isLow = meta.trustStars <= 3;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
      {isLow ? <ShieldAlert size={10} color="#FFA500" /> : <Shield size={10} color="#00FF94" />}
      <Text style={{ fontSize: 9, color: isLow ? "#FFA500" : colors.textMuted }}>{stars} {meta.license}</Text>
    </View>
  );
}

function MobileMoneyRow({ bookmakerId, region }: { bookmakerId: string; region: ArbRegion }) {
  if (region !== "africa") return null;
  const meta = BK_META[bookmakerId];
  if (!meta?.mobileMoney?.length) return null;
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
      {meta.mobileMoney.map((mm) => (
        <View key={mm} style={[styles.mmPill, { backgroundColor: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.2)" }]}>
          <Text style={{ fontSize: 9, color: colors.textSecondary }}>📱 {mm} ✓</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Stake Calculator Modal ───────────────────────────────────────────────────

function CalcModal({
  arb, visible, onClose, token, region,
}: {
  arb: ArbOpportunity | null;
  visible: boolean;
  onClose: () => void;
  token: string;
  region: ArbRegion;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const defaultCurrency = REGION_DEFAULT_CURRENCY[region];
  const [currency, setCurrency] = useState(defaultCurrency);
  const [budgetLocal, setBudgetLocal] = useState("50000");
  const [result, setResult] = useState<ArbCalcResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset currency when region changes
  useEffect(() => { setCurrency(REGION_DEFAULT_CURRENCY[region]); }, [region]);

  const currencyList = region === "africa" ? AFRICA_CURRENCIES : GLOBAL_CURRENCIES;
  const currInfo = CURRENCIES[currency] ?? CURRENCIES["USD"];

  async function calculate() {
    if (!arb) return;
    const localAmt = parseFloat(budgetLocal.replace(/,/g, ""));
    if (!localAmt || localAmt <= 0) return;
    const usdBudget = parseFloat((localAmt / currInfo.rate).toFixed(4));
    setIsLoading(true);
    try {
      const r = await api.arbitrage.calculate(token, arb.id, usdBudget, region);
      setResult(r);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Calculation failed");
    } finally {
      setIsLoading(false);
    }
  }

  if (!arb) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>ARB Calculator</Text>
            <Text style={[{ fontSize: 11, color: colors.textMuted, marginTop: 1 }]}>
              {arb.homeTeam} vs {arb.awayTeam} · +{arb.profitPercent}%
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.modalBody, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {/* Currency selector */}
          <View style={{ gap: 6 }}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Currency</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {currencyList.map((c) => {
                  const ci = CURRENCIES[c];
                  const active = c === currency;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.currencyPill, {
                        backgroundColor: active ? colors.cyan : colors.card,
                        borderColor: active ? colors.cyan : colors.border,
                      }]}
                      onPress={() => { setCurrency(c); setResult(null); }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 12, color: active ? colors.background : colors.text }}>{ci?.symbol}{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Budget input */}
          <View style={[styles.budgetRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Total Budget</Text>
            <View style={styles.budgetInputRow}>
              <Text style={[styles.budgetSymbol, { color: colors.cyan }]}>{currInfo.symbol}</Text>
              <TextInput
                style={[styles.budgetInput, { color: colors.text }]}
                value={budgetLocal}
                onChangeText={(v) => { setBudgetLocal(v); setResult(null); }}
                keyboardType="decimal-pad"
                placeholder={region === "africa" ? "50000" : "1000"}
                placeholderTextColor={colors.textMuted}
              />
            </View>
            {currency !== "USD" && parseFloat(budgetLocal) > 0 && (
              <Text style={{ fontSize: 10, color: colors.textMuted }}>
                ≈ ${(parseFloat(budgetLocal.replace(/,/g, "")) / currInfo.rate).toFixed(2)} USD
              </Text>
            )}
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
                const localStake = toLocal(stake.stake, currInfo.rate);
                const localReturns = toLocal(stake.returns, currInfo.rate);
                const meta = leg ? BK_META[leg.bookmakerId] : undefined;
                return (
                  <View key={i} style={[styles.stakeCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <View style={styles.stakeCardHeader}>
                      <Text style={[styles.stakeNum, { color: colors.cyan }]}>BET {i + 1}</Text>
                      <TouchableOpacity
                        style={styles.openBkBtn}
                        onPress={() => Linking.openURL(meta?.url ?? `https://google.com/search?q=${stake.bookmaker}`).catch(() => {})}
                        activeOpacity={0.8}
                      >
                        <ExternalLink size={11} color={colors.textMuted} />
                        <Text style={[styles.openBkText, { color: colors.textMuted }]}>{stake.bookmaker}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.stakeSelection, { color: colors.text }]}>{stake.selection}</Text>
                    {meta && <TrustBadge bookmakerId={leg?.bookmakerId ?? ""} region={region} />}
                    {leg && <MobileMoneyRow bookmakerId={leg.bookmakerId} region={region} />}
                    <View style={styles.stakeDetailRow}>
                      <View style={styles.stakeDetailItem}>
                        <Text style={[styles.stakeDetailLabel, { color: colors.textMuted }]}>Odds</Text>
                        <Text style={[styles.stakeDetailVal, { color: colors.text }]}>{leg?.odds ?? "—"}</Text>
                      </View>
                      <View style={styles.stakeDetailItem}>
                        <Text style={[styles.stakeDetailLabel, { color: colors.textMuted }]}>Stake</Text>
                        <Text style={[styles.stakeDetailVal, { color: colors.cyan }]}>{formatLocal(localStake, currInfo.symbol)}</Text>
                      </View>
                      <View style={styles.stakeDetailItem}>
                        <Text style={[styles.stakeDetailLabel, { color: colors.textMuted }]}>Returns</Text>
                        <Text style={[styles.stakeDetailVal, { color: "#00FF94" }]}>{formatLocal(localReturns, currInfo.symbol)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Profit summary */}
              <View style={[styles.profitCard, { backgroundColor: "rgba(0,255,148,0.08)", borderColor: "rgba(0,255,148,0.3)" }]}>
                {[
                  ["Guaranteed Return", formatLocal(toLocal(result.guaranteedReturn, currInfo.rate), currInfo.symbol)],
                  ["Guaranteed Profit", `+${formatLocal(toLocal(result.guaranteedProfit, currInfo.rate), currInfo.symbol)}`],
                  ["Profit %", `+${result.profitPercent}%`],
                  ["ROI", "Instant (risk-free)"],
                ].map(([label, val]) => (
                  <View key={label} style={styles.profitRow}>
                    <Text style={[styles.profitLabel, { color: colors.textSecondary }]}>{label}</Text>
                    <Text style={[styles.profitVal, { color: label === "ROI" ? colors.textSecondary : "#00FF94", fontSize: label === "Guaranteed Profit" ? 22 : 16 }]}>{val}</Text>
                  </View>
                ))}
              </View>

              {/* Open bookmaker buttons */}
              <View style={styles.openBooksRow}>
                {arb.legs.map((leg, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.openBkFullBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    onPress={() => Linking.openURL(BK_META[leg.bookmakerId]?.url ?? `https://google.com/search?q=${leg.bookmaker}`).catch(() => {})}
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

function ArbCard({ arb, region, onCalculate }: { arb: ArbOpportunity; region: ArbRegion; onCalculate: (a: ArbOpportunity) => void }) {
  const colors = useColors();
  const pColor = profitColor(arb.profitPercent);
  const currSymbol = CURRENCIES[REGION_DEFAULT_CURRENCY[region]]?.symbol ?? "$";
  const currRate   = CURRENCIES[REGION_DEFAULT_CURRENCY[region]]?.rate ?? 1;

  return (
    <View style={[styles.arbCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderLeftColor: pColor, borderLeftWidth: 3 }]}>
      {/* Header row */}
      <View style={styles.arbCardHeader}>
        <View style={styles.arbCardHeaderLeft}>
          <View style={[styles.arbTypePill, { backgroundColor: arb.marketType === "3way" ? "rgba(255,215,0,0.12)" : "rgba(0,229,255,0.1)", borderColor: arb.marketType === "3way" ? "#FFD700" : colors.cyan }]}>
            <Text style={[styles.arbTypePillText, { color: arb.marketType === "3way" ? "#FFD700" : colors.cyan }]}>{arb.marketType === "3way" ? "3-WAY ⚡" : "2-WAY 🔄"}</Text>
          </View>
          <Text style={[styles.arbLeague, { color: colors.textMuted }]}>{arb.league}</Text>
        </View>
        <View style={[styles.profitBadge, { backgroundColor: `${pColor}18`, borderColor: `${pColor}55` }]}>
          <TrendingUp size={11} color={pColor} />
          <Text style={[styles.profitBadgeText, { color: pColor }]}>+{arb.profitPercent}%</Text>
        </View>
      </View>

      {/* Matchup */}
      <Text style={[styles.arbMatchup, { color: colors.text }]}>{arb.homeTeam} <Text style={{ color: colors.textMuted }}>vs</Text> {arb.awayTeam}</Text>
      <Countdown iso={arb.commenceTime} />

      {/* Legs table */}
      <View style={[styles.legsTable, { borderColor: colors.border }]}>
        <View style={[styles.legsHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.legHeaderText, { color: colors.textMuted, flex: 2 }]}>Bookmaker</Text>
          <Text style={[styles.legHeaderText, { color: colors.textMuted, flex: 2 }]}>Selection</Text>
          <Text style={[styles.legHeaderText, { color: colors.textMuted, flex: 1, textAlign: "right" }]}>Odds</Text>
        </View>
        {arb.legs.map((leg, i) => (
          <View key={i} style={[styles.legRowContainer, i < arb.legs.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
            <View style={styles.legRow}>
              <Text style={[styles.legCell, { color: colors.textSecondary, flex: 2 }]} numberOfLines={1}>{leg.bookmaker}</Text>
              <Text style={[styles.legCell, { color: colors.text, flex: 2 }]} numberOfLines={1}>{leg.selection}</Text>
              <Text style={[styles.legCell, { color: pColor, flex: 1, textAlign: "right" }]}>{leg.odds}</Text>
            </View>
            <View style={{ paddingHorizontal: 10, paddingBottom: 6 }}>
              <TrustBadge bookmakerId={leg.bookmakerId} region={region} />
              <MobileMoneyRow bookmakerId={leg.bookmakerId} region={region} />
            </View>
          </View>
        ))}
      </View>

      {/* Profit hint */}
      <Text style={[styles.profitHint, { color: colors.textMuted }]}>
        On {formatLocal(1000 * currRate, currSymbol)} stake: +{formatLocal(arb.profitPercent / 100 * 1000 * currRate, currSymbol)} guaranteed
      </Text>

      {/* CTA */}
      <TouchableOpacity style={[styles.calcArbBtn, { backgroundColor: "rgba(0,229,255,0.1)", borderColor: colors.cyan }]} onPress={() => onCalculate(arb)} activeOpacity={0.8}>
        <Calculator size={14} color={colors.cyan} />
        <Text style={[styles.calcArbBtnText, { color: colors.cyan }]}>Calculate Stakes</Text>
        <ChevronRight size={14} color={colors.cyan} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ArbitrageScreen() {
  const colors    = useColors();
  const insets    = useSafeAreaInsets();
  const router    = useRouter();
  const { token, user } = useAuth();

  const [selectedRegion, setSelectedRegion] = useState<ArbRegion>("global");
  const [data, setData]           = useState<ArbScanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError]         = useState("");
  const [selectedArb, setSelectedArb] = useState<ArbOpportunity | null>(null);
  const [calcVisible, setCalcVisible] = useState(false);

  const scanAnim = useRef(new Animated.Value(0)).current;

  const tier    = (user?.tier ?? "free") as "free" | "pro" | "elite";
  const isElite = tier === "elite";
  const isPro   = tier === "pro" || isElite;

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  useEffect(() => {
    if (!isElite) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
    ).start();
  }, [isElite, scanAnim]);

  const load = useCallback(async (force = false) => {
    if (!token) return;
    if (force) setIsRefreshing(true); else setIsLoading(true);
    setError("");
    try {
      const result = force && isElite
        ? await api.arbitrage.scan(token, selectedRegion)
        : await api.arbitrage.list(token, selectedRegion);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to scan");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, isElite, selectedRegion]);

  // Reload when region changes
  useEffect(() => { setData(null); load(); }, [selectedRegion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Elite: auto-refresh every 30s
  useEffect(() => {
    if (!isElite) return;
    const id = setInterval(() => load(true), 30_000);
    return () => clearInterval(id);
  }, [isElite, load]);

  const opps = data?.opportunities ?? [];
  const disclaimer = data?.disclaimer ?? (selectedRegion === "africa"
    ? "Verify your local bookmaker holds a valid gaming license. 1xBet and Melbet operate with limited regulation — use with caution. 18+ only."
    : "Sports betting laws vary by jurisdiction. Gamble responsibly. 18+ only.");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>🔄 ARB Scanner</Text>
          {isElite
            ? <Animated.Text style={[styles.headerSub, { color: "#00FF94", opacity: scanAnim }]}>⚡ LIVE — scanning 40+ bookmakers</Animated.Text>
            : <Text style={[styles.headerSub, { color: colors.textSecondary }]}>{isPro ? "Top 3 opportunities · Manual refresh" : "Upgrade to view opportunities"}</Text>}
        </View>
        {isPro && (
          <TouchableOpacity style={[styles.refreshBtn, { borderColor: colors.border }]} onPress={() => load(true)} disabled={isRefreshing} activeOpacity={0.7}>
            <RefreshCw size={16} color={isRefreshing ? colors.textMuted : colors.cyan} />
          </TouchableOpacity>
        )}
      </View>

      {/* Region tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.regionScroll, { borderBottomColor: colors.border }]} contentContainerStyle={styles.regionContent}>
        {REGIONS.map((r) => {
          const active = selectedRegion === r.id;
          const isAfrica = r.id === "africa";
          return (
            <TouchableOpacity
              key={r.id}
              style={[styles.regionPill, {
                backgroundColor: active ? (isAfrica ? "#FFD700" : colors.cyan) : colors.card,
                borderColor: active ? (isAfrica ? "#FFD700" : colors.cyan) : colors.border,
              }]}
              onPress={() => setSelectedRegion(r.id)}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 12 }}>{r.flag}</Text>
              <Text style={[styles.regionPillText, { color: active ? colors.background : colors.text }]}>{r.label}</Text>
              {isAfrica && !active && (
                <View style={[styles.newBadge, { backgroundColor: "#FFD700" }]}>
                  <Text style={{ fontSize: 8, color: "#000" }}>NEW</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Stats bar */}
      {data && (
        <View style={[styles.statsBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: opps.length > 0 ? "#00FF94" : colors.textMuted }]}>{opps.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Live Arbs</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.text }]}>{data.totalFound}</Text>
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
            <Text style={[styles.statVal, { color: colors.textMuted, fontSize: 10 }]}>
              {data.lastScanned ? new Date(data.lastScanned).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Last Scan</Text>
          </View>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => load(true)} tintColor={colors.cyan} />}
      >
        {/* Loading */}
        {isLoading && !data && (
          <View style={styles.centered}>
            <Text style={{ fontSize: 32 }}>{selectedRegion === "africa" ? "🌍" : "🔍"}</Text>
            <Text style={[styles.loadingTitle, { color: colors.text }]}>Scanning {selectedRegion === "africa" ? "African" : ""} bookmakers…</Text>
            <Text style={[styles.loadingSub, { color: colors.textSecondary }]}>Comparing odds across 40+ bookmakers for guaranteed profit margins</Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={[styles.errorCard, { backgroundColor: "rgba(255,77,77,0.08)", borderColor: "rgba(255,77,77,0.25)" }]}>
            <AlertTriangle size={16} color={colors.red} />
            <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
          </View>
        )}

        {/* Africa info banner */}
        {selectedRegion === "africa" && !isLoading && (
          <View style={[styles.infoBanner, { backgroundColor: "rgba(255,215,0,0.07)", borderColor: "rgba(255,215,0,0.3)" }]}>
            <Text style={{ fontSize: 16 }}>🌍</Text>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.infoBannerTitle, { color: "#FFD700" }]}>African Markets — Bigger Arb Windows</Text>
              <Text style={[styles.infoBannerSub, { color: colors.textSecondary }]}>
                African bookmakers often have larger odds differences than global markets — leading to better profit margins. Local bookmakers (Bet9ja, SportyBet, BetKing) are sourced directly.
              </Text>
            </View>
          </View>
        )}

        {/* Free tier gate */}
        {!isPro && !isLoading && (
          <View style={[styles.gateCard, { backgroundColor: colors.card, borderColor: "#00E5FF" }]}>
            <Zap size={28} color="#00E5FF" />
            <Text style={[styles.gateTitle, { color: colors.text }]}>Arbitrage Alerts</Text>
            <Text style={[styles.gateSub, { color: colors.textSecondary }]}>
              Pro tier: Top 3 arb alerts per day with stake calculator.{"\n"}Elite tier: Real-time scanner, unlimited arbs, auto-calculator & alerts.
            </Text>
            {opps.length > 0 || (data?.totalFound ?? 0) > 0 ? (
              <View style={[styles.teaserCard, { backgroundColor: "rgba(0,229,255,0.06)", borderColor: "rgba(0,229,255,0.2)" }]}>
                <Text style={[styles.teaserText, { color: colors.textSecondary }]}>
                  🔄 {data?.totalFound ?? "Multiple"} {selectedRegion === "africa" ? "African " : ""}arb {(data?.totalFound ?? 0) === 1 ? "opportunity" : "opportunities"} found now — upgrade to view
                </Text>
              </View>
            ) : null}
            <TouchableOpacity style={[styles.upgradeBtn, { backgroundColor: "#00E5FF" }]} onPress={() => router.push("/settings")} activeOpacity={0.85}>
              <Text style={[styles.upgradeBtnText, { color: colors.background }]}>🔒 Upgrade to Pro — $14.99/mo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.upgradeBtn, { backgroundColor: "rgba(255,215,0,0.12)", borderWidth: 1, borderColor: "#FFD700" }]} onPress={() => router.push("/settings")} activeOpacity={0.85}>
              <Crown size={14} color="#FFD700" />
              <Text style={[styles.upgradeBtnText, { color: "#FFD700" }]}>Upgrade to Elite — $39.99/mo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pro / Elite content */}
        {isPro && !isLoading && (
          <>
            {isElite ? (
              <View style={[styles.eliteBanner, { backgroundColor: "rgba(0,255,148,0.08)", borderColor: "rgba(0,255,148,0.3)" }]}>
                <View style={[styles.liveDot, { backgroundColor: "#00FF94" }]} />
                <Text style={[styles.eliteBannerText, { color: "#00FF94" }]}>
                  LIVE — Auto-refresh every 30s · {opps.length} active {opps.length === 1 ? "opportunity" : "opportunities"}
                </Text>
              </View>
            ) : (
              <View style={[styles.proInfoBanner, { backgroundColor: "rgba(0,229,255,0.06)", borderColor: "rgba(0,229,255,0.2)" }]}>
                <Zap size={14} color="#00E5FF" />
                <Text style={[styles.proInfoText, { color: colors.textSecondary }]}>Pro: Top 3 arbs (2-way only) · Tap refresh to update</Text>
                <TouchableOpacity onPress={() => router.push("/settings")} activeOpacity={0.8}>
                  <Text style={{ color: "#FFD700", fontSize: 11 }}>👑 Go Elite</Text>
                </TouchableOpacity>
              </View>
            )}

            {opps.length === 0 && !isLoading && (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40 }}>{selectedRegion === "africa" ? "🌍" : "📊"}</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No arbs right now</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  Bookmakers have closed the gaps. Refresh to keep scanning — arbitrage windows typically last 2–15 minutes.
                </Text>
                <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => load(true)} activeOpacity={0.8}>
                  <RefreshCw size={14} color={colors.cyan} />
                  <Text style={[styles.retryText, { color: colors.cyan }]}>Scan Now</Text>
                </TouchableOpacity>
              </View>
            )}

            {opps.map((arb) => (
              <ArbCard key={arb.id} arb={arb} region={selectedRegion} onCalculate={(a) => { setSelectedArb(a); setCalcVisible(true); }} />
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

        {/* Africa-specific country disclaimers */}
        {selectedRegion === "africa" && (
          <View style={{ gap: 8 }}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 4 }]}>COUNTRY REGULATIONS</Text>
            {[
              { flag: "🇳🇬", label: "Nigeria", text: "Regulated by the NLRC. Only use NLRC-licensed operators." },
              { flag: "🇰🇪", label: "Kenya",   text: "Regulated by BCLB. 20% excise duty applies to winnings." },
              { flag: "🇿🇦", label: "South Africa", text: "Regulated by the National Gambling Board." },
              { flag: "🇬🇭", label: "Ghana",   text: "Regulated by the Gaming Commission of Ghana." },
            ].map(({ flag, label, text }) => (
              <View key={label} style={[styles.countryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 16 }}>{flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.countryLabel, { color: colors.text }]}>{label}</Text>
                  <Text style={[styles.countryText, { color: colors.textSecondary }]}>{text}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Disclaimer */}
        <View style={[styles.disclaimerCard, { backgroundColor: "rgba(255,165,0,0.06)", borderColor: "rgba(255,165,0,0.2)" }]}>
          <AlertTriangle size={14} color="#FFA500" />
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>{disclaimer}</Text>
        </View>

        <DisclaimerFooter />
      </ScrollView>

      {/* Calculator Modal */}
      {token && (
        <CalcModal
          arb={selectedArb}
          visible={calcVisible}
          onClose={() => setCalcVisible(false)}
          token={token}
          region={selectedRegion}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 20, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, marginTop: 1 },
  refreshBtn: { padding: 8, borderRadius: 10, borderWidth: 1 },

  // Region tabs
  regionScroll: { borderBottomWidth: 1, maxHeight: 52 },
  regionContent: { paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", gap: 8, alignItems: "center" },
  regionPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  regionPillText: { fontSize: 12 },
  newBadge: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, marginLeft: 2 },

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

  // Info banner
  infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoBannerTitle: { fontSize: 14 },
  infoBannerSub: { fontSize: 11, lineHeight: 16 },

  // Error
  errorCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 13 },

  // Gate
  gateCard: { padding: 20, borderRadius: 18, borderWidth: 2, alignItems: "center", gap: 12 },
  gateTitle: { fontSize: 20, letterSpacing: -0.3 },
  gateSub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  teaserCard: { width: "100%", padding: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  teaserText: { fontSize: 13, textAlign: "center" },
  upgradeBtn: { flexDirection: "row", alignItems: "center", gap: 6, width: "100%", justifyContent: "center", padding: 14, borderRadius: 14 },
  upgradeBtnText: { fontSize: 14 },

  // Banners
  proInfoBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  proInfoText: { flex: 1, fontSize: 11 },
  eliteBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  eliteBannerText: { flex: 1, fontSize: 12 },

  // Empty
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
  legRowContainer: {},
  legRow: { flexDirection: "row", paddingHorizontal: 10, paddingTop: 10, paddingBottom: 4 },
  legCell: { fontSize: 12 },
  mmPill: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  profitHint: { fontSize: 11 },
  calcArbBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  calcArbBtnText: { fontSize: 13 },

  // Elite upgrade nudge
  eliteUpgradeCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  eliteUpgradeTitle: { fontSize: 14 },
  eliteUpgradeSub: { fontSize: 11, lineHeight: 16 },

  // Country cards
  countryCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  countryLabel: { fontSize: 13 },
  countryText: { fontSize: 11, lineHeight: 15, marginTop: 1 },
  sectionLabel: { fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" },

  // Disclaimer
  disclaimerCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  disclaimerText: { flex: 1, fontSize: 11, lineHeight: 16 },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, paddingTop: 24, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18 },
  modalBody: { padding: 20, gap: 14 },
  currencyPill: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  budgetRow: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  budgetInputRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  budgetSymbol: { fontSize: 22 },
  budgetInput: { flex: 1, fontSize: 28, letterSpacing: -0.5 },
  calcBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 14 },
  calcBtnText: { fontSize: 15 },
  stakesDivider: { borderTopWidth: 1 },
  stakeCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  stakeCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stakeNum: { fontSize: 11, letterSpacing: 0.5 },
  openBkBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  openBkText: { fontSize: 11 },
  stakeSelection: { fontSize: 15 },
  stakeDetailRow: { flexDirection: "row", gap: 8, marginTop: 4 },
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
