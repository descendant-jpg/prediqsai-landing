import * as Haptics from "expo-haptics";
import { AlertTriangle, ArrowRight, Check } from "lucide-react-native";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Sport = { key: string; label: string; icon: string };
type BettorType = { key: string; label: string; sub: string };

const SPORTS: Sport[] = [
  { key: "soccer", label: "Soccer / Football", icon: "⚽" },
  { key: "nfl", label: "NFL", icon: "🏈" },
  { key: "nba", label: "NBA", icon: "🏀" },
  { key: "mlb", label: "MLB", icon: "⚾" },
  { key: "tennis", label: "Tennis", icon: "🎾" },
  { key: "boxing", label: "Boxing / MMA", icon: "🥊" },
];

const BETTOR_TYPES: BettorType[] = [
  { key: "casual", label: "Casual", sub: "Bet for fun occasionally" },
  { key: "regular", label: "Regular", sub: "Bet weekly for extra income" },
  { key: "serious", label: "Serious", sub: "Bet daily with a system" },
  { key: "professional", label: "Professional", sub: "Full-time betting" },
];

function Step1({ colors }: { colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  return (
    <View style={styles.stepContainer}>
      <View style={[styles.logoCircle, { backgroundColor: "rgba(0,229,255,0.12)", borderColor: colors.cyan }]}>
        <Text style={styles.logoEmoji}>⚡</Text>
      </View>
      <Text style={[styles.welcomeTitle, { color: colors.text }]}>Welcome to{"\n"}PrediQs AI</Text>
      <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>
        AI-powered sports betting intelligence. Real predictions, real edge, responsible play.
      </Text>
      <View style={styles.featureList}>
        {[
          { icon: "🎯", text: "AI predictions across 50+ leagues" },
          { icon: "📊", text: "Bankroll & bankroll management" },
          { icon: "⚡", text: "Live scores & momentum tracking" },
          { icon: "🔍", text: "Bet slip analysis with Claude Vision" },
        ].map((f, i) => (
          <View key={i} style={[styles.featureRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.featureEmoji}>{f.icon}</Text>
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>{f.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Step2({ selected, onToggle, colors }: { selected: string[]; onToggle: (key: string) => void; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Choose your sports</Text>
      <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
        We'll tailor predictions and alerts to what you care about most.
      </Text>
      <View style={styles.sportsGrid}>
        {SPORTS.map((s) => {
          const active = selected.includes(s.key);
          return (
            <TouchableOpacity
              key={s.key}
              style={[
                styles.sportCard,
                { backgroundColor: active ? "rgba(0,229,255,0.12)" : colors.card, borderColor: active ? colors.cyan : colors.border },
              ]}
              onPress={() => { Haptics.selectionAsync(); onToggle(s.key); }}
              activeOpacity={0.75}
            >
              <Text style={styles.sportEmoji}>{s.icon}</Text>
              <Text style={[styles.sportLabel, { color: active ? colors.cyan : colors.text }]}>{s.label}</Text>
              {active && (
                <View style={[styles.checkBadge, { backgroundColor: colors.cyan }]}>
                  <Check size={10} color={colors.background} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function Step3({ selected, onSelect, colors }: { selected: string; onSelect: (key: string) => void; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>What type of bettor are you?</Text>
      <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
        This helps us personalise your stake recommendations and coaching.
      </Text>
      <View style={styles.bettorList}>
        {BETTOR_TYPES.map((b) => {
          const active = selected === b.key;
          return (
            <TouchableOpacity
              key={b.key}
              style={[
                styles.bettorCard,
                { backgroundColor: active ? "rgba(0,229,255,0.08)" : colors.card, borderColor: active ? colors.cyan : colors.border },
              ]}
              onPress={() => { Haptics.selectionAsync(); onSelect(b.key); }}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.bettorLabel, { color: active ? colors.cyan : colors.text }]}>{b.label}</Text>
                <Text style={[styles.bettorSub, { color: colors.textSecondary }]}>{b.sub}</Text>
              </View>
              <View style={[styles.radio, { borderColor: active ? colors.cyan : colors.border, backgroundColor: active ? colors.cyan : "transparent" }]}>
                {active && <View style={[styles.radioDot, { backgroundColor: colors.background }]} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function Step4({ limit, onChangeLimit, colors }: { limit: number; onChangeLimit: (v: number) => void; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const PRESETS = [25, 50, 100, 250, 500, 1000];
  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Set your daily loss limit</Text>
      <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
        We'll alert you when you're approaching this limit. Responsible gambling starts here.
      </Text>
      <View style={[styles.limitDisplay, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.limitLabel, { color: colors.textMuted }]}>Daily Loss Limit</Text>
        <Text style={[styles.limitValue, { color: colors.cyan }]}>${limit}</Text>
      </View>
      <View style={styles.presetGrid}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.presetBtn,
              { backgroundColor: limit === p ? colors.cyan : colors.card, borderColor: limit === p ? colors.cyan : colors.border },
            ]}
            onPress={() => { Haptics.selectionAsync(); onChangeLimit(p); }}
            activeOpacity={0.75}
          >
            <Text style={[styles.presetText, { color: limit === p ? colors.background : colors.text }]}>${p}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.warningBox, { backgroundColor: "rgba(255,107,53,0.08)", borderColor: "rgba(255,107,53,0.3)" }]}>
        <AlertTriangle size={16} color="#FF6B35" />
        <Text style={[styles.warningText, { color: "#FF6B35" }]}>
          Gambling can be addictive. Only bet what you can afford to lose. 18+ only.
        </Text>
      </View>
    </View>
  );
}

function Step5({ colors }: { colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  return (
    <View style={[styles.stepContainer, { alignItems: "center" }]}>
      <View style={[styles.successCircle, { backgroundColor: "rgba(0,255,148,0.12)", borderColor: "#00FF94" }]}>
        <Check size={40} color="#00FF94" />
      </View>
      <Text style={[styles.welcomeTitle, { color: colors.text, textAlign: "center" }]}>You're all set! 🎯</Text>
      <Text style={[styles.welcomeSub, { color: colors.textSecondary, textAlign: "center" }]}>
        Your personalised dashboard is ready. AI predictions refresh every 6 hours with live data from 50+ leagues worldwide.
      </Text>
      <View style={styles.readyList}>
        {[
          "✅ Sports preferences saved",
          "✅ Daily loss limit configured",
          "✅ AI predictions activated",
          "✅ Responsible gambling protection on",
        ].map((item, i) => (
          <Text key={i} style={[styles.readyItem, { color: colors.textSecondary }]}>{item}</Text>
        ))}
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { updateBankroll } = useApp();

  const [step, setStep] = useState(0);
  const [selectedSports, setSelectedSports] = useState<string[]>(["soccer", "nfl"]);
  const [bettorType, setBettorType] = useState("casual");
  const [dailyLimit, setDailyLimit] = useState(100);

  const flatListRef = useRef<FlatList>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const TOTAL_STEPS = 5;

  function goToStep(next: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(next);
    flatListRef.current?.scrollToIndex({ index: next, animated: true });
    Animated.timing(progress, { toValue: (next + 1) / TOTAL_STEPS, duration: 300, useNativeDriver: false }).start();
  }

  function toggleSport(key: string) {
    setSelectedSports((prev) => prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]);
  }

  async function finish() {
    try { await updateBankroll(0); } catch {}
    router.replace("/(tabs)");
  }

  const canContinue = step === 0 || (step === 1 && selectedSports.length > 0) || (step === 2 && bettorType !== "") || step === 3 || step === 4;
  const stepData = [{ key: "welcome" }, { key: "sports" }, { key: "type" }, { key: "limit" }, { key: "ready" }];
  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.progressBar, { paddingTop: insets.top + 16 }]}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: colors.cyan }]} />
        </View>
        {step > 0 && (
          <TouchableOpacity style={styles.skipBtn} onPress={() => router.replace("/(tabs)")}>
            <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={stepData}
        keyExtractor={(item) => item.key}
        renderItem={({ index }) => (
          <View style={{ width: SCREEN_WIDTH }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {index === 0 && <Step1 colors={colors} />}
              {index === 1 && <Step2 selected={selectedSports} onToggle={toggleSport} colors={colors} />}
              {index === 2 && <Step3 selected={bettorType} onSelect={setBettorType} colors={colors} />}
              {index === 3 && <Step4 limit={dailyLimit} onChangeLimit={setDailyLimit} colors={colors} />}
              {index === 4 && <Step5 colors={colors} />}
            </ScrollView>
          </View>
        )}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      />

      <View style={[styles.navRow, { paddingBottom: insets.bottom + 20, borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <View style={styles.dots}>
          {stepData.map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === step ? colors.cyan : colors.border, width: i === step ? 20 : 7 }]} />
          ))}
        </View>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: canContinue ? colors.cyan : colors.border, opacity: canContinue ? 1 : 0.5 }]}
          onPress={() => { if (step < TOTAL_STEPS - 1) goToStep(step + 1); else finish(); }}
          disabled={!canContinue}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextBtnText, { color: canContinue ? colors.background : colors.textMuted }]}>
            {step === TOTAL_STEPS - 1 ? "Go to Dashboard" : "Continue"}
          </Text>
          <ArrowRight size={16} color={canContinue ? colors.background : colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressBar: { paddingHorizontal: 20, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  skipBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  skipText: { fontSize: 13 },
  stepContainer: { width: SCREEN_WIDTH, padding: 24, paddingTop: 20, gap: 0 },
  logoCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", borderWidth: 2, marginBottom: 24, alignSelf: "center" },
  logoEmoji: { fontSize: 44 },
  welcomeTitle: { fontSize: 30, lineHeight: 38, marginBottom: 12 },
  welcomeSub: { fontSize: 15, lineHeight: 23, marginBottom: 28 },
  featureList: { gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  featureEmoji: { fontSize: 20 },
  featureText: { fontSize: 14 },
  stepTitle: { fontSize: 24, marginBottom: 8, letterSpacing: -0.3 },
  stepSub: { fontSize: 14, lineHeight: 21, marginBottom: 24 },
  sportsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  sportCard: { width: (SCREEN_WIDTH - 60) / 2, padding: 16, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 8, position: "relative" },
  sportEmoji: { fontSize: 32 },
  sportLabel: { fontSize: 13, textAlign: "center" },
  checkBadge: { position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  bettorList: { gap: 12 },
  bettorCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 1, gap: 14 },
  bettorLabel: { fontSize: 15 },
  bettorSub: { fontSize: 12, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  limitDisplay: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", marginBottom: 24, gap: 6 },
  limitLabel: { fontSize: 12, letterSpacing: 0.5 },
  limitValue: { fontSize: 44 },
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  presetBtn: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 10, borderWidth: 1 },
  presetText: { fontSize: 14 },
  warningBox: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  warningText: { flex: 1, fontSize: 12, lineHeight: 18 },
  successCircle: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", borderWidth: 2, marginBottom: 24 },
  readyList: { gap: 10, marginTop: 20, width: "100%" },
  readyItem: { fontSize: 14 },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1 },
  dots: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { height: 7, borderRadius: 3.5 },
  nextBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  nextBtnText: { fontSize: 15 },
});
