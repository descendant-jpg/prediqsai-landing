import React, { useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PredictionCard } from "@/components/PredictionCard";
import { MOCK_PREDICTIONS, SPORT_FILTERS } from "@/constants/mockData";
import { useColors } from "@/hooks/useColors";
import type { Prediction } from "@/types";

type FilterKey = (typeof SPORT_FILTERS)[number]["key"];

function applyFilter(predictions: Prediction[], filter: FilterKey): Prediction[] {
  switch (filter) {
    case "all": return predictions;
    case "nfl": return predictions.filter((p) => p.sport === "nfl");
    case "nba": return predictions.filter((p) => p.sport === "nba");
    case "mlb": return predictions.filter((p) => p.sport === "mlb");
    case "soccer": return predictions.filter((p) => p.sport === "soccer");
    case "value": return predictions.filter((p) => p.valueDetected);
    case "avoid": return predictions.filter((p) => p.avoidMatch);
    default: return predictions;
  }
}

export default function PicksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const filtered = applyFilter(MOCK_PREDICTIONS, activeFilter);
  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + topPaddingWeb;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Today's Picks</Text>
        <Text style={[styles.count, { color: colors.textSecondary }]}>
          {filtered.length} picks
        </Text>
      </View>

      {/* Filter bar */}
      <View style={[styles.filterContainer, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {SPORT_FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterBtn,
                  {
                    backgroundColor: isActive ? colors.cyan : "transparent",
                    borderColor: isActive ? colors.cyan : colors.border,
                  },
                ]}
                onPress={() => setActiveFilter(f.key as FilterKey)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: isActive ? colors.background : colors.textSecondary },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Picks list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PredictionCard prediction={item} />}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No picks for this filter
            </Text>
          </View>
        }
        scrollEnabled={!!filtered.length}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  count: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  filterContainer: {
    borderBottomWidth: 1,
  },
  filters: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  list: {
    padding: 16,
  },
  empty: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
