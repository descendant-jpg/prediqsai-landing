import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

const GOLD = "#FFD700";

export function LearningLoader({ message }: { message: string }) {
  const colors = useColors();
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 900, easing: Easing.linear }),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [rotation, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + pulse.value * 0.4,
    transform: [{ scale: 0.85 + pulse.value * 0.3 }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.spinnerWrap}>
        <Animated.View style={[styles.glow, glowStyle]} />
        <Animated.View
          style={[
            styles.ring,
            { borderColor: "rgba(255,215,0,0.18)", borderTopColor: GOLD },
            ringStyle,
          ]}
        />
      </View>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 22 },
  spinnerWrap: { width: 64, height: 64, alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,215,0,0.18)" },
  ring: { width: 50, height: 50, borderRadius: 25, borderWidth: 4 },
  message: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
