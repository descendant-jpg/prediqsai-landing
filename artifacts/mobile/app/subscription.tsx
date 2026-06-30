import { ArrowLeft, Check, RefreshCw, Shield, Star, Zap } from "lucide-react-native";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIAP, type TierKey } from "@/context/IAPContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

// ─── Feature list ─────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: "⚡", label: "Unlimited AI picks — all sports & leagues" },
  { icon: "🧠", label: "Full AI reasoning + confidence breakdown" },
  { icon: "📊", label: "ARB Scanner across 40+ bookmakers" },
  { icon: "📝", label: "Slip Analyzer (unlimited bet slips)" },
  { icon: "💬", label: "Unlimited Oracle AI conversations" },
  { icon: "📈", label: "Kelly Criterion + ROI performance charts" },
  { icon: "⚽", label: "Full H2H stats, match detail & form" },
  { icon: "🏆", label: "World Cup 2026 full predictions & coverage" },
  { icon: "🔔", label: "All alerts — value bets, arbitrage, injury news" },
  { icon: "🛡️", label: "Priority support" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SubscriptionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { subscribe, restore, isLoading, error, clearError, productsReady, tiers, iapSupported } =
    useIAP();
  const { profile } = useApp();

  const isPremium = profile.tier === "premium";

  const [selectedTier, setSelectedTier] = useState<TierKey>("monthly");
  const activeTier = tiers.find((t) => t.key === selectedTier) ?? tiers[0];

  // Only block the button when IAP is genuinely available but offerings failed
  // to load. On web / Expo Go we leave it enabled so the explanatory alert fires.
  const offeringsUnavailable = iapSupported && !productsReady;
  const ctaDisabled = isLoading || offeringsUnavailable;

  useEffect(() => {
    clearError();
  }, []);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ width: 22 }} />
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.iconRing, { borderColor: "rgba(255,215,0,0.35)", backgroundColor: "rgba(255,215,0,0.08)" }]}>
            <Star size={36} color="#FFD700" fill="#FFD700" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>PrediQs AI Premium</Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            The full power of AI sports intelligence, in your pocket
          </Text>
        </View>

        {/* Already premium */}
        {isPremium && (
          <View style={[styles.alreadyCard, { backgroundColor: "rgba(0,255,148,0.06)", borderColor: "rgba(0,255,148,0.2)" }]}>
            <Check size={18} color="#00FF94" />
            <Text style={[styles.alreadyText, { color: "#00FF94" }]}>
              You already have Premium — all features are active
            </Text>
          </View>
        )}

        {/* Features */}
        <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.featureCardTitle, { color: colors.textMuted }]}>EVERYTHING INCLUDED</Text>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={[styles.featureText, { color: colors.text }]}>{f.label}</Text>
              <Check size={14} color="#00FF94" />
            </View>
          ))}
        </View>

        {/* Plan selector */}
        {!isPremium && (
          <View style={styles.tierList}>
            {tiers.map((tier) => {
              const selected = tier.key === selectedTier;
              return (
                <TouchableOpacity
                  key={tier.key}
                  style={[
                    styles.tierBox,
                    {
                      backgroundColor: selected ? "rgba(255,215,0,0.06)" : colors.card,
                      borderColor: selected ? "#FFD700" : colors.cardBorder,
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSelectedTier(tier.key)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      { borderColor: selected ? "#FFD700" : colors.textMuted },
                    ]}
                  >
                    {selected && <View style={styles.radioInner} />}
                  </View>

                  <View style={styles.tierInfo}>
                    <View style={styles.tierLabelRow}>
                      <Text style={[styles.tierLabel, { color: colors.text }]}>{tier.label}</Text>
                      {tier.saveLabel && (
                        <View style={styles.saveBadge}>
                          <Text style={styles.saveText}>{tier.saveLabel}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.tierPriceCol}>
                    <Text style={[styles.tierPrice, { color: "#FFD700" }]}>{tier.price}</Text>
                    <Text style={[styles.tierPeriod, { color: colors.textMuted }]}>
                      {tier.periodLabel}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Error */}
        {error ? (
          <View style={[styles.errorCard, { backgroundColor: "rgba(255,77,77,0.08)", borderColor: "rgba(255,77,77,0.25)" }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* CTA */}
        {!isPremium && (
          <>
            <TouchableOpacity
              style={[
                styles.subscribeBtn,
                { backgroundColor: "#FFD700", opacity: ctaDisabled ? 0.55 : 1 },
              ]}
              onPress={() => subscribe(selectedTier)}
              disabled={ctaDisabled}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#070B12" size="small" />
              ) : offeringsUnavailable ? (
                <Text style={styles.subscribeBtnText}>Subscription unavailable</Text>
              ) : (
                <>
                  <Zap size={18} color="#070B12" fill="#070B12" />
                  <Text style={styles.subscribeBtnText}>
                    Subscribe — {activeTier?.price}
                    {activeTier?.buttonPeriod}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restoreBtn}
              onPress={restore}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <RefreshCw size={14} color={colors.textMuted} />
              <Text style={[styles.restoreText, { color: colors.textMuted }]}>
                Restore Previous Purchase
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Trust badges */}
        <View style={styles.trustRow}>
          {["Secure billing", "Cancel anytime", "No hidden fees"].map((t) => (
            <View key={t} style={[styles.trustBadge, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Shield size={11} color={colors.textMuted} />
              <Text style={[styles.trustText, { color: colors.textMuted }]}>{t}</Text>
            </View>
          ))}
        </View>

        {/* Legal */}
        <Text style={[styles.legal, { color: colors.textMuted }]}>
          Subscription auto-renews monthly unless cancelled at least 24 hours before the end of the
          billing period. Manage or cancel in your App Store or Google Play account settings.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  hero: { alignItems: "center", gap: 10, paddingVertical: 16 },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.5 },
  heroSub: { fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 280 },
  alreadyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  alreadyText: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  featureCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  featureCardTitle: { fontSize: 11, letterSpacing: 1, fontFamily: "Inter_700Bold", marginBottom: 2 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureIcon: { fontSize: 16, width: 22, textAlign: "center" },
  featureText: { flex: 1, fontSize: 13, lineHeight: 18 },
  tierList: { gap: 10 },
  tierBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 16,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFD700",
  },
  tierInfo: { flex: 1 },
  tierLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  tierLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  saveBadge: {
    backgroundColor: "rgba(0,255,148,0.12)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  saveText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#00FF94" },
  tierPriceCol: { alignItems: "flex-end" },
  tierPrice: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  tierPeriod: { fontSize: 12, marginTop: 1 },
  errorCard: { borderRadius: 12, borderWidth: 1, padding: 12 },
  errorText: { fontSize: 13, color: "#FF4D4D", textAlign: "center" },
  subscribeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 17,
    borderRadius: 16,
  },
  subscribeBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#070B12",
    letterSpacing: 0.2,
  },
  restoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  restoreText: { fontSize: 13 },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  trustText: { fontSize: 11 },
  legal: { fontSize: 11, textAlign: "center", lineHeight: 16, paddingHorizontal: 8 },
});
