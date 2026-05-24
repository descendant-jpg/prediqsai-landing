import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, View, type ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = 8, style }: SkeletonProps) {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: Platform.OS !== "web" }),
      ]),
    ).start();
  }, [anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.muted,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.cardHeader}>
        <Skeleton width={60} height={22} borderRadius={11} />
        <Skeleton width={80} height={22} borderRadius={11} />
      </View>
      <Skeleton width="70%" height={18} style={{ marginVertical: 8 }} />
      <Skeleton width="50%" height={14} />
      <View style={styles.cardFooter}>
        <Skeleton width={56} height={56} borderRadius={28} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={20} borderRadius={6} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonStatRow() {
  return (
    <View style={styles.statRow}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.statCard}>
          <Skeleton width="60%" height={28} />
          <Skeleton width="80%" height={12} style={{ marginTop: 6 }} />
          <Skeleton width="50%" height={11} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  cardFooter: { flexDirection: "row", gap: 14, marginTop: 8, alignItems: "center" },
  statRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "transparent",
    alignItems: "flex-start",
  },
});
