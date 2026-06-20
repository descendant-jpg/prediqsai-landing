import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

/** Feature 6 — floating Bet Slip button. Bounces when the count changes. */
export function FloatingSlipButton({ count, onPress }: { count: number; onPress: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (count <= 0) return;
    const anim = Animated.sequence([
      Animated.spring(scale, { toValue: 1.25, useNativeDriver: Platform.OS !== "web", speed: 20, bounciness: 14 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== "web", speed: 20, bounciness: 14 }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [count, scale]);

  if (count <= 0) return null;

  return (
    <Animated.View
      style={[
        styles.wrap,
        { transform: [{ scale }], bottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24 },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[styles.btn, { backgroundColor: colors.gold }]}
      >
        <Text style={styles.icon}>🎟️</Text>
        <Text style={styles.label}>Bet Slip</Text>
        <Text style={[styles.badge, { backgroundColor: "#0a0a0a", color: colors.gold }]}>{count}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", right: 16, zIndex: 90 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 28,
    shadowColor: "#FFD700",
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  icon: { fontSize: 16 },
  label: { fontSize: 15, fontWeight: "800", color: "#0a0a0a" },
  badge: {
    minWidth: 22,
    textAlign: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 11,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
  },
});
