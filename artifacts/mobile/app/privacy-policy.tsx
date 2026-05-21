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

export default function PrivacyPolicyScreen() {
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
          <Text style={styles.headerIcon}>🔒</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.updated, { color: colors.textMuted }]}>Last updated: May 20, 2026</Text>

        <Section title="1. Who We Are">
          <Body>
            PrediQs AI is an educational sports intelligence platform. We provide AI-powered sports analysis for informational and educational purposes only.{"\n\n"}
            Contact: privacy@prediqsai.com{"\n"}Website: prediqsai.com
          </Body>
        </Section>

        <Section title="2. Information We Collect">
          <Body>When you create an account:</Body>
          <BulletList items={["Full name and username", "Email address", "Country of residence", "Betting experience level", "How you found us"]} />
          <Body>When you use the app:</Body>
          <BulletList items={["Sports preferences", "Predictions you view", "Paper bets you place", "Slip analyses you run", "AI chat messages", "App usage patterns", "Device type (iOS/Android)", "App version"]} />
          <Body>We do NOT collect:</Body>
          <BulletList items={["Real betting account details", "Bank or payment information", "Government ID or documents", "Location/GPS data", "Contacts or phone book"]} />
        </Section>

        <Section title="3. How We Use Your Data">
          <BulletList items={[
            "Provide AI sports predictions",
            "Personalize your experience",
            "Send push notifications",
            "Improve prediction accuracy",
            "Process subscription payments",
            "Respond to support requests",
            "Prevent fraud and abuse",
            "Comply with legal obligations",
          ]} />
        </Section>

        <Section title="4. Third Party Services">
          <Body>We use these trusted services:</Body>
          <BulletList items={[
            "AI Analysis: Anthropic (claude.ai)",
            "Sports Data: API-Sports",
            "Odds Data: The Odds API",
            "News Data: NewsAPI",
            "Weather Data: WeatherAPI",
            "Push Notifications: OneSignal",
            "Email Service: Resend",
            "Analytics: Google Analytics",
            "Payments: Apple/Google/Paystack",
          ]} />
          <Body>Each service has their own privacy policy governing their use of data.</Body>
        </Section>

        <Section title="5. Data Storage">
          <Body>
            Your data is stored securely on encrypted servers. We use industry-standard security measures to protect your information.{"\n\n"}
            Data is retained while your account is active. Upon account deletion your data is permanently removed within 30 days.
          </Body>
        </Section>

        <Section title="6. Your Rights">
          <Body>You have the right to:</Body>
          <BulletList items={[
            "Access your personal data",
            "Correct inaccurate data",
            "Delete your account and data",
            "Export your data",
            "Opt out of marketing emails",
            "Opt out of push notifications",
          ]} />
          <Body>To exercise these rights contact: privacy@prediqsai.com</Body>
        </Section>

        <Section title="7. Children's Privacy">
          <Body>
            PrediQs AI is not intended for anyone under 18 years of age. We do not knowingly collect data from minors. If you believe a minor has registered please contact us immediately.
          </Body>
        </Section>

        <Section title="8. Gambling Disclaimer">
          <Body>
            PrediQs AI does not facilitate real money gambling. We provide educational sports analysis only. Any betting decisions made using our analysis are entirely the user's own responsibility.
          </Body>
        </Section>

        <Section title="9. Changes to This Policy">
          <Body>
            We may update this policy periodically. We will notify you of significant changes via email or in-app notification.
          </Body>
        </Section>

        <Section title="10. Contact Us">
          <Body>Questions about this policy?{"\n"}Email: privacy@prediqsai.com</Body>
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
  updated: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 12, textAlign: "center" },
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
