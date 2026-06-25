import { ArrowLeft, Check, CheckCircle, ChevronRight, Code2, Crown, Info, LogOut, Mail, Settings, Shield, Star, X, Zap } from "lucide-react-native";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

type Tier = "free" | "premium";

// ─── Pricing constants (single source of truth) ───────────────────────────────

export const TIER_PRICING = {
  free:    { monthly: 0,      annual: 0,    annualSave: 0 },
  premium: { monthly: 19.99,  annual: 216,  annualSave: 23.88 },
} as const;

export const UPGRADE_PRICE: Record<Tier, string> = {
  free:    "$0",
  premium: "$19.99/mo",
};

// ─── Tier card features (compact) ─────────────────────────────────────────────

const TIER_CARDS: {
  key: Tier;
  label: string;
  color: string;
  badge: string | null;
  badgeIcon: "star" | "crown" | null;
  cardFeatures: string[];
}[] = [
  {
    key: "free",
    label: "Free",
    color: "#94A3B8",
    badge: null,
    badgeIcon: null,
    cardFeatures: [
      "2 picks/day (soccer + PL only)",
      "Basic confidence %",
      "3 Oracle AI messages/day",
      "Bankroll tracker (basic)",
      "Leaderboard (view only)",
    ],
  },
  {
    key: "premium",
    label: "Premium",
    color: "#FFD700",
    badge: "⭐ BEST VALUE",
    badgeIcon: "star",
    cardFeatures: [
      "Unlimited picks all sports & leagues",
      "Full AI reasoning + risk badges",
      "ARB Scanner (40+ bookmakers)",
      "Slip Analyzer (unlimited)",
      "Unlimited Oracle AI",
      "Full match detail, H2H & stats",
      "Kelly Calculator + ROI charts",
      "World Cup 2026 full coverage",
      "All notifications & alerts",
    ],
  },
];

// ─── Active features per tier ─────────────────────────────────────────────────

type FeatureItem = { label: string; active: boolean; requiredTier?: "premium" };

const TIER_ACTIVE_FEATURES: Record<Tier, FeatureItem[]> = {
  free: [
    { label: "2 AI picks per day (soccer only)", active: true },
    { label: "Premier League picks only", active: true },
    { label: "Basic confidence %", active: true },
    { label: "3 Oracle AI messages per day", active: true },
    { label: "Leaderboard (view only)", active: true },
    { label: "Bankroll tracker (basic)", active: true },
    { label: "Unlimited picks all sports", active: false, requiredTier: "premium" },
    { label: "Full AI reasoning & risk badges", active: false, requiredTier: "premium" },
    { label: "ARB Scanner (40+ bookmakers)", active: false, requiredTier: "premium" },
    { label: "Slip Analyzer (unlimited)", active: false, requiredTier: "premium" },
    { label: "Match detail & H2H stats", active: false, requiredTier: "premium" },
    { label: "Kelly Criterion calculator", active: false, requiredTier: "premium" },
    { label: "Performance charts & ROI", active: false, requiredTier: "premium" },
    { label: "World Cup 2026 predictions", active: false, requiredTier: "premium" },
  ],
  premium: [
    { label: "Unlimited picks all sports & leagues", active: true },
    { label: "Full AI reasoning + risk badges", active: true },
    { label: "ARB Scanner (40+ bookmakers)", active: true },
    { label: "Slip Analyzer (unlimited)", active: true },
    { label: "Unlimited Oracle AI", active: true },
    { label: "Full match detail, H2H & stats", active: true },
    { label: "Kelly Criterion calculator", active: true },
    { label: "Performance charts & ROI", active: true },
    { label: "World Cup 2026 full coverage", active: true },
    { label: "All notification types", active: true },
    { label: "Community access + tipsters", active: true },
    { label: "Priority support", active: true },
  ],
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, logout, refreshUser } = useAuth();
  const [isChangingTier, setIsChangingTier] = useState(false);
  const [annualMode, setAnnualMode] = useState(false);
  const [versionTaps, setVersionTaps] = useState(0);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [secretPassword, setSecretPassword] = useState("");
  const [secretLoading, setSecretLoading] = useState(false);
  const [secretError, setSecretError] = useState("");
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleVersionTap() {
    const next = versionTaps + 1;
    setVersionTaps(next);
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (next >= 7) {
      setVersionTaps(0);
      setSecretPassword("");
      setSecretError("");
      setShowSecretModal(true);
      return;
    }
    tapTimer.current = setTimeout(() => setVersionTaps(0), 2000);
  }

  async function handleSecretLogin() {
    if (!secretPassword) return;
    setSecretLoading(true);
    setSecretError("");
    try {
      const r = await api.admin.verifyPassword(secretPassword);
      if (r.ok) {
        setShowSecretModal(false);
        router.push("/admin");
      } else {
        setSecretError("Incorrect password.");
      }
    } catch {
      setSecretError("Verification failed. Try again.");
    } finally {
      setSecretLoading(false);
    }
  }

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + topPaddingWeb;

  async function handleSetTier(tier: Tier) {
    if (!token || tier === user?.tier || isChangingTier) return;
    if (!user?.isAdmin) {
      Alert.alert(
        "Subscriptions Coming Soon",
        "Full payment processing is launching very soon. You'll be notified when upgrades go live!",
        [{ text: "Got it" }],
      );
      return;
    }
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

  async function performLogout() {
    try {
      await logout();
      router.replace("/(auth)/login");
    } catch {
      if (Platform.OS === "web") {
        window.alert("Something went wrong while signing out. Please try again.");
      } else {
        Alert.alert(
          "Sign Out Failed",
          "Something went wrong while signing out. Please try again.",
        );
      }
    }
  }

  function handleLogout() {
    // React Native Web's Alert.alert ignores the buttons array, so use the
    // browser's native confirm on web and the RN Alert on native devices.
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to sign out?")) {
        performLogout();
      }
      return;
    }

    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: performLogout },
      ],
    );
  }

  const rawTier = user?.tier ?? "free";
  const currentTier: Tier = rawTier === "premium" ? "premium" : "free";
  const currentCard = TIER_CARDS.find((t) => t.key === currentTier)!;
  const activeFeatures = TIER_ACTIVE_FEATURES[currentTier];

  function priceLabel(key: Tier): string {
    if (key === "free") return "$0 forever";
    const p = TIER_PRICING[key];
    if (annualMode) return `$${p.annual}/year`;
    return `$${p.monthly}/mo`;
  }

  function annualSaveLabel(key: Tier): string | null {
    if (key === "free") return null;
    const p = TIER_PRICING[key];
    return annualMode ? `💚 Save $${p.annualSave.toFixed(2)}/year with annual` : null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 16, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Settings</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Beta banner — admin only during development */}
        {user?.isAdmin && (
          <View style={[styles.betaBanner, { backgroundColor: "rgba(255,107,53,0.08)", borderColor: "rgba(255,107,53,0.25)" }]}>
            <Zap size={16} color="#FF6B35" />
            <View style={styles.betaText}>
              <Text style={[styles.betaTitle, { color: "#FF6B35" }]}>Admin / Dev Mode Active</Text>
              <Text style={[styles.betaSub, { color: colors.textSecondary }]}>
                You can switch tiers freely. This banner is only visible to admins.
              </Text>
            </View>
          </View>
        )}

        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.avatar, { backgroundColor: "rgba(0,229,255,0.12)", borderColor: "rgba(0,229,255,0.3)" }]}>
            <Text style={[styles.avatarText, { color: "#00E5FF" }]}>
              {user?.username?.charAt(0).toUpperCase() ?? "?"}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{user?.username ?? "—"}</Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email ?? "—"}</Text>
          </View>
          <View style={[styles.tierPill, { backgroundColor: `${currentCard.color}20`, borderColor: `${currentCard.color}50` }]}>
            <Text style={[styles.tierPillText, { color: currentCard.color }]}>{currentCard.label}</Text>
          </View>
        </View>

        {/* Subscription section */}
        <View style={styles.sectionLabel}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Plan</Text>
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
            Compare plans and unlock more AI-powered features
          </Text>
        </View>

        {/* Admin-only: Tier Simulator */}
        {user?.isAdmin && (
          <>
            {/* Annual / Monthly toggle */}
            <View style={[styles.billingToggle, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <TouchableOpacity
                style={[styles.toggleBtn, !annualMode && { backgroundColor: colors.cyan, borderRadius: 8 }]}
                onPress={() => setAnnualMode(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleBtnText, { color: !annualMode ? colors.background : colors.textSecondary }]}>Monthly</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, annualMode && { backgroundColor: "#00FF94", borderRadius: 8 }]}
                onPress={() => setAnnualMode(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleBtnText, { color: annualMode ? colors.background : colors.textSecondary }]}>Annual</Text>
                <View style={[styles.savePill, { backgroundColor: annualMode ? "rgba(0,0,0,0.15)" : "rgba(0,255,148,0.15)" }]}>
                  <Text style={[styles.savePillText, { color: annualMode ? colors.background : "#00FF94" }]}>Save ~10%</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Tier cards */}
            <View style={styles.tierGrid}>
              {TIER_CARDS.map((tier) => {
                const isActive = currentTier === tier.key;
                const save = annualSaveLabel(tier.key);
                return (
                  <TouchableOpacity
                    key={tier.key}
                    style={[
                      styles.tierCard,
                      {
                        backgroundColor: isActive ? `${tier.color}10` : colors.card,
                        borderColor: isActive ? tier.color : tier.key === "free" ? "#94A3B8" : "#FFD700",
                        borderWidth: isActive ? 2 : 1,
                        opacity: isChangingTier && !isActive ? 0.6 : 1,
                      },
                    ]}
                    onPress={() => handleSetTier(tier.key)}
                    disabled={isChangingTier || isActive}
                    activeOpacity={0.8}
                  >
                    <View style={styles.tierCardHeader}>
                      <Text style={[styles.tierCardLabel, { color: isActive ? tier.color : colors.text }]}>{tier.label}</Text>
                      <View style={styles.cardHeaderRight}>
                        {tier.badge && (
                          <View style={[styles.popularBadge, { backgroundColor: "rgba(255,215,0,0.15)", borderColor: tier.color }]}>
                            {tier.badgeIcon === "star" && <Star size={9} color={tier.color} />}
                            {tier.badgeIcon === "crown" && <Crown size={9} color={tier.color} />}
                            <Text style={[styles.popularBadgeText, { color: tier.color }]}>{tier.badge}</Text>
                          </View>
                        )}
                        {isActive && (
                          <View style={[styles.activeCheck, { backgroundColor: tier.color }]}>
                            <Check size={10} color={colors.background} />
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={[styles.tierCardPrice, { color: isActive ? tier.color : colors.text }]}>{priceLabel(tier.key)}</Text>
                    {save && <Text style={[styles.annualSave, { color: "#00FF94" }]}>{save}</Text>}
                    {tier.key === "premium" && !annualMode && (
                      <Text style={[styles.annualHint, { color: colors.textMuted }]}>$216/year — save ~10%</Text>
                    )}
                    <View style={styles.tierFeatures}>
                      {tier.cardFeatures.map((f, i) => (
                        <View key={i} style={styles.featureRow}>
                          <View style={[styles.featureDot, { backgroundColor: isActive ? tier.color : colors.textMuted }]} />
                          <Text style={[styles.featureText, { color: isActive ? colors.text : colors.textSecondary }]}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Active features for current tier */}
        <View style={[styles.activeCard, { backgroundColor: colors.card, borderColor: `${currentCard.color}30` }]}>
          <Text style={[styles.activeCardTitle, { color: currentCard.color }]}>{currentCard.label} — Active Features</Text>
          {activeFeatures.map((item, i) => (
            <View key={i} style={styles.featureRow}>
              {item.active ? (
                <CheckCircle size={14} color={currentCard.color} />
              ) : (
                <X size={14} color={colors.textMuted} />
              )}
              <Text style={[styles.activeFeatureText, { color: item.active ? colors.text : colors.textMuted }]}>
                {item.label}
                {!item.active && item.requiredTier ? (
                  <Text style={{ color: "#FFD700" }}>
                    {" "}(Upgrade to Premium — $19.99/mo)
                  </Text>
                ) : null}
              </Text>
            </View>
          ))}
        </View>

        {/* Upgrade CTA for free users */}
        {currentTier === "free" && (
          <TouchableOpacity
            style={[styles.upgradeBtn, { backgroundColor: "rgba(255,215,0,0.1)", borderColor: "#FFD700" }]}
            onPress={() => router.push("/subscription" as any)}
            activeOpacity={0.8}
          >
            <Star size={15} color="#FFD700" fill="#FFD700" />
            <Text style={[styles.upgradeBtnText, { color: "#FFD700" }]}>⭐ Upgrade to Premium — $19.99/mo</Text>
          </TouchableOpacity>
        )}

        {/* Admin */}
        {user?.isAdmin && (
          <>
            <Text style={[styles.adminLabel, { color: colors.textMuted }]}>ADMIN</Text>
            <TouchableOpacity
              style={[styles.rowBtn, { backgroundColor: "rgba(168,85,247,0.08)", borderColor: "rgba(168,85,247,0.35)" }]}
              onPress={() => router.push("/admin")}
              activeOpacity={0.8}
            >
              <Shield size={18} color="#A855F7" />
              <Text style={[styles.rowBtnText, { color: "#A855F7" }]}>Admin Panel</Text>
              <ChevronRight size={16} color="#A855F7" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rowBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => router.push("/setup")}
              activeOpacity={0.8}
            >
              <Settings size={18} color={colors.textSecondary} />
              <Text style={[styles.rowBtnText, { color: colors.text }]}>API Keys Setup Guide</Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        )}

        {/* Legal */}
        <Text style={[styles.adminLabel, { color: colors.textMuted }]}>LEGAL</Text>
        <TouchableOpacity
          style={[styles.rowBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => router.push("/terms-of-service" as any)}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 16 }}>📄</Text>
          <Text style={[styles.rowBtnText, { color: colors.text }]}>Terms of Service</Text>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rowBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => router.push("/privacy-policy" as any)}
          activeOpacity={0.8}
        >
          <Shield size={18} color={colors.textSecondary} />
          <Text style={[styles.rowBtnText, { color: colors.text }]}>Privacy Policy</Text>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rowBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => router.push("/responsible-gambling" as any)}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 16 }}>🛡️</Text>
          <Text style={[styles.rowBtnText, { color: colors.text }]}>Responsible Gambling</Text>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rowBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => { /* open email */ }}
          activeOpacity={0.8}
        >
          <Mail size={18} color={colors.textSecondary} />
          <Text style={[styles.rowBtnText, { color: colors.text }]}>Contact Us</Text>
          <Text style={[styles.rowBtnSub, { color: colors.textMuted }]}>support@prediqsai.com</Text>
        </TouchableOpacity>

        {/* App Info */}
        <Text style={[styles.adminLabel, { color: colors.textMuted }]}>APP INFO</Text>
        <TouchableOpacity
          style={[styles.rowBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => router.push("/about")}
          activeOpacity={0.8}
        >
          <Info size={18} color={colors.textSecondary} />
          <Text style={[styles.rowBtnText, { color: colors.text }]}>About PrediQs AI</Text>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Account */}
        <Text style={[styles.adminLabel, { color: colors.textMuted }]}>ACCOUNT</Text>
        <TouchableOpacity
          style={[styles.rowBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogOut size={18} color="#FF4D4D" />
          <Text style={[styles.rowBtnText, { color: "#FF4D4D" }]}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleVersionTap} activeOpacity={0.8}>
          <Text style={[styles.footer, { color: versionTaps > 0 ? colors.cyan : colors.textMuted }]}>
            PrediQs AI v1.0 — Beta{versionTaps > 0 ? ` (${7 - versionTaps} more…)` : ""}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Secret Admin Password Modal */}
      <Modal visible={showSecretModal} transparent animationType="fade">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: "rgba(168,85,247,0.4)" }]}>
            <Shield size={28} color="#A855F7" />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Admin Access</Text>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>Enter the admin password to continue</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              secureTextEntry
              placeholder="Admin password"
              placeholderTextColor={colors.textMuted}
              value={secretPassword}
              onChangeText={setSecretPassword}
              onSubmitEditing={handleSecretLogin}
              autoFocus
            />
            {secretError ? <Text style={styles.modalError}>{secretError}</Text> : null}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setShowSecretModal(false)}
              >
                <Text style={{ color: colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#A855F7", borderColor: "#A855F7", opacity: secretLoading ? 0.7 : 1 }]}
                onPress={handleSecretLogin}
                disabled={secretLoading}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>{secretLoading ? "Checking…" : "Enter"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  pageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  pageTitle: { fontSize: 22, letterSpacing: -0.4 },
  betaBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  betaText: { flex: 1, gap: 3 },
  betaTitle: { fontSize: 14 },
  betaSub: { fontSize: 12, lineHeight: 17 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  avatarText: { fontSize: 20 },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontSize: 16 },
  profileEmail: { fontSize: 12 },
  tierPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  tierPillText: { fontSize: 11, letterSpacing: 0.5 },
  sectionLabel: { gap: 4 },
  devBadge: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  devBadgeText: { fontSize: 10, letterSpacing: 0.5 },
  sectionTitle: { fontSize: 17 },
  sectionSub: { fontSize: 12, lineHeight: 17 },
  billingToggle: { flexDirection: "row", borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
  toggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 10 },
  toggleBtnText: { fontSize: 13 },
  savePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  savePillText: { fontSize: 10, letterSpacing: 0.3 },
  tierGrid: { gap: 10 },
  tierCard: { padding: 16, borderRadius: 16, gap: 4 },
  tierCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  tierCardLabel: { fontSize: 18, letterSpacing: 0.5 },
  cardHeaderRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  popularBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  popularBadgeText: { fontSize: 9, letterSpacing: 0.4 },
  activeCheck: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tierCardPrice: { fontSize: 18, letterSpacing: -0.3, marginBottom: 2 },
  annualSave: { fontSize: 11, marginBottom: 2 },
  annualHint: { fontSize: 11, marginBottom: 4 },
  tierFeatures: { gap: 5, marginTop: 6 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureDot: { width: 5, height: 5, borderRadius: 2.5, flexShrink: 0 },
  featureText: { fontSize: 12, flex: 1 },
  activeCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  activeCardTitle: { fontSize: 13, letterSpacing: 0.3, marginBottom: 2 },
  activeFeatureText: { fontSize: 13, flex: 1 },
  upgradeRow: { gap: 8 },
  upgradeBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 14, borderWidth: 1 },
  upgradeBtnText: { flex: 1, fontSize: 13 },
  adminLabel: { fontSize: 11, letterSpacing: 1, marginTop: 4 },
  rowBtn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  rowBtnText: { flex: 1, fontSize: 15 },
  rowBtnSub: { fontSize: 12 },
  footer: { fontSize: 11, textAlign: "center", marginTop: 8, paddingVertical: 6 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: 32 },
  modalCard: { width: "100%", maxWidth: 360, borderRadius: 20, borderWidth: 1, padding: 28, alignItems: "center", gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  modalSub: { fontSize: 13, textAlign: "center" },
  modalInput: { width: "100%", borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  modalError: { fontSize: 13, color: "#FF4D4D" },
  modalBtns: { flexDirection: "row", gap: 12, width: "100%", marginTop: 4 },
  modalBtn: { flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: 12, borderWidth: 1 },
});
