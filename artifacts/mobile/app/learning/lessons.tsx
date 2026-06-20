import { useRouter } from "expo-router";
import { ArrowLeft, ChevronRight, Clock } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LearningLoader } from "@/components/learning/LearningLoader";
import { EntranceView, PressableScale, useLoadingDelay } from "@/components/learning/animations";
import { useColors } from "@/hooks/useColors";
import { LESSON_SECTIONS, getLessonsBySection } from "@/lib/learning/lessons";

const SECTION_COLORS: Record<string, string> = {
  Basics: "#0EA5E9",
  Strategy: "#10B981",
  Advanced: "#F59E0B",
  Mindset: "#A78BFA",
};

export default function LessonsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const loading = useLoadingDelay(1200);

  let rowIndex = -1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <PressableScale style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.text} />
        </PressableScale>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Betting Lessons</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <LearningLoader message="Preparing your lessons..." />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90 }}
          showsVerticalScrollIndicator={false}
        >
          {LESSON_SECTIONS.map((section) => {
            const lessons = getLessonsBySection(section);
            const accent = SECTION_COLORS[section] ?? colors.cyan;
            return (
              <View key={section} style={{ marginBottom: 24 }}>
                <View style={styles.sectionHeaderRow}>
                  <View style={[styles.sectionDot, { backgroundColor: accent }]} />
                  <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>{section.toUpperCase()}</Text>
                </View>

                <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {lessons.map((lesson, i) => {
                    rowIndex += 1;
                    return (
                      <EntranceView
                        key={lesson.id}
                        direction="right"
                        distance={28}
                        delay={rowIndex * 50}
                      >
                        <PressableScale
                          style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
                          onPress={() =>
                            router.push({ pathname: "/learning/lesson-detail", params: { id: lesson.id } } as never)
                          }
                        >
                          <Text style={styles.rowEmoji}>{lesson.icon}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.rowTitle, { color: colors.text }]}>{lesson.title}</Text>
                            <View style={styles.metaRow}>
                              <Clock size={11} color={colors.textMuted} />
                              <Text style={[styles.metaText, { color: colors.textMuted }]}>{lesson.readMinutes} min read</Text>
                            </View>
                          </View>
                          <ChevronRight size={16} color={colors.textMuted} />
                        </PressableScale>
                      </EntranceView>
                    );
                  })}
                </View>
              </View>
            );
          })}
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
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, marginLeft: 4 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionHeader: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  group: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 15 },
  rowEmoji: { fontSize: 22 },
  rowTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
