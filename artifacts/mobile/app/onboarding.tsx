import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AlertTriangle, ArrowRight, Check, Zap } from "lucide-react-native";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
type UserType = { key: string; label: string; sub: string };

const SPORTS: Sport[] = [
  { key: "soccer", label: "Soccer / Football", icon: "⚽" },
  { key: "nfl", label: "NFL", icon: "🏈" },
  { key: "nba", label: "NBA", icon: "🏀" },
  { key: "mlb", label: "MLB", icon: "⚾" },
  { key: "tennis", label: "Tennis", icon: "🎾" },
  { key: "boxing", label: "Boxing / MMA", icon: "🥊" },
];

const USER_TYPES: UserType[] = [
  { key: "casual", label: "Casual Fan", sub: "Follow sports for fun occasionally" },
  { key: "regular", label: "Sports Enthusiast", sub: "Follow sports closely, weekly" },
  { key: "serious", label: "Analytics Follower", sub: "Track stats and data daily" },
  { key: "professional", label: "Professional Analyst", sub: "Full-time sports analysis" },
];

const STATIC_CONFIRMS = [
  "I understand this is for educational purposes only",
  "Betting is legal in my jurisdiction",
  "I will engage responsibly and within my means",
];

function Step0({
  ageChecked,
  onToggleAge,
  colors,
}: {
  ageChecked: boolean;
  onToggleAge: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={styles.stepContainer}>
      {/* Gold lightning bolt */}
      <View style={[styles.logoCircle, { backgroundColor: "rgba(255,215,0,0.10)", borderColor: "#FFD700" }]}>
        <Zap size={44} color="#FFD700" fill="#FFD700" />
      </View>

      {/* Title with cyan brand name */}
      <Text style={[styles.welcomeTitle, { color: colors.text }]}>
        {"Welcome to\n"}
        <Text style={{ color: colors.cyan }}>PrediQs AI</Text>
      </Text>
      <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>
        PrediQs AI is an educational sports intelligence platform.
      </Text>

      <View style={[styles.doCard, { backgroundColor: "rgba(0,255,148,0.06)", borderColor: "rgba(0,255,148,0.25)" }]}>
        <Text style={[styles.doCardTitle, { color: "#00FF94" }]}>✅  What we do</Text>
        {[
          "Provide AI sports match analysis",
          "Teach probability concepts",
          "Show odds comparisons",
          "Educational insights only",
        ].map((t, i) => (
          <Text key={i} style={[styles.doItem, { color: colors.textSecondary }]}>• {t}</Text>
        ))}
      </View>

      <View style={[styles.doCard, { backgroundColor: "rgba(255,77,77,0.06)", borderColor: "rgba(255,77,77,0.25)", marginTop: 10 }]}>
        <Text style={[styles.doCardTitle, { color: "#FF4D4D" }]}>❌  What we don't do</Text>
        {[
          "Accept bets or wagers",
          "Provide gambling advice",
          "Guarantee any outcomes",
        ].map((t, i) => (
          <Text key={i} style={[styles.doItem, { color: colors.textSecondary }]}>• {t}</Text>
        ))}
      </View>

      <Text style={[styles.confirmTitle, { color: colors.textSecondary }]}>
        By continuing you also confirm:
      </Text>
      {STATIC_CONFIRMS.map((t, i) => (
        <View key={i} style={styles.staticConfirmRow}>
          <View style={[styles.staticDot, { backgroundColor: colors.textMuted }]} />
          <Text style={[styles.staticConfirmText, { color: colors.textMuted }]}>{t}</Text>
        </View>
      ))}

      {/* ── Required age checkbox ── */}
      <TouchableOpacity
        style={[
          styles.checkRow,
          {
            borderColor: ageChecked ? colors.cyan : colors.border,
            backgroundColor: ageChecked ? "rgba(0,229,255,0.09)" : colors.card,
            marginTop: 16,
          },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onToggleAge();
        }}
        activeOpacity={0.75}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: ageChecked ? colors.cyan : colors.border,
              backgroundColor: ageChecked ? colors.cyan : "transparent",
            },
          ]}
        >
          {ageChecked && <Check size={13} color="#070B12" strokeWidth={3} />}
        </View>
        <Text style={[styles.checkLabel, { color: ageChecked ? colors.text : colors.textSecondary }]}>
          I am 18 years or older
        </Text>
        {ageChecked && (
          <View style={[styles.tickedBadge, { backgroundColor: "rgba(0,229,255,0.15)" }]}>
            <Text style={[styles.tickedBadgeText, { color: colors.cyan }]}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

function Step1({ colors }: { colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>What's inside</Text>
      <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
        AI-powered sports intelligence for educational match analysis, probability learning, and informed decision making.
      </Text>
      <View style={styles.featureList}>
        {[
          { icon: "🎯", text: "AI match analysis across 50+ leagues" },
          { icon: "📊", text: "Sports finance tracking & management" },
          { icon: "⚡", text: "Live scores & momentum tracking" },
          { icon: "🔍", text: "Slip review education with PrediQs AI" },
        ].map((f, i) => (
          <View key={i} style={[styles.featureRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.featureEmoji}>{f.icon}</Text>
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>{f.text}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.eduNote, { backgroundColor: "rgba(0,229,255,0.06)", borderColor: "rgba(0,229,255,0.2)" }]}>
        <Text style={[styles.eduNoteText, { color: colors.textMuted }]}>
          All match analysis, probability scores and insights are for learning and information only. Not gambling advice.
        </Text>
      </View>
    </View>
  );
}

function Step2({ selected, onToggle, colors }: { selected: string[]; onToggle: (key: string) => void; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Choose your sports</Text>
      <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
        We'll tailor match analysis and alerts to what you care about most.
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
                  <Check size={10} color="#070B12" />
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
      <Text style={[styles.stepTitle, { color: colors.text }]}>How do you engage with sports?</Text>
      <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
        This helps us personalise your analysis insights and education level.
      </Text>
      <View style={styles.bettorList}>
        {USER_TYPES.map((b) => {
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
      <Text style={[styles.stepTitle, { color: colors.text }]}>Set your daily tracking limit</Text>
      <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
        We'll alert you when you're approaching this limit. Responsible tracking starts here.
      </Text>
      <View style={[styles.limitDisplay, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.limitLabel, { color: colors.textMuted }]}>Daily Limit</Text>
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
            <Text style={[styles.presetText, { color: limit === p ? "#070B12" : colors.text }]}>${p}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.warningBox, { backgroundColor: "rgba(255,107,53,0.08)", borderColor: "rgba(255,107,53,0.3)" }]}>
        <AlertTriangle size={16} color="#FF6B35" />
        <Text style={[styles.warningText, { color: "#FF6B35" }]}>
          Sports betting involves risk. Only stake what you can afford. For educational use only. 18+ only.
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
        Your personalised dashboard is ready. AI match analysis refreshes every 6 hours with live data from 50+ leagues worldwide.
      </Text>
      <View style={styles.readyList}>
        {[
          "✅ Sports preferences saved",
          "✅ Daily limit configured",
          "✅ AI match analysis activated",
          "✅ Responsible play protection on",
        ].map((item, i) => (
          <Text key={i} style={[styles.readyItem, { color: colors.textSecondary }]}>{item}</Text>
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { updateBankroll } = useApp();

  const [step, setStep] = useState(0);
  const [ageChecked, setAgeChecked] = useState(false);
  const [selectedSports, setSelectedSports] = useState<string[]>(["soccer", "nfl"]);
  const [userType, setUserType] = useState("casual");
  const [dailyLimit, setDailyLimit] = useState(100);

  const flatListRef = useRef<FlatList>(null);
  const progress    = useRef(new Animated.Value(0)).current;
  const btnScale    = useRef(new Animated.Value(1)).current;
  const TOTAL_STEPS = 6;

  const canContinue =
    (step === 0 && ageChecked) ||
    step === 1 ||
    (step === 2 && selectedSports.length > 0) ||
    (step === 3 && userType !== "") ||
    step === 4 ||
    step === 5;

  // Animate button scale when it becomes active
  useEffect(() => {
    if (canContinue) {
      Animated.spring(btnScale, {
        toValue: 1.04,
        useNativeDriver: Platform.OS !== "web",
        tension: 200,
        friction: 8,
      }).start(() => {
        Animated.spring(btnScale, {
          toValue: 1,
          useNativeDriver: Platform.OS !== "web",
          tension: 200,
          friction: 8,
        }).start();
      });
    }
  }, [canContinue]);

  async function goToStep(next: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 0 && next === 1) {
      await AsyncStorage.setItem("onboardingComplete", "true");
    }
    setStep(next);
    flatListRef.current?.scrollToIndex({ index: next, animated: true });
    Animated.timing(progress, { toValue: (next + 1) / TOTAL_STEPS, duration: 300, useNativeDriver: false }).start();
  }

  function toggleSport(key: string) {
    setSelectedSports((prev) => prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]);
  }

  async function finish() {
    try { await updateBankroll(0); } catch {}
    await AsyncStorage.setItem("onboardingComplete", "true");
    router.replace("/(tabs)");
  }

  const stepData = [
    { key: "disclaimer" },
    { key: "welcome" },
    { key: "sports" },
    { key: "type" },
    { key: "limit" },
    { key: "ready" },
  ];
  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  const btnBg      = canContinue ? "#00E5FF" : "#1A2535";
  const btnTextCol = canContinue ? "#070B12" : "#4A6070";
  const btnOpacity = canContinue ? 1.0 : 0.5;

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
              {index === 0 && (
                <Step0
                  ageChecked={ageChecked}
                  onToggleAge={() => setAgeChecked((v) => !v)}
                  colors={colors}
                />
              )}
              {index === 1 && <Step1 colors={colors} />}
              {index === 2 && <Step2 selected={selectedSports} onToggle={toggleSport} colors={colors} />}
              {index === 3 && <Step3 selected={userType} onSelect={setUserType} colors={colors} />}
              {index === 4 && <Step4 limit={dailyLimit} onChangeLimit={setDailyLimit} colors={colors} />}
              {index === 5 && <Step5 colors={colors} />}
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
        {/* Page dots — first dot is cyan on step 0 */}
        <View style={styles.dots}>
          {stepData.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === step ? "#00E5FF" : colors.border,
                  width: i === step ? 20 : 7,
                },
              ]}
            />
          ))}
        </View>

        {/* Animated button with glow when active */}
        <Animated.View
          style={[
            styles.btnShadowWrap,
            canContinue && styles.btnGlow,
            { transform: [{ scale: btnScale }] },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.nextBtn,
              { backgroundColor: btnBg, opacity: btnOpacity },
            ]}
            onPress={() => {
              if (!canContinue) return;
              if (step < TOTAL_STEPS - 1) goToStep(step + 1);
              else finish();
            }}
            disabled={!canContinue}
            activeOpacity={0.85}
          >
            <Text style={[styles.nextBtnText, { color: btnTextCol }]}>
              {step === 0 ? "I Understand — Continue" : step === TOTAL_STEPS - 1 ? "Go to Dashboard" : "Continue"}
            </Text>
            <ArrowRight size={16} color={btnTextCol} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1 },
  progressBar:      { paddingHorizontal: 20, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 },
  progressTrack:    { flex: 1, height: 3, borderRadius: 2, overflow: "hidden" },
  progressFill:     { height: "100%", borderRadius: 2 },
  skipBtn:          { paddingHorizontal: 4, paddingVertical: 4 },
  skipText:         { fontSize: 13 },
  stepContainer:    { width: SCREEN_WIDTH, padding: 24, paddingTop: 20, gap: 0 },
  logoCircle:       { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", borderWidth: 2, marginBottom: 20, alignSelf: "center" },
  welcomeTitle:     { fontSize: 30, lineHeight: 38, marginBottom: 10, fontFamily: "Inter_700Bold" },
  welcomeSub:       { fontSize: 15, lineHeight: 23, marginBottom: 16 },
  doCard:           { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  doCardTitle:      { fontSize: 13, marginBottom: 2, fontFamily: "Inter_600SemiBold" },
  doItem:           { fontSize: 13, lineHeight: 20 },
  confirmTitle:     { fontSize: 13, marginTop: 18, marginBottom: 8, fontFamily: "Inter_500Medium" },
  staticConfirmRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 5, paddingLeft: 2 },
  staticDot:        { width: 4, height: 4, borderRadius: 2, marginTop: 7 },
  staticConfirmText:{ flex: 1, fontSize: 13, lineHeight: 19 },
  checkRow:         { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, borderWidth: 1.5, marginBottom: 8 },
  checkbox:         { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkLabel:       { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  tickedBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tickedBadgeText:  { fontSize: 13, fontFamily: "Inter_700Bold", color: "#00E5FF" },
  featureList:      { gap: 10, marginTop: 4 },
  featureRow:       { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  featureEmoji:     { fontSize: 20 },
  featureText:      { fontSize: 14 },
  eduNote:          { borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 14 },
  eduNoteText:      { fontSize: 12, lineHeight: 18, textAlign: "center" },
  stepTitle:        { fontSize: 24, marginBottom: 8, letterSpacing: -0.3, fontFamily: "Inter_700Bold" },
  stepSub:          { fontSize: 14, lineHeight: 21, marginBottom: 24 },
  sportsGrid:       { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  sportCard:        { width: (SCREEN_WIDTH - 60) / 2, padding: 16, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 8, position: "relative" },
  sportEmoji:       { fontSize: 32 },
  sportLabel:       { fontSize: 13, textAlign: "center" },
  checkBadge:       { position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  bettorList:       { gap: 12 },
  bettorCard:       { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 1, gap: 14 },
  bettorLabel:      { fontSize: 15 },
  bettorSub:        { fontSize: 12, marginTop: 2 },
  radio:            { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot:         { width: 10, height: 10, borderRadius: 5 },
  limitDisplay:     { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", marginBottom: 24, gap: 6 },
  limitLabel:       { fontSize: 12, letterSpacing: 0.5 },
  limitValue:       { fontSize: 44, fontFamily: "Inter_700Bold" },
  presetGrid:       { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  presetBtn:        { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 10, borderWidth: 1 },
  presetText:       { fontSize: 14 },
  warningBox:       { flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  warningText:      { flex: 1, fontSize: 12, lineHeight: 18 },
  successCircle:    { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", borderWidth: 2, marginBottom: 24 },
  readyList:        { gap: 10, marginTop: 20, width: "100%" },
  readyItem:        { fontSize: 14 },
  navRow:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1 },
  dots:             { flexDirection: "row", alignItems: "center", gap: 6 },
  dot:              { height: 7, borderRadius: 3.5 },
  // Button
  btnShadowWrap:    { borderRadius: 14 },
  btnGlow:          {
    ...Platform.select({
      web: { boxShadow: "0 0 12px rgba(0,229,255,0.55)" } as any,
      default: {
        shadowColor: "#00E5FF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
        elevation: 10,
      },
    }),
  },
  nextBtn:          { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14 },
  nextBtnText:      { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
