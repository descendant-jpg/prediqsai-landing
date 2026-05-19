import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, XCircle, Zap } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";
import type { ApiKeyStatus, ApiKeyTestResult } from "@/lib/api";

// ─── Category colour map ──────────────────────────────────────────────────────
const CATEGORY_COLOR: Record<string, string> = {
  AI:        "#9B59B6",
  Sports:    "#00E5FF",
  Betting:   "#FFD700",
  Content:   "#00FF94",
  Data:      "#3498DB",
  Push:      "#FF9900",
  Email:     "#FF6B6B",
  Analytics: "#2ECC71",
  Finance:   "#1ABC9C",
};

type KeyState = {
  testing: boolean;
  result: ApiKeyTestResult | null;
  editing: boolean;
  editValue: string;
  saving: boolean;
};

function initKeyState(): KeyState {
  return { testing: false, result: null, editing: false, editValue: "", saving: false };
}

function StatusBadge({ configured, result }: { configured: boolean; result: ApiKeyTestResult | null }) {
  if (result) {
    return result.ok ? (
      <View style={[s.badge, s.badgeGreen]}>
        <CheckCircle2 size={11} color="#00FF94" />
        <Text style={[s.badgeText, { color: "#00FF94" }]}>Working</Text>
      </View>
    ) : (
      <View style={[s.badge, s.badgeRed]}>
        <XCircle size={11} color="#FF4D4D" />
        <Text style={[s.badgeText, { color: "#FF4D4D" }]}>Failed</Text>
      </View>
    );
  }
  return configured ? (
    <View style={[s.badge, s.badgeGray]}>
      <CheckCircle2 size={11} color="#94A3B8" />
      <Text style={[s.badgeText, { color: "#94A3B8" }]}>Configured</Text>
    </View>
  ) : (
    <View style={[s.badge, s.badgeRed]}>
      <AlertCircle size={11} color="#FF4D4D" />
      <Text style={[s.badgeText, { color: "#FF4D4D" }]}>Not set</Text>
    </View>
  );
}

function KeyCard({
  keyStatus,
  ks,
  onTest,
  onToggleEdit,
  onEditChange,
  onSave,
}: {
  keyStatus: ApiKeyStatus;
  ks: KeyState;
  onTest: () => void;
  onToggleEdit: () => void;
  onEditChange: (v: string) => void;
  onSave: () => void;
}) {
  const colors = useColors();
  const catColor = CATEGORY_COLOR[keyStatus.category] ?? "#94A3B8";

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: ks.result ? (ks.result.ok ? "#00FF9422" : "#FF4D4D33") : colors.cardBorder }]}>
      {/* Card header */}
      <View style={s.cardHeader}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={s.cardTitleRow}>
            <Text style={[s.cardName, { color: colors.text }]} numberOfLines={1}>{keyStatus.name}</Text>
            <View style={[s.catPill, { backgroundColor: `${catColor}20`, borderColor: `${catColor}44` }]}>
              <Text style={[s.catText, { color: catColor }]}>{keyStatus.category}</Text>
            </View>
          </View>
          <Text style={[s.cardLabel, { color: colors.textMuted }]}>{keyStatus.label}</Text>
        </View>
        <StatusBadge configured={keyStatus.configured} result={ks.result} />
      </View>

      {/* Masked value */}
      {keyStatus.configured && (
        <View style={s.maskedRow}>
          <Text style={[s.maskedText, { color: colors.textSecondary }]} selectable={false}>
            {keyStatus.masked}
          </Text>
          <Text style={[s.sourceTag, { color: colors.textMuted }]}>
            {keyStatus.source === "database" ? "📁 DB" : "🔧 env"}
          </Text>
        </View>
      )}

      {/* Test result detail */}
      {ks.result && (
        <View style={[s.resultRow, { backgroundColor: ks.result.ok ? "#00FF9410" : "#FF4D4D10", borderColor: ks.result.ok ? "#00FF9422" : "#FF4D4D22" }]}>
          <Text style={[s.resultMsg, { color: ks.result.ok ? "#00FF94" : "#FF4D4D" }]}>
            {ks.result.message}
          </Text>
          <Text style={[s.resultMs, { color: colors.textMuted }]}>{ks.result.responseTime}ms</Text>
          {ks.result.metadata && Object.keys(ks.result.metadata).length > 0 && (
            <Text style={[s.resultMeta, { color: colors.textMuted }]}>
              {Object.entries(ks.result.metadata)
                .filter(([, v]) => v != null)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ")}
            </Text>
          )}
        </View>
      )}

      {/* Inline edit form */}
      {ks.editing && (
        <View style={s.editForm}>
          <TextInput
            style={[s.editInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={ks.editValue}
            onChangeText={onEditChange}
            placeholder={`Paste new ${keyStatus.name}…`}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <TouchableOpacity
            style={[s.saveBtn, !ks.editValue.trim() && s.saveBtnDisabled]}
            onPress={onSave}
            disabled={ks.saving || !ks.editValue.trim()}
            activeOpacity={0.8}
          >
            {ks.saving ? (
              <ActivityIndicator size="small" color="#070B12" />
            ) : (
              <Text style={s.saveBtnText}>Test & Save</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Action buttons */}
      <View style={s.cardActions}>
        <TouchableOpacity
          style={[s.actionBtn, { borderColor: colors.border, opacity: ks.testing ? 0.6 : 1 }]}
          onPress={onTest}
          disabled={ks.testing || !keyStatus.configured}
          activeOpacity={0.8}
        >
          {ks.testing ? (
            <ActivityIndicator size="small" color="#00E5FF" />
          ) : (
            <Zap size={13} color="#00E5FF" />
          )}
          <Text style={[s.actionBtnText, { color: "#00E5FF" }]}>
            {ks.testing ? "Testing…" : "Test"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.actionBtn, { borderColor: ks.editing ? "#FFD700" : colors.border, backgroundColor: ks.editing ? "#FFD70015" : "transparent" }]}
          onPress={onToggleEdit}
          activeOpacity={0.8}
        >
          {ks.editing ? <ChevronUp size={13} color="#FFD700" /> : <ChevronDown size={13} color="#FFD700" />}
          <Text style={[s.actionBtnText, { color: "#FFD700" }]}>
            {ks.editing ? "Cancel" : "Update Key"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminApiKeysScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const [keyStatuses, setKeyStatuses] = useState<ApiKeyStatus[]>([]);
  const [keyStates, setKeyStates] = useState<Record<string, KeyState>>({});
  const [loading, setLoading] = useState(true);
  const [testingAll, setTestingAll] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const statuses = await api.admin.apiKeys(token);
      setKeyStatuses(statuses);
      const initial: Record<string, KeyState> = {};
      for (const ks of statuses) initial[ks.name] = initKeyState();
      setKeyStates(initial);
    } catch {
      Alert.alert("Error", "Failed to load API key status");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function patchKeyState(keyName: string, patch: Partial<KeyState>) {
    setKeyStates((prev) => ({ ...prev, [keyName]: { ...prev[keyName]!, ...patch } }));
  }

  async function handleTest(keyName: string) {
    if (!token) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    patchKeyState(keyName, { testing: true, result: null });
    try {
      const result = await api.admin.testApiKey(token, keyName);
      patchKeyState(keyName, { testing: false, result });
    } catch {
      patchKeyState(keyName, { testing: false, result: { keyName, ok: false, responseTime: 0, message: "Request failed" } });
    }
  }

  async function handleTestAll() {
    if (!token) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTestingAll(true);
    // Reset all results
    setKeyStates((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) next[k] = { ...next[k]!, testing: true, result: null };
      return next;
    });
    try {
      const results = await api.admin.testAllApiKeys(token);
      setKeyStates((prev) => {
        const next = { ...prev };
        for (const r of results) {
          if (next[r.keyName]) next[r.keyName] = { ...next[r.keyName]!, testing: false, result: r };
        }
        return next;
      });
    } catch {
      setKeyStates((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          if (next[k]!.testing) next[k] = { ...next[k]!, testing: false };
        }
        return next;
      });
      Alert.alert("Error", "Test all failed");
    } finally {
      setTestingAll(false);
    }
  }

  async function handleSave(keyName: string) {
    const ks = keyStates[keyName];
    if (!token || !ks?.editValue.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    patchKeyState(keyName, { saving: true });

    try {
      // 1. Save to DB
      await api.admin.updateConfig(token, keyName, ks.editValue.trim());
      // 2. Test the new key
      const result = await api.admin.testApiKey(token, keyName);

      // 3. Update local status
      setKeyStatuses((prev) => prev.map((s) =>
        s.name === keyName
          ? { ...s, configured: true, masked: "••••••" + ks.editValue.trim().slice(-4), source: "database" as const }
          : s,
      ));
      patchKeyState(keyName, { saving: false, editing: false, editValue: "", result });

      Alert.alert(
        result.ok ? "✅ Saved & Working" : "⚠️ Saved but test failed",
        result.ok
          ? `${keyName} saved to database and verified working.`
          : `Saved to database but test returned: ${result.message}`,
      );
    } catch (err) {
      patchKeyState(keyName, { saving: false });
      Alert.alert("Error", err instanceof Error ? err.message : "Save failed");
    }
  }

  const configuredCount = keyStatuses.filter((k) => k.configured).length;
  const workingCount = Object.values(keyStates).filter((ks) => ks.result?.ok).length;
  const failedCount = Object.values(keyStates).filter((ks) => ks.result && !ks.result.ok).length;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>🔌 API Key Management</Text>
          <Text style={[s.headerSub, { color: colors.textMuted }]}>
            {configuredCount}/{keyStatuses.length} configured
            {workingCount > 0 ? ` · ${workingCount} working` : ""}
            {failedCount > 0 ? ` · ${failedCount} failed` : ""}
          </Text>
        </View>
        <TouchableOpacity
          style={[s.testAllBtn, testingAll && { opacity: 0.6 }]}
          onPress={handleTestAll}
          disabled={testingAll}
          activeOpacity={0.8}
        >
          {testingAll
            ? <ActivityIndicator size="small" color="#070B12" />
            : <RefreshCw size={14} color="#070B12" />}
          <Text style={s.testAllText}>{testingAll ? "Testing…" : "Test All"}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.cyan} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[s.infoBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[s.infoText, { color: colors.textMuted }]}>
              Keys stored in the database override environment variables. Tap{" "}
              <Text style={{ color: "#FFD700" }}>Update Key</Text> to set or rotate a key.
              It will be tested before saving.
            </Text>
          </View>

          {keyStatuses.map((ks) => (
            <KeyCard
              key={ks.name}
              keyStatus={ks}
              ks={keyStates[ks.name] ?? initKeyState()}
              onTest={() => handleTest(ks.name)}
              onToggleEdit={() => patchKeyState(ks.name, { editing: !keyStates[ks.name]?.editing, editValue: "" })}
              onEditChange={(v) => patchKeyState(ks.name, { editValue: v })}
              onSave={() => handleSave(ks.name)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerSub: { fontSize: 11, marginTop: 1 },
  testAllBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FFD700", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  testAllText: { fontSize: 12, fontWeight: "700", color: "#070B12" },
  content: { padding: 14, gap: 12 },
  infoBox: { borderRadius: 12, borderWidth: 1, padding: 12 },
  infoText: { fontSize: 12, lineHeight: 17 },

  // Card
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  cardName: { fontSize: 13, fontWeight: "700", letterSpacing: 0.2 },
  cardLabel: { fontSize: 12 },
  catPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  catText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.4 },

  // Badge
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  badgeGreen: { backgroundColor: "#00FF9415", borderColor: "#00FF9433" },
  badgeRed: { backgroundColor: "#FF4D4D15", borderColor: "#FF4D4D33" },
  badgeGray: { backgroundColor: "#94A3B815", borderColor: "#94A3B833" },
  badgeText: { fontSize: 10, fontWeight: "700" },

  // Masked
  maskedRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  maskedText: { fontSize: 13, letterSpacing: 1, fontFamily: "monospace" },
  sourceTag: { fontSize: 10 },

  // Result
  resultRow: { borderRadius: 8, borderWidth: 1, padding: 10, gap: 3 },
  resultMsg: { fontSize: 12, fontWeight: "600" },
  resultMs: { fontSize: 11 },
  resultMeta: { fontSize: 11 },

  // Edit form
  editForm: { gap: 8 },
  editInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13 },
  saveBtn: { backgroundColor: "#FFD700", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: "#070B12", fontWeight: "700", fontSize: 13 },

  // Actions
  cardActions: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  actionBtnText: { fontSize: 12, fontWeight: "600" },
});
