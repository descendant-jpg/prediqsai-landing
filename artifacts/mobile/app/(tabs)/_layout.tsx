import { BlurView } from "expo-blur";
import { Bot, Crosshair, DollarSign, LayoutGrid, User } from "lucide-react-native";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";

import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.cyan,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.backgroundSecondary,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : null,
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="chart.bar.fill" tintColor={color} size={22} />
            ) : (
              <LayoutGrid size={20} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="picks"
        options={{
          title: "Picks",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="target" tintColor={color} size={22} />
            ) : (
              <Crosshair size={20} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: "Oracle",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="bolt.circle.fill" tintColor={color} size={22} />
            ) : (
              <Bot size={20} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="bankroll"
        options={{
          title: "Finance",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="dollarsign.circle.fill" tintColor={color} size={22} />
            ) : (
              <DollarSign size={20} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.circle.fill" tintColor={color} size={22} />
            ) : (
              <User size={20} color={color} />
            ),
        }}
      />
      {/* Hidden screens — accessible via router.push but not in tab bar */}
      <Tabs.Screen name="soccer"      options={{ href: null }} />
      <Tabs.Screen name="performance" options={{ href: null }} />
    </Tabs>
  );
}
