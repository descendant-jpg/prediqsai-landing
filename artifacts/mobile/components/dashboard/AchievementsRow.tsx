import { Lock, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { BADGES, DEFAULT_UNLOCKED_BADGES, type Badge } from "@/lib/mockData";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";

export function AchievementsRow() {
  const colors = useColors();
  const [unlocked, setUnlocked] = useState<string[]>(DEFAULT_UNLOCKED_BADGES);
  const [selected, setSelected] = useState<Badge | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await getItem<string[] | null>(STORAGE_KEYS.badges, null);
      if (!active) return;
      if (stored == null) {
        await setItem(STORAGE_KEYS.badges, DEFAULT_UNLOCKED_BADGES);
        setUnlocked(DEFAULT_UNLOCKED_BADGES);
      } else {
        setUnlocked(stored);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Achievements</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {BADGES.map((badge) => (
          <BadgeTile
            key={badge.id}
            badge={badge}
            unlocked={unlocked.includes(badge.id)}
            onPress={() => setSelected(badge)}
          />
        ))}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelected(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {selected && (
              <>
                <View
                  style={[
                    styles.modalIcon,
                    {
                      backgroundColor: unlocked.includes(selected.id) ? "rgba(255,215,0,0.14)" : colors.background,
                      borderColor: unlocked.includes(selected.id) ? colors.gold : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.modalEmoji, { opacity: unlocked.includes(selected.id) ? 1 : 0.4 }]}>
                    {selected.icon}
                  </Text>
                </View>
                <Text style={[styles.modalName, { color: colors.text }]}>{selected.name}</Text>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: unlocked.includes(selected.id) ? "rgba(0,255,148,0.1)" : "rgba(255,255,255,0.05)",
                    },
                  ]}
                >
                  <Text style={{ color: unlocked.includes(selected.id) ? colors.green : colors.textMuted, fontSize: 11 }}>
                    {unlocked.includes(selected.id) ? "✓ UNLOCKED" : "🔒 LOCKED"}
                  </Text>
                </View>
                <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>{selected.description}</Text>
                <View style={[styles.howToBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.howToLabel, { color: colors.gold }]}>HOW TO UNLOCK</Text>
                  <Text style={[styles.howToText, { color: colors.text }]}>{selected.howToUnlock}</Text>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function BadgeTile({ badge, unlocked, onPress }: { badge: Badge; unlocked: boolean; onPress: () => void }) {
  const colors = useColors();
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!unlocked) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1100, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(glow, { toValue: 0, duration: 1100, useNativeDriver: Platform.OS !== "web" }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [unlocked, glow]);

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.tile}>
      <View style={styles.tileIconWrap}>
        {unlocked && (
          <Animated.View
            style={[
              styles.glowRing,
              { borderColor: colors.gold, opacity: glowOpacity },
            ]}
          />
        )}
        <View
          style={[
            styles.tileIcon,
            {
              backgroundColor: unlocked ? "rgba(255,215,0,0.12)" : colors.card,
              borderColor: unlocked ? colors.gold : colors.cardBorder,
            },
          ]}
        >
          <Text style={[styles.emoji, { opacity: unlocked ? 1 : 0.35 }]}>{badge.icon}</Text>
          {!unlocked && (
            <View style={styles.lockDot}>
              <Lock size={11} color={colors.textMuted} />
            </View>
          )}
        </View>
      </View>
      <Text
        style={[styles.tileName, { color: unlocked ? colors.text : colors.textMuted }]}
        numberOfLines={2}
      >
        {badge.name}
      </Text>
    </TouchableOpacity>
  );
}

const bold = Platform.OS === "web" ? ({ fontWeight: "700" } as const) : ({ fontFamily: "Inter_700Bold" } as const);

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, marginBottom: 12, ...bold },
  row: { gap: 14, paddingRight: 8, paddingBottom: 2 },
  tile: { width: 64, alignItems: "center", gap: 6 },
  tileIconWrap: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },
  glowRing: { position: "absolute", width: 56, height: 56, borderRadius: 28, borderWidth: 2 },
  tileIcon: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 24 },
  lockDot: { position: "absolute", bottom: -2, right: -2, backgroundColor: "#0a0a0a", borderRadius: 9, padding: 2 },
  tileName: { fontSize: 10, textAlign: "center", lineHeight: 13 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 340, borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center", gap: 10 },
  modalClose: { position: "absolute", top: 14, right: 14, zIndex: 2 },
  modalIcon: { width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  modalEmoji: { fontSize: 36 },
  modalName: { fontSize: 18, ...bold },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  modalDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  howToBox: { width: "100%", borderRadius: 12, borderWidth: 1, padding: 14, gap: 6, marginTop: 4 },
  howToLabel: { fontSize: 10, letterSpacing: 0.8, ...bold },
  howToText: { fontSize: 13, lineHeight: 19 },
});
