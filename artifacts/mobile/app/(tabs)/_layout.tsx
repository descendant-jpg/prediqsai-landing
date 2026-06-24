import { BlurView } from "expo-blur";
import { BrainCircuit, Crosshair, DollarSign, LayoutGrid, User } from "lucide-react-native";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const BASE_TAB_HEIGHT = 62;

const CYAN    = "#00E5FF";
const MUTED   = "#3A5060";
const BG_DARK = "#070B12";

function TabIcon({
  Icon,
  focused,
  color,
  size = 22,
}: {
  Icon: React.ComponentType<{ size: number; color: string }>;
  focused: boolean;
  color: string;
  size?: number;
}) {
  return (
    <View style={styles.iconWrap}>
      <View
        style={[
          styles.iconGlow,
          focused && { backgroundColor: "rgba(0,229,255,0.12)", borderRadius: 10 },
        ]}
      >
        <Icon size={size} color={color} />
      </View>
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isIOS  = Platform.OS === "ios";

  // Extra breathing room above Android's nav buttons; iOS home indicator already covered by inset.
  const androidExtra = Platform.OS === "android" ? 10 : 0;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   CYAN,
        tabBarInactiveTintColor: MUTED,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : BG_DARK,
          borderTopWidth: 1,
          borderTopColor: "#131E2E",
          elevation: 0,
          // Grow the bar by the safe-area inset so icons keep their full BASE_TAB_HEIGHT…
          height: BASE_TAB_HEIGHT + insets.bottom + androidExtra,
          // …and push content above the system nav bar / home indicator.
          paddingBottom: insets.bottom + androidExtra,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : null,
        tabBarLabelStyle: { fontSize: 10, marginTop: -2, marginBottom: 4 },
        tabBarItemStyle: { paddingTop: 6 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={LayoutGrid} focused={focused} color={color} size={20} />
          ),
        }}
      />
      <Tabs.Screen
        name="picks"
        options={{
          title: "Picks",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Crosshair} focused={focused} color={color} size={20} />
          ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: "PrediQs AI",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={BrainCircuit} focused={focused} color={color} size={21} />
          ),
        }}
      />
      <Tabs.Screen
        name="bankroll"
        options={{
          title: "Finance",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={DollarSign} focused={focused} color={color} size={20} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={User} focused={focused} color={color} size={20} />
          ),
        }}
      />
      {/* Hidden screens — still accessible via router.push */}
      <Tabs.Screen name="soccer"       options={{ href: null }} />
      <Tabs.Screen name="performance"  options={{ href: null }} />
      <Tabs.Screen name="learning-hub" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap:  { alignItems: "center", justifyContent: "center", width: 36, height: 28 },
  iconGlow:  { padding: 5, alignItems: "center", justifyContent: "center" },
  activeDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: CYAN,
    marginTop: 2,
    ...Platform.select({
      web: { boxShadow: `0 0 4px ${CYAN}` } as any,
      default: {
        shadowColor: CYAN,
        shadowOpacity: 0.9,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
  },
});
