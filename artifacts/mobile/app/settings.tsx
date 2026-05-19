import { ArrowLeft, Check, CheckCircle, ChevronRight, Code2, Crown, LogOut, Settings, Star, X, Zap } from "lucide-react-native";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

type Tier = "free" | "pro" | "elite";

// ─── Pricing constants (single source of truth) ───────────────────────────────

export const TIER_PRICING = {
  free:  { monthly: 0,      annual: 0,   annualSave: 0 },
  pro:   { monthly: 14.99,  annual: 99,  annualSave: 80.88 },
  elite: { monthly: 39.99,  annual: 299, annualSave: 179.89 },
} as const;

export const UPGRADE_PRICE: Record<Tier, string> = {
  free:  "$0",
  pro:   "$14.99/mo",
  elite: "$39.99/mo",
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
    label: "FREE",
    color: "#94A3B8",
    badge: null,
    badgeIcon: null,
    cardFeatures: [
      "3 picks/day (soccer only)",
      "Basic confidence %",
      "1 Don't Bet warning/day",
      "5 AI messages/day",
      "5 paper bets max",
    ],
  },
  {
    key: "pro",
    label: "PRO",
    color: "#00E5FF",
    badge: "MOST POPULAR",
    badgeIcon: "star",
    cardFeatures: [
      "Unlimited picks all sports",
      "3 model consensus (StatIQ + PatternAI + PulseAI)",
      "Full AI reasoning & explanation",
      "Value bet detection",
      "Sharp money alerts",
      "50 AI messages/day",
      "Bet slip analyzer (5/day)",
    ],
  },
  {
    key: "elite",
    label: "ELITE",
    color: "#FFD700",
    badge: "BEST ROI",
    badgeIcon: "crown",
    cardFeatures: [
      "Everything in Pro",
      "All 5 AI models (+ SharpIQ + ContextAI)",
      "Live in-game momentum AI",
      "Arbitrage opportunity scanner",
      "Voice AI assistant",
      "Unlimited everything",
      "PDF exports & API access",
    ],
  },
];

// ─── Active features per tier ─────────────────────────────────────────────────

type FeatureItem = { label: string; active: boolean; requiredTier?: "pro" | "elite" };

const TIER_ACTIVE_FEATURES: Record<Tier, FeatureItem[]> = {
  free: [
    { label: "3 picks per day (soccer only)", active: true },
    { label: "Basic confidence meter", active: true },
    { label: "1 Don't Bet warning", active: true },
    { label: "5 AI messages", active: true },
    { label: "5 paper bets", active: true },
    { label: "View leaderboard", active: true },
    { label: "Full AI reasoning", active: false, requiredTier: "pro" },
    { label: "Value bets", active: false, requiredTier: "pro" },
    { label: "Slip analyzer", active: false, requiredTier: "pro" },
    { label: "Live momentum AI", active: false, requiredTier: "elite" },
    { label: "Voice AI", active: false, requiredTier: "elite" },
  ],
  pro: [
    { label: "Unlimited picks all sports", active: true },
    { label: "3 model consensus", active: true },
    { label: "Full AI reasoning", active: true },
    { label: "Value bet detection", active: true },
    { label: "Line movement alerts", active: true },
    { label: "Sharp money signals", active: true },
    { label: "Kelly criterion calculator", active: true },
    { label: "AI assistant (50/day)", active: true },
    { label: "Slip analyzer (5/day)", active: true },
    { label: "Unlimited paper bets", active: true },
    { label: "Weather analysis", active: true },
    { label: "Injury scanner", active: true },
    { label: "Push notifications", active: true },
    { label: "Live momentum AI", active: false, requiredTier: "elite" },
    { label: "Arbitrage scanner", active: false, requiredTier: "elite" },
    { label: "Voice AI", active: false, requiredTier: "elite" },
    { label: "All 5 models", active: false, requiredTier: "elite" },
  ],
  elite: [
    { label: "Everything in Pro", active: true },
    { label: "StatIQ model", active: true },
    { label: "PatternAI model", active: true },
    { label: "PulseAI model", active: true },
    { label: "SharpIQ model", active: true },
    { label: "ContextAI model", active: true },
    { label: "Full model breakdown", active: true },
    { label: "Live momentum AI", active: true },
    { label: "Goal probability tracker", active: true },
    { label: "Arbitrage scanner", active: true },
    { label: "CLV tracker", active: true },
    { label: "Referee analysis", active: true },
    { label: "Fatigue scoring", active: true },
    { label: "Voice AI assistant", active: true },
    { label: "Unlimited AI chat", active: true },
    { label: "Unlimited slip analyses", active: true },
    { label: "Syndicate room", active: true },
    { label: "WhatsApp alerts", active: true },
    { label: "PDF exports", active: true },
    { label: "API access", active: true },
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

  const currentTier = (user?.tier ?? "free") as Tier;
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

        {/* Beta banner */}
        <View style={[styles.betaBanner, { backgroundColor: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.25)" }]}>
          <Zap size={16} color="#00E5FF" />
          <View style={styles.betaText}>
            <Text style={[styles.betaTitle, { color: "#00E5FF" }]}>Beta Access — Full Features Unlocked</Text>
            <Text style={[styles.betaSub, { color: colors.textSecondary }]}>
              Payment coming soon. Enjoy full access during beta — no credit card needed.
            </Text>
          </View>
        </View>

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

        {/* Dev mode label */}
        <View style={styles.sectionLabel}>
          <View style={[styles.devBadge, { backgroundColor: "rgba(255,107,53,0.12)", borderColor: "rgba(255,107,53,0.3)" }]}>
            <Code2 size={11} color="#FF6B35" />
            <Text style={[styles.devBadgeText, { color: "#FF6B35" }]}>DEV MODE</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tier Simulator</Text>
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
            Switch tiers to test gated features — no payment required during development
          </Text>
        </View>

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
              <Text style={[styles.savePillText, { color: annualMode ? colors.background : "#00FF94" }]}>Save up to 45%</Text>
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
                    borderColor: isActive ? tier.color : tier.key === "free" ? "#94A3B8" : tier.key === "pro" ? "#00E5FF" : "#FFD700",
                    borderWidth: isActive ? 2 : 1,
                    opacity: isChangingTier && !isActive ? 0.6 : 1,
                  },
                ]}
                onPress={() => handleSetTier(tier.key)}
                disabled={isChangingTier || isActive}
                activeOpacity={0.8}
              >
                {/* Card header row */}
                <View style={styles.tierCardHeader}>
                  <Text style={[styles.tierCardLabel, { color: isActive ? tier.color : colors.text }]}>{tier.label}</Text>
                  <View style={styles.cardHeaderRight}>
                    {tier.badge && (
                      <View style={[styles.popularBadge, { backgroundColor: tier.key === "pro" ? "rgba(0,229,255,0.15)" : "rgba(255,215,0,0.15)", borderColor: tier.color }]}>
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

                {/* Price */}
                <Text style={[styles.tierCardPrice, { color: isActive ? tier.color : colors.text }]}>{priceLabel(tier.key)}</Text>
                {save && (
                  <Text style={[styles.annualSave, { color: "#00FF94" }]}>{save}</Text>
                )}
                {tier.key === "pro" && !annualMode && (
                  <Text style={[styles.annualHint, { color: colors.textMuted }]}>$99/year — save 45%</Text>
                )}
                {tier.key === "elite" && !annualMode && (
                  <Text style={[styles.annualHint, { color: colors.textMuted }]}>$299/year — save 38%</Text>
                )}

                {/* Feature dots */}
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
                  <Text style={{ color: item.requiredTier === "elite" ? "#FFD700" : "#00E5FF" }}>
                    {" "}({item.requiredTier === "elite" ? `Upgrade to Elite — $39.99/mo` : `Upgrade to Pro — $14.99/mo`})
                  </Text>
                ) : null}
              </Text>
            </View>
          ))}
        </View>

        {/* Upgrade CTAs for non-elite users */}
        {currentTier === "free" && (
          <View style={styles.upgradeRow}>
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: "rgba(0,229,255,0.1)", borderColor: "#00E5FF" }]}
              onPress={() => handleSetTier("pro")}
              activeOpacity={0.8}
            >
              <Zap size={15} color="#00E5FF" />
              <Text style={[styles.upgradeBtnText, { color: "#00E5FF" }]}>🔒 Upgrade to Pro — $14.99/mo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: "rgba(255,215,0,0.08)", borderColor: "#FFD700" }]}
              onPress={() => handleSetTier("elite")}
              activeOpacity={0.8}
            >
              <Crown size={15} color="#FFD700" />
              <Text style={[styles.upgradeBtnText, { color: "#FFD700" }]}>🔒 Upgrade to Elite — $39.99/mo</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentTier === "pro" && (
          <TouchableOpacity
            style={[styles.upgradeBtn, { backgroundColor: "rgba(255,215,0,0.08)", borderColor: "#FFD700" }]}
            onPress={() => handleSetTier("elite")}
            activeOpacity={0.8}
          >
            <Crown size={15} color="#FFD700" />
            <Text style={[styles.upgradeBtnText, { color: "#FFD700" }]}>👑 Upgrade to Elite — $39.99/mo</Text>
          </TouchableOpacity>
        )}

        {/* Admin */}
        {user?.id === 1 && (
          <>
            <Text style={[styles.adminLabel, { color: colors.textMuted }]}>ADMIN</Text>
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

        <Text style={[styles.footer, { color: colors.textMuted }]}>PrediQs AI v1.0 — Beta</Text>
      </ScrollView>
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
  footer: { fontSize: 11, textAlign: "center", marginTop: 8 },
});
