import { ArrowLeft, Bell, BellOff, Clock, TrendingUp, Zap } from "lucide-react-native";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useNotifications } from "@/context/NotificationsContext";
import type { NotificationPrefs } from "@/context/NotificationsContext";

const HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, "0")}:00`,
);

type SettingItem = {
  key: keyof NotificationPrefs;
  label: string;
  desc: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  iconColor: string;
  isPremium?: boolean;
};

const SETTING_ITEMS: SettingItem[] = [
  {
    key: "aiPickAlerts",
    label: "AI Pick Alerts",
    desc: "High-confidence picks (75%+) as soon as AI generates them",
    icon: Zap,
    iconColor: "#FFD700",
  },
  {
    key: "arbitrageAlerts",
    label: "Arbitrage Alerts",
    desc: "New arb opportunities above 2% guaranteed margin",
    icon: TrendingUp,
    iconColor: "#00E5FF",
  },
  {
    key: "liveArbAlerts",
    label: "Live Arb Alerts",
    desc: "Real-time in-game arb windows — act fast",
    icon: Bell,
    iconColor: "#FF6B35",
  },
  {
    key: "matchReminders",
    label: "Match Reminders",
    desc: "30-minute heads-up before matches you follow",
    icon: Clock,
    iconColor: "#00FF94",
  },
  {
    key: "evAlerts",
    label: "+EV Alerts",
    desc: "Positive expected value bets above 5% edge",
    icon: TrendingUp,
    iconColor: "#A855F7",
  },
];

function TimePickerModal({
  visible,
  value,
  title,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: string;
  title: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} onPress={onClose} activeOpacity={1}>
        <View style={[s.sheet, { backgroundColor: colors.card }]}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />
          <Text style={[s.sheetTitle, { color: colors.text }]}>{title}</Text>
          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            {HOURS.map((h) => (
              <TouchableOpacity
                key={h}
                style={[
                  s.hourRow,
                  { borderBottomColor: colors.border },
                  h === value && { backgroundColor: "rgba(255,215,0,0.08)" },
                ]}
                onPress={() => { onSelect(h); onClose(); }}
                activeOpacity={0.8}
              >
                <Text style={[s.hourText, { color: h === value ? "#FFD700" : colors.text }]}>{h}</Text>
                {h === value && <Text style={{ color: "#FFD700" }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function NotificationSettingsScreen() {
  const colors   = useColors();
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const { prefs, loading, updatePref, clearBadge } = useNotifications();

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker,   setShowEndPicker]   = useState(false);

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding    = insets.top + topPaddingWeb;

  async function handleToggle(key: keyof NotificationPrefs, value: boolean) {
    await updatePref(key, value);
    if (key === "aiPickAlerts" && value) {
      Alert.alert(
        "AI Pick Alerts On",
        "You'll get a notification whenever the AI generates a pick with 75%+ confidence.",
        [{ text: "Got it" }],
      );
    }
  }

  React.useEffect(() => {
    clearBadge();
  }, []);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: topPadding + 16, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.pageTitle, { color: colors.text }]}>Notifications</Text>
          <View style={{ width: 22 }} />
        </View>

        {loading && (
          <View style={s.loadingRow}>
            <ActivityIndicator color="#FFD700" />
            <Text style={[s.loadingText, { color: colors.textMuted }]}>Loading preferences…</Text>
          </View>
        )}

        {/* Alert types */}
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>ALERT TYPES</Text>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {SETTING_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            const enabled = prefs[item.key] as boolean;
            const isLast  = idx === SETTING_ITEMS.length - 1;
            return (
              <View
                key={item.key}
                style={[
                  s.row,
                  { borderBottomColor: colors.border },
                  isLast && { borderBottomWidth: 0 },
                ]}
              >
                <View style={[s.iconWrap, { backgroundColor: `${item.iconColor}18` }]}>
                  <Icon size={16} color={item.iconColor} />
                </View>
                <View style={s.rowText}>
                  <Text style={[s.rowLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[s.rowDesc,  { color: colors.textMuted }]}>{item.desc}</Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={(v) => handleToggle(item.key, v)}
                  trackColor={{ false: colors.border, true: "#FFD70040" }}
                  thumbColor={enabled ? "#FFD700" : colors.textMuted}
                />
              </View>
            );
          })}
        </View>

        {/* Quiet hours */}
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>QUIET HOURS</Text>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[s.row, { borderBottomColor: colors.border }]}>
            <View style={[s.iconWrap, { backgroundColor: "rgba(58,80,96,0.3)" }]}>
              <BellOff size={16} color={colors.textSecondary} />
            </View>
            <View style={s.rowText}>
              <Text style={[s.rowLabel, { color: colors.text }]}>Enable Quiet Hours</Text>
              <Text style={[s.rowDesc, { color: colors.textMuted }]}>Silence all alerts during set hours</Text>
            </View>
            <Switch
              value={prefs.quietHoursEnabled}
              onValueChange={(v) => updatePref("quietHoursEnabled", v)}
              trackColor={{ false: colors.border, true: "#FFD70040" }}
              thumbColor={prefs.quietHoursEnabled ? "#FFD700" : colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={[s.row, { borderBottomColor: colors.border }, !prefs.quietHoursEnabled && s.rowDisabled]}
            onPress={() => prefs.quietHoursEnabled && setShowStartPicker(true)}
            activeOpacity={0.8}
          >
            <View style={[s.iconWrap, { backgroundColor: "rgba(58,80,96,0.3)" }]}>
              <Clock size={16} color={colors.textSecondary} />
            </View>
            <Text style={[s.rowLabel, { color: prefs.quietHoursEnabled ? colors.text : colors.textMuted }]}>
              Start time
            </Text>
            <Text style={[s.timeValue, { color: prefs.quietHoursEnabled ? "#FFD700" : colors.textMuted }]}>
              {prefs.quietHoursStart}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.row, { borderBottomWidth: 0 }, !prefs.quietHoursEnabled && s.rowDisabled]}
            onPress={() => prefs.quietHoursEnabled && setShowEndPicker(true)}
            activeOpacity={0.8}
          >
            <View style={[s.iconWrap, { backgroundColor: "rgba(58,80,96,0.3)" }]}>
              <Clock size={16} color={colors.textSecondary} />
            </View>
            <Text style={[s.rowLabel, { color: prefs.quietHoursEnabled ? colors.text : colors.textMuted }]}>
              End time
            </Text>
            <Text style={[s.timeValue, { color: prefs.quietHoursEnabled ? "#FFD700" : colors.textMuted }]}>
              {prefs.quietHoursEnd}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.footnote, { color: colors.textMuted }]}>
          Push notifications require granting permission when prompted. You can also manage this in your device Settings → PrediQs AI.
        </Text>
      </ScrollView>

      <TimePickerModal
        visible={showStartPicker}
        value={prefs.quietHoursStart}
        title="Quiet Hours Start"
        onSelect={(v) => updatePref("quietHoursStart", v)}
        onClose={() => setShowStartPicker(false)}
      />
      <TimePickerModal
        visible={showEndPicker}
        value={prefs.quietHoursEnd}
        title="Quiet Hours End"
        onSelect={(v) => updatePref("quietHoursEnd", v)}
        onClose={() => setShowEndPicker(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content:   { paddingHorizontal: 16, gap: 8 },
  header:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  loadingText: { fontSize: 13 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },
  card:  { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 4 },
  row:   { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, borderBottomWidth: 1 },
  rowDisabled: { opacity: 0.45 },
  iconWrap:  { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rowText:   { flex: 1, gap: 2 },
  rowLabel:  { fontSize: 15, fontFamily: "Inter_400Regular" },
  rowDesc:   { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  timeValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  footnote:  { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 16, marginTop: 8 },
  // Time picker modal
  overlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 12 },
  handle:    { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  hourRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1 },
  hourText:  { fontSize: 16, fontFamily: "Inter_400Regular" },
});
