import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  data: number[];
  width: number;
  height: number;
  color?: string;
}

export function LineChart({ data, width, height, color }: Props) {
  const colors = useColors();
  const line = color ?? colors.gold;

  const padX = 6;
  const padY = 10;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => {
    const x = padX + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = padY + innerH - ((value - min) / range) * innerH;
    return [x, y] as [number, number];
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    `${linePath} L ${points[points.length - 1][0].toFixed(1)} ${(height - padY).toFixed(1)}` +
    ` L ${points[0][0].toFixed(1)} ${(height - padY).toFixed(1)} Z`;

  const progress = useRef(new Animated.Value(0)).current;
  const totalLen = useRef(0);

  // Approximate path length for the draw-on animation.
  let approxLen = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    approxLen += Math.sqrt(dx * dx + dy * dy);
  }
  totalLen.current = approxLen;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [width, height, progress, data.length]);

  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [approxLen, 0],
  });

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="lcfill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={line} stopOpacity={0.25} />
            <Stop offset="1" stopColor={line} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#lcfill)" />
        <AnimatedPath
          d={linePath}
          stroke={line}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={approxLen}
          strokeDashoffset={dashOffset as unknown as number}
        />
        {points.map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={2.5} fill={line} />
        ))}
      </Svg>
    </View>
  );
}
