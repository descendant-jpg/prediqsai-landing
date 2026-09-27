import { useRouter } from "expo-router";
import { ArrowLeft, Bell } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View, FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const { t } = useLanguage();
  
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marking, setMarking] = useState(false);

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      // 1. Fetch unread count for the badge
      const unreadRes = await api.notifications.getUnreadCount(token);
      setUnread(unreadRes.count);

      // 2. Fetch the newly built list endpoint
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || "https://api.prediqsai.com";
      const listRes = await fetch(`${baseUrl}/api/notifications/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (listRes.ok) {
        const listData = await listRes.json();
        if (listData.notifications) setNotifications(listData.notifications);
      }
    } catch (err) {
      console.warn("Notification load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  async function markAllRead() {
    if (!token || marking) return;
    setMarking(true);
    try {
      await api.notifications.markRead(token);
      setUnread(0);
    } catch (err) {
      console.warn("Mark read error:", err);
    } finally {
      setMarking(false);
    }
  }

  const renderItem = ({ item }: { item: any }) => {
    const d = new Date(item.createdAt);
    const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.cardDate, { color: colors.textMuted }]}>{dateStr}</Text>
        </View>
        <Text style={[styles.cardMessage, { color: colors.text }]}>{item.message}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 14, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t("notifications.title")}</Text>
        
        {/* We fixed the header crash by safely rendering the button or a spacer */}
        {unread > 0 ? (
          <TouchableOpacity disabled={marking} onPress={markAllRead} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.markAll, { color: colors.cyan }]}>{t("notifications.markAll")}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.cyan} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={[styles.empty, { paddingBottom: insets.bottom }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Bell size={26} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("notifications.emptyTitle")}</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t("notifications.emptyText")}</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
        />
      )}
    </View>
  );
}

const bold = Platform.OS === "web" ? ({ fontWeight: "700" } as const) : ({ fontFamily: "Inter_700Bold" } as const);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, ...bold },
  markAll: { fontSize: 13, width: 60, textAlign: "right", ...bold },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  emptyIcon: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 17, ...bold },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 300 },
  listContent: { padding: 16, gap: 12 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 },
  cardTitle: { fontSize: 15, flex: 1, ...bold },
  cardDate: { fontSize: 11 },
  cardMessage: { fontSize: 14, lineHeight: 20 },
});
