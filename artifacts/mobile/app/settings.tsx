import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

type Tier = "free" | "pro" | "elite";

const TIERS: { key: Tier; label: string; price: string; color: string; features: string[] }[] = [
  {
    key: "free",
    label: "Free",
    price: "Free",
    color: "#8B9EB7",
    features: ["5 picks per day", "Basic confidence scores", "AI assistant (10 msgs/day)"],
  },
  {
    key: "pro",
    label: "Pro",
    price: "$9.99/mo",
    color: "#00E5FF",
    features: [
      "Unlimited picks",
      "Full AI analysis & reasoning",
      "Sharp money signals",
      "Kelly criterion calculator",
      "AI assistant (unlimited)",
    ],
  },
  {
    key: "elite",
    label: "Elite",
    price: "$24.99/mo",
    color: "#FFD700",
    features: [
      "Everything in Pro",
      "Real-time odds & line movement",
      "Exclusive high-confidence models",
      "Performance analytics",
      "Priority support",
    ],
  },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, logout, refreshUser } = useAuth();

  const [isChangingTier, setIsChangingTier] = useState(false);

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + topPaddingWeb;

  async function handleSetTier(tier: Tier) {
    if (!token || tier === user?.tier || isChangingTier) return;
    setIsChangingTier(true);
    try {
      await api.subscription.setTier(token, tier);
      await refreshUser();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to change tier");
    } finally {
      setIsChangingTier(false);
    }
  }

  function handleLogout() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => logout() },
    ]);
  }

  const currentTier = (user?.tier ?? "pro") as Tier;
  const currentTierData = TIERS.find((t) => t.key === currentTier) ?? TIERS[1];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding + 16, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Settings</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Beta banner */}
        <View style={[styles.betaBanner, { backgroundColor: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.25)" }]}>
          <Ionicons name="flash" size={16} color="#00E5FF" />
          <View style={styles.betaText}>
            <Text style={[styles.betaTitle, { color: "#00E5FF" }]}>Beta Access — Full Features Unlocked</Text>
            <Text style={[styles.betaSub, { color: colors.textSecondary }]}>
              Payment coming soon. Enjoy full access during beta — no credit card needed.
            </Text>
          </View>
        </View>

        {/* Profile */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.avatar, { backgroundColor: "rgba(0,229,255,0.12)", borderColor: "rgba(0,229,255,0.3)" }]}>
            <Text style={[styles.avatarText, { color: "#00E5FF" }]}>
              {user?.username?.charAt(0).toUpperCase() ?? "?"}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{user?.username ?? "—"}</Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email ?? "—"}</Text>
          </View>
          <View style={[styles.tierPill, { backgroundColor: `${currentTierData.color}20`, borderColor: `${currentTierData.color}50` }]}>
            <Text style={[styles.tierPillText, { color: currentTierData.color }]}>
              {currentTierData.label.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Dev tier switcher */}
        <View style={styles.sectionLabel}>
          <View style={[styles.devBadge, { backgroundColor: "rgba(255,107,53,0.12)", borderColor: "rgba(255,107,53,0.3)" }]}>
            <Feather name="code" size={11} color="#FF6B35" />
            <Text style={[styles.devBadgeText, { color: "#FF6B35" }]}>DEV MODE</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tier Simulator</Text>
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
            Switch tiers to test gated features — no payment required during development
          </Text>
        </View>

        <View style={styles.tierGrid}>
          {TIERS.map((tier) => {
            const isActive = currentTier === tier.key;
            return (
              <TouchableOpacity
                key={tier.key}
                style={[
                  styles.tierCard,
                  {
                    backgroundColor: isActive ? `${tier.color}12` : colors.card,
                    borderColor: isActive ? tier.color : colors.cardBorder,
                    borderWidth: isActive ? 2 : 1,
                  },
                ]}
                onPress={() => handleSetTier(tier.key)}
                disabled={isChangingTier}
                activeOpacity={0.8}
              >
                <View style={styles.tierCardHeader}>
                  <Text style={[styles.tierCardLabel, { color: isActive ? tier.color : colors.text }]}>
                    {tier.label}
                  </Text>
                  {isActive && (
                    <View style={[styles.activeCheck, { backgroundColor: tier.color }]}>
                      <Feather name="check" size={10} color={colors.background} />
                    </View>
                  )}
                </View>
                <Text style={[styles.tierCardPrice, { color: colors.textMuted }]}>{tier.price}</Text>
                <View style={styles.tierFeatures}>
                  {tier.features.slice(0, 3).map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <View style={[styles.featureDot, { backgroundColor: isActive ? tier.color : colors.textMuted }]} />
                      <Text style={[styles.featureText, { color: isActive ? colors.text : colors.textSecondary }]}>
                        {f}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Current tier features */}
        <View style={[styles.currentTierCard, { backgroundColor: colors.card, borderColor: `${currentTierData.color}30` }]}>
          <Text style={[styles.currentTierTitle, { color: currentTierData.color }]}>
            {currentTierData.label} — Active Features
          </Text>
          {currentTierData.features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Feather name="check-circle" size={14} color={currentTierData.color} />
              <Text style={[styles.currentFeatureText, { color: colors.text }]}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Admin section */}
        {user?.id === 1 && (
          <>
            <Text style={[styles.adminLabel, { color: colors.textMuted }]}>ADMIN</Text>
            <TouchableOpacity
              style={[styles.rowBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => router.push("/setup")}
              activeOpacity={0.8}
            >
              <Feather name="settings" size={18} color={colors.textSecondary} />
              <Text style={[styles.rowBtnText, { color: colors.text }]}>API Keys Setup Guide</Text>
              <Feather name="chevron-right" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        )}

        {/* Sign out */}
        <Text style={[styles.adminLabel, { color: colors.textMuted }]}>ACCOUNT</Text>
        <TouchableOpacity
          style={[styles.rowBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={18} color="#FF4D4D" />
          <Text style={[styles.rowBtnText, { color: "#FF4D4D" }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.footer, { color: colors.textMuted }]}>
          PrediQs AI v1.0 — Beta
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  betaBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  betaText: { flex: 1, gap: 3 },
  betaTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  betaSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  section: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  avatarText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  profileEmail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  tierPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  tierPillText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  sectionLabel: { gap: 4 },
  devBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  devBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  tierGrid: { gap: 10 },
  tierCard: {
    padding: 16,
    borderRadius: 16,
    gap: 6,
  },
  tierCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tierCardLabel: { fontSize: 17, fontFamily: "Inter_700Bold" },
  activeCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tierCardPrice: { fontSize: 12, fontFamily: "Inter_500Medium" },
  tierFeatures: { gap: 5, marginTop: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureDot: { width: 5, height: 5, borderRadius: 2.5 },
  featureText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  currentTierCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  currentTierTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  currentFeatureText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  adminLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginTop: 4 },
  rowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  rowBtnText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  footer: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },
});
