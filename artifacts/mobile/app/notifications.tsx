import { useRouter } from "expo-router";
import { ArrowLeft, Bell } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState("");

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const loadUnread = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const result = await api.notifications.getUnreadCount(token);
      setUnread(result.count);
      setError("");
    } catch {
      setError(t("notifications.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t, token]);

  useEffect(() => {
    void loadUnread();
  }, [loadUnread]);

  async function markAllRead() {
    if (!token || marking) return;
    setMarking(true);
    try {
      await api.notifications.markRead(token);
      setUnread(0);
      setError("");
    } catch {
      setError(t("notifications.markError"));
    } finally {
      setMarking(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 14, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t("notifications.title")}</Text>
        {unread > 0 ? (
          <TouchableOpacity disabled={marking} onPress={markAllRead} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.markAll, { color: colors.cyan }]}>{t("notifications.markAll")}</Text>
          </TouchableOpacity>
        ) : error ? (
          <>
            <Text style={[styles.emptyTitle, { color: colors.red }]}>{error}</Text>
            <TouchableOpacity onPress={loadUnread}>
              <Text style={[styles.retry, { color: colors.cyan }]}>{t("notifications.retry")}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      <View style={[styles.empty, { paddingBottom: insets.bottom }]}>
        {loading ? (
          <ActivityIndicator color={colors.cyan} />
        ) : (
          <>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Bell size={26} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("notifications.emptyTitle")}</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {unread > 0
                ? t("notifications.unreadPending", { count: unread })
                : t("notifications.emptyText")}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const bold = Platform.OS === "web" ? ({ fontWeight: "700" } as const) : ({ fontFamily: "Inter_700Bold" } as const);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, ...bold },
  markAll: { fontSize: 13, width: 56, textAlign: "right" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  emptyIcon: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 17, ...bold },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 300 },
  retry: { fontSize: 14, ...bold },
});
