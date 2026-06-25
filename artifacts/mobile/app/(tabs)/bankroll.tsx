import * as Haptics from "expo-haptics";
import {
  AlertCircle,
  AlertTriangle,
  BarChart2,
  ChevronRight,
  Cpu,
  Inbox,
  MinusCircle,
  PlusCircle,
  Settings,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  KeyboardAvoidingView,
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

import { CoachAlerts } from "@/components/CoachAlerts";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { TierGate } from "@/components/TierGate";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { api, type CoachData } from "@/lib/api";
import type { BankrollEntry, EntryType } from "@/types";

type FinanceTab = "bankroll" | "performance" | "paper";

type IconComp = React.ComponentType<{ size: number; color: string }>;

const ENTRY_TYPES: { type: EntryType; labelKey: string; Icon: IconComp; color: string }[] = [
  { type: "deposit",    labelKey: "bankroll.typeDeposit",    Icon: PlusCircle,   color: "#00FF94" },
  { type: "withdrawal", labelKey: "bankroll.typeWithdrawal", Icon: MinusCircle,  color: "#FF6B35" },
  { type: "win",        labelKey: "bankroll.typeWin",        Icon: TrendingUp,   color: "#00E5FF" },
  { type: "loss",       labelKey: "bankroll.typeLoss",       Icon: TrendingDown, color: "#FF4D4D" },
];

function getColor(sport: string) {
  const m: Record<string, string> = {
    soccer: "#00E5FF", football: "#FF6B35", nfl: "#FF6B35",
    basketball: "#FFD700", nba: "#FFD700", baseball: "#00FF94", mlb: "#00FF94",
  };
  return m[sport.toLowerCase()] ?? "#A855F7";
}

// ── Kelly Calculator ──────────────────────────────────────────────────────────
function KellyCalculator() {
  const colors = useColors();
  const { t } = useLanguage();
  const { profile } = useApp();
  const [odds,        setOdds]        = useState("");
  const [probability, setProbability] = useState("");
  const [result,      setResult]      = useState<number | null>(null);

  function calculate() {
    const p = parseFloat(probability) / 100;
    const rawOdds = parseFloat(odds);
    if (isNaN(p) || isNaN(rawOdds) || p <= 0 || p >= 1) return;
    let decimalOdds: number;
    if (rawOdds >= 100)        decimalOdds = rawOdds / 100 + 1;
    else if (rawOdds <= -100)  decimalOdds = 100 / Math.abs(rawOdds) + 1;
    else return;
    const b = decimalOdds - 1;
    const q = 1 - p;
    const kelly = (b * p - q) / b;
    if (kelly <= 0) { setResult(0); return; }
    const bankrollAmt = parseFloat(String(profile.bankroll));
    setResult(isNaN(bankrollAmt) ? 0 : kelly * 0.5 * bankrollAmt);
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.cardHeader}>
        <Cpu size={18} color={colors.cyan} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>{t("bankroll.kellyTitle")}</Text>
      </View>
      <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
        {t("bankroll.kellyDesc")}
      </Text>
      <View style={styles.kellyInputs}>
        <View style={styles.kellyField}>
          <Text style={[styles.kellyLabel, { color: colors.textSecondary }]}>{t("bankroll.kellyAmericanOdds")}</Text>
          <TextInput
            style={[styles.kellyInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            value={odds} onChangeText={setOdds} placeholder={t("bankroll.kellyOddsExample")} keyboardType="numeric" placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={styles.kellyField}>
          <Text style={[styles.kellyLabel, { color: colors.textSecondary }]}>{t("bankroll.kellyWinProb")}</Text>
          <TextInput
            style={[styles.kellyInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            value={probability} onChangeText={setProbability} placeholder={t("bankroll.kellyProbExample")} keyboardType="numeric" placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>
      <TouchableOpacity style={[styles.calcBtn, { backgroundColor: colors.cyan }]} onPress={calculate} activeOpacity={0.85}>
        <Text style={[styles.calcBtnText, { color: colors.background }]}>{t("bankroll.kellyCalculate")}</Text>
      </TouchableOpacity>
      {result !== null && (
        <View style={[styles.kellyResult, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.kellyResultLabel, { color: colors.textSecondary }]}>{t("bankroll.kellyRecommended")}</Text>
          <Text style={[styles.kellyResultValue, { color: colors.cyan }]}>${result.toFixed(2)}</Text>
          <Text style={[styles.kellyResultPct, { color: colors.textMuted }]}>
            {t("bankroll.kellyOfBankroll", { pct: profile.bankroll > 0 ? ((result / profile.bankroll) * 100).toFixed(1) : "0.0" })}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Entry Row ─────────────────────────────────────────────────────────────────
function EntryRow({ entry }: { entry: BankrollEntry }) {
  const colors = useColors();
  const { t } = useLanguage();
  const isPositive = entry.type === "deposit" || entry.type === "win";
  const config = ENTRY_TYPES.find((e) => e.type === entry.type)!;
  return (
    <View style={[styles.entryRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.entryIcon, { backgroundColor: `${config.color}18` }]}>
        <config.Icon size={18} color={config.color} />
      </View>
      <View style={styles.entryInfo}>
        <Text style={[styles.entryLabel, { color: colors.text }]}>
          {t(config.labelKey)}{entry.description ? ` — ${entry.description}` : ""}
        </Text>
        <Text style={[styles.entryDate, { color: colors.textMuted }]}>
          {new Date(entry.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={[styles.entryAmount, { color: isPositive ? colors.green : colors.red }]}>
        {isPositive ? "+" : "-"}${entry.amount.toFixed(2)}
      </Text>
    </View>
  );
}

// ── Bankroll Tab ──────────────────────────────────────────────────────────────
function BankrollTab({ onAddEntry }: { onAddEntry: () => void }) {
  const colors = useColors();
  const { t, locale } = useLanguage();
  const { profile, bankrollEntries } = useApp();
  const { token } = useAuth();
  const [coachData, setCoachData] = useState<CoachData | null>(null);

  const loadCoach = useCallback(async () => {
    if (!token) return;
    try { setCoachData(await api.coach.get(token)); } catch {}
  }, [token]);
  useEffect(() => { loadCoach(); }, [loadCoach]);

  const todayLoss = bankrollEntries
    .filter((e) => new Date(e.createdAt).toDateString() === new Date().toDateString() && e.type === "loss")
    .reduce((s, e) => s + e.amount, 0);
  const lossPercent = Math.min(100, (todayLoss / (profile.dailyLossLimit || 200)) * 100);
  const recentHourLosses = bankrollEntries.filter(
    (e) => e.type === "loss" && Date.now() - new Date(e.createdAt).getTime() < 2 * 60 * 60 * 1000,
  );
  const showEmotionalWarning = recentHourLosses.length >= 3;

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Balance Card */}
      <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>{t("bankroll.currentBalance")}</Text>
        <Text style={[styles.balance, { color: colors.gold }]}>
          ${profile.bankroll.toLocaleString(locale, { minimumFractionDigits: 2 })}
        </Text>
        <View style={styles.limitSection}>
          <View style={styles.limitHeader}>
            <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>{t("bankroll.dailyLossLimit")}</Text>
            <Text style={[styles.limitValue, { color: lossPercent >= 80 ? colors.red : colors.textSecondary }]}>
              ${todayLoss.toFixed(0)} / ${profile.dailyLossLimit}
            </Text>
          </View>
          <View style={[styles.limitBar, { backgroundColor: colors.border }]}>
            <View
              style={[styles.limitFill, {
                width: `${lossPercent}%` as any,
                backgroundColor: lossPercent >= 80 ? colors.red : lossPercent >= 50 ? colors.gold : colors.green,
              }]}
            />
          </View>
          {lossPercent >= 80 && (
            <View style={[styles.warningBanner, { backgroundColor: "rgba(255,77,77,0.1)", borderColor: "rgba(255,77,77,0.3)" }]}>
              <AlertTriangle size={14} color={colors.red} />
              <Text style={[styles.warningText, { color: colors.red }]}>
                {t("bankroll.toughSession")}
              </Text>
            </View>
          )}
        </View>
      </View>

      {showEmotionalWarning && (
        <View style={[styles.emotionalBanner, { backgroundColor: "rgba(255,107,53,0.1)", borderColor: "rgba(255,107,53,0.3)" }]}>
          <AlertTriangle size={16} color="#FF6B35" />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.emotionalTitle, { color: "#FF6B35" }]}>{t("bankroll.emotionalTitle")}</Text>
            <Text style={[styles.emotionalText, { color: colors.textSecondary }]}>
              {t("bankroll.emotionalText", { count: recentHourLosses.length })}
            </Text>
          </View>
        </View>
      )}

      {coachData && coachData.alerts.length > 0 && (
        <CoachAlerts alerts={coachData.alerts} riskProfile={coachData.summary.riskProfile} />
      )}

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        {ENTRY_TYPES.map((et) => (
          <TouchableOpacity
            key={et.type}
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={onAddEntry}
            activeOpacity={0.8}
          >
            <et.Icon size={20} color={et.color} />
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>{t(et.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TierGate requiredTier="premium" customMessage={t("bankroll.kellyGateMsg")}>
        <KellyCalculator />
      </TierGate>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("bankroll.history")}</Text>
      {bankrollEntries.length === 0 ? (
        <View style={styles.emptyHistory}>
          <Inbox size={28} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t("bankroll.noEntries")}</Text>
        </View>
      ) : (
        <View style={[styles.historyList, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {bankrollEntries.slice(0, 20).map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </View>
      )}
      <DisclaimerFooter />
    </ScrollView>
  );
}

// ── Performance Tab ───────────────────────────────────────────────────────────
function PerformanceTab() {
  const colors = useColors();
  const { t } = useLanguage();
  const { token, user } = useAuth();
  const router = useRouter();
  const [data,      setData]      = useState<Awaited<ReturnType<typeof api.user.performance>> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setError(""); setIsLoading(true);
    try { setData(await api.user.performance(token)); }
    catch (e) { setError(e instanceof Error ? e.message : t("performance.loadError")); }
    finally   { setIsLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const hasActivity  = (data?.totalBets ?? 0) > 0;
  const sportEntries = data ? Object.entries(data.sportStats).sort((a, b) => b[1].picks - a[1].picks).slice(0, 5) : [];
  const tiers = data ? [
    { tier: data.confidenceTiers.high.label,   count: data.confidenceTiers.high.count },
    { tier: data.confidenceTiers.medium.label, count: data.confidenceTiers.medium.count },
    { tier: data.confidenceTiers.low.label,    count: data.confidenceTiers.low.count },
  ] : [];
  const totalTierPicks = tiers.reduce((s, t) => s + t.count, 0);

  const overallStats = data ? [
    { label: t("performance.winRate"), value: hasActivity ? `${data.winRate}%` : "—",  sub: hasActivity ? t("performance.betsPlaced", { count: data.totalBets }) : t("performance.noBetsYet"), positive: hasActivity ? data.winRate > 50 : null },
    { label: t("performance.roi"),      value: hasActivity ? `${data.roi >= 0 ? "+" : ""}${data.roi}%` : "—", sub: t("performance.onDeposited"), positive: hasActivity ? data.roi > 0 : null },
    { label: t("performance.aiPicks"), value: `${data.predictionCount}`,              sub: t("performance.avgConfidence", { pct: data.avgConfidence }), positive: null },
    { label: t("performance.netPnl"),  value: hasActivity ? `${data.netPnl >= 0 ? "+" : ""}$${Math.abs(data.netPnl).toFixed(0)}` : "—", sub: hasActivity ? (data.netPnl >= 0 ? t("performance.inProfit") : t("performance.inLosses")) : t("performance.noActivity"), positive: hasActivity ? data.netPnl >= 0 : null },
  ] : [];

  return (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isLoading && data !== null} onRefresh={load} tintColor={colors.cyan} />}
    >
      <View style={styles.perfHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("performance.title")}</Text>
          <Text style={[styles.perfSubtitle, { color: colors.textSecondary }]}>{t("performance.subtitle")}</Text>
        </View>
        <TouchableOpacity
          style={[styles.leaderboardBtn, { backgroundColor: "rgba(255,215,0,0.1)", borderColor: "rgba(255,215,0,0.35)" }]}
          onPress={() => router.push("/leaderboard" as any)}
          activeOpacity={0.8}
        >
          <Trophy size={14} color={colors.gold} />
          <Text style={[styles.leaderboardBtnText, { color: colors.gold }]}>{t("performance.leaderboard")}</Text>
        </TouchableOpacity>
      </View>

      {!!error && (
        <View style={[styles.errorCard, { backgroundColor: "rgba(255,77,77,0.08)", borderColor: "rgba(255,77,77,0.25)" }]}>
          <AlertCircle size={16} color={colors.red} />
          <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
        </View>
      )}

      {isLoading && !data ? (
        <View style={styles.statsGrid}>
          {[0,1,2,3].map((i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.skeleton, { width: "60%", backgroundColor: colors.border }]} />
              <View style={[styles.skeleton, { width: "40%", height: 28, marginTop: 4, backgroundColor: colors.border }]} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.statsGrid}>
          {overallStats.map((stat, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
              <Text style={[styles.statValue, { color: stat.positive === true ? colors.green : stat.positive === false ? colors.red : colors.text }]}>
                {stat.value}
              </Text>
              {stat.sub ? <Text style={[styles.statSub, { color: colors.textMuted }]}>{stat.sub}</Text> : null}
            </View>
          ))}
        </View>
      )}

      {!hasActivity && !isLoading && (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.emptyCardTitle, { color: colors.text }]}>{t("performance.noActivityTitle")}</Text>
          <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
            {t("performance.noActivityText")}
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TrendingUp size={20} color={colors.green} />
            <TrendingDown size={20} color={colors.red} />
          </View>
        </View>
      )}

      {sportEntries.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("performance.bySport")}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {sportEntries.map(([sport, stats], i) => {
              const color = getColor(sport);
              const pct   = (stats.picks / Math.max(data!.predictionCount, 1)) * 100;
              return (
                <View key={sport} style={[styles.sportRow, i < sportEntries.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                  <View style={[styles.sportDot, { backgroundColor: color }]} />
                  <Text style={[styles.sportName, { color: colors.text }]}>{sport.toUpperCase()}</Text>
                  <View style={styles.sportBarWrap}>
                    <View style={[styles.sportBarBg, { backgroundColor: colors.border }]}>
                      <View style={[styles.sportBarFill, { width: `${Math.min(pct, 100)}%` as never, backgroundColor: color }]} />
                    </View>
                    <Text style={[styles.sportWinRate, { color }]}>{t("performance.picksCount", { count: stats.picks })}</Text>
                  </View>
                  <Text style={[styles.sportConf, { color: colors.textSecondary }]}>{t("performance.avgShort", { pct: stats.avgConfidence })}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {tiers.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("performance.confidenceTiers")}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.tableHeaderText, { color: colors.textMuted, flex: 2 }]}>{t("performance.colTier")}</Text>
              <Text style={[styles.tableHeaderText, { color: colors.textMuted }]}>{t("performance.colPicks")}</Text>
              <Text style={[styles.tableHeaderText, { color: colors.textMuted }]}>{t("performance.colShare")}</Text>
            </View>
            {tiers.map((row, i) => (
              <View key={i} style={[styles.tableRow, i < tiers.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>{row.tier}</Text>
                <Text style={[styles.tableCell, { color: colors.textSecondary }]}>{row.count}</Text>
                <Text style={[styles.tableCell, { color: colors.textSecondary }]}>
                  {totalTierPicks > 0 ? `${Math.round((row.count / totalTierPicks) * 100)}%` : "—"}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {user?.id === 1 && (
        <TouchableOpacity
          style={[styles.adminLink, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => router.push("/setup")}
          activeOpacity={0.8}
        >
          <Settings size={16} color={colors.textMuted} />
          <Text style={[styles.adminLinkText, { color: colors.textSecondary }]}>{t("performance.apiKeysGuide")}</Text>
          <ChevronRight size={14} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      <DisclaimerFooter />
    </ScrollView>
  );
}

// ── Paper Bets Tab ────────────────────────────────────────────────────────────
function PaperBetsTab() {
  const colors = useColors();
  const { t } = useLanguage();
  return (
    <ScrollView contentContainerStyle={[styles.tabContent, { alignItems: "center", paddingTop: 48 }]} showsVerticalScrollIndicator={false}>
      <Text style={{ fontSize: 52, marginBottom: 16 }}>📝</Text>
      <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>{t("bankroll.paperBets")}</Text>
      <Text style={[styles.cardDesc, { color: colors.textSecondary, textAlign: "center", maxWidth: 280 }]}>
        {t("bankroll.paperDesc")}
      </Text>
      <View style={[styles.comingSoonBadge, { backgroundColor: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.2)" }]}>
        <Text style={[styles.comingSoonText, { color: "#00E5FF" }]}>{t("bankroll.comingSoon")}</Text>
      </View>
      <View style={{ gap: 10, width: "100%", marginTop: 32 }}>
        {[t("bankroll.paperFeat1"), t("bankroll.paperFeat2"), t("bankroll.paperFeat3"), t("bankroll.paperFeat4")].map((f) => (
          <View key={f} style={[styles.featureRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: "#00E5FF", fontSize: 16 }}>✓</Text>
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>{f}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Main Finance Screen ───────────────────────────────────────────────────────
export default function FinanceScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { bankrollEntries, addEntry } = useApp();

  const [activeTab,     setActiveTab]     = useState<FinanceTab>("bankroll");
  const [modalVisible,  setModalVisible]  = useState(false);
  const [selectedType,  setSelectedType]  = useState<EntryType>("deposit");
  const [amount,        setAmount]        = useState("");
  const [note,          setNote]          = useState("");
  const [isSubmitting,  setIsSubmitting]  = useState(false);

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding    = insets.top + topPaddingWeb;

  async function handleAddEntry() {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) return;
    setIsSubmitting(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addEntry({ type: selectedType, amount: parsed, description: note.trim() || undefined });
      setAmount(""); setNote(""); setModalVisible(false);
    } catch (err) {
      Alert.alert(t("bankroll.errorTitle"), err instanceof Error ? err.message : t("bankroll.addEntryError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const SUB_TABS: { key: FinanceTab; label: string }[] = [
    { key: "bankroll",   label: t("bankroll.tabBankroll")    },
    { key: "performance", label: t("bankroll.tabPerformance") },
    { key: "paper",      label: t("bankroll.tabPaper")  },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPadding + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>{t("bankroll.financeTitle")}</Text>

        {/* Sub-tab bar */}
        <View style={styles.subTabRow}>
          {SUB_TABS.map((st) => {
            const active = st.key === activeTab;
            return (
              <TouchableOpacity
                key={st.key}
                style={[styles.subTab, active && { borderBottomColor: "#00E5FF", borderBottomWidth: 2 }]}
                onPress={() => setActiveTab(st.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.subTabText, { color: active ? "#00E5FF" : colors.textSecondary }]}>
                  {st.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Content ── */}
      <View style={styles.flex}>
        {activeTab === "bankroll"    && <BankrollTab   onAddEntry={() => setModalVisible(true)} />}
        {activeTab === "performance" && <PerformanceTab />}
        {activeTab === "paper"       && <PaperBetsTab  />}
      </View>

      {/* ── Add Entry Modal ── */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t("bankroll.addEntry")}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.typeRow}>
              {ENTRY_TYPES.map((et) => (
                <TouchableOpacity
                  key={et.type}
                  style={[styles.typeBtn, { backgroundColor: selectedType === et.type ? `${et.color}22` : colors.card, borderColor: selectedType === et.type ? et.color : colors.border }]}
                  onPress={() => setSelectedType(et.type)}
                  activeOpacity={0.8}
                >
                  <et.Icon size={16} color={et.color} />
                  <Text style={[styles.typeBtnText, { color: selectedType === et.type ? et.color : colors.textSecondary }]}>{t(et.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t("bankroll.amountLabel")}</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                value={amount} onChangeText={setAmount} placeholder="0.00"
                placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" autoFocus
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t("bankroll.noteLabel")}</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                value={note} onChangeText={setNote} placeholder={t("bankroll.notePlaceholder")} placeholderTextColor={colors.textMuted}
              />
            </View>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.cyan, opacity: amount && !isSubmitting ? 1 : 0.5 }]}
              onPress={handleAddEntry} disabled={!amount || isSubmitting} activeOpacity={0.85}
            >
              <Text style={[styles.submitText, { color: colors.background }]}>
                {isSubmitting ? t("bankroll.saving") : t("bankroll.addEntry")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  flex:               { flex: 1 },
  header:             { paddingHorizontal: 16, paddingBottom: 0, borderBottomWidth: 1 },
  screenTitle:        { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 12 },
  subTabRow:          { flexDirection: "row" },
  subTab:             { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  subTabText:         { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  tabContent:         { padding: 16, gap: 16, paddingBottom: 40 },
  balanceCard:        { borderRadius: 16, padding: 20, borderWidth: 1, gap: 16 },
  balanceLabel:       { fontSize: 13 },
  balance:            { fontSize: 40, letterSpacing: -1, fontFamily: "Inter_700Bold" },
  limitSection:       { gap: 8 },
  limitHeader:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  limitLabel:         { fontSize: 12 },
  limitValue:         { fontSize: 12 },
  limitBar:           { height: 6, borderRadius: 3, overflow: "hidden" },
  limitFill:          { height: "100%", borderRadius: 3 },
  warningBanner:      { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 8, borderWidth: 1 },
  warningText:        { fontSize: 12, flex: 1 },
  actionsRow:         { flexDirection: "row", gap: 10 },
  actionBtn:          { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1, alignItems: "center", gap: 6 },
  actionLabel:        { fontSize: 11 },
  card:               { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  cardHeader:         { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle:          { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  cardDesc:           { fontSize: 13 },
  kellyInputs:        { flexDirection: "row", gap: 10 },
  kellyField:         { flex: 1, gap: 4 },
  kellyLabel:         { fontSize: 11 },
  kellyInput:         { borderRadius: 8, borderWidth: 1, padding: 10, fontSize: 14 },
  calcBtn:            { borderRadius: 10, padding: 12, alignItems: "center" },
  calcBtnText:        { fontSize: 14 },
  kellyResult:        { borderRadius: 10, padding: 14, borderWidth: 1, alignItems: "center", gap: 4 },
  kellyResultLabel:   { fontSize: 12 },
  kellyResultValue:   { fontSize: 28, letterSpacing: -0.5, fontFamily: "Inter_700Bold" },
  kellyResultPct:     { fontSize: 12 },
  sectionTitle:       { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyHistory:       { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptyText:          { fontSize: 14 },
  emotionalBanner:    { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  emotionalTitle:     { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emotionalText:      { fontSize: 13, lineHeight: 18 },
  historyList:        { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  entryRow:           { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1 },
  entryIcon:          { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  entryInfo:          { flex: 1 },
  entryLabel:         { fontSize: 14 },
  entryDate:          { fontSize: 11, marginTop: 1 },
  entryAmount:        { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  // Performance tab
  perfHeader:         { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  perfSubtitle:       { fontSize: 12 },
  errorCard:          { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  errorText:          { flex: 1, fontSize: 13 },
  statsGrid:          { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard:           { borderRadius: 14, padding: 14, borderWidth: 1, width: "47.5%", gap: 4 },
  statLabel:          { fontSize: 12 },
  statValue:          { fontSize: 22, letterSpacing: -0.5, fontFamily: "Inter_700Bold" },
  statSub:            { fontSize: 11 },
  skeleton:           { height: 14, borderRadius: 7 },
  emptyCard:          { borderRadius: 16, padding: 20, borderWidth: 1, alignItems: "center", gap: 10 },
  emptyCardTitle:     { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyCardText:      { fontSize: 13, textAlign: "center", lineHeight: 18 },
  sectionCard:        { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sportRow:           { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  sportDot:           { width: 10, height: 10, borderRadius: 5 },
  sportName:          { fontSize: 13, width: 40 },
  sportBarWrap:       { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  sportBarBg:         { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  sportBarFill:       { height: "100%", borderRadius: 3 },
  sportWinRate:       { fontSize: 11, width: 52, textAlign: "right" },
  sportConf:          { fontSize: 11, width: 52, textAlign: "right" },
  tableHeader:        { flexDirection: "row", padding: 12, borderBottomWidth: 1, gap: 8 },
  tableHeaderText:    { fontSize: 11, letterSpacing: 0.5, flex: 1, textTransform: "uppercase" },
  tableRow:           { flexDirection: "row", padding: 14, alignItems: "center", gap: 8 },
  tableCell:          { fontSize: 13, flex: 1 },
  adminLink:          { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  adminLinkText:      { flex: 1, fontSize: 14 },
  leaderboardBtn:     { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  leaderboardBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  // Paper bets
  comingSoonBadge:    { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1, marginTop: 16 },
  comingSoonText:     { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  featureRow:         { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  featureText:        { fontSize: 14, flex: 1 },
  // Modal
  modal:              { flex: 1 },
  modalHeader:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, paddingTop: 24, borderBottomWidth: 1 },
  modalTitle:         { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  modalBody:          { padding: 20, gap: 16 },
  typeRow:            { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeBtn:            { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  typeBtnText:        { fontSize: 13 },
  field:              { gap: 6 },
  fieldLabel:         { fontSize: 13 },
  fieldInput:         { borderRadius: 10, borderWidth: 1, padding: 14, fontSize: 16 },
  submitBtn:          { borderRadius: 14, padding: 16, alignItems: "center" },
  submitText:         { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
