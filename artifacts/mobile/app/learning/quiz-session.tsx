import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Check, RotateCcw, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  SlideInRight,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LearningLoader } from "@/components/learning/LearningLoader";
import { BounceInView, EntranceView, PressableScale, useLoadingDelay } from "@/components/learning/animations";
import { useColors } from "@/hooks/useColors";
import { QUIZZES, QuizLevel, getGrade } from "@/lib/learning/quizzes";

const LETTERS = ["A", "B", "C", "D"];

type AnswerState = "idle" | "correct" | "wrong" | "muted";

interface AnswerOptionProps {
  letter: string;
  text: string;
  state: AnswerState;
  answered: boolean;
  borderColor: string;
  backgroundColor: string;
  letterBorder: string;
  letterText: string;
  textColor: string;
  green: string;
  red: string;
  onPress: () => void;
}

function AnswerOption({
  letter,
  text,
  state,
  answered,
  borderColor,
  backgroundColor,
  letterBorder,
  letterText,
  textColor,
  green,
  red,
  onPress,
}: AnswerOptionProps) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (state === "correct") {
      scale.value = withSequence(
        withTiming(1.05, { duration: 140, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 6, stiffness: 180 }),
      );
    } else if (state === "wrong") {
      translateX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [state, scale, translateX]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: translateX.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <PressableScale style={[styles.option, { borderColor, backgroundColor }]} onPress={onPress} disabled={answered}>
        <View style={[styles.optionLetter, { borderColor: letterBorder }]}>
          <Text style={[styles.optionLetterText, { color: letterText }]}>{letter}</Text>
        </View>
        <Text style={[styles.optionText, { color: textColor }]}>{text}</Text>
        {state === "correct" && <Check size={18} color={green} />}
        {state === "wrong" && <X size={18} color={red} />}
      </PressableScale>
    </Animated.View>
  );
}

interface ProgressBarProps {
  progress: number;
  track: string;
  fill: string;
}

function ProgressBar({ progress, track, fill }: ProgressBarProps) {
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = withTiming(progress, { duration: 400, easing: Easing.out(Easing.cubic) });
  }, [progress, value]);

  const animStyle = useAnimatedStyle(() => ({ width: `${value.value * 100}%` }));

  return (
    <View style={[styles.progressTrack, { backgroundColor: track }]}>
      <Animated.View style={[styles.progressFill, { backgroundColor: fill }, animStyle]} />
    </View>
  );
}

export default function QuizSessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { level } = useLocalSearchParams<{ level: QuizLevel }>();
  const loading = useLoadingDelay(1100);

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

  function optionState(index: number): AnswerState {
    if (!answered) return "idle";
    if (index === question.correct) return "correct";
    if (index === selected) return "wrong";
    return "muted";
  }

  function optionColors(state: AnswerState) {
    if (state === "correct") return { borderColor: colors.green, backgroundColor: "rgba(0,255,148,0.1)" };
    if (state === "wrong") return { borderColor: colors.red, backgroundColor: "rgba(255,77,77,0.1)" };
    return { borderColor: colors.border, backgroundColor: colors.card };
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
          <PressableScale style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.text} />
          </PressableScale>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{safeLevel} Quiz</Text>
          <View style={{ width: 40 }} />
        </View>
        <LearningLoader message="Getting your questions ready..." />
      </View>
    );
  }

  if (finished) {
    const percentage = Math.round((score / questions.length) * 100);
    const grade = getGrade(percentage);
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
          <PressableScale style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.text} />
          </PressableScale>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{safeLevel} Quiz</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.resultBody}>
          <BounceInView scaleFrom={0.5}>
            <View style={[styles.scoreRing, { borderColor: grade.color }]}>
              <Text style={[styles.scorePct, { color: grade.color }]}>{percentage}%</Text>
              <Text style={[styles.scoreFraction, { color: colors.textMuted }]}>
                {score}/{questions.length}
              </Text>
            </View>
          </BounceInView>

          <EntranceView direction="up" delay={260} distance={14}>
            <Text style={[styles.gradeLabel, { color: grade.color }]}>{grade.label}</Text>
          </EntranceView>
          <EntranceView direction="up" delay={340} distance={14}>
            <Text style={[styles.resultSub, { color: colors.textSecondary }]}>
              You answered {score} of {questions.length} questions correctly.
            </Text>
          </EntranceView>

          <EntranceView style={styles.resultButtons} direction="up" delay={420} distance={14}>
            <PressableScale style={[styles.primaryBtn, { backgroundColor: colors.gold }]} onPress={restart}>
              <RotateCcw size={16} color="#070B12" />
              <Text style={styles.primaryBtnText}>Try Again</Text>
            </PressableScale>
            <PressableScale style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Back to Quizzes</Text>
            </PressableScale>
          </EntranceView>
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{safeLevel} Quiz</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressWrap}>
        <ProgressBar progress={progress} track={colors.border} fill={colors.gold} />
        <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
          Question {current + 1}/{questions.length}
        </Text>
      </View>

      <Animated.View
        key={current}
        entering={SlideInRight.duration(320).easing(Easing.out(Easing.cubic))}
        exiting={SlideOutLeft.duration(220).easing(Easing.in(Easing.cubic))}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 110 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.question, { color: colors.text }]}>{question.question}</Text>

          {question.options.map((opt, i) => {
            const state = optionState(i);
            const oc = optionColors(state);
            return (
              <AnswerOption
                key={i}
                letter={LETTERS[i]}
                text={opt}
                state={state}
                answered={answered}
                borderColor={oc.borderColor}
                backgroundColor={oc.backgroundColor}
                letterBorder={colors.border}
                letterText={colors.textSecondary}
                textColor={colors.text}
                green={colors.green}
                red={colors.red}
                onPress={() => selectAnswer(i)}
              />
            );
          })}
        </ScrollView>
      </Animated.View>

      {answered && (
        <EntranceView
          style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}
          direction="up"
          distance={12}
          duration={240}
        >
          <PressableScale style={[styles.primaryBtn, { backgroundColor: colors.gold }]} onPress={next}>
            <Text style={styles.primaryBtnText}>
              {current + 1 >= questions.length ? "See Results" : "Next Question"}
            </Text>
          </PressableScale>
        </EntranceView>
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
