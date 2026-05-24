import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Ban, Clock, Crown, RefreshCw, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminTabBar } from "@/components/AdminTabBar";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api, type AdminUser } from "@/lib/api";

const TIER_OPTIONS = ["free", "premium"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor ?? colors.text }]}>{value}</Text>
    </View>
  );
}

function ActionBtn({ label, icon, color, onPress, loading }: { label: string; icon: React.ReactNode; color: string; onPress: () => void; loading?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { borderColor: `${color}55`, backgroundColor: `${color}10` }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? <ActivityIndicator size="small" color={color} /> : icon}
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AdminUserDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [trialDays, setTrialDays] = useState("7");

  const load = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const u = await api.admin.user(token, parseInt(id, 10));
      setUser(u);
    } catch {
      Alert.alert("Error", "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => { load(); }, [load]);

  async function doUpdate(patch: Record<string, unknown>, confirmMsg?: string, successMsg?: string) {
    if (!token || !user) return;
    if (confirmMsg) {
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert("Confirm", confirmMsg, [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Confirm", style: "destructive", onPress: () => resolve(true) },
        ]);
      });
      if (!confirmed) return;
    }
    setSaving(true);
    console.log("[AdminUserDetail] doUpdate payload:", JSON.stringify(patch));
    try {
      const updated = await api.admin.updateUser(token, user.id, patch);
      console.log("[AdminUserDetail] doUpdate success:", JSON.stringify(updated));
      setUser(updated);
      Alert.alert("Success", successMsg ?? "User updated successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[AdminUserDetail] doUpdate error:", msg);
      Alert.alert("Error", `Action failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.cyan} size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: "#FF4D4D" }}>User not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.cyan }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tierColor = user.effectiveTier === "premium" ? "#FFD700" : "#94A3B8";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{user.username}</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>ID #{user.id}</Text>
        </View>
        <TouchableOpacity onPress={load} disabled={saving}>
          <RefreshCw size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>

        {/* Status badges */}
        <View style={styles.badges}>
          <View style={[styles.tierBadge, { borderColor: `${tierColor}55`, backgroundColor: `${tierColor}15` }]}>
            <Text style={[styles.tierBadgeText, { color: tierColor }]}>{user.effectiveTier.toUpperCase()}</Text>
          </View>
          {user.isBanned && <View style={[styles.statusBadge, { backgroundColor: "#FF4D4D15", borderColor: "#FF4D4D55" }]}><Text style={[styles.statusBadgeText, { color: "#FF4D4D" }]}>BANNED</Text></View>}
          {user.isSuspended && <View style={[styles.statusBadge, { backgroundColor: "#FF990015", borderColor: "#FF990055" }]}><Text style={[styles.statusBadgeText, { color: "#FF9900" }]}>SUSPENDED</Text></View>}
          {user.isAdmin && <View style={[styles.statusBadge, { backgroundColor: "#A855F715", borderColor: "#A855F755" }]}><Text style={[styles.statusBadgeText, { color: "#A855F7" }]}>ADMIN</Text></View>}
          {user.manualTierOverride && <View style={[styles.statusBadge, { backgroundColor: "#FFD70015", borderColor: "#FFD70055" }]}><Text style={[styles.statusBadgeText, { color: "#FFD700" }]}>OVERRIDE</Text></View>}
        </View>

        {/* Info */}
        <Section title="ACCOUNT INFO">
          <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Tier (actual)" value={user.tier} />
            <InfoRow label="Effective Tier" value={user.effectiveTier} valueColor={tierColor} />
            <InfoRow label="Bankroll" value={`$${user.bankroll.toFixed(2)}`} valueColor="#00FF94" />
            <InfoRow label="Daily Limit" value={`$${user.dailyLossLimit.toFixed(2)}`} />
            <InfoRow label="Joined" value={new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} />
            {user.freeTrialUntil && (
              <InfoRow
                label="Trial Until"
                value={new Date(user.freeTrialUntil).toLocaleDateString()}
                valueColor={new Date(user.freeTrialUntil) > new Date() ? "#00FF94" : "#FF4D4D"}
              />
            )}
            {user.manualTierOverride && <InfoRow label="Override" value={user.manualTierOverride} valueColor="#FFD700" />}
          </View>
        </Section>

        {/* Ban / Suspend */}
        <Section title="MODERATION">
          <View style={styles.actionGrid}>
            {user.isBanned ? (
              <ActionBtn
                label="Unban User"
                icon={<Ban size={16} color="#00FF94" />}
                color="#00FF94"
                onPress={() => doUpdate({ isBanned: false }, undefined, `${user.username} has been unbanned`)}
                loading={saving}
              />
            ) : (
              <ActionBtn
                label="Ban User"
                icon={<Ban size={16} color="#FF4D4D" />}
                color="#FF4D4D"
                onPress={() => doUpdate({ isBanned: true }, `Ban ${user.username}? They won't be able to log in.`, `${user.username} has been banned`)}
                loading={saving}
              />
            )}
            {user.isSuspended ? (
              <ActionBtn
                label="Unsuspend"
                icon={<RefreshCw size={16} color="#00FF94" />}
                color="#00FF94"
                onPress={() => doUpdate({ isSuspended: false }, undefined, `${user.username} has been unsuspended`)}
                loading={saving}
              />
            ) : (
              <ActionBtn
                label="Suspend"
                icon={<Clock size={16} color="#FF9900" />}
                color="#FF9900"
                onPress={() => doUpdate({ isSuspended: true }, `Suspend ${user.username}?`, `${user.username} has been suspended`)}
                loading={saving}
              />
            )}
          </View>
        </Section>

        {/* Tier Override */}
        <Section title="TIER OVERRIDE">
          <View style={styles.tierGrid}>
            {TIER_OPTIONS.map((t) => {
              const tColor = t === "premium" ? "#FFD700" : "#94A3B8";
              const isActive = user.manualTierOverride === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.tierBtn, {
                    backgroundColor: isActive ? `${tColor}20` : colors.card,
                    borderColor: isActive ? tColor : colors.cardBorder,
                  }]}
                  onPress={() => {
                    const newOverride = isActive ? null : t;
                    const msg = newOverride
                      ? `${user.username} overridden to ${t.toUpperCase()}`
                      : `Override cleared for ${user.username}`;
                    doUpdate({ manualTierOverride: newOverride }, undefined, msg);
                  }}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {t === "premium" && <Crown size={14} color={tColor} />}
                  <Text style={[styles.tierBtnText, { color: isActive ? tColor : colors.text }]}>
                    {t.toUpperCase()}{isActive ? " ✓" : ""}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {user.manualTierOverride && (
              <TouchableOpacity
                style={[styles.tierBtn, { backgroundColor: "#FF4D4D10", borderColor: "#FF4D4D44" }]}
                onPress={() => doUpdate({ manualTierOverride: null }, undefined, `Override cleared for ${user.username}`)}
                disabled={saving}
              >
                <Trash2 size={14} color="#FF4D4D" />
                <Text style={[styles.tierBtnText, { color: "#FF4D4D" }]}>Clear Override</Text>
              </TouchableOpacity>
            )}
          </View>
        </Section>

        {/* Free Trial */}
        <Section title="FREE TRIAL">
          <View style={[styles.trialRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Clock size={16} color={colors.cyan} />
            <TextInput
              style={[styles.trialInput, { color: colors.text, borderColor: colors.border }]}
              value={trialDays}
              onChangeText={setTrialDays}
              keyboardType="number-pad"
              placeholder="7"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.trialLabel, { color: colors.textMuted }]}>days</Text>
            <TouchableOpacity
              style={[styles.trialBtn, { backgroundColor: colors.cyan }]}
              onPress={() => {
                const d = parseInt(trialDays, 10);
                if (!d || d < 1 || d > 365) { Alert.alert("Enter 1–365 days"); return; }
                doUpdate({ freeTrialDays: d }, undefined, `Free trial granted for ${d} days`);
              }}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={[styles.trialBtnText, { color: colors.background }]}>Grant</Text>
            </TouchableOpacity>
            {user.freeTrialUntil && (
              <TouchableOpacity
                style={[styles.trialBtn, { backgroundColor: "#FF4D4D15", borderWidth: 1, borderColor: "#FF4D4D55" }]}
                onPress={() => doUpdate({ freeTrialDays: 0 }, undefined, "Free trial removed")}
                disabled={saving}
              >
                <Text style={{ color: "#FF4D4D", fontSize: 12 }}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </Section>

      </ScrollView>
      <AdminTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerSub: { fontSize: 12 },
  content: { padding: 16, gap: 20 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  tierBadgeText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 11, letterSpacing: 1 },
  infoBox: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1 },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: "600", maxWidth: "60%", textAlign: "right" },
  actionGrid: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontWeight: "600" },
  tierGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tierBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  tierBtnText: { fontSize: 13, fontWeight: "600" },
  trialRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  trialInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, width: 54, fontSize: 15, textAlign: "center" },
  trialLabel: { fontSize: 13, marginRight: 4 },
  trialBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  trialBtnText: { fontSize: 13, fontWeight: "700" },
});
