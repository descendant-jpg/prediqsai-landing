import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { AlertTriangle } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import colors from "@/constants/colors";

export const DISCLAIMER_STORAGE_KEY = "@has_accepted_disclaimer";

// ─── Design tokens (sourced from constants/colors.ts — no invented colors) ─────────
const C = colors.dark;
const SHEET_BG = C.backgroundSecondary;
const BORDER = C.cardBorder;
const GOLD = C.gold;
const CYAN = C.cyan;
const RED = C.red;
const ORANGE = C.orange;
const TEXT = C.text;
const TEXT_SECONDARY = C.textSecondary;
const BG = C.background;

const SECTIONS = [
  {
    title: "Educational Purpose Only",
    color: CYAN,
    body: "PrediQs AI provides predictive data analysis. This is NOT financial or betting advice.",
  },
  {
    title: "High Risk Warning",
    color: RED,
    body: "Sports betting carries substantial risk. You may lose your entire stake.",
  },
  {
    title: "Past Performance",
    color: ORANGE,
    body: "Historical AI accuracy does not guarantee future outcomes.",
  },
  {
    title: "Your Responsibility",
    color: GOLD,
    body: "You are solely responsible for all betting decisions. We are not liable for losses.",
  },
];

export function DisclaimerModal() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(DISCLAIMER_STORAGE_KEY)
      .then((v) => {
        if (mounted && v == null) setVisible(true);
      })
      .catch(() => {
        // Fail-safe: if storage can't be read, show the disclaimer rather than skip it
        if (mounted) setVisible(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function accept() {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    try {
      await AsyncStorage.setItem(DISCLAIMER_STORAGE_KEY, "true");
    } catch {}
    setVisible(false);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {
        /* non-dismissible: ignore hardware back */
      }}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.iconWrap}>
            <AlertTriangle size={26} color={GOLD} />
          </View>

          <Text style={styles.title}>
            Educational only. Not betting advice. Betting involves risk of loss.
          </Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {SECTIONS.map((s) => (
              <View
                key={s.title}
                style={[styles.section, { borderColor: s.color + "33", backgroundColor: s.color + "0D" }]}
              >
                <Text style={[styles.sectionTitle, { color: s.color }]}>{s.title}</Text>
                <Text style={styles.sectionBody}>{s.body}</Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.acceptBtn} onPress={accept} activeOpacity={0.85}>
            <Text style={styles.acceptText}>I Accept & Understand</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 22,
    paddingTop: 22,
    maxHeight: "88%",
  },
  iconWrap: {
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GOLD + "1A",
    borderWidth: 1,
    borderColor: GOLD + "4D",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    color: TEXT,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 18,
  },
  scroll: { flexGrow: 0 },
  section: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 5 },
  sectionBody: { fontSize: 13, color: TEXT_SECONDARY, lineHeight: 19 },
  acceptBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 14,
  },
  acceptText: { fontSize: 16, color: BG, fontWeight: "800", letterSpacing: 0.3 },
});
