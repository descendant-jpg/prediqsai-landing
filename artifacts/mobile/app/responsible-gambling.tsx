import { useRouter } from "expo-router";
import { Linking } from "react-native";
import { X } from "lucide-react-native";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const WARNING_SIGNS = [
  "Betting more than you can afford",
  "Chasing losses after a bad session",
  "Betting affecting your relationships",
  "Hiding betting activity from family",
  "Borrowing money to fund bets",
  "Betting to escape problems or stress",
];

const HELPLINES = [
  { flag: "🇺🇸", country: "USA", line: "1-800-522-4700", url: "https://www.ncpgambling.org" },
  { flag: "🇬🇧", country: "UK", line: "0808 8020 133", url: "https://www.gamcare.org.uk" },
  { flag: "🌍", country: "Global", line: "gamblingtherapy.org", url: "https://www.gamblingtherapy.org" },
];

export default function ResponsibleGamblingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + topPaddingWeb;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerIcon}>🛡️</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Responsible Gambling</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={[styles.heroBanner, { backgroundColor: "rgba(0,229,255,0.06)", borderColor: "rgba(0,229,255,0.2)" }]}>
          <Text style={styles.heroEmoji}>🛡️</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Bet Responsibly</Text>
          <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
            PrediQs AI cares about your wellbeing. Sports betting should be enjoyable entertainment, never a financial necessity.
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>WARNING SIGNS</Text>
        <View style={[styles.warningCard, { backgroundColor: colors.card, borderColor: "rgba(255,77,77,0.3)" }]}>
          {WARNING_SIGNS.map((sign, i) => (
            <View
              key={i}
              style={[
                styles.warningRow,
                i < WARNING_SIGNS.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
              ]}
            >
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={[styles.warningText, { color: colors.textSecondary }]}>{sign}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TOOLS TO HELP</Text>
        <View style={styles.toolsGrid}>
          {[
            { emoji: "💰", label: "Set Daily Loss Limit", desc: "Cap how much you can lose in one day", action: () => router.back() },
            { emoji: "⏸️", label: "Take a 24hr Break", desc: "Pause all activity for 24 hours", action: () => {} },
            { emoji: "🚫", label: "Self Exclude 7 Days", desc: "Lock yourself out for a week", action: () => {} },
            { emoji: "🔒", label: "Self Exclude 30 Days", desc: "Extended break for a full month", action: () => {} },
          ].map((tool, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.toolCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={tool.action}
              activeOpacity={0.8}
            >
              <Text style={styles.toolEmoji}>{tool.emoji}</Text>
              <Text style={[styles.toolLabel, { color: colors.text }]}>{tool.label}</Text>
              <Text style={[styles.toolDesc, { color: colors.textMuted }]}>{tool.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>GET HELP NOW</Text>
        <View style={styles.helplinesContainer}>
          {HELPLINES.map((h, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.helplineCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => Linking.openURL(h.url)}
              activeOpacity={0.8}
            >
              <Text style={styles.helplineFlag}>{h.flag}</Text>
              <View style={styles.helplineInfo}>
                <Text style={[styles.helplineCountry, { color: colors.text }]}>{h.country}</Text>
                <Text style={[styles.helplineLine, { color: colors.cyan }]}>{h.line}</Text>
              </View>
              <Text style={[styles.helplineTap, { color: colors.textMuted }]}>Tap to open →</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.closingBanner, { backgroundColor: "rgba(0,255,148,0.05)", borderColor: "rgba(0,255,148,0.2)" }]}>
          <Text style={[styles.closingText, { color: colors.green }]}>
            "You are not alone. Help is available 24/7. Reaching out is a sign of strength."
          </Text>
        </View>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            PrediQs AI is for educational purposes only.{"\n"}Not betting advice. 18+ | Please gamble responsibly.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerIcon: { fontSize: 18 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  heroBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  heroEmoji: { fontSize: 36 },
  heroTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, textAlign: "center" },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    marginBottom: -8,
  },
  warningCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  warningIcon: { fontSize: 16 },
  warningText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  toolsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  toolCard: {
    width: "47.5%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  toolEmoji: { fontSize: 24 },
  toolLabel: { fontSize: 13, fontFamily: "Inter_700Bold", lineHeight: 18 },
  toolDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  helplinesContainer: { gap: 10 },
  helplineCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  helplineFlag: { fontSize: 28 },
  helplineInfo: { flex: 1, gap: 3 },
  helplineCountry: { fontSize: 14, fontFamily: "Inter_700Bold" },
  helplineLine: { fontSize: 13, fontFamily: "Inter_500Medium" },
  helplineTap: { fontSize: 11, fontFamily: "Inter_400Regular" },
  closingBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  closingText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 22,
    textAlign: "center",
    fontStyle: "italic",
  },
  footer: { borderTopWidth: 1, paddingTop: 16, alignItems: "center" },
  footerText: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
});
