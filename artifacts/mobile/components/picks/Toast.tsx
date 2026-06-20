import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

/**
 * Lightweight Animated snackbar. The parent bumps `nonce` (e.g. Date.now())
 * each time it wants the current `message` to appear, which re-triggers the
 * fade-in / hold / fade-out sequence even for an identical message.
 */
export function Toast({ message, nonce }: { message: string; nonce: number }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!nonce) return;
    opacity.setValue(0);
    const anim = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== "web" }),
      Animated.delay(1600),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== "web" }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [nonce, opacity]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          opacity,
          bottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 96,
          backgroundColor: "#1a1a1a",
          borderColor: colors.gold,
        },
      ]}
    >
      <Text style={[styles.toastText, { color: colors.text }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: "88%",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    zIndex: 100,
  },
  toastText: { fontSize: 13, fontWeight: "600", textAlign: "center" },
});
