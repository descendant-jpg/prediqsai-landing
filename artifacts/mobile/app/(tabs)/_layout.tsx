import { BlurView } from "expo-blur";
import { BarChart2, CircleDot, Crosshair, DollarSign, LayoutGrid, Zap } from "lucide-react-native";
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
        name="soccer"
        options={{
          title: "Football",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="soccerball" tintColor={color} size={22} />
            ) : (
              <CircleDot size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: "AI",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="bolt.circle.fill" tintColor={color} size={22} />
            ) : (
              <Zap size={20} color={color} />
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
        name="performance"
        options={{
          title: "Stats",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="trophy.fill" tintColor={color} size={22} />
            ) : (
              <BarChart2 size={20} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}
