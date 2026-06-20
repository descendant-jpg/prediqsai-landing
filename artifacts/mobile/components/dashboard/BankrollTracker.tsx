import { ChevronDown, ChevronUp, Plus, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { LineChart } from "@/components/dashboard/LineChart";
import { useColors } from "@/hooks/useColors";
import { BANKROLL_HISTORY, BANKROLL_START, type BetEntry } from "@/lib/mockData";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";

function pnl(entry: BetEntry): number {
  return entry.result === "won" ? entry.stake * (entry.odds - 1) : -entry.stake;
}

export function BankrollTracker() {
  const colors = useColors();
  const [expanded, setExpanded] = useState(true);
  const [entries, setEntries] = useState<BetEntry[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [chartWidth, setChartWidth] = useState(0);

  const [match, setMatch] = useState("");
  const [stake, setStake] = useState("");
  const [odds, setOdds] = useState("");
  const [result, setResult] = useState<"won" | "lost">("won");

  useEffect(() => {
    (async () => {
      const stored = await getItem<BetEntry[]>(STORAGE_KEYS.bankrollEntries, []);
      setEntries(stored);
    })();
  }, []);

  const totalPnl = entries.reduce((sum, e) => sum + pnl(e), 0);
  const hasEntries = entries.length > 0;

  const starting = BANKROLL_START;
  const current = hasEntries ? starting + totalPnl : BANKROLL_HISTORY[BANKROLL_HISTORY.length - 1].value;
  const profit = current - starting;
  const totalStaked = entries.reduce((sum, e) => sum + e.stake, 0);
  const roi = hasEntries
    ? totalStaked > 0
      ? (totalPnl / totalStaked) * 100
      : 0
    : (profit / starting) * 100;

  const chartData = hasEntries
    ? (() => {
        let running = starting;
        const series = [starting];
        for (const e of entries) {
          running += pnl(e);
          series.push(running);
        }
        return series;
      })()
    : BANKROLL_HISTORY.map((p) => p.value);

  const profitColor = profit >= 0 ? colors.green : colors.red;

  async function handleLogBet() {
    const stakeNum = parseFloat(stake);
    const oddsNum = parseFloat(odds);
    if (!match.trim() || !Number.isFinite(stakeNum) || stakeNum <= 0 || !Number.isFinite(oddsNum) || oddsNum <= 1) {
      return;
    }
    const entry: BetEntry = {
      id: `bet_${Date.now()}`,
      match: match.trim(),
      stake: stakeNum,
      odds: oddsNum,
      result,
      createdAt: Date.now(),
    };
    const next = [...entries, entry];
    setEntries(next);
    await setItem(STORAGE_KEYS.bankrollEntries, next);
    setMatch("");
    setStake("");
    setOdds("");
    setResult("won");
    setModalOpen(false);
  }

  const previewReturn = (() => {
    const s = parseFloat(stake);
    const o = parseFloat(odds);
    if (!Number.isFinite(s) || !Number.isFinite(o)) return null;
    return result === "won" ? s * (o - 1) : -s;
  })();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <TouchableOpacity style={styles.header} activeOpacity={0.8} onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.icon}>💰</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Bankroll Tracker</Text>
          <Text style={[styles.subtitle, { color: profitColor }]}>
            ${current.toFixed(0)} · {profit >= 0 ? "+" : ""}${profit.toFixed(0)}
          </Text>
        </View>
        {expanded ? <ChevronUp size={20} color={colors.textMuted} /> : <ChevronDown size={20} color={colors.textMuted} />}
      </TouchableOpacity>

      {expanded && (
        <View style={{ gap: 14 }}>
          <View style={styles.statsGrid}>
            <Stat label="STARTING" value={`$${starting.toFixed(0)}`} color={colors.text} />
            <Stat label="CURRENT" value={`$${current.toFixed(0)}`} color={colors.text} />
            <Stat label="PROFIT/LOSS" value={`${profit >= 0 ? "+" : ""}$${profit.toFixed(0)}`} color={profitColor} />
            <Stat label="ROI" value={`${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%`} color={profitColor} />
          </View>

          <View style={styles.chartWrap} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
            {chartWidth > 0 && <LineChart data={chartData} width={chartWidth} height={110} color={colors.gold} />}
          </View>

          <TouchableOpacity
            style={[styles.logBtn, { backgroundColor: colors.gold }]}
            activeOpacity={0.85}
            onPress={() => setModalOpen(true)}
          >
            <Plus size={16} color="#0a0a0a" />
            <Text style={styles.logBtnText}>Log a Bet</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModalOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Log a Bet</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Field label="Match" value={match} onChangeText={setMatch} placeholder="e.g. Arsenal vs Chelsea" colors={colors} />
            <Field label="Stake ($)" value={stake} onChangeText={setStake} placeholder="50" keyboardType="numeric" colors={colors} />
            <Field label="Odds" value={odds} onChangeText={setOdds} placeholder="1.85" keyboardType="numeric" colors={colors} />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Result</Text>
            <View style={styles.resultRow}>
              {(["won", "lost"] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.resultBtn,
                    {
                      backgroundColor: result === r ? (r === "won" ? "rgba(0,255,148,0.12)" : "rgba(255,77,77,0.12)") : colors.background,
                      borderColor: result === r ? (r === "won" ? colors.green : colors.red) : colors.border,
                    },
                  ]}
                  onPress={() => setResult(r)}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: result === r ? (r === "won" ? colors.green : colors.red) : colors.textMuted, fontSize: 14, ...semibold }}>
                    {r === "won" ? "Won ✓" : "Lost ✗"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {previewReturn != null && (
              <Text style={[styles.preview, { color: previewReturn >= 0 ? colors.green : colors.red }]}>
                {previewReturn >= 0 ? "Profit" : "Loss"}: {previewReturn >= 0 ? "+" : ""}${previewReturn.toFixed(2)}
              </Text>
            )}

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.gold }]} activeOpacity={0.85} onPress={handleLogBet}>
              <Text style={styles.saveBtnText}>Save Bet</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: "numeric";
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
      />
    </View>
  );
}

const bold = Platform.OS === "web" ? ({ fontWeight: "700" } as const) : ({ fontFamily: "Inter_700Bold" } as const);
const semibold = Platform.OS === "web" ? ({ fontWeight: "600" } as const) : ({ fontFamily: "Inter_600SemiBold" } as const);

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { fontSize: 22 },
  title: { fontSize: 16, ...bold },
  subtitle: { fontSize: 13, marginTop: 1, ...semibold },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statBox: { width: "47.5%", flexGrow: 1, borderRadius: 10, borderWidth: 1, padding: 10, gap: 2 },
  statLabel: { fontSize: 9, letterSpacing: 0.4 },
  statValue: { fontSize: 17, ...bold, letterSpacing: -0.3 },
  chartWrap: { width: "100%" },
  logBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  logBtnText: { fontSize: 14, color: "#0a0a0a", ...bold },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, gap: 12 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  sheetTitle: { fontSize: 18, ...bold },
  fieldLabel: { fontSize: 11, letterSpacing: 0.4 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  resultRow: { flexDirection: "row", gap: 10 },
  resultBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  preview: { fontSize: 14, textAlign: "center", ...semibold },
  saveBtn: { alignItems: "center", paddingVertical: 14, borderRadius: 12, marginTop: 4 },
  saveBtnText: { fontSize: 15, color: "#0a0a0a", ...bold },
});
