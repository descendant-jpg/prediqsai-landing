import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowLeft, BookOpen, Brain, Clapperboard, GraduationCap, Library } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LearningLoader } from "@/components/learning/LearningLoader";
import { EntranceView, PressableScale, useLoadingDelay } from "@/components/learning/animations";
import { useColors } from "@/hooks/useColors";

type HubCard = {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  gradient: [string, string];
  route: string;
};

const CARDS: HubCard[] = [
  {
    title: "Trending Videos",
    subtitle: "Expert video tutorials",
    icon: Clapperboard,
    gradient: ["#7C3AED", "#4C1D95"],
    route: "/learning/videos",
  },
  {
    title: "Betting Lessons",
    subtitle: "20 in-depth guides",
    icon: BookOpen,
    gradient: ["#0EA5E9", "#075985"],
    route: "/learning/lessons",
  },
  {
    title: "Quizzes",
    subtitle: "Test your knowledge",
    icon: Brain,
    gradient: ["#F59E0B", "#B45309"],
    route: "/learning/quizzes",
  },
  {
    title: "Dictionary",
    subtitle: "Betting terms A–Z",
    icon: Library,
    gradient: ["#10B981", "#065F46"],
    route: "/learning/dictionary",
  },
];

export default function LearningHubScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const loading = useLoadingDelay(1200);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Learning Hub</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <LearningLoader message="Loading your learning hub..." />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90 }}
          showsVerticalScrollIndicator={false}
        >
          <EntranceView direction="up" distance={14}>
            <View style={[styles.heroCard, { backgroundColor: "rgba(255,215,0,0.06)", borderColor: "rgba(255,215,0,0.2)" }]}>
              <GraduationCap size={26} color={colors.gold} />
              <Text style={[styles.heroTitle, { color: colors.text }]}>Master the game</Text>
              <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>
                Learn the maths, strategy and mindset behind smart, responsible betting.
              </Text>
            </View>
          </EntranceView>

          <View style={styles.grid}>
            {CARDS.map((card, index) => {
              const Icon = card.icon;
              return (
                <EntranceView
                  key={card.title}
                  style={styles.gridItem}
                  direction="up"
                  distance={24}
                  delay={150 + index * 100}
                >
                  <PressableScale style={styles.cardPress} onPress={() => router.push(card.route as never)}>
                    <LinearGradient
                      colors={card.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.cardGradient}
                    >
                      <View style={styles.cardIcon}>
                        <Icon size={28} color="#FFFFFF" />
                      </View>
                      <Text style={styles.cardTitle}>{card.title}</Text>
                      <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
                    </LinearGradient>
                  </PressableScale>
                </EntranceView>
              );
            })}
          </View>
        </ScrollView>
      )}
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
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: -0.2 },
  heroCard: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center", marginBottom: 20, gap: 8 },
  heroTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  heroDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 14 },
  gridItem: { width: "47%" },
  cardPress: { width: "100%" },
  cardGradient: { borderRadius: 18, padding: 18, height: 150, justifyContent: "space-between" },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  cardSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)", marginTop: -6 },
});
