import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
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
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_500Medium",
        },
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
              <Feather name="grid" size={20} color={color} />
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
              <Feather name="crosshair" size={20} color={color} />
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
              <Ionicons name="football-outline" size={22} color={color} />
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
              <Ionicons name="flash" size={20} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="bankroll"
        options={{
          title: "Bankroll",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="dollarsign.circle.fill" tintColor={color} size={22} />
            ) : (
              <Feather name="dollar-sign" size={20} color={color} />
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
              <Feather name="bar-chart-2" size={20} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}
