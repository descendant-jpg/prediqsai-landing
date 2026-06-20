import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { QUIZZES, QUIZ_LEVELS } from "@/lib/learning/quizzes";

export default function QuizzesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Quizzes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Choose a difficulty level. Each quiz has 10 questions — see how you score.
        </Text>

        <View style={styles.grid}>
          {QUIZ_LEVELS.map((lvl) => (
            <TouchableOpacity
              key={lvl.level}
              style={[styles.card, { backgroundColor: colors.card, borderColor: `${lvl.color}55` }]}
              activeOpacity={0.85}
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
            </TouchableOpacity>
          ))}
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
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: -0.2 },
  intro: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, marginBottom: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 14 },
  card: { width: "47%", borderRadius: 18, borderWidth: 1, padding: 18, gap: 6 },
  badge: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  badgeEmoji: { fontSize: 24 },
  cardTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  cardSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  countPill: { alignSelf: "flex-start", marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  countText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
