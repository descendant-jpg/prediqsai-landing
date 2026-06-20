import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";

import { useColors } from "@/hooks/useColors";
import { SPORT_CHIPS, type SportFilter } from "@/lib/mockData";

interface Props {
  selected: SportFilter;
  onSelect: (key: SportFilter) => void;
}

export function SportFilterChips({ selected, onSelect }: Props) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {SPORT_CHIPS.map((chip) => {
        const active = chip.key === selected;
        return (
          <TouchableOpacity
            key={chip.key}
            activeOpacity={0.8}
            onPress={() => onSelect(chip.key)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.gold : "transparent",
                borderColor: colors.gold,
              },
            ]}
          >
            <Text style={styles.chipIcon}>{chip.icon}</Text>
            <Text
              style={[
                styles.chipLabel,
                { color: active ? "#0a0a0a" : colors.gold },
              ]}
            >
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2, paddingRight: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipIcon: { fontSize: 13 },
  chipLabel: {
    fontSize: 13,
    ...(Platform.OS === "web" ? { fontWeight: "600" } : { fontFamily: "Inter_600SemiBold" }),
  },
});
