import { ChevronDown, ChevronUp, Plus, X } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { LineChart } from "@/components/dashboard/LineChart";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { api, type ApiBankrollEntry, type BankrollData } from "@/lib/api";

function delta(entry: ApiBankrollEntry): number {
  return entry.type === "deposit" || entry.type === "win" ? entry.amount : -entry.amount;
}

export function BankrollTracker() {
  const colors = useColors();
  const { token } = useAuth();
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(true);
  const [data, setData] = useState<BankrollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [chartWidth, setChartWidth] = useState(0);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<"win" | "loss">("win");

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setData(await api.bankroll.get(token));
      setError("");
    } catch {
      setError(t("bankrollTracker.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const entries = data?.entries ?? [];
  const hasAggregates = data != null
    && typeof data.currentBankroll === "number"
    && typeof data.totalDeposits === "number"
    && typeof data.totalWithdrawals === "number"
    && typeof data.totalWon === "number"
    && typeof data.totalLost === "number";
  const current = hasAggregates ? data.currentBankroll! : (data?.bankroll ?? 0);
  const recentChange = entries.reduce((sum, entry) => sum + delta(entry), 0);
  const totalChange = hasAggregates
    ? data.totalDeposits! + data.totalWon! - data.totalWithdrawals! - data.totalLost!
    : recentChange;
  const starting = current - totalChange;
  const profit = hasAggregates ? data.totalWon! - data.totalLost! : current - starting;
  const chartData = (() => {
    if (!entries.length) return [];
    let running = current;
    const newestToOldest = [current];
    for (const entry of entries) {
      running -= delta(entry);
      newestToOldest.push(running);
    }
    return newestToOldest.reverse();
  })();

  async function handleAddEntry() {
    const parsed = Number.parseFloat(amount);
    if (!token || !Number.isFinite(parsed) || parsed <= 0 || saving) return;
    setSaving(true);
    try {
      await api.bankroll.addEntry(token, {
        type: result,
        amount: parsed,
        description: description.trim() || undefined,
      });
      setDescription("");
      setAmount("");
      setResult("win");
      setModalOpen(false);
      await load();
    } catch {
      setError(t("bankrollTracker.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <TouchableOpacity style={styles.header} activeOpacity={0.8} onPress={() => setExpanded((value) => !value)}>
        <Text style={styles.icon}>💰</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{t("bankrollTracker.title")}</Text>
          {!loading && <Text style={[styles.subtitle, { color: profit >= 0 ? colors.green : colors.red }]}>
            ${current.toFixed(0)} · {profit >= 0 ? "+" : ""}${profit.toFixed(0)}
          </Text>}
        </View>
        {expanded ? <ChevronUp size={20} color={colors.textMuted} /> : <ChevronDown size={20} color={colors.textMuted} />}
      </TouchableOpacity>

      {expanded && (
        <View style={{ gap: 14 }}>
          {loading ? <ActivityIndicator color={colors.cyan} /> : error ? (
            <TouchableOpacity onPress={load}><Text style={[styles.message, { color: colors.red }]}>{error}</Text></TouchableOpacity>
          ) : entries.length === 0 ? (
            <View style={[styles.empty, { borderColor: colors.border }]}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("bankrollTracker.emptyTitle")}</Text>
              <Text style={[styles.message, { color: colors.textMuted }]}>{t("bankrollTracker.emptyText")}</Text>
            </View>
          ) : (
            <>
              <View style={styles.statsGrid}>
                <Stat label={t("bankrollTracker.starting")} value={`$${starting.toFixed(0)}`} color={colors.text} />
                <Stat label={t("bankrollTracker.current")} value={`$${current.toFixed(0)}`} color={colors.text} />
                <Stat label={t("bankrollTracker.profitLoss")} value={`${profit >= 0 ? "+" : ""}$${profit.toFixed(0)}`} color={profit >= 0 ? colors.green : colors.red} />
              </View>
              <View style={styles.chartWrap} onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}>
                <Text style={[styles.chartLabel, { color: colors.textMuted }]}>{t("bankrollTracker.recentActivity")}</Text>
                {chartWidth > 0 && <LineChart data={chartData} width={chartWidth} height={110} color={colors.gold} />}
              </View>
            </>
          )}
          <TouchableOpacity style={[styles.logBtn, { backgroundColor: colors.gold }]} activeOpacity={0.85} onPress={() => setModalOpen(true)}>
            <Plus size={16} color="#0a0a0a" />
            <Text style={styles.logBtnText}>{t("bankrollTracker.addEntry")}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModalOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={(event) => event.stopPropagation()}>
            <KeyboardAwareScrollViewCompat contentContainerStyle={styles.form}>
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>{t("bankrollTracker.addEntry")}</Text>
                <TouchableOpacity onPress={() => setModalOpen(false)}><X size={22} color={colors.textSecondary} /></TouchableOpacity>
              </View>
              <Field label={t("bankrollTracker.description")} value={description} onChangeText={setDescription} placeholder={t("bankrollTracker.descriptionPlaceholder")} colors={colors} />
              <Field label={t("bankrollTracker.amount")} value={amount} onChangeText={setAmount} placeholder="0" numeric colors={colors} />
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{t("bankrollTracker.result")}</Text>
              <View style={styles.resultRow}>
                {(["win", "loss"] as const).map((value) => (
                  <TouchableOpacity key={value} style={[styles.resultBtn, {
                    backgroundColor: result === value ? (value === "win" ? "rgba(0,255,148,0.12)" : "rgba(255,77,77,0.12)") : colors.background,
                    borderColor: result === value ? (value === "win" ? colors.green : colors.red) : colors.border,
                  }]} onPress={() => setResult(value)}>
                    <Text style={{ color: result === value ? (value === "win" ? colors.green : colors.red) : colors.textMuted }}>
                      {value === "win" ? t("bankrollTracker.win") : t("bankrollTracker.loss")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity disabled={saving} style={[styles.saveBtn, { backgroundColor: colors.gold }]} onPress={handleAddEntry}>
                {saving ? <ActivityIndicator color="#0a0a0a" /> : <Text style={styles.saveBtnText}>{t("bankrollTracker.save")}</Text>}
              </TouchableOpacity>
            </KeyboardAwareScrollViewCompat>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return <View style={[styles.statBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
  </View>;
}

function Field({ label, value, onChangeText, placeholder, numeric, colors }: {
  label: string; value: string; onChangeText: (text: string) => void; placeholder: string; numeric?: boolean; colors: ReturnType<typeof useColors>;
}) {
  return <View style={{ gap: 6 }}>
    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textMuted}
      keyboardType={numeric ? "numeric" : "default"} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} />
  </View>;
}

const bold = Platform.OS === "web" ? ({ fontWeight: "700" } as const) : ({ fontFamily: "Inter_700Bold" } as const);
const semibold = Platform.OS === "web" ? ({ fontWeight: "600" } as const) : ({ fontFamily: "Inter_600SemiBold" } as const);
const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 }, icon: { fontSize: 22 },
  title: { fontSize: 16, ...bold }, subtitle: { fontSize: 13, marginTop: 1, ...semibold },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statBox: { flex: 1, minWidth: "30%", borderRadius: 10, borderWidth: 1, padding: 10, gap: 2 },
  statLabel: { fontSize: 9, letterSpacing: 0.4 }, statValue: { fontSize: 17, ...bold },
  chartWrap: { width: "100%", gap: 6 }, chartLabel: { fontSize: 10, letterSpacing: 0.5 },
  message: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  empty: { borderWidth: 1, borderStyle: "dashed", borderRadius: 12, padding: 18, gap: 6 },
  emptyTitle: { fontSize: 15, textAlign: "center", ...bold },
  logBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  logBtnText: { fontSize: 14, color: "#0a0a0a", ...bold },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { maxHeight: "90%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1 },
  form: { padding: 20, gap: 12 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  sheetTitle: { fontSize: 18, ...bold }, fieldLabel: { fontSize: 11, letterSpacing: 0.4 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  resultRow: { flexDirection: "row", gap: 10 },
  resultBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  saveBtn: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 12, marginTop: 4 },
  saveBtnText: { fontSize: 15, color: "#0a0a0a", ...bold },
});