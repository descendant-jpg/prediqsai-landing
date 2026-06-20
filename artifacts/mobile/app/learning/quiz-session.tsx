import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Check, RotateCcw, X } from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { QUIZZES, QuizLevel, getGrade } from "@/lib/learning/quizzes";

const LETTERS = ["A", "B", "C", "D"];

export default function QuizSessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { level } = useLocalSearchParams<{ level: QuizLevel }>();

  const safeLevel: QuizLevel = level && level in QUIZZES ? level : "Casual";
  const questions = QUIZZES[safeLevel];

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[current];
  const progress = (current + (answered ? 1 : 0)) / questions.length;

  function selectAnswer(index: number) {
    if (answered) return;
    setSelected(index);
    setAnswered(true);
    if (index === question.correct) setScore((s) => s + 1);
  }

  function next() {
    if (current + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setCurrent((c) => c + 1);
    setSelected(null);
    setAnswered(false);
  }

  function restart() {
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setFinished(false);
  }

  function optionStyle(index: number) {
    if (!answered) return { borderColor: colors.border, backgroundColor: colors.card };
    if (index === question.correct) return { borderColor: colors.green, backgroundColor: "rgba(0,255,148,0.1)" };
    if (index === selected) return { borderColor: colors.red, backgroundColor: "rgba(255,77,77,0.1)" };
    return { borderColor: colors.border, backgroundColor: colors.card };
  }

  if (finished) {
    const percentage = Math.round((score / questions.length) * 100);
    const grade = getGrade(percentage);
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{safeLevel} Quiz</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.resultBody}>
          <View style={[styles.scoreRing, { borderColor: grade.color }]}>
            <Text style={[styles.scorePct, { color: grade.color }]}>{percentage}%</Text>
            <Text style={[styles.scoreFraction, { color: colors.textMuted }]}>
              {score}/{questions.length}
            </Text>
          </View>

          <Text style={[styles.gradeLabel, { color: grade.color }]}>{grade.label}</Text>
          <Text style={[styles.resultSub, { color: colors.textSecondary }]}>
            You answered {score} of {questions.length} questions correctly.
          </Text>

          <View style={styles.resultButtons}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.gold }]}
              activeOpacity={0.85}
              onPress={restart}
            >
              <RotateCcw size={16} color="#070B12" />
              <Text style={styles.primaryBtnText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
              activeOpacity={0.85}
              onPress={() => router.back()}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Back to Quizzes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{safeLevel} Quiz</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressWrap}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.gold }]} />
        </View>
        <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
          Question {current + 1}/{questions.length}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.question, { color: colors.text }]}>{question.question}</Text>

        {question.options.map((opt, i) => {
          const isCorrect = answered && i === question.correct;
          const isWrong = answered && i === selected && i !== question.correct;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.option, optionStyle(i)]}
              activeOpacity={answered ? 1 : 0.8}
              onPress={() => selectAnswer(i)}
            >
              <View style={[styles.optionLetter, { borderColor: colors.border }]}>
                <Text style={[styles.optionLetterText, { color: colors.textSecondary }]}>{LETTERS[i]}</Text>
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>{opt}</Text>
              {isCorrect && <Check size={18} color={colors.green} />}
              {isWrong && <X size={18} color={colors.red} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {answered && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.gold }]}
            activeOpacity={0.85}
            onPress={next}
          >
            <Text style={styles.primaryBtnText}>
              {current + 1 >= questions.length ? "See Results" : "Next Question"}
            </Text>
          </TouchableOpacity>
        </View>
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
  progressWrap: { paddingHorizontal: 20, paddingTop: 16, gap: 8 },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  question: { fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 28, marginBottom: 20 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
  },
  optionLetter: { width: 26, height: 26, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  optionLetterText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  optionText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", lineHeight: 21 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  primaryBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#070B12" },
  resultBody: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  scoreRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  scorePct: { fontSize: 40, fontFamily: "Inter_700Bold" },
  scoreFraction: { fontSize: 14, fontFamily: "Inter_500Medium" },
  gradeLabel: { fontSize: 24, fontFamily: "Inter_700Bold" },
  resultSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  resultButtons: { width: "100%", gap: 12, marginTop: 24 },
  secondaryBtn: { paddingVertical: 15, borderRadius: 14, borderWidth: 1, alignItems: "center" },
  secondaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
