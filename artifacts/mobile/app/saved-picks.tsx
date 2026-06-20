import { useFocusEffect, useRouter } from "expo-router";
import { ArrowLeft, Bookmark } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EnhancedPickCard } from "@/components/picks/EnhancedPickCard";
import { Toast } from "@/components/picks/Toast";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { PICK_OF_THE_DAY, PRO_PICKS, type ProPick } from "@/lib/mockData";
import { sharePick } from "@/lib/share";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";

const ALL_PICKS: ProPick[] = [PICK_OF_THE_DAY, ...PRO_PICKS];

function pickById(id: string): ProPick | undefined {
  return ALL_PICKS.find((p) => p.id === id);
}

export default function SavedPicksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useApp();
  const isPro = profile.tier === "premium";

  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [slipIds, setSlipIds] = useState<string[]>([]);
  const [toast, setToast] = useState({ msg: "", nonce: 0 });

  const showToast = useCallback((msg: string) => setToast({ msg, nonce: Date.now() }), []);

  const reload = useCallback(async () => {
    const [saved, slip] = await Promise.all([
      getItem<string[]>(STORAGE_KEYS.savedPicks, []),
      getItem<string[]>(STORAGE_KEYS.betSlip, []),
    ]);
    setSavedIds(saved);
    setSlipIds(slip);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);
  const savedPicks = savedIds.map(pickById).filter((p): p is ProPick => Boolean(p));

  async function handleUnsave(id: string) {
    const next = savedIds.filter((x) => x !== id);
    setSavedIds(next);
    await setItem(STORAGE_KEYS.savedPicks, next);
    showToast("Removed from saved");
  }

  async function handleAddSlip(id: string) {
    if (slipIds.includes(id)) {
      showToast("Already in your slip");
      return;
    }
    const next = [...slipIds, id];
    setSlipIds(next);
    await setItem(STORAGE_KEYS.betSlip, next);
    showToast("Added to bet slip");
  }

  return (
    <View style={[styles.container, { backgroundColor: "#0a0a0a", paddingTop: topPadding }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Saved Picks</Text>
        <View style={styles.backBtn} />
      </View>

      {savedPicks.length === 0 ? (
        <View style={styles.empty}>
          <Bookmark size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved picks yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Tap the bookmark on any pick to save it here for later.
          </Text>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.9} style={[styles.browseBtn, { backgroundColor: colors.gold }]}>
            <Text style={styles.browseText}>Browse Picks</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          <Text style={[styles.count, { color: colors.textSecondary }]}>
            {savedPicks.length} saved {savedPicks.length === 1 ? "pick" : "picks"}
          </Text>
          {savedPicks.map((p) => (
            <EnhancedPickCard
              key={p.id}
              pick={p}
              saved
              inSlip={slipIds.includes(p.id)}
              onSave={() => handleUnsave(p.id)}
              onAddSlip={() => handleAddSlip(p.id)}
              onShare={async () => {
                const result = await sharePick(p);
                if (result === "copied") showToast("Pick copied to clipboard");
              }}
              onAnalysis={() => {
                if (!isPro) {
                  router.push("/subscription");
                  return;
                }
                showToast("Open a pick from the Picks tab for full analysis");
              }}
            />
          ))}
        </ScrollView>
      )}

      <Toast message={toast.msg} nonce={toast.nonce} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "900" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "800", marginTop: 16 },
  emptySub: { fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 8 },
  browseBtn: { borderRadius: 11, paddingHorizontal: 24, paddingVertical: 13, marginTop: 22 },
  browseText: { color: "#0a0a0a", fontSize: 14, fontWeight: "900" },
  count: { fontSize: 13, fontWeight: "600", paddingHorizontal: 16, paddingTop: 14 },
});
