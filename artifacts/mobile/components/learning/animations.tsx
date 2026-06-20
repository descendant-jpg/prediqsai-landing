import React, { useEffect, useState } from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Returns `true` for `ms` milliseconds after mount, then `false`.
 * Used to show a brief loading state before content appears.
 */
export function useLoadingDelay(ms = 1200): boolean {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return loading;
}

type Direction = "up" | "right" | "none";

interface EntranceViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  duration?: number;
  direction?: Direction;
  distance?: number;
  scaleFrom?: number;
}

/**
 * Fades content in on mount, optionally sliding from a direction
 * and/or scaling up from `scaleFrom`. Fully controlled — works on
 * web and native.
 */
export function EntranceView({
  children,
  style,
  delay = 0,
  duration = 360,
  direction = "up",
  distance = 18,
  scaleFrom = 1,
}: EntranceViewProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) }),
    );
  }, [progress, delay, duration]);

  const animStyle = useAnimatedStyle(() => {
    const transform = [];
    if (direction === "up") transform.push({ translateY: (1 - progress.value) * distance });
    if (direction === "right") transform.push({ translateX: (1 - progress.value) * distance });
    if (scaleFrom !== 1) transform.push({ scale: scaleFrom + (1 - scaleFrom) * progress.value });
    return { opacity: progress.value, transform };
  });

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

interface BounceInViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  scaleFrom?: number;
}

/**
 * Dramatic spring scale-up (with overshoot bounce) from `scaleFrom`
 * to 1.0. Used for the quiz score reveal.
 */
export function BounceInView({ children, style, delay = 0, scaleFrom = 0.5 }: BounceInViewProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withSpring(1, { damping: 9, stiffness: 150, mass: 0.9 }));
  }, [progress, delay]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 1.6),
    transform: [{ scale: scaleFrom + (1 - scaleFrom) * progress.value }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  scaleTo?: number;
}

/**
 * Pressable wrapper that scales down on press-in and springs back
 * on release for a tactile feel.
 */
export function PressableScale({
  children,
  onPress,
  style,
  disabled = false,
  scaleTo = 0.95,
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withTiming(scaleTo, { duration: 110, easing: Easing.out(Easing.quad) });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 220 });
      }}
      onPress={onPress}
      disabled={disabled}
      style={[style, animStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
