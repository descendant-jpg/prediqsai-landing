import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { PickType } from "@/lib/mockData";

const TABS: { key: PickType; label: string; icon: string }[] = [
  { key: "hot", label: "Hot", icon: "🔥" },
  { key: "value", label: "Value", icon: "💎" },
  { key: "arb", label: "ARB", icon: "⚖️" },
];

/** Feature 3 — Hot / Value / ARB filter tabs. Persistence handled by parent. */
export function PickTypeTabs({
  value,
  onChange,
}: {
  value: PickType;
  onChange: (next: PickType) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      {TABS.map((tab) => {
        const active = tab.key === value;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.8}
            style={[
              styles.pill,
              {
                backgroundColor: active ? colors.gold : "#1a1a1a",
                borderColor: active ? colors.gold : colors.border,
              },
            ]}
          >
            <Text style={styles.icon}>{tab.icon}</Text>
            <Text
              style={[
                styles.label,
                { color: active ? "#0a0a0a" : colors.textMuted, fontWeight: active ? "800" : "600" },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 4, marginBottom: 4 },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  icon: { fontSize: 13 },
  label: { fontSize: 13 },
});
