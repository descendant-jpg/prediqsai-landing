import { ArrowLeft, Check, RefreshCw, Shield, Star, Zap } from "lucide-react-native";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
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

import { useIAP } from "@/context/IAPContext";
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
  const { subscribe, restore, isLoading, error, clearError } = useIAP();
  const { profile } = useApp();

  const isPremium = profile.tier === "premium";

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

        {/* Price card */}
        {!isPremium && (
          <View style={[styles.priceCard, { backgroundColor: "rgba(255,215,0,0.06)", borderColor: "rgba(255,215,0,0.25)" }]}>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: "#FFD700" }]}>$39.99</Text>
              <Text style={[styles.pricePer, { color: colors.textSecondary }]}>/month</Text>
            </View>
            <Text style={[styles.priceSub, { color: colors.textMuted }]}>
              Charged monthly · Cancel anytime via App Store or Google Play
            </Text>
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
                { backgroundColor: "#FFD700", opacity: isLoading ? 0.75 : 1 },
              ]}
              onPress={subscribe}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#070B12" size="small" />
              ) : (
                <>
                  <Zap size={18} color="#070B12" fill="#070B12" />
                  <Text style={styles.subscribeBtnText}>Subscribe — $39.99/mo</Text>
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
  priceCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  price: { fontSize: 38, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  pricePer: { fontSize: 16 },
  priceSub: { fontSize: 12, textAlign: "center", lineHeight: 17 },
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
