import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { NOTIFICATIONS, SIMULATED_NEW_IDS } from "@/lib/mockData";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";

// Notifications NOT in the simulated-new set start as already read.
const DEFAULT_READ = NOTIFICATIONS.filter((n) => !SIMULATED_NEW_IDS.includes(n.id)).map((n) => n.id);

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [readIds, setReadIds] = useState<string[]>(DEFAULT_READ);

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  useEffect(() => {
    (async () => {
      const stored = await getItem<string[] | null>(STORAGE_KEYS.notificationsRead, null);
      if (stored == null) {
        await setItem(STORAGE_KEYS.notificationsRead, DEFAULT_READ);
        setReadIds(DEFAULT_READ);
      } else {
        setReadIds(stored);
      }
    })();
  }, []);

  async function markRead(ids: string[]) {
    const next = Array.from(new Set([...readIds, ...ids]));
    setReadIds(next);
    await setItem(STORAGE_KEYS.notificationsRead, next);
  }

  async function handleTap(id: string, route?: string) {
    await markRead([id]);
    if (route) router.push(route as never);
  }

  const unread = NOTIFICATIONS.filter((n) => !readIds.includes(n.id)).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 14, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        {unread > 0 ? (
          <TouchableOpacity onPress={() => markRead(NOTIFICATIONS.map((n) => n.id))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.markAll, { color: colors.cyan }]}>Mark all</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 10 }}>
        {NOTIFICATIONS.map((n) => {
          const isUnread = !readIds.includes(n.id);
          return (
            <TouchableOpacity
              key={n.id}
              activeOpacity={0.8}
              onPress={() => handleTap(n.id, n.route)}
              style={[
                styles.row,
                {
                  backgroundColor: isUnread ? "rgba(255,215,0,0.05)" : colors.card,
                  borderColor: isUnread ? "rgba(255,215,0,0.35)" : colors.cardBorder,
                },
              ]}
            >
              <Text style={styles.icon}>{n.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>{n.title}</Text>
                <Text style={[styles.time, { color: colors.textMuted }]}>{n.time}</Text>
              </View>
              {isUnread && <View style={[styles.unreadDot, { backgroundColor: colors.gold }]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const bold = Platform.OS === "web" ? ({ fontWeight: "700" } as const) : ({ fontFamily: "Inter_700Bold" } as const);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, ...bold },
  markAll: { fontSize: 13, width: 56, textAlign: "right" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  icon: { fontSize: 22 },
  title: { fontSize: 14, lineHeight: 19 },
  time: { fontSize: 11, marginTop: 3 },
  unreadDot: { width: 9, height: 9, borderRadius: 4.5 },
});
