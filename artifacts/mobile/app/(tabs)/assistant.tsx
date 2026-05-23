import {
  ArrowRight,
  BarChart2,
  BookOpen,
  MessageCircle,
  RefreshCw,
  ScanLine,
  Search,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const TOOLS = [
  {
    id: "chat",
    emoji: "💬",
    Icon: MessageCircle,
    title: "Oracle AI Chat",
    desc: "Ask anything about sports, bets, or predictions",
    route: "/oracle-chat",
    color: "#00E5FF",
  },
  {
    id: "slip",
    emoji: "📋",
    Icon: ScanLine,
    title: "Slip Analyzer",
    desc: "Upload your bet slip for instant AI review",
    route: "/slip-analysis",
    color: "#FFD700",
  },
  {
    id: "arb",
    emoji: "🔄",
    Icon: RefreshCw,
    title: "ARB Scanner",
    desc: "Find guaranteed profit opportunities across bookmakers",
    route: "/arbitrage",
    color: "#00FF94",
  },
  {
    id: "replay",
    emoji: "📖",
    Icon: BarChart2,
    title: "Prediction Replay",
    desc: "Review past AI predictions and accuracy breakdown",
    route: "/performance",
    color: "#FF6B35",
  },
  {
    id: "bookmaker",
    emoji: "🏦",
    Icon: Search,
    title: "Research Center",
    desc: "World Cup 2026 insights, odds analysis & more",
    route: "/worldcup",
    color: "#A855F7",
  },
  {
    id: "coaching",
    emoji: "📚",
    Icon: BookOpen,
    title: "Betting Coach",
    desc: "Personalised bankroll advice and risk coaching",
    route: "/bankroll",
    color: "#EC4899",
  },
] as const;

export default function AssistantHubScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding    = insets.top + topPaddingWeb;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPadding + 16, paddingBottom: insets.bottom + 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={[styles.brainIcon, { backgroundColor: "rgba(0,229,255,0.12)" }]}>
          <Text style={{ fontSize: 28 }}>🤖</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>PrediQs AI</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Sports Intelligence Engine
        </Text>
        <View style={[styles.tagRow]}>
          {["5 AI Models", "Real-time Data", "40+ Bookmakers"].map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.2)" }]}>
              <Text style={[styles.tagText, { color: colors.cyan }]}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Tool Grid ── */}
      <View style={styles.grid}>
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(tool.route as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.tileIconWrap, { backgroundColor: `${tool.color}18` }]}>
              <Text style={{ fontSize: 22 }}>{tool.emoji}</Text>
            </View>
            <View style={styles.tileBody}>
              <Text style={[styles.tileName, { color: colors.text }]}>{tool.title}</Text>
              <Text style={[styles.tileDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                {tool.desc}
              </Text>
            </View>
            <ArrowRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Quick-start prompt ── */}
      <TouchableOpacity
        style={[styles.chatCta, { backgroundColor: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.25)" }]}
        onPress={() => router.push("/oracle-chat" as any)}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 20 }}>💬</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.ctaTitle, { color: colors.cyan }]}>Start a conversation</Text>
          <Text style={[styles.ctaDesc, { color: colors.textSecondary }]}>
            Ask about tonight's picks, injury news, or betting strategies
          </Text>
        </View>
        <ArrowRight size={18} color={colors.cyan} />
      </TouchableOpacity>

      <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
        For informational and educational purposes only. Always gamble responsibly.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { alignItems: "center", paddingHorizontal: 24, paddingBottom: 24 },
  brainIcon:    { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title:        { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle:     { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4, marginBottom: 14 },
  tagRow:       { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  tag:          { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1 },
  tagText:      { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  grid:         { paddingHorizontal: 16, gap: 10 },
  tile:         { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, padding: 16, borderWidth: 1 },
  tileIconWrap: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  tileBody:     { flex: 1 },
  tileName:     { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  tileDesc:     { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  chatCta:      { flexDirection: "row", alignItems: "center", gap: 14, marginHorizontal: 16, marginTop: 20, borderRadius: 16, padding: 18, borderWidth: 1 },
  ctaTitle:     { fontSize: 14, fontFamily: "Inter_700Bold" },
  ctaDesc:      { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 17 },
  disclaimer:   { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginHorizontal: 24, marginTop: 20 },
});
