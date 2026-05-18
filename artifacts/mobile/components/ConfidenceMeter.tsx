import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  value: number;
  size?: number;
}

export function ConfidenceMeter({ value, size = 80 }: Props) {
  const colors = useColors();
  const animatedOffset = useRef(new Animated.Value(0)).current;

  const strokeWidth = Math.max(6, size * 0.1);
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const color =
    value >= 70 ? colors.green : value >= 50 ? colors.gold : colors.red;

  useEffect(() => {
    const targetOffset = circumference * (1 - value / 100);
    Animated.timing(animatedOffset, {
      toValue: targetOffset,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [value, circumference]);

  const fontSize = Math.max(11, size * 0.22);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.border}
          strokeWidth={strokeWidth}
        />
        {/* Animated progress arc */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={animatedOffset as unknown as number}
          strokeLinecap="round"
        />
      </Svg>
      {/* Center text */}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.center}>
          <Text style={{ color, fontSize, fontFamily: "Inter_700Bold" }}>
            {value}%
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  svg: {
    transform: [{ rotate: "-90deg" }],
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
