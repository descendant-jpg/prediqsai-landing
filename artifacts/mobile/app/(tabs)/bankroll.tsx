import * as Haptics from "expo-haptics";
import { AlertTriangle, Cpu, Inbox, MinusCircle, PlusCircle, TrendingDown, TrendingUp, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { BankrollEntry, EntryType } from "@/types";

type IconComp = React.ComponentType<{ size: number; color: string }>;

const ENTRY_TYPES: {
  type: EntryType;
  label: string;
  Icon: IconComp;
  color: string;
}[] = [
  { type: "deposit", label: "Deposit", Icon: PlusCircle, color: "#00FF94" },
  { type: "withdrawal", label: "Withdraw", Icon: MinusCircle, color: "#FF6B35" },
  { type: "win", label: "Win", Icon: TrendingUp, color: "#00E5FF" },
  { type: "loss", label: "Loss", Icon: TrendingDown, color: "#FF4D4D" },
];

function KellyCalculator() {
  const colors = useColors();
  const { profile } = useApp();
  const [odds, setOdds] = useState("");
  const [probability, setProbability] = useState("");
  const [result, setResult] = useState<number | null>(null);

  function calculate() {
    const p = parseFloat(probability) / 100;
    const rawOdds = parseFloat(odds);
    if (isNaN(p) || isNaN(rawOdds) || p <= 0 || p >= 1) return;

    let decimalOdds: number;
    if (rawOdds >= 100) {
      decimalOdds = rawOdds / 100 + 1;
    } else if (rawOdds <= -100) {
      decimalOdds = 100 / Math.abs(rawOdds) + 1;
    } else {
      return;
    }

    const b = decimalOdds - 1;
    const q = 1 - p;
    const kelly = (b * p - q) / b;

    if (kelly <= 0) {
      setResult(0);
      return;
    }

    const fractionalKelly = kelly * 0.5;
    const bankrollAmt = parseFloat(String(profile.bankroll));
    setResult(isNaN(bankrollAmt) ? 0 : fractionalKelly * bankrollAmt);
  }

  return (
    <View style={[styles.kellyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.kellyHeader}>
        <Cpu size={18} color={colors.cyan} />
        <Text style={[styles.kellyTitle, { color: colors.text }]}>Kelly Calculator</Text>
      </View>
      <Text style={[styles.kellyDesc, { color: colors.textSecondary }]}>
        Calculate optimal stake size using half-Kelly criterion
      </Text>

      <View style={styles.kellyInputs}>
        <View style={styles.kellyField}>
          <Text style={[styles.kellyLabel, { color: colors.textSecondary }]}>American Odds</Text>
          <TextInput
            style={[styles.kellyInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            value={odds}
            onChangeText={setOdds}
            placeholder="e.g. -110"
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={styles.kellyField}>
          <Text style={[styles.kellyLabel, { color: colors.textSecondary }]}>Win Prob. (%)</Text>
          <TextInput
            style={[styles.kellyInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            value={probability}
            onChangeText={setProbability}
            placeholder="e.g. 65"
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.calcBtn, { backgroundColor: colors.cyan }]}
        onPress={calculate}
        activeOpacity={0.85}
      >
        <Text style={[styles.calcBtnText, { color: colors.background }]}>Calculate Stake</Text>
      </TouchableOpacity>

      {result !== null && (
        <View style={[styles.kellyResult, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.kellyResultLabel, { color: colors.textSecondary }]}>Recommended Stake</Text>
          <Text style={[styles.kellyResultValue, { color: colors.cyan }]}>${result.toFixed(2)}</Text>
          <Text style={[styles.kellyResultPct, { color: colors.textMuted }]}>
            {((result / profile.bankroll) * 100).toFixed(1)}% of bankroll
          </Text>
        </View>
      )}
    </View>
  );
}

function EntryRow({ entry }: { entry: BankrollEntry }) {
  const colors = useColors();
  const isPositive = entry.type === "deposit" || entry.type === "win";
  const config = ENTRY_TYPES.find((t) => t.type === entry.type)!;

  return (
    <View style={[styles.entryRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.entryIcon, { backgroundColor: `${config.color}18` }]}>
        <config.Icon size={18} color={config.color} />
      </View>
      <View style={styles.entryInfo}>
        <Text style={[styles.entryLabel, { color: colors.text }]}>
          {config.label}
          {entry.description ? ` — ${entry.description}` : ""}
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

export default function BankrollScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, bankrollEntries, addEntry } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<EntryType>("deposit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + topPaddingWeb;

  const todayLoss = bankrollEntries
    .filter((e) => {
      const isToday = new Date(e.createdAt).toDateString() === new Date().toDateString();
      return isToday && e.type === "loss";
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const lossPercent = Math.min(100, (todayLoss / (profile.dailyLossLimit || 200)) * 100);

  const recentHourLosses = bankrollEntries.filter(
    (e) => e.type === "loss" && Date.now() - new Date(e.createdAt).getTime() < 2 * 60 * 60 * 1000,
  );
  const showEmotionalWarning = recentHourLosses.length >= 3;

  async function handleAddEntry() {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) return;
    setIsSubmitting(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addEntry({
        type: selectedType,
        amount: parsed,
        description: note.trim() || undefined,
      });
      setAmount("");
      setNote("");
      setModalVisible(false);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to add entry");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topPadding + 16,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>Bankroll</Text>

        <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Current Balance</Text>
          <Text style={[styles.balance, { color: colors.gold }]}>
            ${profile.bankroll.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </Text>

          <View style={styles.limitSection}>
            <View style={styles.limitHeader}>
              <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>Daily Loss Limit</Text>
              <Text style={[styles.limitValue, { color: lossPercent >= 80 ? colors.red : colors.textSecondary }]}>
                ${todayLoss.toFixed(0)} / ${profile.dailyLossLimit}
              </Text>
            </View>
            <View style={[styles.limitBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.limitFill,
                  {
                    width: `${lossPercent}%` as any,
                    backgroundColor:
                      lossPercent >= 80 ? colors.red : lossPercent >= 50 ? colors.gold : colors.green,
                  },
                ]}
              />
            </View>
            {lossPercent >= 80 && (
              <View style={[styles.warningBanner, { backgroundColor: "rgba(255,77,77,0.1)", borderColor: "rgba(255,77,77,0.3)" }]}>
                <AlertTriangle size={14} color={colors.red} />
                <Text style={[styles.warningText, { color: colors.red }]}>
                  You've had a tough session. Consider taking a break.
                </Text>
              </View>
            )}
          </View>
        </View>

        {showEmotionalWarning && (
          <View style={[styles.emotionalBanner, { backgroundColor: "rgba(255,107,53,0.1)", borderColor: "rgba(255,107,53,0.3)" }]}>
            <AlertTriangle size={16} color="#FF6B35" />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.emotionalTitle, { color: "#FF6B35" }]}>Emotional Betting Alert</Text>
              <Text style={[styles.emotionalText, { color: colors.textSecondary }]}>
                {recentHourLosses.length} losses in 2 hours detected. Take a break before placing more bets.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.actionsRow}>
          {ENTRY_TYPES.map((t) => (
            <TouchableOpacity
              key={t.type}
              style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => { setSelectedType(t.type); setModalVisible(true); }}
              activeOpacity={0.8}
            >
              <t.Icon size={20} color={t.color} />
              <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <KellyCalculator />

        <Text style={[styles.historyTitle, { color: colors.text }]}>History</Text>
        {bankrollEntries.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Inbox size={28} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No entries yet</Text>
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

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Entry</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.typeRow}>
              {ENTRY_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.type}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: selectedType === t.type ? `${t.color}22` : colors.card,
                      borderColor: selectedType === t.type ? t.color : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedType(t.type)}
                  activeOpacity={0.8}
                >
                  <t.Icon size={16} color={t.color} />
                  <Text style={[styles.typeBtnText, { color: selectedType === t.type ? t.color : colors.textSecondary }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Amount ($)</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Note (optional)</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Chiefs vs Bills"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.cyan, opacity: amount && !isSubmitting ? 1 : 0.5 }]}
              onPress={handleAddEntry}
              disabled={!amount || isSubmitting}
              activeOpacity={0.85}
            >
              <Text style={[styles.submitText, { color: colors.background }]}>
                {isSubmitting ? "Saving…" : "Add Entry"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  title: { fontSize: 24, letterSpacing: -0.5, marginBottom: 4 },
  balanceCard: { borderRadius: 16, padding: 20, borderWidth: 1, gap: 16 },
  balanceLabel: { fontSize: 13 },
  balance: { fontSize: 40, letterSpacing: -1 },
  limitSection: { gap: 8 },
  limitHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  limitLabel: { fontSize: 12 },
  limitValue: { fontSize: 12 },
  limitBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  limitFill: { height: "100%", borderRadius: 3 },
  warningBanner: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 8, borderWidth: 1 },
  warningText: { fontSize: 12, flex: 1 },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1, alignItems: "center", gap: 6 },
  actionLabel: { fontSize: 11 },
  kellyCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  kellyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  kellyTitle: { fontSize: 16 },
  kellyDesc: { fontSize: 13 },
  kellyInputs: { flexDirection: "row", gap: 10 },
  kellyField: { flex: 1, gap: 4 },
  kellyLabel: { fontSize: 11 },
  kellyInput: { borderRadius: 8, borderWidth: 1, padding: 10, fontSize: 14 },
  calcBtn: { borderRadius: 10, padding: 12, alignItems: "center" },
  calcBtnText: { fontSize: 14 },
  kellyResult: { borderRadius: 10, padding: 14, borderWidth: 1, alignItems: "center", gap: 4 },
  kellyResultLabel: { fontSize: 12 },
  kellyResultValue: { fontSize: 28, letterSpacing: -0.5 },
  kellyResultPct: { fontSize: 12 },
  historyTitle: { fontSize: 16 },
  emptyHistory: { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptyText: { fontSize: 14 },
  emotionalBanner: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  emotionalTitle: { fontSize: 14 },
  emotionalText: { fontSize: 13, lineHeight: 18 },
  historyList: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  entryRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1 },
  entryIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  entryInfo: { flex: 1 },
  entryLabel: { fontSize: 14 },
  entryDate: { fontSize: 11, marginTop: 1 },
  entryAmount: { fontSize: 15 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18 },
  modalBody: { padding: 20, gap: 16 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeBtnText: { fontSize: 13 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13 },
  fieldInput: { borderRadius: 10, borderWidth: 1, padding: 14, fontSize: 16 },
  submitBtn: { borderRadius: 14, padding: 16, alignItems: "center" },
  submitText: { fontSize: 16 },
});
