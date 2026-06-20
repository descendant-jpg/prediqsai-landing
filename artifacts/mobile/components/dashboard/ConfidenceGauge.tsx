import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

interface Props {
  value: number; // 0-100
  size?: number;
  label?: string;
}

function pt(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arcPath(cx: number, cy: number, r: number, d0: number, d1: number): string {
  const [x0, y0] = pt(cx, cy, r, d0);
  const [x1, y1] = pt(cx, cy, r, d1);
  const large = d1 - d0 > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

// Compass degrees: 270 = left (value 0), 360 = top (value 50), 450 = right (value 100)
function degForValue(v: number): number {
  return 270 + (Math.max(0, Math.min(100, v)) / 100) * 180;
}

export function ConfidenceGauge({ value, size = 120, label = "AI Confidence" }: Props) {
  const colors = useColors();
  const v = Math.max(0, Math.min(100, value));

  const strokeWidth = Math.max(7, size * 0.09);
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = r + strokeWidth / 2;
  const svgHeight = cy + strokeWidth;

  const zoneColor = v <= 50 ? colors.red : v <= 75 ? colors.orange : colors.green;

  const frac = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(frac, {
      toValue: v / 100,
      duration: 900,
      useNativeDriver: true,
    }).start();
  }, [v, frac]);

  const rotate = frac.interpolate({
    inputRange: [0, 1],
    outputRange: ["-90deg", "90deg"],
  });

  const needleLen = r - strokeWidth * 0.4;

  return (
    <View style={{ width: size, alignItems: "center" }}>
      <View style={{ width: size, height: svgHeight }}>
        <Svg width={size} height={svgHeight}>
          {/* Track */}
          <Path
            d={arcPath(cx, cy, r, 270, 450)}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
          {/* Red zone 0-50 */}
          <Path
            d={arcPath(cx, cy, r, degForValue(0), degForValue(50))}
            stroke={colors.red}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            opacity={0.85}
          />
          {/* Orange zone 51-75 */}
          <Path
            d={arcPath(cx, cy, r, degForValue(50), degForValue(75))}
            stroke={colors.orange}
            strokeWidth={strokeWidth}
            fill="none"
            opacity={0.85}
          />
          {/* Green zone 76-100 */}
          <Path
            d={arcPath(cx, cy, r, degForValue(75), degForValue(100))}
            stroke={colors.green}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            opacity={0.85}
          />
        </Svg>

        {/* Needle (rotates around its base at the gauge center) */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: cx - 1.5,
            top: cy - needleLen,
            width: 3,
            height: needleLen,
            backgroundColor: zoneColor,
            borderRadius: 2,
            transform: [
              { translateY: needleLen / 2 },
              { rotate },
              { translateY: -needleLen / 2 },
            ],
          }}
        />
        {/* Hub */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: cx - 5,
            top: cy - 5,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: zoneColor,
          }}
        />
      </View>

      <Text style={[styles.value, { color: zoneColor, fontSize: Math.max(16, size * 0.18) }]}>
        {Math.round(v)}%
      </Text>
      {label ? <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  value: {
    fontFamily: Platform.OS === "web" ? undefined : "Inter_700Bold",
    fontWeight: "700",
    marginTop: 2,
    letterSpacing: -0.5,
  },
  label: { fontSize: 10, marginTop: 1, letterSpacing: 0.3 },
});
