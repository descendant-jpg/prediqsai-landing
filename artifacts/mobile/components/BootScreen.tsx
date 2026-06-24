import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import colors from "@/constants/colors";

// ─── Design tokens (sourced from constants/colors.ts — no invented colors) ─────────
const C = colors.dark;
const BG = C.background;
const CARD_BG = C.backgroundSecondary;
const GOLD = C.gold;
const CYAN = C.cyan;
const TEXT = C.text;
const TEXT_SECONDARY = C.textSecondary;
const TEXT_MUTED = C.textMuted;

const BULLETS = [
  "AI Match Analysis",
  "Predictive Odds Modeling",
  "Real-Time Data Feeds",
  "Smart Bankroll Strategy",
  "Built for Winners",
];

const BULLET_BASE = 800; // ms before first bullet
const BULLET_STEP = 300; // ms between bullets
const INIT_AT = 2500; // ms — status row flips to "INITIALISING..."
const FINISH_AT = 3000; // ms — route away

function Bullet({ label, delay }: { label: string; delay: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.bulletRow, style]}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{label}</Text>
    </Animated.View>
  );
}

export function BootScreen({ onFinish }: { onFinish: () => void }) {
  const insets = useSafeAreaInsets();
  const [initialising, setInitialising] = useState(false);

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const nameOpacity = useSharedValue(0);
  const tagOpacity = useSharedValue(0);
  const tagTranslate = useSharedValue(8);
  const pulse = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
    logoScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.4)) });
    nameOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
    tagOpacity.value = withDelay(550, withTiming(1, { duration: 500 }));
    tagTranslate.value = withDelay(550, withTiming(0, { duration: 500 }));
    pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);

    const t1 = setTimeout(() => setInitialising(true), INIT_AT);
    const t2 = setTimeout(() => onFinish(), FINISH_AT);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const nameStyle = useAnimatedStyle(() => ({ opacity: nameOpacity.value }));
  const tagStyle = useAnimatedStyle(() => ({
    opacity: tagOpacity.value,
    transform: [{ translateY: tagTranslate.value }],
  }));
  const statusStyle = useAnimatedStyle(() => ({ opacity: 0.55 + pulse.value * 0.45 }));

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 28 }]}>
      <View style={styles.center}>
        <Animated.View style={[styles.logoCircle, logoStyle]}>
          <Text style={styles.logoText}>PQ</Text>
        </Animated.View>
        <Animated.Text style={[styles.appName, nameStyle]}>PrediQs AI</Animated.Text>
        <Animated.Text style={[styles.tagline, tagStyle]}>VISION INTELLIGENCE AI</Animated.Text>

        <View style={styles.bullets}>
          {BULLETS.map((b, i) => (
            <Bullet key={b} label={b} delay={BULLET_BASE + i * BULLET_STEP} />
          ))}
        </View>
      </View>

      <Animated.View style={[styles.statusWrap, statusStyle]}>
        {initialising ? (
          <Text style={styles.initText}>INITIALISING...</Text>
        ) : (
          <Text style={styles.statusText}>🔴 LIVE • 🔒 SECURED • 🤝 TRUSTED</Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    paddingHorizontal: 32,
    justifyContent: "space-between",
    zIndex: 100,
    elevation: 100,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: CARD_BG,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    shadowColor: GOLD,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  logoText: { fontSize: 30, color: GOLD, fontWeight: "800", letterSpacing: -0.5 },
  appName: { fontSize: 32, color: TEXT, fontWeight: "800", letterSpacing: -0.5, marginBottom: 8 },
  tagline: { fontSize: 12, color: GOLD, fontWeight: "700", letterSpacing: 3, marginBottom: 40 },
  bullets: { gap: 14, alignSelf: "center" },
  bulletRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  bulletDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: CYAN },
  bulletText: { fontSize: 15, color: TEXT_SECONDARY, fontWeight: "600", letterSpacing: 0.2 },
  statusWrap: { alignItems: "center" },
  statusText: { fontSize: 12, color: TEXT_MUTED, fontWeight: "600", letterSpacing: 1 },
  initText: { fontSize: 12, color: GOLD, fontWeight: "700", letterSpacing: 2 },
});
