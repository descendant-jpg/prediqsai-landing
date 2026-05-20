import { ArrowLeft, BookOpen, Brain, BarChart2, Info, Shield, Target, Zap } from "lucide-react-native";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const APP_VERSION = "1.0.0";

const FEATURES = [
  {
    icon: "🎯",
    title: "AI Match Analysis",
    desc: "Learn how AI breaks down matches using real statistical data and probability modelling.",
  },
  {
    icon: "📊",
    title: "Probability Education",
    desc: "Understand win/draw/loss probability calculations and what they mean statistically.",
  },
  {
    icon: "🔄",
    title: "Odds Comparison Tool",
    desc: "Learn how odds differ across different platforms and what odds movement signals.",
  },
  {
    icon: "⚡",
    title: "Statistical Edge Analysis",
    desc: "Understand when statistics suggest value in odds and how analysts read discrepancies.",
  },
  {
    icon: "🎮",
    title: "Practice Scenario Simulator",
    desc: "Test your analysis skills with virtual scenarios risk-free, no real money involved.",
  },
  {
    icon: "💰",
    title: "Sports Finance Education",
    desc: "Learn proper bankroll management and staking strategies used by professional analysts.",
  },
  {
    icon: "🤖",
    title: "AI Learning Assistant",
    desc: "Ask any sports analytics question and receive detailed educational responses from PrediQs AI.",
  },
];

export default function AboutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>About PrediQs AI</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: "rgba(0,229,255,0.07)", borderColor: "rgba(0,229,255,0.2)" }]}>
          <Text style={styles.heroEmoji}>⚡</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>PrediQs AI</Text>
          <Text style={[styles.heroTagline, { color: colors.cyan }]}>AI-Powered Sports Analytics Education</Text>
          <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>
            PrediQs AI is an educational sports intelligence platform that helps you understand sports analytics, probability and odds movement through AI-powered analysis.
          </Text>
          <View style={[styles.versionBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.versionText, { color: colors.textMuted }]}>Version {APP_VERSION}</Text>
          </View>
        </View>

        {/* What you can learn */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>What You Can Learn</Text>
        <View style={[styles.learnCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {[
            "How AI analyses sports matches",
            "Understanding probability and statistical outcomes",
            "Reading odds and market movements",
            "Sports data analysis techniques",
            "Bankroll and risk management concepts",
            "How professional analysts think",
          ].map((item, i) => (
            <View key={i} style={styles.learnRow}>
              <Text style={[styles.learnDot, { color: colors.cyan }]}>•</Text>
              <Text style={[styles.learnText, { color: colors.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Educational features */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Educational Features</Text>
        {FEATURES.map((f, i) => (
          <View key={i} style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={styles.featureEmoji}>{f.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>{f.title}</Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{f.desc}</Text>
            </View>
          </View>
        ))}

        {/* Subscription tiers */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Access Tiers</Text>
        {[
          { label: "Basic Learning", color: "#94A3B8", desc: "Free access to core match analysis and probability education." },
          { label: "Advanced Analytics", color: "#00E5FF", desc: "Unlock unlimited match analysis, AI assistant access, and advanced statistical tools." },
          { label: "Professional Intelligence", color: "#FFD700", desc: "Full access to all 5 AI models, live momentum analysis, voice AI and more." },
        ].map((tier, i) => (
          <View key={i} style={[styles.tierRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.tierLabel, { color: tier.color }]}>{tier.label}</Text>
              <Text style={[styles.tierDesc, { color: colors.textSecondary }]}>{tier.desc}</Text>
            </View>
          </View>
        ))}

        {/* Important disclaimer */}
        <View style={[styles.disclaimerCard, { backgroundColor: "rgba(255,107,53,0.08)", borderColor: "rgba(255,107,53,0.3)" }]}>
          <View style={styles.disclaimerHeader}>
            <Shield size={16} color="#FF6B35" />
            <Text style={[styles.disclaimerTitle, { color: "#FF6B35" }]}>Important Disclaimer</Text>
          </View>
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
            PrediQs AI is for educational and informational purposes only. We do not accept bets, provide gambling advice, or guarantee any outcomes. All statistical analysis is educational in nature.
          </Text>
          <Text style={[styles.disclaimerText, { color: colors.textSecondary, marginTop: 8 }]}>
            Sports betting involves risk. Please gamble responsibly. Must be 18+ to use. Check local laws before betting.
          </Text>
        </View>

        {/* App store info */}
        <View style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.metaTitle, { color: colors.textMuted }]}>APP STORE INFO</Text>
          {[
            { label: "Category", value: "Sports / Education" },
            { label: "Age Rating", value: "17+" },
            { label: "Developer", value: "PrediQs AI" },
            { label: "Help & Support", value: "ncpgambling.org · 1-800-522-4700" },
          ].map((row, i) => (
            <View key={i} style={[styles.metaRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{row.label}</Text>
              <Text style={[styles.metaValue, { color: colors.textSecondary }]}>{row.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 16, letterSpacing: -0.2 },
  content: { padding: 20, gap: 0 },
  heroCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", marginBottom: 28 },
  heroEmoji: { fontSize: 44, marginBottom: 10 },
  heroTitle: { fontSize: 26, letterSpacing: -0.5, marginBottom: 4 },
  heroTagline: { fontSize: 13, letterSpacing: 0.2, marginBottom: 14 },
  heroDesc: { fontSize: 14, lineHeight: 22, textAlign: "center", marginBottom: 14 },
  versionBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4 },
  versionText: { fontSize: 12 },
  sectionTitle: { fontSize: 15, letterSpacing: -0.2, marginBottom: 12, marginTop: 4 },
  learnCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10, marginBottom: 24 },
  learnRow: { flexDirection: "row", gap: 10 },
  learnDot: { fontSize: 14, lineHeight: 20 },
  learnText: { flex: 1, fontSize: 14, lineHeight: 20 },
  featureCard: { flexDirection: "row", gap: 14, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, alignItems: "flex-start" },
  featureEmoji: { fontSize: 24 },
  featureTitle: { fontSize: 14, marginBottom: 4 },
  featureDesc: { fontSize: 13, lineHeight: 19 },
  tierRow: { flexDirection: "row", gap: 14, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, alignItems: "flex-start" },
  tierDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  tierLabel: { fontSize: 14, marginBottom: 4 },
  tierDesc: { fontSize: 13, lineHeight: 19 },
  disclaimerCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginTop: 8, marginBottom: 20 },
  disclaimerHeader: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 10 },
  disclaimerTitle: { fontSize: 13 },
  disclaimerText: { fontSize: 13, lineHeight: 20 },
  metaCard: { borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  metaTitle: { fontSize: 10, letterSpacing: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  metaLabel: { fontSize: 13 },
  metaValue: { fontSize: 13 },
});
