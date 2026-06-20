import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Lightbulb } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LearningLoader } from "@/components/learning/LearningLoader";
import { EntranceView, PressableScale, useLoadingDelay } from "@/components/learning/animations";
import { useColors } from "@/hooks/useColors";
import { getLessonById } from "@/lib/learning/lessons";

export default function LessonDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = getLessonById(id ?? "");
  const loading = useLoadingDelay(1000);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
          <PressableScale style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.text} />
          </PressableScale>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Lesson</Text>
          <View style={{ width: 40 }} />
        </View>
        <LearningLoader message="Loading lesson..." />
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
          <PressableScale style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.text} />
          </PressableScale>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Lesson</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.missing}>
          <Text style={[styles.missingText, { color: colors.textSecondary }]}>This lesson could not be found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <PressableScale style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.text} />
        </PressableScale>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {lesson.section}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <EntranceView style={{ flex: 1 }} direction="none" duration={420}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 90 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.lessonEmoji}>{lesson.icon}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{lesson.title}</Text>
        <Text style={[styles.subtitle, { color: colors.gold }]}>{lesson.subtitle}</Text>

        <Text style={[styles.intro, { color: colors.textSecondary }]}>{lesson.intro}</Text>

        {lesson.sections.map((sec, i) => (
          <View key={i} style={{ marginTop: 22 }}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>{sec.heading}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{sec.body}</Text>
            {sec.bullets?.map((b, j) => (
              <View key={j} style={styles.bulletRow}>
                <View style={[styles.bulletDot, { backgroundColor: colors.cyan }]} />
                <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{b}</Text>
              </View>
            ))}
          </View>
        ))}

        {lesson.keyTips.length > 0 && (
          <View style={[styles.tipsCard, { backgroundColor: "rgba(255,215,0,0.07)", borderColor: "rgba(255,215,0,0.25)" }]}>
            <View style={styles.tipsHeader}>
              <Lightbulb size={16} color={colors.gold} />
              <Text style={[styles.tipsTitle, { color: colors.gold }]}>Key Tips</Text>
            </View>
            {lesson.keyTips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Text style={[styles.tipMark, { color: colors.gold }]}>★</Text>
                <Text style={[styles.tipText, { color: colors.text }]}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.takeawaysCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.takeawaysTitle, { color: colors.text }]}>Key Takeaways</Text>
          {lesson.takeaways.map((t, i) => (
            <View key={i} style={styles.takeawayRow}>
              <Text style={[styles.takeawayNum, { color: colors.cyan }]}>{i + 1}</Text>
              <Text style={[styles.takeawayText, { color: colors.textSecondary }]}>{t}</Text>
            </View>
          ))}
        </View>
        </ScrollView>
      </EntranceView>
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
  missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  missingText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  lessonEmoji: { fontSize: 40, marginBottom: 8 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.4, marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 16 },
  intro: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24 },
  sectionHeading: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 8 },
  body: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24 },
  bulletRow: { flexDirection: "row", gap: 10, marginTop: 10, paddingRight: 8 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  bulletText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  tipsCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginTop: 24 },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  tipsTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  tipRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  tipMark: { fontSize: 13, lineHeight: 20 },
  tipText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 21 },
  takeawaysCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginTop: 16 },
  takeawaysTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 12 },
  takeawayRow: { flexDirection: "row", gap: 12, marginBottom: 10, alignItems: "flex-start" },
  takeawayNum: { fontSize: 14, fontFamily: "Inter_700Bold", width: 16 },
  takeawayText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
});
