import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

type Profile = "conservative" | "balanced" | "aggressive";

const PROFILES: {
  key: Profile;
  label: string;
  emoji: string;
  tagline: string;
  desc: string;
  color: string;
  picks: string;
  stakes: string;
}[] = [
  {
    key: "conservative",
    label: "Conservative",
    emoji: "🛡️",
    tagline: "Protect the bankroll",
    desc: "You get only high-confidence picks (75%+), low-volatility matches, and single bets. Designed for steady, disciplined growth.",
    color: "#00FF94",
    picks: "High confidence only (75%+)",
    stakes: "Low stake — 1-2% of bankroll",
  },
  {
    key: "balanced",
    label: "Balanced",
    emoji: "⚖️",
    tagline: "Best of both worlds",
    desc: "All picks from 60% confidence upwards, including value bets and medium-risk opportunities. Good for most bettors.",
    color: "#00E5FF",
    picks: "All picks 60%+",
    stakes: "Medium stake — 2-4% of bankroll",
  },
  {
    key: "aggressive",
    label: "Aggressive",
    emoji: "🚀",
    tagline: "Maximum opportunity",
    desc: "All picks including high-risk, high-reward opportunities and parlays. For experienced bettors with a larger bankroll.",
    color: "#FFD700",
    picks: "All picks including high-risk",
    stakes: "Higher stake — up to 5% of bankroll",
  },
];

export default function RiskProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const [selected, setSelected] = useState<Profile>("balanced");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + topPaddingWeb;

  useEffect(() => {
    async function loadProfile() {
      if (!token) return;
      try {
        const coachData = await api.coach.get(token);
        if (coachData.summary.riskProfile) {
          setSelected(coachData.summary.riskProfile as Profile);
        }
      } catch {}
    }
    loadProfile();
  }, [token]);

  async function save() {
    if (!token) return;
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await api.coach.setProfile(token, selected);
      setSaved(true);
      setTimeout(() => router.back(), 1000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Risk Profile</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          PrediQs AI adapts its picks and coaching to match your betting style. Choose the profile that fits you best.
        </Text>

        {PROFILES.map((p) => {
          const isActive = selected === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.card,
                {
                  backgroundColor: isActive ? `${p.color}10` : colors.card,
                  borderColor: isActive ? p.color : colors.cardBorder,
                },
              ]}
              onPress={() => {
                setSelected(p.key);
                Haptics.selectionAsync();
              }}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardEmoji}>{p.emoji}</Text>
                <View style={styles.cardTitleBlock}>
                  <Text style={[styles.cardLabel, { color: isActive ? p.color : colors.text }]}>{p.label}</Text>
                  <Text style={[styles.cardTagline, { color: colors.textSecondary }]}>{p.tagline}</Text>
                </View>
                <View style={[
                  styles.radioOuter,
                  { borderColor: isActive ? p.color : colors.border },
                ]}>
                  {isActive && <View style={[styles.radioInner, { backgroundColor: p.color }]} />}
                </View>
              </View>

              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{p.desc}</Text>

              <View style={styles.cardStats}>
                <View style={[styles.statPill, { backgroundColor: `${p.color}14`, borderColor: `${p.color}30` }]}>
                  <Text style={[styles.statPillText, { color: p.color }]}>🎯 {p.picks}</Text>
                </View>
                <View style={[styles.statPill, { backgroundColor: `${p.color}14`, borderColor: `${p.color}30` }]}>
                  <Text style={[styles.statPillText, { color: p.color }]}>💰 {p.stakes}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: saved ? "#00FF94" : colors.cyan, opacity: isSaving ? 0.7 : 1 }]}
          onPress={save}
          disabled={isSaving || saved}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.background }]}>
              {saved ? "✓ Saved!" : "Save Profile"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  content: { padding: 20, gap: 14 },
  intro: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    gap: 10,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardEmoji: { fontSize: 28 },
  cardTitleBlock: { flex: 1 },
  cardLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardTagline: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  cardStats: { gap: 6 },
  statPill: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  statPillText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
