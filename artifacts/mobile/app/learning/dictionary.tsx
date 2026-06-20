import { useRouter } from "expo-router";
import { ArrowLeft, ChevronRight, Search, X } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LearningLoader } from "@/components/learning/LearningLoader";
import { EntranceView, PressableScale, useLoadingDelay } from "@/components/learning/animations";
import { useColors } from "@/hooks/useColors";
import { DictionaryTerm, searchDictionary } from "@/lib/learning/dictionary";

export default function DictionaryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const loading = useLoadingDelay(1100);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState<DictionaryTerm | null>(null);

  const grouped = useMemo(() => {
    const results = searchDictionary(query);
    const map: Record<string, DictionaryTerm[]> = {};
    for (const term of results) {
      const letter = term.term[0].toUpperCase();
      (map[letter] ??= []).push(term);
    }
    return Object.keys(map)
      .sort()
      .map((letter) => ({ letter, terms: map[letter] }));
  }, [query]);

  if (active) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
          <PressableScale onPress={() => setActive(null)} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.text} />
          </PressableScale>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Dictionary</Text>
          <View style={{ width: 40 }} />
        </View>

        <EntranceView style={{ flex: 1 }} direction="up" distance={14} duration={360}>
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 90 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.termTitle, { color: colors.gold }]}>{active.term}</Text>

            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>DEFINITION</Text>
            <Text style={[styles.detailBody, { color: colors.text }]}>{active.definition}</Text>

            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>EXAMPLE</Text>
            <Text style={[styles.detailBody, { color: colors.textSecondary }]}>{active.example}</Text>

            <View style={[styles.sentenceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.textMuted, marginTop: 0 }]}>USED IN A SENTENCE</Text>
              <Text style={[styles.sentenceText, { color: colors.text }]}>&ldquo;{active.sentence}&rdquo;</Text>
            </View>

            {active.related.length > 0 && (
              <>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>RELATED TERMS</Text>
                <View style={styles.relatedWrap}>
                  {active.related.map((rel) => (
                    <View key={rel} style={[styles.relatedPill, { borderColor: colors.border, backgroundColor: colors.card }]}>
                      <Text style={[styles.relatedText, { color: colors.textSecondary }]}>{rel}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </EntranceView>
      </View>
    );
  }

  let termIndex = -1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </PressableScale>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Dictionary</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <LearningLoader message="Loading dictionary..." />
      ) : (
        <>
          <View style={styles.searchWrap}>
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Search size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search betting terms..."
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery("")} activeOpacity={0.7}>
                  <X size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {grouped.length === 0 && (
              <EntranceView style={styles.empty} direction="none">
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No terms match &ldquo;{query}&rdquo;.</Text>
              </EntranceView>
            )}

            <View key={query}>
              {grouped.map(({ letter, terms }) => (
                <View key={letter} style={{ marginBottom: 18 }}>
                  <Text style={[styles.letterHeader, { color: colors.gold }]}>{letter}</Text>
                  <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {terms.map((term, i) => {
                      termIndex += 1;
                      return (
                        <EntranceView
                          key={term.term}
                          direction="none"
                          delay={Math.min(termIndex, 14) * 35}
                          duration={300}
                        >
                          <PressableScale
                            style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
                            onPress={() => setActive(term)}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.rowTitle, { color: colors.text }]}>{term.term}</Text>
                              <Text style={[styles.rowDef, { color: colors.textMuted }]} numberOfLines={1}>
                                {term.definition}
                              </Text>
                            </View>
                            <ChevronRight size={16} color={colors.textMuted} />
                          </PressableScale>
                        </EntranceView>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </>
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
  searchWrap: { paddingHorizontal: 16, paddingTop: 14 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", height: "100%" },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  letterHeader: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 8, marginLeft: 4 },
  group: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  rowTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  rowDef: { fontSize: 12, fontFamily: "Inter_400Regular" },
  termTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 12 },
  detailLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1, marginTop: 20, marginBottom: 6 },
  detailBody: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 23 },
  sentenceCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginTop: 20 },
  sentenceText: { fontSize: 15, fontFamily: "Inter_500Medium", fontStyle: "italic", lineHeight: 23, marginTop: 6 },
  relatedWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  relatedPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  relatedText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
