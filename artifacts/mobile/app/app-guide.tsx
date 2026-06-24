import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BellRing,
  Bot,
  Brain,
  Calculator,
  Check,
  Coins,
  Crown,
  Gauge,
  GraduationCap,
  Info,
  Layers,
  LineChart,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  Music2,
  PartyPopper,
  Rocket,
  Rss,
  ScanLine,
  Scale,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sprout,
  TrendingUp,
  Users,
  PlaySquare,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, type BettingExperience } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TOTAL = 10;

/** Maps the betting-experience option keys to the canonical capitalized levels
 * consumed by the global AppContext (and forwarded to the backend AI persona). */
const EXPERIENCE_BY_KEY: Record<string, BettingExperience> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  professional: "Professional",
};

type LucideIcon = React.ComponentType<{ size?: number; color?: string }>;

type CardItem = {
  key?: string;
  icon: LucideIcon | string;
  title: string;
  desc?: string;
  tint?: string;
};

type GuideScreen =
  | {
      kind: "info";
      category: string;
      title: string;
      intro: string;
      banner?: string;
      listHeader?: string;
      items: CardItem[];
    }
  | {
      kind: "single";
      category: string;
      title: string;
      intro: string;
      options: CardItem[];
      purpose?: "experience";
    }
  | {
      kind: "multi";
      category: string;
      title: string;
      intro: string;
      options: CardItem[];
    }
  | { kind: "finish"; category: string; title: string; intro: string };

const SCREENS: GuideScreen[] = [
  {
    kind: "info",
    category: "WELCOME",
    title: "Welcome to Prediqs AI",
    intro:
      "We built this quick guide to help you understand everything Prediqs AI has to offer. We'll walk you through our key features so you can get the most out of the app and beat the bookies.",
    banner:
      "This takes about 2 minutes. Feel free to skip anytime — you can always revisit from your profile.",
    listHeader: "Everything Inside Prediqs AI",
    items: [
      {
        icon: Brain,
        title: "AI Predictions",
        desc: "Get highly trained AI analysis with the highest and surest odds to maximize your win rate.",
      },
      {
        icon: GraduationCap,
        title: "Learning Hub",
        desc: "Videos, lessons, and betting terminology to build your sports betting foundation.",
      },
      {
        icon: Bot,
        title: "Auto Bet",
        desc: "AI-powered automated betting integrations with high winning probabilities.",
      },
      {
        icon: LineChart,
        title: "Betting Tracker",
        desc: "Real-time updates and ROI tracking on all your active slips.",
      },
    ],
  },
  {
    kind: "single",
    category: "WHAT'S",
    title: "What's Your Betting Experience?",
    intro:
      "This helps us personalize your experience and recommend the right betting markets for you.",
    purpose: "experience",
    options: [
      {
        key: "beginner",
        icon: Sprout,
        title: "Beginner",
        desc: "I'm new to sports betting and want to learn the basics.",
      },
      {
        key: "intermediate",
        icon: TrendingUp,
        title: "Intermediate",
        desc: "I understand odds, parlays, and have placed some bets.",
      },
      {
        key: "advanced",
        icon: BarChart3,
        title: "Advanced",
        desc: "I bet regularly, understand bankroll management, and use data.",
      },
      {
        key: "professional",
        icon: Crown,
        title: "Professional",
        desc: "I bet full-time, hunt for arbitrage, and manage funds professionally.",
      },
    ],
  },
  {
    kind: "single",
    category: "GOALS",
    title: "What Are Your Primary Goals?",
    intro: "Tell us what you want to achieve so the Oracle AI can tailor its advice.",
    options: [
      {
        key: "roi",
        icon: LineChart,
        title: "Consistent ROI",
        desc: "I want slow, steady, data-driven profits.",
      },
      {
        key: "parlays",
        icon: Rocket,
        title: "Big Accumulators/Parlays",
        desc: "I want high-risk, high-reward lotto tickets.",
      },
      {
        key: "arb",
        icon: Scale,
        title: "Arbitrage & Value",
        desc: "I want to exploit bookmaker pricing errors.",
      },
      {
        key: "fun",
        icon: PartyPopper,
        title: "Just for Fun",
        desc: "I just want to make watching sports more exciting.",
      },
    ],
  },
  {
    kind: "multi",
    category: "SPORTS",
    title: "Favorite Sports To Bet On?",
    intro: "Select the sports you follow the most. You can change this later.",
    options: [
      { key: "soccer", icon: "⚽", title: "Soccer", desc: "Premier League, La Liga, Champions League" },
      { key: "nfl", icon: "🏈", title: "American Football", desc: "NFL, NCAA" },
      { key: "nba", icon: "🏀", title: "Basketball", desc: "NBA, EuroLeague" },
      { key: "mlb", icon: "⚾", title: "Baseball", desc: "MLB" },
      { key: "tennis", icon: "🎾", title: "Tennis", desc: "ATP, WTA" },
      { key: "mma", icon: "🥊", title: "MMA/Boxing", desc: "UFC" },
    ],
  },
  {
    kind: "info",
    category: "HOW",
    title: "How Betting Works on Prediqs AI",
    intro:
      "Every prediction tells you exactly where the value is. Here is how our data feeds work so you never miss an edge.",
    items: [
      {
        icon: Rss,
        title: "Using Prediqs Feed",
        desc: "A real-time stream of all active bets, line movements, and AI confidence shifts.",
      },
      {
        icon: BellRing,
        title: "VIP Betting Signals",
        desc: "Get push notifications the second our AI detects a massive value gap in the market.",
      },
      {
        icon: Search,
        title: "Bookmaker Odds",
        desc: "We scan 40+ sportsbooks to ensure you always get the absolute best price for your slip.",
      },
    ],
  },
  {
    kind: "info",
    category: "AI-POWERED",
    title: "AI-Powered Betting Tools",
    intro:
      "Our AI does the heavy lifting so you can bet smarter, not harder. Here are your premium tools.",
    items: [
      {
        icon: ScanLine,
        title: "Slip Analyzer",
        desc: "Upload a screenshot of your bet slip, and our AI will instantly grade the risk and calculate the true win probability.",
      },
      {
        icon: MessageCircle,
        title: "Oracle AI Tutor",
        desc: "Ask any betting question. From 'What is Asian Handicap?' to 'Should I hedge this parlay?' — your personal mentor.",
      },
      {
        icon: Calculator,
        title: "Kelly Calculator",
        desc: "Enter your bankroll and the AI's win probability to instantly know the exact optimal stake size.",
      },
    ],
  },
  {
    kind: "info",
    category: "METRICS",
    title: "Understanding Confidence Scores",
    intro:
      "We don't just guess; we grade. Every match is assigned a strict risk and confidence profile.",
    items: [
      {
        icon: ShieldCheck,
        tint: "#00FF94",
        title: "High Confidence (Low Risk)",
        desc: "All statistical, market, and contextual factors align perfectly. Highly recommended.",
      },
      {
        icon: Gauge,
        tint: "#FF6B35",
        title: "Medium Confidence (Med Risk)",
        desc: "Most factors align, presenting a solid value bet opportunity.",
      },
      {
        icon: AlertTriangle,
        tint: "#FF4D4D",
        title: "Avoid/Trap Game (High Risk)",
        desc: "Conflicting data or sharp money movement. The AI recommends skipping this match.",
      },
    ],
  },
  {
    kind: "info",
    category: "STRATEGY",
    title: "Bankroll Management",
    intro:
      "The secret to long-term betting success is protecting your capital. Prediqs AI helps you stay disciplined.",
    items: [
      {
        icon: ShieldAlert,
        title: "Daily Loss Limits",
        desc: "Set a cap on your daily exposure to prevent chasing losses.",
      },
      {
        icon: Layers,
        title: "Stake Recommendations",
        desc: "The AI suggests 'low', 'medium', or 'high' unit stakes based on the edge detected.",
      },
      {
        icon: Activity,
        title: "Performance Tracking",
        desc: "Connect your bets to see your true Win Rate and Return on Investment (ROI) over 30 days.",
      },
    ],
  },
  {
    kind: "single",
    category: "REFERRAL",
    title: "How Did You Find Us?",
    intro: "Help us know where our winners are coming from.",
    options: [
      { key: "social", icon: Share2, title: "Social Media" },
      { key: "friends", icon: Users, title: "Friends or Referral" },
      { key: "youtube", icon: PlaySquare, title: "YouTube" },
      { key: "tiktok", icon: Music2, title: "TikTok" },
      { key: "google", icon: Search, title: "Google Search" },
      { key: "ad", icon: Megaphone, title: "Advertisement" },
      { key: "other", icon: MoreHorizontal, title: "Other" },
    ],
  },
  {
    kind: "finish",
    category: "FINISH",
    title: "You're All Set!",
    intro:
      "Your AI engine is calibrated and ready to go. Welcome to the future of sports betting.",
  },
];

function GuideCard({
  item,
  selectable,
  selected,
  onPress,
  accent,
  colors,
}: {
  item: CardItem;
  selectable: boolean;
  selected: boolean;
  onPress?: () => void;
  accent: string;
  colors: ReturnType<typeof useColors>;
}) {
  const isEmoji = typeof item.icon === "string";
  const Icon = isEmoji ? null : (item.icon as LucideIcon);
  const iconColor = item.tint ?? (selected ? accent : colors.text);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: selected ? `${accent}14` : colors.card,
          borderColor: selected ? accent : colors.cardBorder,
        },
        selected && { shadowColor: accent, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
        pressed && onPress ? { opacity: 0.85 } : null,
      ]}
    >
      <View
        style={[
          styles.cardIcon,
          { backgroundColor: selected ? `${accent}1F` : colors.background, borderColor: colors.cardBorder },
        ]}
      >
        {isEmoji ? (
          <Text style={styles.cardEmoji}>{item.icon as string}</Text>
        ) : Icon ? (
          <Icon size={22} color={iconColor} />
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: "#FFFFFF" }]}>{item.title}</Text>
        {item.desc ? (
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
        ) : null}
      </View>

      {selectable ? (
        <View
          style={[
            styles.selDot,
            {
              borderColor: selected ? accent : colors.cardBorder,
              backgroundColor: selected ? accent : "transparent",
            },
          ]}
        >
          {selected ? <Check size={13} color={colors.background} strokeWidth={3} /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export default function AppGuideScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setBettingExperience, markAppGuideSeen } = useApp();
  const accent = colors.primary;

  const [index, setIndex] = useState(0);
  const [single, setSingle] = useState<Record<number, string>>({});
  const [sports, setSports] = useState<string[]>([]);

  const tx = useSharedValue(0);
  const progress = useSharedValue(1 / TOTAL);
  const trackWidth = useSharedValue(0);

  const trackStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: progress.value * trackWidth.value }));

  function requiresSelection(i: number) {
    const s = SCREENS[i];
    return s.kind === "single" || s.kind === "multi";
  }

  function canContinue(i: number) {
    const s = SCREENS[i];
    if (s.kind === "single") return !!single[i];
    if (s.kind === "multi") return sports.length > 0;
    return true;
  }

  function goTo(next: number) {
    if (next < 0 || next > TOTAL - 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    tx.value = withTiming(-next * SCREEN_WIDTH, { duration: 340 });
    progress.value = withTiming((next + 1) / TOTAL, { duration: 340 });
    setIndex(next);
  }

  async function complete() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markAppGuideSeen();
    router.replace("/(tabs)");
  }

  function handleNext() {
    if (!canContinue(index)) return;
    if (index < TOTAL - 1) goTo(index + 1);
    else complete();
  }

  function selectSingle(i: number, key: string) {
    Haptics.selectionAsync();
    setSingle((prev) => ({ ...prev, [i]: key }));
    // When the user picks their betting experience, save it globally right away so
    // their onboarding choice instantly configures the backend AI persona.
    const screen = SCREENS[i];
    if (screen.kind === "single" && screen.purpose === "experience") {
      const level = EXPERIENCE_BY_KEY[key];
      if (level) void setBettingExperience(level);
    }
  }

  function toggleSport(key: string) {
    Haptics.selectionAsync();
    setSports((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const current = SCREENS[index];
  const stepLabel = `${String(index + 1).padStart(2, "0")} / ${TOTAL}`;
  const continueEnabled = canContinue(index);
  const footerPad = insets.bottom + 16;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>
          PREDIQS <Text style={{ color: accent }}>AI</Text>
        </Text>
        <Pressable onPress={complete} hitSlop={10} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>SKIP</Text>
        </Pressable>
      </View>

      {/* Progress */}
      <View style={styles.progressWrap}>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {stepLabel} <Text style={{ color: colors.textMuted }}>•</Text>{" "}
          <Text style={{ color: accent }}>{current.category}</Text>
        </Text>
        <View
          style={[styles.progressTrack, { backgroundColor: colors.cardBorder }]}
          onLayout={(e) => {
            trackWidth.value = e.nativeEvent.layout.width;
          }}
        >
          <Animated.View style={[styles.progressFill, fillStyle, { backgroundColor: accent }]} />
        </View>
      </View>

      {/* Carousel */}
      <View style={styles.carousel}>
        <Animated.View style={[styles.track, trackStyle, { width: SCREEN_WIDTH * TOTAL }]}>
          {SCREENS.map((screen, i) => (
            <View key={i} style={{ width: SCREEN_WIDTH }}>
              <ScrollView
                contentContainerStyle={styles.slideContent}
                showsVerticalScrollIndicator={false}
              >
                {screen.kind === "finish" ? (
                  <View style={styles.finishWrap}>
                    <View
                      style={[
                        styles.finishBadge,
                        { backgroundColor: `${accent}14`, borderColor: accent },
                      ]}
                    >
                      <Sparkles size={48} color={accent} />
                    </View>
                    <Text style={styles.finishTitle}>{screen.title}</Text>
                    <Text style={[styles.finishIntro, { color: colors.textSecondary }]}>
                      {screen.intro}
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.slideTitle}>{screen.title}</Text>
                    <Text style={[styles.slideIntro, { color: colors.textSecondary }]}>
                      {screen.intro}
                    </Text>

                    {screen.kind === "info" && screen.banner ? (
                      <View
                        style={[
                          styles.banner,
                          { backgroundColor: `${accent}12`, borderColor: `${accent}3A` },
                        ]}
                      >
                        <Info size={16} color={accent} />
                        <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
                          {screen.banner}
                        </Text>
                      </View>
                    ) : null}

                    {requiresSelection(i) && !canContinue(i) ? (
                      <View
                        style={[
                          styles.banner,
                          { backgroundColor: `${accent}12`, borderColor: `${accent}3A` },
                        ]}
                      >
                        <Info size={16} color={accent} />
                        <Text style={[styles.bannerText, { color: accent }]}>
                          Please select one option to continue
                        </Text>
                      </View>
                    ) : null}

                    {screen.kind === "info" && screen.listHeader ? (
                      <Text style={[styles.listHeader, { color: colors.textMuted }]}>
                        {screen.listHeader.toUpperCase()}
                      </Text>
                    ) : null}

                    <View style={styles.cardList}>
                      {screen.kind === "info"
                        ? screen.items.map((item, k) => (
                            <GuideCard
                              key={k}
                              item={item}
                              selectable={false}
                              selected={false}
                              accent={accent}
                              colors={colors}
                            />
                          ))
                        : screen.options.map((item) => {
                            const isSelected =
                              screen.kind === "single"
                                ? single[i] === item.key
                                : sports.includes(item.key ?? "");
                            return (
                              <GuideCard
                                key={item.key}
                                item={item}
                                selectable
                                selected={isSelected}
                                accent={accent}
                                colors={colors}
                                onPress={() =>
                                  screen.kind === "single"
                                    ? selectSingle(i, item.key ?? "")
                                    : toggleSport(item.key ?? "")
                                }
                              />
                            );
                          })}
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          { paddingBottom: footerPad, borderTopColor: colors.cardBorder, backgroundColor: colors.background },
        ]}
      >
        {index > 0 ? (
          <Pressable
            onPress={() => goTo(index - 1)}
            style={[styles.backBtn, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
            hitSlop={6}
          >
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={handleNext}
          disabled={!continueEnabled}
          style={[
            styles.nextBtn,
            {
              backgroundColor: continueEnabled ? accent : colors.card,
              borderColor: continueEnabled ? accent : colors.cardBorder,
              opacity: continueEnabled ? 1 : 0.6,
            },
            continueEnabled && {
              shadowColor: accent,
              shadowOpacity: 0.45,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 0 },
              elevation: 6,
            },
          ]}
        >
          <Text
            style={[
              styles.nextText,
              { color: continueEnabled ? colors.background : colors.textMuted },
            ]}
          >
            {index === TOTAL - 1 ? "Enter Prediqs AI" : "Next"}
          </Text>
          <ArrowRight
            size={18}
            color={continueEnabled ? colors.background : colors.textMuted}
          />
        </Pressable>
      </View>
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
    paddingTop: 8,
    paddingBottom: 6,
  },
  logo: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 1.5,
  },
  skipBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  skipText: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },

  progressWrap: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12, gap: 8 },
  progressText: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden", width: "100%" },
  progressFill: { height: "100%", borderRadius: 2 },

  carousel: { flex: 1, overflow: "hidden" },
  track: { flex: 1, flexDirection: "row" },
  slideContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },

  slideTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  slideIntro: { fontSize: 14, lineHeight: 21, marginBottom: 16 },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerText: { flex: 1, fontSize: 12.5, lineHeight: 18, fontFamily: "Inter_500Medium" },

  listHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  cardList: { gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  cardEmoji: { fontSize: 24 },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 15.5, fontFamily: "Inter_700Bold" },
  cardDesc: { fontSize: 12.5, lineHeight: 18 },
  selDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  finishWrap: { alignItems: "center", paddingTop: 60, gap: 18 },
  finishBadge: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  finishTitle: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  finishIntro: { fontSize: 15, lineHeight: 23, textAlign: "center", paddingHorizontal: 12 },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  backBtn: {
    width: 54,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  nextBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextText: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
});
