import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.cyan }]}>{title}</Text>
      {children}
    </View>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return <Text style={[styles.body, { color: colors.textSecondary }]}>{children}</Text>;
}

function BulletList({ items }: { items: string[] }) {
  const colors = useColors();
  return (
    <View style={styles.list}>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={[styles.bullet, { color: colors.cyan }]}>•</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export default function TermsOfServiceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + topPaddingWeb;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerIcon}>📄</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Terms of Service</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.updated, { color: colors.textMuted }]}>Last updated: May 20, 2026</Text>

        <View style={[styles.importantBanner, { backgroundColor: "rgba(255,215,0,0.07)", borderColor: "rgba(255,215,0,0.3)" }]}>
          <Text style={[styles.importantText, { color: colors.gold }]}>
            ⚠️ PrediQs AI is for educational and informational purposes ONLY. We do not accept bets or wagers. All analysis is educational.
          </Text>
        </View>

        <Section title="1. Acceptance of Terms">
          <Body>
            By using PrediQs AI you agree to these Terms of Service. If you do not agree please do not use the app.
          </Body>
        </Section>

        <Section title="2. Description of Service">
          <Body>PrediQs AI is an educational sports intelligence platform. We provide:</Body>
          <BulletList items={[
            "AI-powered match analysis",
            "Statistical probability scores",
            "Odds comparison education",
            "Sports betting educational content",
            "Bankroll management education",
          ]} />
          <Body>We do NOT provide:</Body>
          <BulletList items={[
            "Gambling or betting services",
            "Financial or investment advice",
            "Guaranteed winning predictions",
            "Real money wagering",
          ]} />
        </Section>

        <Section title="3. Eligibility">
          <Body>To use PrediQs AI you must:</Body>
          <BulletList items={[
            "Be at least 18 years old",
            "Have legal capacity to enter into agreements",
            "Ensure sports betting is legal in your jurisdiction",
            "Not be located in a restricted jurisdiction",
          ]} />
        </Section>

        <Section title="4. Educational Purpose Only">
          <Body>
            ALL content on PrediQs AI is provided for EDUCATIONAL and INFORMATIONAL purposes ONLY.{"\n\n"}
            Nothing on PrediQs AI constitutes betting advice, gambling advice, financial advice, investment advice, or a recommendation to place any bet or wager.{"\n\n"}
            Past prediction accuracy does not guarantee future results. Sports outcomes are inherently uncertain.
          </Body>
        </Section>

        <Section title="5. User Responsibilities">
          <Body>You are solely responsible for:</Body>
          <BulletList items={[
            "Your own betting decisions",
            "Ensuring betting is legal in your jurisdiction",
            "Betting within your means",
            "Understanding the risks of sports betting",
            "Any losses incurred",
          ]} />
        </Section>

        <Section title="6. Subscription Terms">
          <Body>Free tier: Available at no cost with limited features.{"\n\n"}Premium subscription: $29.99/month or $319/year, auto-renews unless cancelled, cancel anytime in settings, access to all features.{"\n\n"}Lifetime access: One-time payment $299, permanent access, no recurring charges.</Body>
        </Section>

        <Section title="7. Refund Policy">
          <Body>
            Digital subscriptions are generally non-refundable. Exceptions may be made for technical issues preventing access, duplicate charges, or charges after cancellation.{"\n\n"}Refund requests: support@prediqsai.com
          </Body>
        </Section>

        <Section title="8. Prohibited Uses">
          <Body>You may not:</Body>
          <BulletList items={[
            "Resell or redistribute our predictions",
            "Use bots or automated tools to scrape data",
            "Share your account login",
            "Attempt to hack or compromise the platform",
            "Use for illegal purposes",
            "Violate any applicable laws",
          ]} />
        </Section>

        <Section title="9. Intellectual Property">
          <Body>
            All content, predictions, analysis, branding and technology on PrediQs AI is owned by PrediQs AI. You may not copy, reproduce or distribute our content without written permission.
          </Body>
        </Section>

        <Section title="10. Limitation of Liability">
          <Body>PrediQs AI and its operators are NOT liable for:</Body>
          <BulletList items={[
            "Any betting losses",
            "Financial losses of any kind",
            "Inaccurate predictions",
            "Technical downtime",
            "Third party actions",
            "Any indirect damages",
          ]} />
          <Body>Our maximum liability is limited to the amount you paid us in the last 30 days.</Body>
        </Section>

        <Section title="11. Responsible Gambling">
          <Body>
            We promote responsible gambling. If you need help:{"\n\n"}
            🇺🇸 USA: ncpgambling.org · 1-800-522-4700{"\n"}
            🇬🇧 UK: gamcare.org.uk · begambleaware.org{"\n"}
            🌍 Global: gamblingtherapy.org{"\n\n"}
            Please gamble responsibly. Never bet more than you can afford to lose.
          </Body>
        </Section>

        <Section title="12. Changes to Terms">
          <Body>
            We reserve the right to modify these terms at any time. Continued use of the app constitutes acceptance of updated terms.
          </Body>
        </Section>

        <Section title="13. Governing Law">
          <Body>
            These terms are governed by applicable laws. Disputes will be resolved through binding arbitration.
          </Body>
        </Section>

        <Section title="14. Contact">
          <Body>
            Legal: legal@prediqsai.com{"\n"}
            Support: support@prediqsai.com{"\n"}
            Privacy: privacy@prediqsai.com
          </Body>
        </Section>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            PrediQs AI · Educational Purposes Only · 18+
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerIcon: { fontSize: 18 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  content: { padding: 20, gap: 4, paddingBottom: 40 },
  updated: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8, textAlign: "center" },
  importantBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  importantText: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  section: { marginBottom: 20, gap: 8 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.3, textTransform: "uppercase" },
  body: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  list: { gap: 5, paddingLeft: 4 },
  bulletRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  bullet: { fontSize: 14, lineHeight: 22, fontFamily: "Inter_700Bold" },
  bulletText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  footer: { borderTopWidth: 1, paddingTop: 20, marginTop: 12, alignItems: "center" },
  footerText: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
});
