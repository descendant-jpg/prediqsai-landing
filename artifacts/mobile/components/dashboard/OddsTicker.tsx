import { TrendingDown, TrendingUp, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api, type OddsTickerApiItem } from "@/lib/api";

type OddsTickerItem = OddsTickerApiItem;

export function OddsTicker() {
  const colors = useColors();
  const { token } = useAuth();
  const translateX = useRef(new Animated.Value(0)).current;
  const [setWidth, setSetWidth] = useState(0);
  const [selected, setSelected] = useState<OddsTickerItem | null>(null);
  const [items, setItems] = useState<OddsTickerItem[]>([]);

  // Fetch live odds on mount and refresh every 3 minutes.
  useEffect(() => {
    if (!token) {
      setItems([]);
      return;
    }
    let active = true;
    async function load() {
      try {
        const data = await api.odds.ticker(token!);
        if (active) setItems(data.items);
      } catch {
        if (active) setItems([]);
      }
    }
    load();
    const iv = setInterval(load, 3 * 60_000);
    return () => { active = false; clearInterval(iv); };
  }, [token]);

  useEffect(() => {
    if (setWidth <= 0) return;
    translateX.setValue(0);
    const duration = setWidth * 22; // ~22ms per px → smooth steady scroll
    const anim = Animated.loop(
      Animated.timing(translateX, {
        toValue: -setWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [setWidth, translateX]);

  // Nothing to show until real odds arrive.
  if (items.length === 0) return null;

  return (
    <View style={[styles.bar, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={[styles.liveTag, { backgroundColor: "rgba(255,215,0,0.14)" }]}>
        <Text style={[styles.liveText, { color: colors.gold }]}>LIVE ODDS</Text>
      </View>

      <View style={styles.viewport}>
        <Animated.View style={[styles.track, { transform: [{ translateX }] }]}>
          {/* First set is measured; the duplicate creates the seamless loop */}
          <View style={styles.set} onLayout={(e) => setSetWidth(e.nativeEvent.layout.width)}>
            {items.map((item) => (
              <TickerCell key={item.id} item={item} onPress={() => setSelected(item)} />
            ))}
          </View>
          <View style={styles.set}>
            {items.map((item) => (
              <TickerCell key={`dup-${item.id}`} item={item} onPress={() => setSelected(item)} />
            ))}
          </View>
        </Animated.View>
      </View>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                {selected?.icon} {selected?.match}
              </Text>
              <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {selected && (
              <>
                <View style={styles.modalRow}>
                  <Text style={[styles.modalMarket, { color: colors.gold }]}>{selected.market}</Text>
                  <View style={styles.modalOddsWrap}>
                    {selected.direction === "up" ? (
                      <TrendingUp size={16} color={colors.green} />
                    ) : (
                      <TrendingDown size={16} color={colors.red} />
                    )}
                    <Text style={[styles.modalOdds, { color: selected.direction === "up" ? colors.green : colors.red }]}>
                      {selected.odds.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.modalDetail, { color: colors.textSecondary }]}>{selected.detail}</Text>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function TickerCell({ item, onPress }: { item: OddsTickerItem; onPress: () => void }) {
  const colors = useColors();
  const up = item.direction === "up";
  return (
    <TouchableOpacity style={styles.cell} activeOpacity={0.7} onPress={onPress}>
      <Text style={[styles.cellText, { color: colors.gold }]}>
        {item.icon} {item.match} — {item.market} → {item.odds.toFixed(2)}
      </Text>
      <Text style={styles.arrow}>{up ? "⬆️" : "⬇️"}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", height: 40, borderRadius: 10, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  liveTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8, marginRight: 6 },
  liveText: { fontSize: 9, letterSpacing: 0.5, ...(Platform.OS === "web" ? { fontWeight: "700" } : { fontFamily: "Inter_700Bold" }) },
  viewport: { flex: 1, overflow: "hidden" },
  track: { flexDirection: "row" },
  set: { flexDirection: "row" },
  cell: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14 },
  cellText: { fontSize: 12 },
  arrow: { fontSize: 11 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 380, borderRadius: 16, borderWidth: 1, padding: 18, gap: 12 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  modalTitle: { fontSize: 16, flex: 1, ...(Platform.OS === "web" ? { fontWeight: "700" } : { fontFamily: "Inter_700Bold" }) },
  modalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalMarket: { fontSize: 15, ...(Platform.OS === "web" ? { fontWeight: "600" } : { fontFamily: "Inter_600SemiBold" }) },
  modalOddsWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  modalOdds: { fontSize: 18, ...(Platform.OS === "web" ? { fontWeight: "700" } : { fontFamily: "Inter_700Bold" }) },
  modalDetail: { fontSize: 13, lineHeight: 20 },
});
