import { usePathname, useRouter } from "expo-router";
import { BarChart3, DollarSign, FileWarning, Globe, Key, LayoutDashboard, MessageSquare, Target, TrendingUp, Users } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const TABS = [
  { path: "/admin",               icon: LayoutDashboard, label: "Overview" },
  { path: "/admin/users",         icon: Users,           label: "Users" },
  { path: "/admin/predictions",   icon: Target,          label: "Picks" },
  { path: "/admin/api-keys",      icon: Key,             label: "API Keys" },
  { path: "/admin/revenue",       icon: TrendingUp,      label: "Revenue" },
  { path: "/admin/notifications",  icon: MessageSquare,   label: "Notify" },
  { path: "/admin/affiliates",    icon: DollarSign,      label: "Affiliates" },
  { path: "/admin/errors",        icon: FileWarning,     label: "Errors" },
  { path: "/admin/worldcup",      icon: Globe,           label: "World Cup" },
  { path: "/admin/config",        icon: BarChart3,       label: "Config" },
] as const;

export function AdminTabBar() {
  const colors = useColors();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.wrapper, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom || 8 }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.strip}>
        {TABS.map((tab) => {
          const active = pathname === tab.path || (tab.path !== "/admin" && pathname.startsWith(tab.path));
          const Icon = tab.icon;
          return (
            <TouchableOpacity
              key={tab.path}
              style={[s.tab, active && { backgroundColor: `${colors.cyan}18` }]}
              onPress={() => router.push(tab.path as Parameters<typeof router.push>[0])}
              activeOpacity={0.7}
            >
              <Icon size={18} color={active ? colors.cyan : colors.textMuted} strokeWidth={active ? 2.2 : 1.6} />
              <Text style={[s.label, { color: active ? colors.cyan : colors.textMuted }]}>{tab.label}</Text>
              {active && <View style={[s.dot, { backgroundColor: colors.cyan }]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { borderTopWidth: 1 },
  strip: { flexDirection: "row", paddingHorizontal: 8, paddingTop: 8 },
  tab: { alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 3, minWidth: 60, position: "relative" },
  label: { fontSize: 9, fontWeight: "600", letterSpacing: 0.2 },
  dot: { position: "absolute", bottom: 3, width: 4, height: 4, borderRadius: 2 },
});
