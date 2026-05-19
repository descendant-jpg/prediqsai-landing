import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdminTabBar } from "@/components/AdminTabBar";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const TARGETS = [
  { id: "all",   label: "All Users",     emoji: "📢" },
  { id: "free",  label: "Free only",     emoji: "🆓" },
  { id: "pro",   label: "Pro only",      emoji: "⭐" },
  { id: "elite", label: "Elite only",    emoji: "👑" },
];

const LINKS = [
  { id: "",              label: "No link" },
  { id: "/(tabs)/",     label: "Dashboard" },
  { id: "/(tabs)/picks",label: "Picks" },
  { id: "/(tabs)/bankroll", label: "Bankroll" },
  { id: "/(tabs)/assistant", label: "AI Chat" },
];

type NotifHistoryItem = {
  id: string; title: string; message: string; target: string;
  recipientCount: number | null; createdAt: string;
};

export default function AdminNotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [target, setTarget] = useState("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [linkTo, setLinkTo] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<NotifHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!token) return;
    setLoadingHistory(true);
    try {
      const r = await fetch("/api/admin/notifications", { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json() as NotifHistoryItem[];
      setHistory(data);
    } catch { /* ignore */ } finally {
      setLoadingHistory(false);
    }
  }, [token]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function sendNotification() {
    if (!title.trim() || !message.trim()) { Alert.alert("Fill in title and message"); return; }
    if (!token) return;

    const targetLabel = TARGETS.find((t) => t.id === target)?.label ?? target;
    Alert.alert(
      "Confirm Send",
      `Send to: ${targetLabel}\nTitle: "${title}"\n\nThis will send a real push notification.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Now", style: "default", onPress: async () => {
            setSending(true);
            try {
              const r = await fetch("/api/admin/notifications/send", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ title: title.trim(), message: message.trim(), target, linkTo: linkTo || undefined }),
              });
              const data = await r.json() as { ok: boolean; notification: NotifHistoryItem };
              if (data.ok) {
                Alert.alert("✅ Sent", `Notification sent to ${targetLabel}`);
                setTitle(""); setMessage(""); setLinkTo("");
                setHistory((prev) => [data.notification, ...prev]);
              } else {
                Alert.alert("Error", "Send failed");
              }
            } catch {
              Alert.alert("Error", "Send failed");
            } finally {
              setSending(false);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.text }]}>📣 Send Notifications</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
        {/* Compose card */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[s.sectionTitle, { color: colors.textMuted }]}>COMPOSE</Text>

          <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Target Audience</Text>
          <View style={s.targetGrid}>
            {TARGETS.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[s.targetBtn, { borderColor: target === t.id ? colors.cyan : colors.border, backgroundColor: target === t.id ? `${colors.cyan}18` : "transparent" }]}
                onPress={() => setTarget(t.id)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 16 }}>{t.emoji}</Text>
                <Text style={[s.targetLabel, { color: target === t.id ? colors.cyan : colors.text }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Title</Text>
          <TextInput
            style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Notification title…"
            placeholderTextColor={colors.textMuted}
            maxLength={100}
          />
          <Text style={[s.charCount, { color: colors.textMuted }]}>{title.length}/100</Text>

          <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Message</Text>
          <TextInput
            style={[s.input, s.textarea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={message}
            onChangeText={setMessage}
            placeholder="Notification message…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
          />
          <Text style={[s.charCount, { color: colors.textMuted }]}>{message.length}/500</Text>

          <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Link To (optional)</Text>
          <View style={s.linkRow}>
            {LINKS.map((l) => (
              <TouchableOpacity
                key={l.id}
                style={[s.linkPill, { borderColor: linkTo === l.id ? "#FFD700" : colors.border, backgroundColor: linkTo === l.id ? "#FFD70015" : "transparent" }]}
                onPress={() => setLinkTo(l.id)}
                activeOpacity={0.8}
              >
                <Text style={[s.linkPillText, { color: linkTo === l.id ? "#FFD700" : colors.textSecondary }]}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[s.sendBtn, (!title.trim() || !message.trim() || sending) && s.sendBtnDisabled]}
            onPress={sendNotification}
            disabled={!title.trim() || !message.trim() || sending}
            activeOpacity={0.85}
          >
            {sending ? <ActivityIndicator color="#070B12" size="small" /> : <Text style={s.sendBtnText}>📤 Send Now</Text>}
          </TouchableOpacity>
        </View>

        {/* History */}
        <Text style={[s.sectionTitle, { color: colors.textMuted, marginTop: 8 }]}>SENT HISTORY</Text>

        {loadingHistory ? (
          <ActivityIndicator color={colors.cyan} style={{ marginTop: 20 }} />
        ) : history.length === 0 ? (
          <Text style={[s.empty, { color: colors.textMuted }]}>No notifications sent yet</Text>
        ) : (
          history.map((n) => (
            <View key={n.id} style={[s.historyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={s.historyHeader}>
                <Text style={[s.historyTitle, { color: colors.text }]}>{n.title}</Text>
                <Text style={[s.historyCount, { color: colors.cyan }]}>{n.recipientCount ?? 0} sent</Text>
              </View>
              <Text style={[s.historyMsg, { color: colors.textMuted }]} numberOfLines={2}>{n.message}</Text>
              <View style={s.historyFooter}>
                <View style={[s.targetPill, { backgroundColor: `${colors.cyan}15`, borderColor: `${colors.cyan}33` }]}>
                  <Text style={[s.targetPillText, { color: colors.cyan }]}>{n.target}</Text>
                </View>
                <Text style={[s.historyDate, { color: colors.textMuted }]}>{new Date(n.createdAt).toLocaleDateString()}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <AdminTabBar />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  scroll: { flex: 1 },
  content: { padding: 14, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 11, letterSpacing: 1, fontWeight: "700" },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: -4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textarea: { height: 88, textAlignVertical: "top" },
  charCount: { fontSize: 10, textAlign: "right", marginTop: -8 },
  targetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  targetBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  targetLabel: { fontSize: 12, fontWeight: "600" },
  linkRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  linkPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  linkPillText: { fontSize: 11, fontWeight: "600" },
  sendBtn: { backgroundColor: "#FFD700", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: "#070B12", fontWeight: "700", fontSize: 15 },
  historyCard: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 6 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyTitle: { fontSize: 13, fontWeight: "700", flex: 1 },
  historyCount: { fontSize: 11, fontWeight: "700" },
  historyMsg: { fontSize: 12, lineHeight: 17 },
  historyFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  targetPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  targetPillText: { fontSize: 10, fontWeight: "600" },
  historyDate: { fontSize: 11 },
  empty: { textAlign: "center", marginTop: 20, fontSize: 13 },
});
