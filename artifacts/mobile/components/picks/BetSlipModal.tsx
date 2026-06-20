import { Share2, Trash2, X } from "lucide-react-native";
import React, { useState } from "react";
import { Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { ProPick } from "@/lib/mockData";

/** Feature 6 — Bet Slip builder modal with combined odds + potential return. */
export function BetSlipModal({
  visible,
  slip,
  onClose,
  onRemove,
  onClear,
  onShare,
}: {
  visible: boolean;
  slip: ProPick[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onShare: () => void;
}) {
  const colors = useColors();
  const [stakeRaw, setStakeRaw] = useState("10");

  const combined = slip.reduce((acc, p) => acc * p.odds, 1);
  const stake = Number.parseFloat(stakeRaw) || 0;
  const potentialReturn = stake * combined;
  const profit = potentialReturn - stake;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: "#0f0f0f", borderColor: colors.border }]}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>🎟️ Bet Slip {slip.length > 0 ? `(${slip.length})` : ""}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {slip.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎟️</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Your slip is empty</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Tap "Slip" on any pick to start building your accumulator.
              </Text>
            </View>
          ) : (
            <>
              <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                {slip.map((p) => (
                  <View key={p.id} style={[styles.legRow, { borderColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.legMatch, { color: colors.text }]} numberOfLines={1}>
                        {p.homeTeam} vs {p.awayTeam}
                      </Text>
                      <Text style={[styles.legPick, { color: colors.gold }]} numberOfLines={1}>
                        {p.aiPick}
                      </Text>
                    </View>
                    <Text style={[styles.legOdds, { color: colors.text }]}>{p.odds.toFixed(2)}</Text>
                    <TouchableOpacity onPress={() => onRemove(p.id)} hitSlop={8} style={styles.removeBtn}>
                      <Trash2 size={17} color={colors.red} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              {/* Stake + returns */}
              <View style={[styles.calc, { borderColor: colors.border }]}>
                <View style={styles.calcRow}>
                  <Text style={[styles.calcLabel, { color: colors.textSecondary }]}>Combined Odds</Text>
                  <Text style={[styles.calcValueGold, { color: colors.gold }]}>{combined.toFixed(2)}</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={[styles.calcLabel, { color: colors.textSecondary }]}>Stake</Text>
                  <View style={[styles.stakeBox, { borderColor: colors.border }]}>
                    <Text style={[styles.currency, { color: colors.textSecondary }]}>$</Text>
                    <TextInput
                      value={stakeRaw}
                      onChangeText={(t) => setStakeRaw(t.replace(/[^0-9.]/g, ""))}
                      keyboardType="decimal-pad"
                      style={[styles.stakeInput, { color: colors.text }]}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
                <View style={styles.calcRow}>
                  <Text style={[styles.calcLabel, { color: colors.textSecondary }]}>Potential Profit</Text>
                  <Text style={[styles.calcValue, { color: colors.green }]}>${profit.toFixed(2)}</Text>
                </View>
                <View style={[styles.calcRow, styles.returnRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.returnLabel, { color: colors.text }]}>Potential Return</Text>
                  <Text style={[styles.returnValue, { color: colors.gold }]}>${potentialReturn.toFixed(2)}</Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.footerActions}>
                <TouchableOpacity onPress={onClear} activeOpacity={0.8} style={[styles.clearBtn, { borderColor: colors.red }]}>
                  <Text style={[styles.clearText, { color: colors.red }]}>Clear All</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onShare} activeOpacity={0.9} style={[styles.shareBtn, { backgroundColor: colors.gold }]}>
                  <Share2 size={17} color="#0a0a0a" />
                  <Text style={styles.shareText}>Share Slip</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: Platform.OS === "web" ? 24 : 34,
  },
  handleRow: { alignItems: "center", paddingVertical: 8 },
  handle: { width: 42, height: 5, borderRadius: 3 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  title: { fontSize: 18, fontWeight: "900" },
  closeBtn: { padding: 4 },
  empty: { alignItems: "center", paddingVertical: 44 },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: 17, fontWeight: "800", marginTop: 12 },
  emptySub: { fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 6, paddingHorizontal: 24 },
  legRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 11, padding: 12, marginBottom: 8 },
  legMatch: { fontSize: 14, fontWeight: "700" },
  legPick: { fontSize: 13, fontWeight: "800", marginTop: 2 },
  legOdds: { fontSize: 15, fontWeight: "900" },
  removeBtn: { padding: 4 },
  calc: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 12 },
  calcRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  calcLabel: { fontSize: 13, fontWeight: "600" },
  calcValue: { fontSize: 14, fontWeight: "800" },
  calcValueGold: { fontSize: 16, fontWeight: "900" },
  stakeBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, minWidth: 110 },
  currency: { fontSize: 14, fontWeight: "700" },
  stakeInput: { flex: 1, fontSize: 15, fontWeight: "800", paddingVertical: 8, paddingHorizontal: 4, textAlign: "right" },
  returnRow: { borderTopWidth: 1, paddingTop: 10, marginBottom: 0 },
  returnLabel: { fontSize: 15, fontWeight: "800" },
  returnValue: { fontSize: 19, fontWeight: "900" },
  footerActions: { flexDirection: "row", gap: 12, marginTop: 14 },
  clearBtn: { flex: 1, borderWidth: 1, borderRadius: 11, paddingVertical: 13, alignItems: "center" },
  clearText: { fontSize: 14, fontWeight: "800" },
  shareBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 11, paddingVertical: 13 },
  shareText: { color: "#0a0a0a", fontSize: 14, fontWeight: "900" },
});
