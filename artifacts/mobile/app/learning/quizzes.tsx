import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LearningLoader } from "@/components/learning/LearningLoader";
import { EntranceView, PressableScale, useLoadingDelay } from "@/components/learning/animations";
import { useColors } from "@/hooks/useColors";
import { QUIZZES, QUIZ_LEVELS } from "@/lib/learning/quizzes";

export default function QuizzesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const loading = useLoadingDelay(1100);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <PressableScale style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.text} />
        </PressableScale>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Quizzes</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <LearningLoader message="Loading quizzes..." />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90 }}
          showsVerticalScrollIndicator={false}
        >
          <EntranceView direction="up" distance={12}>
            <Text style={[styles.intro, { color: colors.textSecondary }]}>
              Choose a difficulty level. Each quiz has 10 questions — see how you score.
            </Text>
          </EntranceView>

          <View style={styles.grid}>
            {QUIZ_LEVELS.map((lvl, index) => (
              <EntranceView
                key={lvl.level}
                style={styles.cardWrap}
                direction="none"
                scaleFrom={0.8}
                delay={120 + index * 90}
                duration={320}
              >
                <PressableScale
                  style={[styles.card, { backgroundColor: colors.card, borderColor: `${lvl.color}55` }]}
                  onPress={() =>
                    router.push({ pathname: "/learning/quiz-session", params: { level: lvl.level } } as never)
                  }
                >
                  <View style={[styles.badge, { backgroundColor: `${lvl.color}22` }]}>
                    <Text style={styles.badgeEmoji}>{lvl.emoji}</Text>
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{lvl.level}</Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>{lvl.subtitle}</Text>
                  <View style={[styles.countPill, { borderColor: `${lvl.color}55` }]}>
                    <Text style={[styles.countText, { color: lvl.color }]}>{QUIZZES[lvl.level].length} questions</Text>
                  </View>
                </PressableScale>
              </EntranceView>
            ))}
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
  intro: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, marginBottom: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 14 },
  cardWrap: { width: "47%" },
  card: { width: "100%", borderRadius: 18, borderWidth: 1, padding: 18, gap: 6 },
  badge: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  badgeEmoji: { fontSize: 24 },
  cardTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  cardSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  countPill: { alignSelf: "flex-start", marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  countText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
