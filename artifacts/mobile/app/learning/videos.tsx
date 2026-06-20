import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LearningLoader } from "@/components/learning/LearningLoader";
import { EntranceView, PressableScale, useLoadingDelay } from "@/components/learning/animations";
import { useColors } from "@/hooks/useColors";

export default function VideosScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const loading = useLoadingDelay(1100);

  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.18, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </PressableScale>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Trending Videos</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <LearningLoader message="Loading videos..." />
      ) : (
        <EntranceView style={styles.body} direction="none">
          <View style={styles.iconWrap}>
            <Animated.View style={[styles.ring, { borderColor: colors.gold }, ringStyle]} />
            <Animated.View style={iconStyle}>
              <MaterialCommunityIcons name="play-circle" size={120} color={colors.gold} />
            </Animated.View>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Trending Videos</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Expert betting video tutorials coming soon!
          </Text>

          <View style={[styles.badge, { backgroundColor: "rgba(255,215,0,0.1)", borderColor: "rgba(255,215,0,0.3)" }]}>
            <Text style={[styles.badgeText, { color: colors.gold }]}>COMING SOON</Text>
          </View>
        </EntranceView>
      )}
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
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: -0.2 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  iconWrap: { width: 160, height: 160, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  ring: { position: "absolute", width: 150, height: 150, borderRadius: 75, borderWidth: 2 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, textAlign: "center" },
  badge: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 1 },
});
