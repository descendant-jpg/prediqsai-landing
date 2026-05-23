import { BlurView } from "expo-blur";
import { BrainCircuit, Crosshair, DollarSign, LayoutGrid, User } from "lucide-react-native";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

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
  const isIOS  = Platform.OS === "ios";

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
          height: 62 + (isIOS ? 0 : 0),
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
      <Tabs.Screen name="soccer"      options={{ href: null }} />
      <Tabs.Screen name="performance" options={{ href: null }} />
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
    shadowColor: CYAN,
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
});
