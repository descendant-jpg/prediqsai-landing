import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminTabBar } from "@/components/AdminTabBar";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

const TOGGLE_KEYS: { key: string; label: string; description: string }[] = [
  { key: "maintenance_mode",      label: "Maintenance Mode",      description: "Show maintenance page to all users" },
  { key: "allow_signups",         label: "Allow Sign-Ups",         description: "New account registrations" },
  { key: "arbitrage_enabled",     label: "Arbitrage Scanner",      description: "ARB Scanner feature" },
  { key: "slip_analyzer_enabled", label: "Slip Analyzer",          description: "Bet slip photo analysis" },
  { key: "worldcup_enabled",      label: "World Cup Screen",       description: "FIFA 2026 predictions tab" },
  { key: "paper_bet_enabled",     label: "Paper Bet Mode",         description: "Virtual paper betting" },
  { key: "voice_ai_enabled",      label: "Voice AI",               description: "Voice AI assistant" },
];

const NUMBER_KEYS: { key: string; label: string; description: string; suffix: string }[] = [
  { key: "free_daily_limit",  label: "Free Daily Pick Limit",  description: "Max picks per day for free users", suffix: "picks/day" },
  { key: "pro_chat_limit",    label: "Pro AI Chat Limit",      description: "Max AI messages per day for Pro", suffix: "msgs/day" },
];

export default function AdminConfigScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const c = await api.admin.config(token);
      setConfig(c);
      const ev: Record<string, string> = {};
      for (const k of NUMBER_KEYS) ev[k.key] = c[k.key] ?? "";
      setEditingValues(ev);
    } catch {
      Alert.alert("Error", "Failed to load config");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function toggle(key: string, currentVal: boolean) {
    if (!token) return;
    setSaving(key);
    const newVal = (!currentVal).toString();
    try {
      await api.admin.updateConfig(token, key, newVal);
      setConfig((prev) => ({ ...prev, [key]: newVal }));
    } catch {
      Alert.alert("Error", "Failed to update");
    } finally {
      setSaving(null);
    }
  }

  async function saveNumber(key: string) {
    const val = editingValues[key];
    if (!token || !val) return;
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 0) { Alert.alert("Enter a valid number"); return; }
    setSaving(key);
    try {
      await api.admin.updateConfig(token, key, String(n));
      setConfig((prev) => ({ ...prev, [key]: String(n) }));
    } catch {
      Alert.alert("Error", "Failed to update");
    } finally {
      setSaving(null);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>⚙️ Feature Flags</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.cyan} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>

          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>FEATURE TOGGLES</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {TOGGLE_KEYS.map((item, i) => {
              const isOn = config[item.key] === "true";
              const isSaving = saving === item.key;
              const isLast = i === TOGGLE_KEYS.length - 1;
              return (
                <View
                  key={item.key}
                  style={[styles.toggleRow, !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.toggleLabel, { color: colors.text }]}>{item.label}</Text>
                    <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>{item.description}</Text>
                  </View>
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.cyan} />
                  ) : (
                    <Switch
                      value={isOn}
                      onValueChange={() => toggle(item.key, isOn)}
                      trackColor={{ false: colors.border, true: item.key === "maintenance_mode" ? "#FF4D4D" : colors.cyan }}
                      thumbColor={isOn ? "#fff" : "#888"}
                    />
                  )}
                </View>
              );
            })}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>LIMITS & QUOTAS</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {NUMBER_KEYS.map((item, i) => {
              const isLast = i === NUMBER_KEYS.length - 1;
              return (
                <View
                  key={item.key}
                  style={[styles.numRow, !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.toggleLabel, { color: colors.text }]}>{item.label}</Text>
                    <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>{item.description}</Text>
                  </View>
                  <View style={styles.numRight}>
                    <TextInput
                      style={[styles.numInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                      value={editingValues[item.key] ?? ""}
                      onChangeText={(v) => setEditingValues((prev) => ({ ...prev, [item.key]: v }))}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      onSubmitEditing={() => saveNumber(item.key)}
                    />
                    <Text style={[styles.numSuffix, { color: colors.textMuted }]}>{item.suffix}</Text>
                    <TouchableOpacity
                      style={[styles.saveBtn, { backgroundColor: colors.cyan }]}
                      onPress={() => saveNumber(item.key)}
                      disabled={saving === item.key}
                    >
                      {saving === item.key
                        ? <ActivityIndicator size="small" color={colors.background} />
                        : <Text style={[styles.saveBtnText, { color: colors.background }]}>Save</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

        </ScrollView>
      )}
      <AdminTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  content: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 11, letterSpacing: 1, marginTop: 8 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  toggleLabel: { fontSize: 14, fontWeight: "600" },
  toggleDesc: { fontSize: 12 },
  numRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  numRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  numInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, width: 56, fontSize: 14, textAlign: "center" },
  numSuffix: { fontSize: 11 },
  saveBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  saveBtnText: { fontSize: 12, fontWeight: "700" },
});
