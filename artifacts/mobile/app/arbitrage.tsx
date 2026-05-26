import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  ChevronRight,
  ExternalLink,
  Filter,
  RefreshCw,
  Shield,
  ShieldAlert,
  TrendingUp,
  X,
  Zap,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import {
  type AffiliateRegion,
  filterByRegion,
  REGION_DISPLAY_OPTIONS,
  REGION_LABELS,
} from "@/hooks/useUserRegion";
import { useRegion } from "@/context/RegionContext";
import {
  api,
  type AffiliatePartner,
  type ArbCalcResult,
  type ArbOpportunity,
  type ArbRegion,
  type ArbScanResponse,
  type EVBet,
  type EVScanResponse,
  type MiddleOpportunity,
  type MiddlesScanResponse,
} from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

type ScannerTab = "arbs" | "ev" | "middles" | "live";

const SCANNER_TABS: { id: ScannerTab; label: string; emoji: string }[] = [
  { id: "arbs",    label: "ARBs",    emoji: "🔄" },
  { id: "ev",      label: "+EV",     emoji: "📈" },
  { id: "middles", label: "Middles", emoji: "🎯" },
  { id: "live",    label: "Live",    emoji: "⚡" },
];

const SPORT_FILTERS = ["All", "Soccer", "NFL", "NBA", "MLB", "NHL"];

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

function getRate(code: string, liveRates: Record<string, number>): number {
  return liveRates[code] ?? CURRENCIES[code]?.rate ?? 1;
}

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
  pointsbet:     { trustStars: 4, license: "Licensed US ✅",         mobileMoney: [],                       url: "https://www.pointsbet.com" },
  betrivers:     { trustStars: 4, license: "Licensed US ✅",         mobileMoney: [],                       url: "https://www.betrivers.com" },
  bet365:        { trustStars: 5, license: "Licensed UK GC ✅",      mobileMoney: [],                       url: "https://www.bet365.com" },
  williamhill:   { trustStars: 5, license: "Licensed UK GC ✅",      mobileMoney: [],                       url: "https://www.williamhill.com" },
  betfair:       { trustStars: 5, license: "Licensed UK GC ✅",      mobileMoney: [],                       url: "https://www.betfair.com" },
  unibet:        { trustStars: 5, license: "Licensed Malta ✅",      mobileMoney: [],                       url: "https://www.unibet.com" },
  pinnacle:      { trustStars: 5, license: "Licensed Curacao ✅",    mobileMoney: [],                       url: "https://www.pinnacle.com" },
  paddypower:    { trustStars: 5, license: "Licensed UK GC ✅",      mobileMoney: [],                       url: "https://www.paddypower.com" },
  bwin:          { trustStars: 4, license: "Licensed Malta ✅",      mobileMoney: [],                       url: "https://www.bwin.com" },
  skybet:        { trustStars: 5, license: "Licensed UK GC ✅",      mobileMoney: [],                       url: "https://www.skybet.com" },
  "888sport":    { trustStars: 4, license: "Licensed UK GC ✅",      mobileMoney: [],                       url: "https://www.888sport.com" },
};

const AFRICA_CURRENCIES = ["NGN", "KES", "GHS", "ZAR", "UGX", "USD"];
const GLOBAL_CURRENCIES  = ["USD", "GBP", "EUR", "NGN", "KES", "GHS", "ZAR"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function secondsUntil(iso: string) { return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)); }
function formatCountdown(s: number) {
  if (s <= 0) return "EXPIRED";
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}
function profitColor(pct: number) { return pct >= 3 ? "#00FF94" : pct >= 1.5 ? "#FFD700" : "#00E5FF"; }
function evColor(pct: number) { return pct >= 4 ? "#00FF94" : pct >= 2.5 ? "#FFD700" : "#00E5FF"; }
function toLocal(usd: number, rate: number) { return parseFloat((usd * rate).toFixed(2)); }
function formatLocal(amount: number, sym: string) {
  if (amount >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${sym}${(amount / 1_000).toFixed(1)}K`;
  return `${sym}${amount.toFixed(2)}`;
}
function openUrl(url: string) {
  Linking.openURL(url).catch(() => {});
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Countdown({ iso, compact }: { iso: string; compact?: boolean }) {
  const [secs, setSecs] = useState(() => secondsUntil(iso));
  const colors = useColors();
  useEffect(() => { const id = setInterval(() => setSecs(secondsUntil(iso)), 1000); return () => clearInterval(id); }, [iso]);
  const urgent = secs < 300 && secs > 0;
  return (
    <Text style={[styles.countdown, { color: urgent ? "#FF4D4D" : secs === 0 ? colors.textMuted : colors.textMuted }]}>
      {compact ? "" : "⏱ Window: "}{formatCountdown(secs)}
    </Text>
  );
}

// ─── Affiliate Banner ─────────────────────────────────────────────────────────

function AffiliateBanner({ bookmakers, affiliatePartners, token }: { bookmakers: string[]; affiliatePartners: AffiliatePartner[]; token?: string }) {
  const colors = useColors();
  const match = affiliatePartners.find((p) =>
    bookmakers.some((bk) =>
      bk.toLowerCase().includes(p.bookName.toLowerCase()) ||
      p.bookName.toLowerCase().includes(bk.toLowerCase())
    )
  );
  if (!match) return null;

  function trackAndOpen() {
    if (token) {
      api.affiliate.click(token, {
        partnerId: match!.id,
        bookName: match!.bookName,
        affiliateUrl: match!.affiliateUrl,
        source: "arb_card",
      }).catch(() => {});
    }
    Linking.openURL(match!.affiliateUrl).catch(() => {});
  }

  return (
    <TouchableOpacity
      style={[styles.affiliateBanner, { backgroundColor: "rgba(0,255,148,0.06)", borderColor: "rgba(0,255,148,0.25)" }]}
      onPress={trackAndOpen}
      activeOpacity={0.8}
    >
      <Text style={{ fontSize: 14 }}>🎁</Text>
      <Text style={[styles.affiliateBannerText, { color: "#00FF94" }]} numberOfLines={1}>
        New to {match.bookName}? {match.bonusText ?? "Get a welcome bonus"} →
      </Text>
    </TouchableOpacity>
  );
}

function TrustBadge({ bookmakerId }: { bookmakerId: string }) {
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

// ─── EV Bet Card ──────────────────────────────────────────────────────────────

function EVCard({ bet, region }: { bet: EVBet; region: ArbRegion }) {
  const colors = useColors();
  const ec = evColor(bet.evPercent);
  const meta = BK_META[bet.bookmakerId];
  return (
    <View style={[styles.arbCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderLeftColor: ec, borderLeftWidth: 3 }]}>
      <View style={styles.arbCardHeader}>
        <View style={styles.arbCardHeaderLeft}>
          <View style={[styles.arbTypePill, { backgroundColor: "rgba(0,255,148,0.1)", borderColor: "#00FF94" }]}>
            <Text style={[styles.arbTypePillText, { color: "#00FF94" }]}>+EV BET 📈</Text>
          </View>
          <Text style={[styles.arbLeague, { color: colors.textMuted }]}>{bet.league}</Text>
        </View>
        <View style={[styles.profitBadge, { backgroundColor: `${ec}18`, borderColor: `${ec}55` }]}>
          <TrendingUp size={11} color={ec} />
          <Text style={[styles.profitBadgeText, { color: ec }]}>+{bet.evPercent}% EV</Text>
        </View>
      </View>

      <Text style={[styles.arbMatchup, { color: colors.text }]}>
        {bet.homeTeam} <Text style={{ color: colors.textMuted }}>vs</Text> {bet.awayTeam}
      </Text>
      <Countdown iso={bet.commenceTime} />

      <View style={[styles.evRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.evCol}>
          <Text style={[styles.evLabel, { color: colors.textMuted }]}>Bookmaker</Text>
          <TouchableOpacity onPress={() => openUrl(meta?.url ?? `https://google.com/search?q=${bet.bookmaker}`)}>
            <Text style={[styles.evVal, { color: colors.cyan }]}>{bet.bookmaker} ↗</Text>
          </TouchableOpacity>
          <TrustBadge bookmakerId={bet.bookmakerId} />
          <MobileMoneyRow bookmakerId={bet.bookmakerId} region={region} />
        </View>
        <View style={styles.evCol}>
          <Text style={[styles.evLabel, { color: colors.textMuted }]}>Selection</Text>
          <Text style={[styles.evVal, { color: colors.text }]}>{bet.selection}</Text>
        </View>
        <View style={styles.evCol}>
          <Text style={[styles.evLabel, { color: colors.textMuted }]}>Odds</Text>
          <Text style={[styles.evVal, { color: ec }]}>{bet.odds}</Text>
          <Text style={{ fontSize: 9, color: colors.textMuted }}>Sharp: {bet.sharpOdds}</Text>
        </View>
      </View>

      <View style={[styles.evSummaryRow, { backgroundColor: "rgba(0,255,148,0.06)", borderColor: "rgba(0,255,148,0.2)" }]}>
        <View style={styles.evSummaryItem}>
          <Text style={[styles.evLabel, { color: colors.textMuted }]}>Edge vs Sharp</Text>
          <Text style={[styles.evSummaryVal, { color: "#00FF94" }]}>+{(bet.impliedEdge * 100).toFixed(1)}%</Text>
        </View>
        <View style={[styles.evSummaryDivider, { backgroundColor: "rgba(0,255,148,0.2)" }]} />
        <View style={styles.evSummaryItem}>
          <Text style={[styles.evLabel, { color: colors.textMuted }]}>EV on $100</Text>
          <Text style={[styles.evSummaryVal, { color: "#00FF94" }]}>+${(bet.evPercent).toFixed(2)}</Text>
        </View>
        <View style={[styles.evSummaryDivider, { backgroundColor: "rgba(0,255,148,0.2)" }]} />
        <View style={styles.evSummaryItem}>
          <Text style={[styles.evLabel, { color: colors.textMuted }]}>Model</Text>
          <Text style={[styles.evSummaryVal, { color: colors.textSecondary }]}>Sharp Line</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.calcArbBtn, { backgroundColor: "rgba(0,255,148,0.1)", borderColor: "#00FF94" }]}
        onPress={() => openUrl(meta?.url ?? `https://google.com/search?q=${bet.bookmaker}+sports+betting`)}
        activeOpacity={0.8}
      >
        <ExternalLink size={14} color="#00FF94" />
        <Text style={[styles.calcArbBtnText, { color: "#00FF94" }]}>Open {bet.bookmaker}</Text>
        <ChevronRight size={14} color="#00FF94" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Middle Card ──────────────────────────────────────────────────────────────

function MiddleCard({ middle, region }: { middle: MiddleOpportunity; region: ArbRegion }) {
  const colors = useColors();
  const hitColor = middle.hitProbability >= 25 ? "#00FF94" : middle.hitProbability >= 15 ? "#FFD700" : "#00E5FF";
  const meta1 = BK_META[middle.book1.bookmakerId];
  const meta2 = BK_META[middle.book2.bookmakerId];
  return (
    <View style={[styles.arbCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderLeftColor: hitColor, borderLeftWidth: 3 }]}>
      <View style={styles.arbCardHeader}>
        <View style={styles.arbCardHeaderLeft}>
          <View style={[styles.arbTypePill, { backgroundColor: "rgba(255,215,0,0.1)", borderColor: "#FFD700" }]}>
            <Text style={[styles.arbTypePillText, { color: "#FFD700" }]}>MIDDLE 🎯</Text>
          </View>
          <Text style={[styles.arbLeague, { color: colors.textMuted }]}>{middle.league}</Text>
        </View>
        <View style={[styles.profitBadge, { backgroundColor: `${hitColor}18`, borderColor: `${hitColor}55` }]}>
          <Text style={[styles.profitBadgeText, { color: hitColor }]}>{middle.hitProbability}% hit</Text>
        </View>
      </View>

      <Text style={[styles.arbMatchup, { color: colors.text }]}>
        {middle.homeTeam} <Text style={{ color: colors.textMuted }}>vs</Text> {middle.awayTeam}
      </Text>
      <Countdown iso={middle.commenceTime} />

      <View style={[styles.middleBooksRow, { borderColor: colors.border }]}>
        {[{ book: middle.book1, meta: meta1 }, { book: middle.book2, meta: meta2 }].map(({ book, meta }, i) => (
          <View key={i} style={[styles.middleBookCol, i === 0 && { borderRightColor: colors.border, borderRightWidth: 1 }]}>
            <Text style={[styles.evLabel, { color: colors.textMuted }]}>BET {i + 1}</Text>
            <TouchableOpacity onPress={() => openUrl(meta?.url ?? `https://google.com/search?q=${book.bookmaker}`)}>
              <Text style={[{ fontSize: 12, color: colors.cyan, marginBottom: 2 }]}>{book.bookmaker} ↗</Text>
            </TouchableOpacity>
            <Text style={[{ fontSize: 13, color: colors.text }]}>{book.selection}</Text>
            <Text style={[{ fontSize: 12, color: "#FFD700", marginTop: 2 }]}>{book.odds}</Text>
            <TrustBadge bookmakerId={book.bookmakerId} />
          </View>
        ))}
      </View>

      <View style={[styles.evSummaryRow, { backgroundColor: "rgba(255,215,0,0.06)", borderColor: "rgba(255,215,0,0.2)" }]}>
        <View style={styles.evSummaryItem}>
          <Text style={[styles.evLabel, { color: colors.textMuted }]}>Window</Text>
          <Text style={[styles.evSummaryVal, { color: "#FFD700" }]}>{middle.window} pts</Text>
        </View>
        <View style={[styles.evSummaryDivider, { backgroundColor: "rgba(255,215,0,0.2)" }]} />
        <View style={styles.evSummaryItem}>
          <Text style={[styles.evLabel, { color: colors.textMuted }]}>Hit Prob</Text>
          <Text style={[styles.evSummaryVal, { color: hitColor }]}>{middle.hitProbability}%</Text>
        </View>
        <View style={[styles.evSummaryDivider, { backgroundColor: "rgba(255,215,0,0.2)" }]} />
        <View style={styles.evSummaryItem}>
          <Text style={[styles.evLabel, { color: colors.textMuted }]}>Worst Case</Text>
          <Text style={[styles.evSummaryVal, { color: colors.textSecondary }]}>{middle.worstCase}%</Text>
        </View>
      </View>

      <View style={styles.openBooksRow}>
        {[{ book: middle.book1, meta: meta1 }, { book: middle.book2, meta: meta2 }].map(({ book, meta }, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.openBkFullBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => openUrl(meta?.url ?? `https://google.com/search?q=${book.bookmaker}`)}
            activeOpacity={0.8}
          >
            <ExternalLink size={13} color={colors.cyan} />
            <Text style={[styles.openBkFullText, { color: colors.cyan }]}>Open {book.bookmaker}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Stake Calculator Modal ───────────────────────────────────────────────────

function CalcModal({
  arb, visible, onClose, token, region, liveRates,
}: {
  arb: ArbOpportunity | null;
  visible: boolean;
  onClose: () => void;
  token: string;
  region: ArbRegion;
  liveRates: Record<string, number>;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const defaultCurrency = REGION_DEFAULT_CURRENCY[region];
  const [currency, setCurrency] = useState(defaultCurrency);
  const [budgetLocal, setBudgetLocal] = useState("50000");
  const [result, setResult] = useState<ArbCalcResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { setCurrency(REGION_DEFAULT_CURRENCY[region]); }, [region]);

  const currencyList = region === "africa" ? AFRICA_CURRENCIES : GLOBAL_CURRENCIES;
  const currInfo = CURRENCIES[currency] ?? CURRENCIES["USD"]!;
  const currLiveRate = getRate(currency, liveRates);

  async function calculate() {
    if (!arb) return;
    const localAmt = parseFloat(budgetLocal.replace(/,/g, ""));
    if (!localAmt || localAmt <= 0) return;
    const usdBudget = parseFloat((localAmt / currLiveRate).toFixed(4));
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
                ≈ ${(parseFloat(budgetLocal.replace(/,/g, "")) / currLiveRate).toFixed(2)} USD
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
                        onPress={() => openUrl(meta?.url ?? `https://google.com/search?q=${stake.bookmaker}`)}
                        activeOpacity={0.8}
                      >
                        <ExternalLink size={11} color={colors.textMuted} />
                        <Text style={[styles.openBkText, { color: colors.textMuted }]}>{stake.bookmaker}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.stakeSelection, { color: colors.text }]}>{stake.selection}</Text>
                    {meta && <TrustBadge bookmakerId={leg?.bookmakerId ?? ""} />}
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

              <View style={styles.openBooksRow}>
                {arb.legs.map((leg, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.openBkFullBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    onPress={() => openUrl(BK_META[leg.bookmakerId]?.url ?? `https://google.com/search?q=${leg.bookmaker}`)}
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

// ─── Filter Modal ──────────────────────────────────────────────────────────────

function FilterModal({
  visible, onClose, minProfit, setMinProfit, sportFilter, setSportFilter,
}: {
  visible: boolean;
  onClose: () => void;
  minProfit: number;
  setMinProfit: (v: number) => void;
  sportFilter: string;
  setSportFilter: (v: string) => void;
}) {
  const colors = useColors();
  const PROFIT_OPTIONS = [0, 1, 1.5, 2, 3, 5];
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ color: colors.cyan, fontSize: 14 }}>Done</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={[styles.modalBody, { gap: 24 }]} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 10 }}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Min Profit %</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {PROFIT_OPTIONS.map((v) => {
                const active = minProfit === v;
                return (
                  <TouchableOpacity
                    key={v}
                    style={[styles.filterPill, {
                      backgroundColor: active ? colors.cyan : colors.card,
                      borderColor: active ? colors.cyan : colors.border,
                    }]}
                    onPress={() => setMinProfit(v)}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 13, color: active ? colors.background : colors.text }}>
                      {v === 0 ? "Any" : `≥${v}%`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Sport</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SPORT_FILTERS.map((s) => {
                const active = sportFilter === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.filterPill, {
                      backgroundColor: active ? "#FFD700" : colors.card,
                      borderColor: active ? "#FFD700" : colors.border,
                    }]}
                    onPress={() => setSportFilter(s)}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 13, color: active ? "#000" : colors.text }}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.calcBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => { setMinProfit(0); setSportFilter("All"); }}
            activeOpacity={0.8}
          >
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>Reset Filters</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Arb Opportunity Card ─────────────────────────────────────────────────────

function ArbCard({
  arb, region, liveRates, onCalculate, showLivePulse, affiliatePartners, token,
}: {
  arb: ArbOpportunity;
  region: ArbRegion;
  liveRates: Record<string, number>;
  onCalculate: (a: ArbOpportunity) => void;
  showLivePulse?: boolean;
  affiliatePartners?: AffiliatePartner[];
  token?: string;
}) {
  const colors = useColors();
  const pColor = profitColor(arb.profitPercent);
  const defCurrency = REGION_DEFAULT_CURRENCY[region] ?? "USD";
  const currSymbol  = CURRENCIES[defCurrency]?.symbol ?? "$";
  const currRate    = getRate(defCurrency, liveRates);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!showLivePulse) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [showLivePulse, pulseAnim]);

  return (
    <View style={[styles.arbCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderLeftColor: pColor, borderLeftWidth: 3 }]}>
      <View style={styles.arbCardHeader}>
        <View style={styles.arbCardHeaderLeft}>
          {showLivePulse && (
            <Animated.View style={[styles.liveDot, { backgroundColor: "#FF4D4D", opacity: pulseAnim, marginRight: 4 }]} />
          )}
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

      <Text style={[styles.arbMatchup, { color: colors.text }]}>{arb.homeTeam} <Text style={{ color: colors.textMuted }}>vs</Text> {arb.awayTeam}</Text>
      <Countdown iso={arb.commenceTime} />

      <View style={[styles.legsTable, { borderColor: colors.border }]}>
        <View style={[styles.legsHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.legHeaderText, { color: colors.textMuted, flex: 2 }]}>Bookmaker</Text>
          <Text style={[styles.legHeaderText, { color: colors.textMuted, flex: 2 }]}>Selection</Text>
          <Text style={[styles.legHeaderText, { color: colors.textMuted, flex: 1, textAlign: "right" }]}>Odds</Text>
        </View>
        {arb.legs.map((leg, i) => (
          <View key={i} style={[styles.legRowContainer, i < arb.legs.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
            <View style={styles.legRow}>
              <TouchableOpacity style={{ flex: 2 }} onPress={() => openUrl(BK_META[leg.bookmakerId]?.url ?? `https://google.com/search?q=${leg.bookmaker}`)}>
                <Text style={[styles.legCell, { color: colors.cyan }]} numberOfLines={1}>{leg.bookmaker} ↗</Text>
              </TouchableOpacity>
              <Text style={[styles.legCell, { color: colors.text, flex: 2 }]} numberOfLines={1}>{leg.selection}</Text>
              <Text style={[styles.legCell, { color: pColor, flex: 1, textAlign: "right" }]}>{leg.odds}</Text>
            </View>
            <View style={{ paddingHorizontal: 10, paddingBottom: 6 }}>
              <TrustBadge bookmakerId={leg.bookmakerId} />
              <MobileMoneyRow bookmakerId={leg.bookmakerId} region={region} />
            </View>
          </View>
        ))}
      </View>

      <Text style={[styles.profitHint, { color: colors.textMuted }]}>
        On {formatLocal(1000 * currRate, currSymbol)} stake: +{formatLocal(arb.profitPercent / 100 * 1000 * currRate, currSymbol)} guaranteed
      </Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <TouchableOpacity
          style={[styles.calcArbBtn, { flex: 1, backgroundColor: "rgba(0,229,255,0.1)", borderColor: colors.cyan }]}
          onPress={() => onCalculate(arb)}
          activeOpacity={0.8}
        >
          <Calculator size={14} color={colors.cyan} />
          <Text style={[styles.calcArbBtnText, { color: colors.cyan }]}>Calculate</Text>
        </TouchableOpacity>
        {arb.legs.length >= 2 && (
          <TouchableOpacity
            style={[styles.calcArbBtn, { flex: 1, backgroundColor: "rgba(0,255,148,0.08)", borderColor: "rgba(0,255,148,0.4)" }]}
            onPress={() => {
              arb.legs.forEach((leg) => openUrl(BK_META[leg.bookmakerId]?.url ?? `https://google.com/search?q=${leg.bookmaker}`));
            }}
            activeOpacity={0.8}
          >
            <ExternalLink size={14} color="#00FF94" />
            <Text style={[styles.calcArbBtnText, { color: "#00FF94" }]}>Open Bookies</Text>
          </TouchableOpacity>
        )}
      </View>

      {affiliatePartners && affiliatePartners.length > 0 && (
        <AffiliateBanner
          bookmakers={arb.legs.map((l) => l.bookmaker)}
          affiliatePartners={affiliatePartners}
          token={token}
        />
      )}
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
  const [selectedTab, setSelectedTab] = useState<ScannerTab>("arbs");
  const [data, setData]               = useState<ArbScanResponse | null>(null);
  const [evData, setEvData]           = useState<EVScanResponse | null>(null);
  const [middlesData, setMiddlesData] = useState<MiddlesScanResponse | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveRates, setLiveRates]     = useState<Record<string, number>>({});
  const [error, setError]             = useState("");
  const [selectedArb, setSelectedArb] = useState<ArbOpportunity | null>(null);
  const [calcVisible, setCalcVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [minProfit, setMinProfit]     = useState(0);
  const [sportFilter, setSportFilter] = useState("All");
  const [affiliatePartners, setAffiliatePartners] = useState<AffiliatePartner[]>([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const { region: affiliateRegion, setRegion: setAffiliateRegion, detected: detectedRegion } = useRegion();

  const scanAnim = useRef(new Animated.Value(0)).current;
  const liveRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const effectiveTier = data?.effectiveTier ?? data?.tier ?? user?.tier ?? "free";
  const isPremium = effectiveTier === "premium";
  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const hasActiveFilters = minProfit > 0 || sportFilter !== "All";

  useEffect(() => {
    if (!isPremium) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1500, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1500, useNativeDriver: Platform.OS !== "web" }),
      ]),
    ).start();
  }, [isPremium, scanAnim]);

  const load = useCallback(async (force = false) => {
    if (!token) return;
    if (force) setIsRefreshing(true); else setIsLoading(true);
    setError("");
    try {
      const result = force && isPremium
        ? await api.arbitrage.scan(token, selectedRegion)
        : await api.arbitrage.list(token, selectedRegion);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to scan");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, isPremium, selectedRegion]);

  const loadEV = useCallback(async (force = false) => {
    if (!token || !isPremium) return;
    try {
      const result = await api.arbitrage.ev(token, selectedRegion, force);
      setEvData(result);
    } catch { /* silent */ }
  }, [token, isPremium, selectedRegion]);

  const loadMiddles = useCallback(async (force = false) => {
    if (!token || !isPremium) return;
    try {
      const result = await api.arbitrage.middles(token, selectedRegion, force);
      setMiddlesData(result);
    } catch { /* silent */ }
  }, [token, isPremium, selectedRegion]);

  useEffect(() => {
    api.arbitrage.rates().then((r) => { if (r.rates) setLiveRates(r.rates); }).catch(() => {});
  }, []);

  // Reload affiliate partners whenever affiliate region changes
  useEffect(() => {
    api.affiliate.partners(affiliateRegion).then((r) => setAffiliatePartners(r.partners ?? [])).catch(() => {});
  }, [affiliateRegion]);

  useEffect(() => {
    setData(null); setEvData(null); setMiddlesData(null);
    load();
  }, [selectedRegion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedTab === "ev" && !evData) loadEV();
    if (selectedTab === "middles" && !middlesData) loadMiddles();
  }, [selectedTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show first-time welcome modal for free users once
  useEffect(() => {
    if (data && affiliatePartners.length > 0 && !isPremium) {
      AsyncStorage.getItem("arb_welcome_shown").then((v) => {
        if (!v) setShowWelcomeModal(true);
      }).catch(() => {});
    }
  }, [data, affiliatePartners, isPremium]);

  // Premium ARBs: auto-refresh every 30s
  useEffect(() => {
    if (!isPremium) return;
    const id = setInterval(() => load(true), 30_000);
    return () => clearInterval(id);
  }, [isPremium, load]);

  // Live tab: 10s auto-refresh
  useEffect(() => {
    if (selectedTab !== "live" || !isPremium) {
      if (liveRefreshRef.current) { clearInterval(liveRefreshRef.current); liveRefreshRef.current = null; }
      return;
    }
    liveRefreshRef.current = setInterval(() => load(true), 10_000);
    return () => { if (liveRefreshRef.current) clearInterval(liveRefreshRef.current); };
  }, [selectedTab, isPremium, load]);

  const allOpps = data?.opportunities ?? [];

  const opps = allOpps.filter((o) => {
    if (minProfit > 0 && o.profitPercent < minProfit) return false;
    if (sportFilter !== "All" && o.sport !== sportFilter) return false;
    return true;
  });

  const evBets = (evData?.bets ?? []).filter((b) => {
    if (minProfit > 0 && b.evPercent < minProfit) return false;
    if (sportFilter !== "All" && b.sport !== sportFilter) return false;
    return true;
  });

  const middles = (middlesData?.middles ?? []).filter((m) => {
    if (sportFilter !== "All" && m.sport !== sportFilter) return false;
    return true;
  });

  // Live = arbs starting within next 3h
  const liveOpps = allOpps.filter((o) => {
    const secs = secondsUntil(o.commenceTime);
    return secs > 0 && secs < 10800;
  });

  const disclaimer = data?.disclaimer ?? "Odds comparison data is shown for educational purposes only. PrediQs AI does not facilitate placing of any bets or wagers. 18+ only.";

  if (!isPremium && isLoading && !data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ fontSize: 36 }}>🔄</Text>
        <Text style={[styles.loadingTitle, { color: colors.text, marginTop: 12 }]}>Checking access…</Text>
      </View>
    );
  }

  if (!isPremium) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 12, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>🔄 Odds Comparison</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>⭐ Premium Feature</Text>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32, alignItems: "center", paddingTop: 48 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ fontSize: 64 }}>🔄</Text>
          <Text style={[styles.gateTitle, { color: colors.text, marginTop: 16, textAlign: "center" }]}>ARB Scanner</Text>
          <Text style={[styles.gateSub, { color: colors.textSecondary, textAlign: "center", marginVertical: 12 }]}>
            Scan 40+ global and African bookmakers for guaranteed profit margins. Real-time odds discrepancy detection with stake calculator.
          </Text>
          <View style={[styles.teaserCard, { backgroundColor: "rgba(255,215,0,0.06)", borderColor: "rgba(255,215,0,0.25)", marginBottom: 20, width: "100%" }]}>
            {[
              "Real-time auto-refresh every 30s",
              "40+ global + African bookmakers",
              "2-way & 3-way arbitrage (ARBs tab)",
              "+EV Bets scanner with sharp line comparison",
              "Middles detector for spreads & totals",
              "Live Arbs tab — 10s refresh on active games",
              "Profit calculator with stake optimizer",
              "Push alerts for high-value arbs",
            ].map((f) => (
              <Text key={f} style={[styles.teaserText, { color: colors.textSecondary }]}>✓ {f}</Text>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.upgradeBtn, { backgroundColor: "#FFD700" }]}
            onPress={() => router.push("/settings")}
            activeOpacity={0.85}
          >
            <Text style={[styles.upgradeBtnText, { color: "#070B12" }]}>⭐ Upgrade to Premium — $39.99/mo</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>🔄 Odds Comparison</Text>
          <Animated.Text style={[styles.headerSub, { color: "#00FF94", opacity: scanAnim }]}>⚡ LIVE — scanning 40+ bookmakers</Animated.Text>
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, {
            borderColor: hasActiveFilters ? colors.cyan : colors.border,
            backgroundColor: hasActiveFilters ? "rgba(0,229,255,0.1)" : "transparent",
          }]}
          onPress={() => setFilterVisible(true)}
          activeOpacity={0.7}
        >
          <Filter size={15} color={hasActiveFilters ? colors.cyan : colors.textMuted} />
          {hasActiveFilters && <View style={[styles.filterDot, { backgroundColor: colors.cyan }]} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.refreshBtn, { borderColor: colors.border, marginLeft: 6 }]}
          onPress={() => { load(true); loadEV(true); loadMiddles(true); }}
          disabled={isRefreshing}
          activeOpacity={0.7}
        >
          <RefreshCw size={16} color={isRefreshing ? colors.textMuted : colors.cyan} />
        </TouchableOpacity>
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

      {/* Scanner type tabs */}
      <View style={[styles.scannerTabRow, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        {SCANNER_TABS.map((tab) => {
          const active = selectedTab === tab.id;
          const isLive = tab.id === "live";
          const liveCount = isLive ? liveOpps.length : null;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.scannerTab, active && { borderBottomColor: isLive ? "#FF4D4D" : colors.cyan, borderBottomWidth: 2 }]}
              onPress={() => setSelectedTab(tab.id)}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 13 }}>{tab.emoji}</Text>
              <Text style={[styles.scannerTabText, { color: active ? (isLive ? "#FF4D4D" : colors.cyan) : colors.textMuted }]}>
                {tab.label}
              </Text>
              {liveCount !== null && liveCount > 0 && (
                <View style={[styles.liveCountBadge, { backgroundColor: "#FF4D4D" }]}>
                  <Text style={{ fontSize: 9, color: "#fff" }}>{liveCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Stats bar */}
      {(selectedTab === "arbs" || selectedTab === "live") && data && (
        <View style={[styles.statsBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: (selectedTab === "live" ? liveOpps : opps).length > 0 ? "#00FF94" : colors.textMuted }]}>
              {selectedTab === "live" ? liveOpps.length : opps.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{selectedTab === "live" ? "Live Now" : "Arbs"}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.text }]}>{data.totalFound}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Found</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.cyan }]}>
              {allOpps.length > 0 ? `+${Math.max(...allOpps.map((o) => o.profitPercent)).toFixed(1)}%` : "—"}
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

      {selectedTab === "ev" && evData && (
        <View style={[styles.statsBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: evBets.length > 0 ? "#00FF94" : colors.textMuted }]}>{evBets.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>+EV Bets</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: evBets.length > 0 ? colors.cyan : colors.textMuted }]}>
              {evBets.length > 0 ? `+${Math.max(...evBets.map((b) => b.evPercent)).toFixed(1)}%` : "—"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Best EV</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.textMuted, fontSize: 10 }]}>
              {evData.lastScanned ? new Date(evData.lastScanned).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Last Scan</Text>
          </View>
        </View>
      )}

      {selectedTab === "middles" && middlesData && (
        <View style={[styles.statsBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: middles.length > 0 ? "#FFD700" : colors.textMuted }]}>{middles.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Middles</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: middles.length > 0 ? "#FFD700" : colors.textMuted }]}>
              {middles.length > 0 ? `${Math.max(...middles.map((m) => m.hitProbability))}%` : "—"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Best Hit %</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.textMuted, fontSize: 10 }]}>
              {middlesData.lastScanned ? new Date(middlesData.lastScanned).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Last Scan</Text>
          </View>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { load(true); if (selectedTab === "ev") loadEV(true); if (selectedTab === "middles") loadMiddles(true); }} tintColor={colors.cyan} />}
      >
        {/* Loading */}
        {isLoading && !data && (
          <View style={styles.centered}>
            <Text style={{ fontSize: 32 }}>{selectedRegion === "africa" ? "🌍" : "🔍"}</Text>
            <Text style={[styles.loadingTitle, { color: colors.text }]}>Scanning bookmakers…</Text>
            <Text style={[styles.loadingSub, { color: colors.textSecondary }]}>Comparing odds across 40+ bookmakers</Text>
          </View>
        )}

        {error && (
          <View style={[styles.errorCard, { backgroundColor: "rgba(255,77,77,0.08)", borderColor: "rgba(255,77,77,0.25)" }]}>
            <AlertTriangle size={16} color={colors.red} />
            <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
          </View>
        )}

        {/* ── ARBs tab ── */}
        {(selectedTab === "arbs" || selectedTab === "live") && !isLoading && (
          <>
            <View style={[styles.eliteBanner, {
              backgroundColor: selectedTab === "live" ? "rgba(255,77,77,0.08)" : "rgba(0,255,148,0.08)",
              borderColor: selectedTab === "live" ? "rgba(255,77,77,0.3)" : "rgba(0,255,148,0.3)",
            }]}>
              <View style={[styles.liveDot, { backgroundColor: selectedTab === "live" ? "#FF4D4D" : "#00FF94" }]} />
              <Text style={[styles.eliteBannerText, { color: selectedTab === "live" ? "#FF4D4D" : "#00FF94" }]}>
                {selectedTab === "live"
                  ? `LIVE — 10s refresh · ${liveOpps.length} active in next 3h`
                  : `LIVE — Auto-refresh every 30s · ${opps.length} active ${opps.length === 1 ? "opportunity" : "opportunities"}`}
              </Text>
            </View>

            {selectedRegion === "africa" && (
              <View style={[styles.infoBanner, { backgroundColor: "rgba(255,215,0,0.07)", borderColor: "rgba(255,215,0,0.3)" }]}>
                <Text style={{ fontSize: 16 }}>🌍</Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.infoBannerTitle, { color: "#FFD700" }]}>African Markets — Bigger Arb Windows</Text>
                  <Text style={[styles.infoBannerSub, { color: colors.textSecondary }]}>
                    Local bookmakers (Bet9ja, SportyBet, BetKing) are sourced directly for larger margin gaps.
                  </Text>
                </View>
              </View>
            )}

            {(() => {
              const displayOpps = selectedTab === "live" ? liveOpps : opps;
              if (displayOpps.length === 0) {
                return (
                  <View style={styles.emptyState}>
                    <Text style={{ fontSize: 40 }}>{selectedTab === "live" ? "⚡" : selectedRegion === "africa" ? "🌍" : "📊"}</Text>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      {selectedTab === "live" ? "No live games right now" : "No arbs right now"}
                    </Text>
                    <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                      {selectedTab === "live"
                        ? "Games starting within 3h will appear here. Check back soon."
                        : "Bookmakers have closed the gaps. Refresh to keep scanning."}
                    </Text>
                    <TouchableOpacity
                      style={[styles.retryBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: isRefreshing ? 0.6 : 1 }]}
                      onPress={() => load(true)}
                      disabled={isRefreshing}
                      activeOpacity={0.8}
                    >
                      <RefreshCw size={14} color={isRefreshing ? colors.textMuted : colors.cyan} />
                      <Text style={[styles.retryText, { color: isRefreshing ? colors.textMuted : colors.cyan }]}>
                        {isRefreshing ? "Scanning…" : "Scan Now"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }
              return displayOpps.map((arb) => (
                <ArbCard
                  key={arb.id}
                  arb={arb}
                  region={selectedRegion}
                  liveRates={liveRates}
                  onCalculate={(a) => { setSelectedArb(a); setCalcVisible(true); }}
                  showLivePulse={selectedTab === "live"}
                  affiliatePartners={affiliatePartners}
                  token={token ?? undefined}
                />
              ));
            })()}
          </>
        )}

        {/* ── +EV tab ── */}
        {selectedTab === "ev" && (
          <>
            <View style={[styles.eliteBanner, { backgroundColor: "rgba(0,255,148,0.08)", borderColor: "rgba(0,255,148,0.3)" }]}>
              <Zap size={12} color="#00FF94" />
              <Text style={[styles.eliteBannerText, { color: "#00FF94" }]}>
                +EV Bets — Odds higher than sharp line · Edge vs Pinnacle/market average
              </Text>
            </View>

            {!evData && !isLoading && (
              <View style={styles.centered}>
                <Text style={{ fontSize: 32 }}>📈</Text>
                <Text style={[styles.loadingTitle, { color: colors.text }]}>Loading +EV scanner…</Text>
              </View>
            )}

            {evBets.length === 0 && evData && (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40 }}>📈</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No +EV bets right now</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  Sharp lines are aligned. Refresh to check for new opportunities.
                </Text>
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => loadEV(true)}
                  activeOpacity={0.8}
                >
                  <RefreshCw size={14} color={colors.cyan} />
                  <Text style={[styles.retryText, { color: colors.cyan }]}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}

            {evBets.map((bet) => (
              <EVCard key={bet.id} bet={bet} region={selectedRegion} />
            ))}
          </>
        )}

        {/* ── Middles tab ── */}
        {selectedTab === "middles" && (
          <>
            <View style={[styles.eliteBanner, { backgroundColor: "rgba(255,215,0,0.08)", borderColor: "rgba(255,215,0,0.3)" }]}>
              <Text style={{ fontSize: 12 }}>🎯</Text>
              <Text style={[styles.eliteBannerText, { color: "#FFD700" }]}>
                Middles — Spread/total discrepancies where both bets can win
              </Text>
            </View>

            <View style={[styles.infoBanner, { backgroundColor: "rgba(255,215,0,0.04)", borderColor: "rgba(255,215,0,0.15)" }]}>
              <Text style={{ fontSize: 14 }}>💡</Text>
              <Text style={[styles.infoBannerSub, { color: colors.textSecondary, flex: 1 }]}>
                A middle wins when the final score falls between two spread positions. Both bets win — you profit on both. Worst case: one bet loses (~4.5% of stake).
              </Text>
            </View>

            {!middlesData && (
              <View style={styles.centered}>
                <Text style={{ fontSize: 32 }}>🎯</Text>
                <Text style={[styles.loadingTitle, { color: colors.text }]}>Loading middles scanner…</Text>
              </View>
            )}

            {middles.length === 0 && middlesData && (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40 }}>🎯</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No middles right now</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  No significant spread discrepancies found. Check back when more games are available.
                </Text>
              </View>
            )}

            {middles.map((middle) => (
              <MiddleCard key={middle.id} middle={middle} region={selectedRegion} />
            ))}
          </>
        )}

        {/* ── Recommended Sportsbooks ── */}
        {(selectedTab === "arbs" || selectedTab === "live") && !isLoading && (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>📚 RECOMMENDED SPORTSBOOKS</Text>
              <TouchableOpacity
                style={[styles.regionPill, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowRegionPicker(true)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 10 }}>📍</Text>
                <Text style={[styles.regionPillText, { color: colors.text }]} numberOfLines={1}>
                  {REGION_LABELS[affiliateRegion] ?? affiliateRegion}
                </Text>
                <Text style={[{ fontSize: 10, color: colors.textMuted }]}>▾</Text>
              </TouchableOpacity>
            </View>

            {affiliatePartners.length === 0 ? (
              <View style={[styles.recBookCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, width: "100%", paddingVertical: 24 }]}>
                <Text style={[styles.recBookName, { color: colors.textMuted }]}>No books available for this region</Text>
                <TouchableOpacity onPress={() => setShowRegionPicker(true)}>
                  <Text style={[{ color: colors.cyan, fontSize: 12, marginTop: 6 }]}>Change Region →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 10, paddingRight: 4 }}>
                  {affiliatePartners.map((p) => (
                    <View key={p.id} style={[styles.recBookCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                      <Text style={styles.recBookLogo}>{p.logo ?? "🏦"}</Text>
                      <Text style={[styles.recBookName, { color: colors.text }]}>{p.bookName}</Text>
                      <Text style={[styles.recBookBonus, { color: colors.textMuted }]} numberOfLines={2}>{p.bonusText ?? "Welcome bonus"}</Text>
                      {p.commissionAmount && (
                        <Text style={[{ fontSize: 10, color: "#00FF94" }]}>
                          {p.commissionType === "cpa" ? `CPA ${p.commissionCurrency ?? "USD"} ${p.commissionAmount}` : `${p.commissionAmount}% Rev Share`}
                        </Text>
                      )}
                      <TouchableOpacity
                        style={[styles.recBookBtn, { backgroundColor: "#00FF94" }]}
                        onPress={() => {
                          if (token) {
                            api.affiliate.click(token, { partnerId: p.id, bookName: p.bookName, affiliateUrl: p.affiliateUrl, source: "recommended", userRegion: affiliateRegion }).catch(() => {});
                          }
                          Linking.openURL(p.affiliateUrl).catch(() => {});
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.recBookBtnText, { color: "#000" }]}>Sign Up & Get Bonus</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        )}

        {/* Africa country disclaimers */}
        {selectedRegion === "africa" && (selectedTab === "arbs" || selectedTab === "live") && (
          <View style={{ gap: 8 }}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 4 }]}>COUNTRY REGULATIONS</Text>
            {[
              { flag: "🇳🇬", label: "Nigeria",      text: "Regulated by the NLRC. Only use NLRC-licensed operators." },
              { flag: "🇰🇪", label: "Kenya",        text: "Regulated by BCLB. 20% excise duty applies to winnings." },
              { flag: "🇿🇦", label: "South Africa", text: "Regulated by the National Gambling Board." },
              { flag: "🇬🇭", label: "Ghana",        text: "Regulated by the Gaming Commission of Ghana." },
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

        <View style={[styles.disclaimerCard, { backgroundColor: "rgba(255,165,0,0.06)", borderColor: "rgba(255,165,0,0.2)" }]}>
          <AlertTriangle size={14} color="#FFA500" />
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>{disclaimer}</Text>
        </View>

        <DisclaimerFooter />
      </ScrollView>

      {token && (
        <CalcModal
          arb={selectedArb}
          visible={calcVisible}
          onClose={() => setCalcVisible(false)}
          token={token}
          region={selectedRegion}
          liveRates={liveRates}
        />
      )}

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        minProfit={minProfit}
        setMinProfit={setMinProfit}
        sportFilter={sportFilter}
        setSportFilter={setSportFilter}
      />

      {/* ── Region Picker Modal ── */}
      <Modal
        visible={showRegionPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRegionPicker(false)}
      >
        <View style={styles.welcomeOverlay}>
          <View style={[styles.welcomeBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TouchableOpacity style={styles.welcomeClose} onPress={() => setShowRegionPicker(false)}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <Text style={[styles.welcomeTitle, { color: colors.text, fontSize: 16 }]}>📍 Select Your Region</Text>
            <Text style={[styles.welcomeBody, { color: colors.textMuted, fontSize: 12 }]}>
              {detectedRegion !== affiliateRegion && `Auto-detected: ${REGION_LABELS[detectedRegion] ?? detectedRegion}`}
              {detectedRegion !== affiliateRegion && " · "}
              Showing sportsbooks available in your selected region.
            </Text>

            <View style={{ gap: 8 }}>
              {REGION_DISPLAY_OPTIONS.map((opt) => {
                const active = opt.id === affiliateRegion;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.welcomePartnerRow, {
                      backgroundColor: active ? "rgba(0,229,255,0.1)" : colors.background,
                      borderColor: active ? colors.cyan : colors.border,
                    }]}
                    onPress={() => {
                      setAffiliateRegion(opt.id);
                      setShowRegionPicker(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={{ fontSize: 18 }}>{opt.label.split(" ")[0]}</Text>
                    <Text style={[{ flex: 1, color: active ? colors.cyan : colors.text, fontSize: 14, fontWeight: active ? "700" : "400" }]}>
                      {opt.label.split(" ").slice(1).join(" ")}
                    </Text>
                    {active && <Text style={{ color: colors.cyan, fontSize: 12 }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── First-time Welcome Modal ── */}
      <Modal
        visible={showWelcomeModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setShowWelcomeModal(false);
          AsyncStorage.setItem("arb_welcome_shown", "1").catch(() => {});
        }}
      >
        <View style={styles.welcomeOverlay}>
          <View style={[styles.welcomeBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              style={styles.welcomeClose}
              onPress={() => {
                setShowWelcomeModal(false);
                AsyncStorage.setItem("arb_welcome_shown", "1").catch(() => {});
              }}
            >
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <Text style={[styles.welcomeTitle, { color: colors.text }]}>💰 Maximize Your Arb Profits!</Text>
            <Text style={[styles.welcomeBody, { color: colors.textMuted }]}>
              Having accounts at multiple sportsbooks means more opportunities. Sign up to our recommended books:
            </Text>

            <View style={{ gap: 8 }}>
              {affiliatePartners.slice(0, 3).map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.welcomePartnerRow, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => {
                    if (token) {
                      api.affiliate.click(token, { partnerId: p.id, bookName: p.bookName, affiliateUrl: p.affiliateUrl, source: "modal" }).catch(() => {});
                    }
                    Linking.openURL(p.affiliateUrl).catch(() => {});
                    setShowWelcomeModal(false);
                    AsyncStorage.setItem("arb_welcome_shown", "1").catch(() => {});
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={{ fontSize: 20 }}>{p.logo ?? "🏦"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: colors.text, fontSize: 14, fontWeight: "700" }]}>{p.bookName}</Text>
                    <Text style={[{ color: colors.textMuted, fontSize: 11 }]} numberOfLines={1}>{p.bonusText}</Text>
                  </View>
                  <View style={[styles.welcomeSignUpBtn, { backgroundColor: "#00FF94" }]}>
                    <Text style={{ color: "#000", fontSize: 11, fontWeight: "700" }}>Sign Up →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.welcomeGetStarted, { backgroundColor: colors.cyan }]}
              onPress={() => {
                setShowWelcomeModal(false);
                AsyncStorage.setItem("arb_welcome_shown", "1").catch(() => {});
              }}
              activeOpacity={0.85}
            >
              <Text style={[{ color: colors.background, fontSize: 15, fontWeight: "700" }]}>Get Started</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowWelcomeModal(false);
                AsyncStorage.setItem("arb_welcome_shown", "1").catch(() => {});
              }}
              style={{ alignItems: "center", marginTop: 8 }}
            >
              <Text style={[{ color: colors.textMuted, fontSize: 13 }]}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 20, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, marginTop: 1 },
  refreshBtn: { padding: 8, borderRadius: 10, borderWidth: 1 },
  filterBtn: { padding: 8, borderRadius: 10, borderWidth: 1, position: "relative" },
  filterDot: { position: "absolute", top: 5, right: 5, width: 6, height: 6, borderRadius: 3 },

  regionScroll: { borderBottomWidth: 1, maxHeight: 52 },
  regionContent: { paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", gap: 8, alignItems: "center" },
  regionPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  regionPillText: { fontSize: 12 },
  newBadge: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, marginLeft: 2 },

  scannerTabRow: { flexDirection: "row", borderBottomWidth: 1 },
  scannerTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 2, borderBottomColor: "transparent" },
  scannerTabText: { fontSize: 12, letterSpacing: 0.2 },
  liveCountBadge: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6, minWidth: 16, alignItems: "center" },

  statsBar: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1 },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statVal: { fontSize: 16, letterSpacing: -0.3 },
  statLabel: { fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase" },
  statDivider: { width: 1, marginVertical: 4 },

  content: { padding: 16, gap: 14 },
  centered: { alignItems: "center", gap: 12, paddingVertical: 60, paddingHorizontal: 24 },
  loadingTitle: { fontSize: 18, textAlign: "center" },
  loadingSub: { fontSize: 13, textAlign: "center", lineHeight: 19 },

  infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoBannerTitle: { fontSize: 14 },
  infoBannerSub: { fontSize: 11, lineHeight: 16 },

  errorCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 13 },

  gateTitle: { fontSize: 20, letterSpacing: -0.3 },
  gateSub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  teaserCard: { width: "100%", padding: 12, borderRadius: 10, borderWidth: 1 },
  teaserText: { fontSize: 12, marginVertical: 2 },
  upgradeBtn: { flexDirection: "row", alignItems: "center", gap: 6, width: "100%", justifyContent: "center", padding: 14, borderRadius: 14 },
  upgradeBtnText: { fontSize: 14 },

  eliteBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  eliteBannerText: { flex: 1, fontSize: 12 },

  emptyState: { alignItems: "center", gap: 10, paddingVertical: 40 },
  emptyTitle: { fontSize: 18 },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  retryText: { fontSize: 13 },

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

  evRow: { flexDirection: "row", borderRadius: 10, borderWidth: 1, padding: 12, gap: 8 },
  evCol: { flex: 1, gap: 4 },
  evLabel: { fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase" },
  evVal: { fontSize: 13 },
  evSummaryRow: { flexDirection: "row", borderRadius: 10, borderWidth: 1, padding: 12 },
  evSummaryItem: { flex: 1, alignItems: "center", gap: 3 },
  evSummaryVal: { fontSize: 15, letterSpacing: -0.2 },
  evSummaryDivider: { width: 1, marginVertical: 4 },

  middleBooksRow: { flexDirection: "row", borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  middleBookCol: { flex: 1, padding: 12, gap: 4 },

  countryCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  countryLabel: { fontSize: 13 },
  countryText: { fontSize: 11, lineHeight: 15, marginTop: 1 },
  sectionLabel: { fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" },

  disclaimerCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  disclaimerText: { flex: 1, fontSize: 11, lineHeight: 16 },

  filterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },

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

  // Affiliate
  affiliateBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  affiliateBannerText: { flex: 1, fontSize: 12 },

  recBookCard: { width: 160, borderRadius: 14, borderWidth: 1, padding: 12, gap: 8, alignItems: "center" },
  recBookLogo: { fontSize: 28 },
  recBookName: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  recBookBonus: { fontSize: 11, textAlign: "center", lineHeight: 15 },
  recBookBtn: { width: "100%", paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  recBookBtnText: { fontSize: 11, fontWeight: "700" },
  recBookAlready: { fontSize: 10, textDecorationLine: "underline" },

  welcomeOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 24 },
  welcomeBox: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 24, gap: 16 },
  welcomeClose: { position: "absolute", top: 16, right: 16 },
  welcomeTitle: { fontSize: 20, fontWeight: "700", marginTop: 8 },
  welcomeBody: { fontSize: 13, lineHeight: 19 },
  welcomePartnerRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  welcomeSignUpBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  welcomeGetStarted: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
});
