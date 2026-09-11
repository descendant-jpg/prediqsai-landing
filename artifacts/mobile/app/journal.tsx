import { useRouter } from "expo-router";
import { ArrowLeft, Plus, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";

interface BetEntry {
  id: string;
  match: string;
  stake: number;
  odds: number;
  result: "won" | "lost";
  createdAt: number;
}

function entryPnl(e: BetEntry): number {
  return e.result === "won" ? e.stake * (e.odds - 1) : -e.stake;
}

function confirmDelete(onConfirm: () => void, t: (key: string) => string) {
  if (Platform.OS === "web") {
    if (window.confirm(t("journal.deleteConfirm"))) onConfirm();
  } else {
    Alert.alert(t("journal.deleteTitle"), t("journal.deleteConfirm"), [
      { text: t("journal.cancel"), style: "cancel" },
      { text: t("journal.delete"), style: "destructive", onPress: onConfirm },
    ]);
  }
}

export default function JournalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();

  const [entries, setEntries] = useState<BetEntry[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [match, setMatch] = useState("");
  const [stake, setStake] = useState("");
  const [odds, setOdds] = useState("");
  const [result, setResult] = useState<"won" | "lost">("won");

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  useEffect(() => {
    (async () => {
      const stored = await getItem<BetEntry[]>(STORAGE_KEYS.journalEntries, []);
      setEntries(stored);
    })();
  }, []);

  const totalStaked = entries.reduce((s, e) => s + e.stake, 0);
  const totalReturned = entries.reduce((s, e) => s + (e.result === "won" ? e.stake * e.odds : 0), 0);
  const profit = totalReturned - totalStaked;
  const userRoi = totalStaked > 0 ? (profit / totalStaked) * 100 : 0;

  async function persist(next: BetEntry[]) {
    setEntries(next);
    await setItem(STORAGE_KEYS.journalEntries, next);
  }

  async function handleAdd() {
    const s = parseFloat(stake);
    const o = parseFloat(odds);
    if (!match.trim() || !Number.isFinite(s) || s <= 0 || !Number.isFinite(o) || o <= 1) return;
    const entry: BetEntry = {
      id: `j_${Date.now()}`,
      match: match.trim(),
      stake: s,
      odds: o,
      result,
      createdAt: Date.now(),
    };
    await persist([entry, ...entries]);
    setMatch("");
    setStake("");
    setOdds("");
    setResult("won");
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    confirmDelete(() => {
      void persist(entries.filter((e) => e.id !== id));
    }, t);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 14, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t("journal.title")}</Text>
        <TouchableOpacity onPress={() => setModalOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Plus size={22} color={colors.gold} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 16 }}>
        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.summaryGrid}>
            <Summary label={t("journal.staked")} value={`$${totalStaked.toFixed(0)}`} color={colors.text} />
            <Summary label={t("journal.returned")} value={`$${totalReturned.toFixed(0)}`} color={colors.text} />
            <Summary label={t("journal.profitLoss")} value={`${profit >= 0 ? "+" : ""}$${profit.toFixed(0)}`} color={profit >= 0 ? colors.green : colors.red} />
            <Summary label={t("journal.yourRoi")} value={`${userRoi >= 0 ? "+" : ""}${userRoi.toFixed(1)}%`} color={userRoi >= 0 ? colors.green : colors.red} />
          </View>
        </View>

        {/* Entries */}
        <Text style={[styles.listLabel, { color: colors.textMuted }]}>{t("journal.yourBets", { count: entries.length })}</Text>
        {entries.length === 0 ? (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t("journal.empty")}
            </Text>
          </View>
        ) : (
          entries.map((e) => {
            const won = e.result === "won";
            const p = entryPnl(e);
            return (
              <Pressable
                key={e.id}
                onLongPress={() => handleDelete(e.id)}
                delayLongPress={350}
                style={[styles.entry, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <View style={[styles.resultDot, { backgroundColor: won ? "rgba(0,255,148,0.12)" : "rgba(255,77,77,0.12)" }]}>
                  <Text style={{ color: won ? colors.green : colors.red, fontSize: 16 }}>{won ? "✓" : "✗"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.entryMatch, { color: colors.text }]} numberOfLines={1}>{e.match}</Text>
                  <Text style={[styles.entryMeta, { color: colors.textMuted }]}>
                    ${e.stake.toFixed(0)} @ {e.odds.toFixed(2)}
                  </Text>
                </View>
                <Text style={[styles.entryPnl, { color: p >= 0 ? colors.green : colors.red }]}>
                  {p >= 0 ? "+" : ""}${p.toFixed(0)}
                </Text>
              </Pressable>
            );
          })
        )}
        {entries.length > 0 && (
          <Text style={[styles.hint, { color: colors.textMuted }]}>{t("journal.deleteHint")}</Text>
        )}
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModalOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={(ev) => ev.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{t("journal.logBet")}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <KeyboardAwareScrollViewCompat contentContainerStyle={{ gap: 12 }}>
            <Field label={t("journal.match")} value={match} onChangeText={setMatch} placeholder={t("journal.matchPlaceholder")} colors={colors} />
            <Field label={t("journal.stake")} value={stake} onChangeText={setStake} placeholder="0" keyboardType="numeric" colors={colors} />
            <Field label={t("journal.odds")} value={odds} onChangeText={setOdds} placeholder="0" keyboardType="numeric" colors={colors} />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{t("journal.result")}</Text>
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
                    {r === "won" ? t("journal.won") : t("journal.lost")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.gold }]} activeOpacity={0.85} onPress={handleAdd}>
              <Text style={styles.saveBtnText}>{t("journal.save")}</Text>
            </TouchableOpacity>
            </KeyboardAwareScrollViewCompat>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Summary({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.summaryBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={[styles.summaryBoxLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.summaryBoxValue, { color }]}>{value}</Text>
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
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, ...bold },
  summaryCard: { borderRadius: 16, padding: 14, borderWidth: 1 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryBox: { width: "47.5%", flexGrow: 1, borderRadius: 10, borderWidth: 1, padding: 10, gap: 2 },
  summaryBoxLabel: { fontSize: 9, letterSpacing: 0.4 },
  summaryBoxValue: { fontSize: 17, ...bold, letterSpacing: -0.3 },
  compareCard: { borderRadius: 16, padding: 16, borderWidth: 1.5, gap: 12 },
  compareTitle: { fontSize: 13, ...bold, letterSpacing: 0.5 },
  compareRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  compareCol: { flex: 1, alignItems: "center", gap: 4 },
  compareLabel: { fontSize: 10, letterSpacing: 0.5 },
  compareValue: { fontSize: 24, ...bold, letterSpacing: -0.5 },
  vs: { fontSize: 13, paddingHorizontal: 8 },
  compareNote: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  listLabel: { fontSize: 11, letterSpacing: 0.8, ...bold },
  empty: { borderRadius: 12, borderWidth: 1, borderStyle: "dashed", padding: 24, alignItems: "center" },
  emptyText: { fontSize: 13, textAlign: "center" },
  entry: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  resultDot: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  entryMatch: { fontSize: 14, ...semibold },
  entryMeta: { fontSize: 12, marginTop: 1 },
  entryPnl: { fontSize: 15, ...bold },
  hint: { fontSize: 11, textAlign: "center", marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, gap: 12 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  sheetTitle: { fontSize: 18, ...bold },
  fieldLabel: { fontSize: 11, letterSpacing: 0.4 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  resultRow: { flexDirection: "row", gap: 10 },
  resultBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  saveBtn: { alignItems: "center", paddingVertical: 14, borderRadius: 12, marginTop: 4 },
  saveBtnText: { fontSize: 15, color: "#0a0a0a", ...bold },
});
