import {
  Bell,
  BookOpen,
  ChevronRight,
  ExternalLink,
  Globe,
  HelpCircle,
  LifeBuoy,
  Lock,
  LogOut,
  Mail,
  MessageSquare,
  Percent,
  PlayCircle,
  Settings,
  Shield,
  Star,
  Users,
} from "lucide-react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { LANGUAGES, useLanguage } from "@/context/LanguageContext";
import { useNotifications } from "@/context/NotificationsContext";

const TIER_COLORS: Record<string, string> = {
  free:    "#94A3B8",
  premium: "#FFD700",
};

const BETTING_EXPERIENCE_OPTIONS = [
  { key: "Beginner",     i18nKey: "beginner" },
  { key: "Intermediate", i18nKey: "intermediate" },
  { key: "Advanced",     i18nKey: "advanced" },
  { key: "Professional", i18nKey: "professional" },
] as const;

const SOCIAL_LINKS = [
  { name: "Facebook",      icon: "facebook",  color: "#1877F2", url: "https://facebook.com/prediqsai" },
  { name: "Telegram",      icon: "telegram",  color: "#229ED9", url: "https://t.me/prediqsai" },
  { name: "X (Twitter)",   icon: "twitter",   color: "#FFFFFF", url: "https://x.com/prediqsai" },
  { name: "Instagram",     icon: "instagram", color: "#E1306C", url: "https://instagram.com/prediqsai" },
  { name: "TikTok",        icon: "tiktok",    color: "#FFFFFF", url: "https://tiktok.com/@prediqsai" },
  { name: "YouTube",       icon: "youtube",   color: "#FF0000", url: "https://youtube.com/@prediqsai" },
] as const;

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
      {title.toUpperCase()}
    </Text>
  );
}

function SettingRow({
  icon: Icon,
  iconColor,
  label,
  value,
  onPress,
  danger,
  right,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  iconColor?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  const colors = useColors();
  const ic = iconColor ?? colors.textSecondary;
  return (
    <TouchableOpacity
      style={[styles.settingRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.settingIconWrap, { backgroundColor: `${danger ? colors.red : ic}18` }]}>
        <Icon size={16} color={danger ? colors.red : ic} />
      </View>
      <Text style={[styles.settingLabel, { color: danger ? colors.red : colors.text }]}>
        {label}
      </Text>
      <View style={styles.settingRight}>
        {value ? (
          <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{value}</Text>
        ) : null}
        {right ?? null}
        {onPress && !right ? <ChevronRight size={14} color={colors.textMuted} /> : null}
      </View>
    </TouchableOpacity>
  );
}

function SettingGroup({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.settingGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { language, setLanguage, t, locale } = useLanguage();
  const { unreadCount } = useNotifications();
  const { bettingExperience, setBettingExperience } = useApp();

  const [copied, setCopied] = useState(false);
  const [showLangModal, setShowLangModal]   = useState(false);
  const [showExpModal, setShowExpModal]     = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding    = insets.top + topPaddingWeb;

  const tier      = (user as any)?.tier ?? "free";
  const tierColor = TIER_COLORS[tier] ?? TIER_COLORS.free;
  const username  = user?.username ?? user?.email?.split("@")[0] ?? "Bettor";
  const referral  = `https://prediqs.ai/ref/${user?.id ?? 0}`;
  const isAdmin   = user?.isAdmin ?? (user?.id ?? 0) === 1;

  function copyReferral() {
    Alert.alert("Referral Link", referral, [{ text: "OK" }]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  function handleContactUs() {
    Linking.openURL("mailto:support@prediqsai.com?subject=PrediqsAI Support").catch(() =>
      Alert.alert("Email", "Email us at support@prediqsai.com"),
    );
  }

  function handleTelegram() {
    Linking.openURL("https://t.me/prediqsai").catch(() =>
      Alert.alert("Telegram", "Find us at t.me/prediqsai"),
    );
  }

  function handleFollowUs() {
    setShowSocialModal(true);
  }

  async function openSocial(url: string) {
    try {
      await Linking.openURL(url);
      setShowSocialModal(false);
    } catch {
      if (Platform.OS === "web") {
        window.alert("Could not open link. Please try again.");
      } else {
        Alert.alert("Follow Us", "Could not open link. Please try again.");
      }
    }
  }

  return (
    <>
      <ScrollView
        key={locale}
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingTop: topPadding + 16, paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile card ── */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatarCircle, { backgroundColor: "rgba(0,229,255,0.15)" }]}>
            <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.accountInfo}>
            <Text style={[styles.displayName, { color: colors.text }]}>{username}</Text>
            <Text style={[styles.emailText,   { color: colors.textSecondary }]}>
              {user?.email ?? ""}
            </Text>
            <View style={styles.tierRow}>
              <View style={[styles.tierBadge, { backgroundColor: `${tierColor}20`, borderColor: `${tierColor}40` }]}>
                <Star size={11} color={tierColor} />
                <Text style={[styles.tierText, { color: tierColor }]}>{tier.toUpperCase()}</Text>
              </View>
              <TouchableOpacity
                style={[styles.upgradeBtn, { backgroundColor: "rgba(0,229,255,0.1)", borderColor: "rgba(0,229,255,0.25)" }]}
                onPress={() => router.push("/settings" as any)}
                activeOpacity={0.8}
              >
                <Text style={[styles.upgradeBtnText, { color: colors.cyan }]}>
                  {tier === "premium" ? t("profile.managePlan") : t("profile.upgrade")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Referral banner ── */}
        <View style={[styles.referralCard, { backgroundColor: "rgba(255,215,0,0.06)", borderColor: "rgba(255,215,0,0.2)" }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.referralTitle, { color: colors.gold }]}>{t("profile.invite")}</Text>
            <Text style={[styles.referralLink, { color: colors.textSecondary }]} numberOfLines={1}>
              {referral}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.copyBtn,
              {
                backgroundColor: copied ? "rgba(0,255,148,0.15)" : "rgba(255,215,0,0.15)",
                borderColor:     copied ? "rgba(0,255,148,0.35)" : "rgba(255,215,0,0.3)",
              },
            ]}
            onPress={copyReferral}
            activeOpacity={0.8}
          >
            <Text style={[styles.copyBtnText, { color: copied ? colors.green : colors.gold }]}>
              {copied ? t("profile.copied") : t("profile.copy")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats strip ── */}
        <View style={styles.statsStrip}>
          {[
            { label: t("profile.plan"),      value: tier.toUpperCase(),  color: tierColor            },
            { label: t("profile.status"),    value: t("profile.active"), color: colors.green         },
            { label: t("profile.referrals"), value: "0",                 color: colors.textSecondary },
          ].map((s) => (
            <View key={s.label} style={[styles.statCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statCellValue, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.statCellLabel, { color: colors.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Features ── */}
        <SectionHeader title={t("sections.features")} />
        <SettingGroup>
          <SettingRow
            icon={Bell}
            label={t("profile.notifications")}
            value={unreadCount > 0 ? t("profile.newCount", { count: unreadCount }) : undefined}
            onPress={() => router.push("/notification-settings" as any)}
          />
          <SettingRow
            icon={Globe}
            label={t("profile.language")}
            value={`${language.flag} ${language.name}`}
            onPress={() => setShowLangModal(true)}
          />
          <SettingRow
            icon={Percent}
            label={t("profile.bettingExperience")}
            value={t(`profile.expOptions.${
              BETTING_EXPERIENCE_OPTIONS.find((o) => o.key === bettingExperience)?.i18nKey ?? "beginner"
            }.label`)}
            onPress={() => setShowExpModal(true)}
          />
          <SettingRow
            icon={BookOpen}
            label={t("profile.learningHub")}
            onPress={() => router.push("/learning-hub" as any)}
          />
          <SettingRow
            icon={PlayCircle}
            iconColor={colors.cyan}
            label={t("profile.replayGuide")}
            onPress={() => router.push("/app-guide" as any)}
          />
          <SettingRow icon={Lock} label={t("profile.changePassword")} onPress={() => router.push("/change-password" as any)} />
        </SettingGroup>

        {/* ── Support ── */}
        <SectionHeader title={t("sections.support")} />
        <SettingGroup>
          <SettingRow
            icon={Mail}
            label={t("profile.contactUs")}
            onPress={handleContactUs}
          />
          <SettingRow
            icon={HelpCircle}
            label={t("profile.helpFaq")}
            onPress={() => router.push("/about" as any)}
          />
          <SettingRow
            icon={BookOpen}
            label={t("profile.appGuide")}
            onPress={() => router.push("/about" as any)}
          />
          <SettingRow
            icon={MessageSquare} label={t("profile.telegramCommunity")}
            right={<ExternalLink size={14} color="#3A5060" />}
            onPress={handleTelegram}
          />
          <SettingRow
            icon={Users} label={t("profile.followUs")}
            right={<ExternalLink size={14} color="#3A5060" />}
            onPress={handleFollowUs}
          />
        </SettingGroup>

        {/* ── Legal ── */}
        <SectionHeader title={t("sections.legal")} />
        <SettingGroup>
          <SettingRow
            icon={BookOpen}
            label={t("profile.termsOfService")}
            onPress={() => router.push("/terms-of-service" as any)}
          />
          <SettingRow
            icon={Shield}
            label={t("profile.privacyPolicy")}
            onPress={() => router.push("/privacy-policy" as any)}
          />
          <SettingRow
            icon={LifeBuoy}
            label={t("profile.responsibleGambling")}
            iconColor="#FF6B35"
            onPress={() => router.push("/responsible-gambling" as any)}
          />
        </SettingGroup>

        {/* ── Account Actions ── */}
        <SectionHeader title={t("sections.account")} />
        <SettingGroup>
          {isAdmin && (
            <SettingRow
              icon={Settings} label={t("profile.adminPanel")}
              iconColor={colors.gold}
              onPress={() => router.push("/setup" as any)}
            />
          )}
          <SettingRow icon={LogOut} label={t("profile.signOut")} danger onPress={handleLogout} />
        </SettingGroup>

        {/* ── App version ── */}
        <View style={styles.versionBlock}>
          <Text style={[styles.versionText,       { color: colors.textMuted }]}>PrediQs AI v1.0.0</Text>
          <Text style={[styles.versionDisclaimer, { color: colors.textMuted }]}>
            {t("profile.educationalOnly")}
          </Text>
        </View>
      </ScrollView>

      {/* ── Language Modal ── */}
      <Modal visible={showLangModal} transparent animationType="slide" onRequestClose={() => setShowLangModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowLangModal(false)} activeOpacity={1}>
          <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{t("profile.selectLanguage")}</Text>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(l) => l.code}
              style={{ maxHeight: 440 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.sheetRow,
                    { borderBottomColor: colors.border },
                    item.code === language.code && { backgroundColor: "rgba(255,215,0,0.06)" },
                  ]}
                  onPress={() => { setLanguage(item); setShowLangModal(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sheetRowFlag}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sheetRowName, { color: item.code === language.code ? "#FFD700" : colors.text }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.sheetRowNative, { color: colors.textMuted }]}>{item.nativeName}</Text>
                  </View>
                  {item.code === language.code && <Text style={{ color: "#FFD700", fontSize: 16 }}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Betting Experience Modal ── */}
      <Modal visible={showExpModal} transparent animationType="slide" onRequestClose={() => setShowExpModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowExpModal(false)} activeOpacity={1}>
          <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{t("profile.bettingExperience")}</Text>
            <Text style={[styles.sheetSub, { color: colors.textMuted }]}>
              {t("profile.bettingExperienceSub")}
            </Text>
            {BETTING_EXPERIENCE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.expRow,
                  { borderColor: colors.border, backgroundColor: colors.background },
                  bettingExperience === opt.key && { borderColor: "#FFD700", backgroundColor: "rgba(255,215,0,0.06)" },
                ]}
                onPress={() => { setBettingExperience(opt.key); setShowExpModal(false); }}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.expLabel, { color: bettingExperience === opt.key ? "#FFD700" : colors.text }]}>
                    {t(`profile.expOptions.${opt.i18nKey}.label`)}
                  </Text>
                  <Text style={[styles.expDesc, { color: colors.textMuted }]}>
                    {t(`profile.expOptions.${opt.i18nKey}.desc`)}
                  </Text>
                </View>
                {bettingExperience === opt.key && <Text style={{ color: "#FFD700", fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Follow Us Modal ── */}
      <Modal visible={showSocialModal} transparent animationType="slide" onRequestClose={() => setShowSocialModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSocialModal(false)} activeOpacity={1}>
          <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{t("profile.followUsTitle")}</Text>
            <Text style={[styles.sheetSub, { color: colors.textMuted }]}>
              {t("profile.followUsSub")}
            </Text>
            {SOCIAL_LINKS.map((s) => (
              <TouchableOpacity
                key={s.name}
                style={[styles.sheetRow, { borderBottomColor: colors.border }]}
                onPress={() => openSocial(s.url)}
                activeOpacity={0.8}
              >
                <View style={[styles.socialIcon, { backgroundColor: s.color === "#FFFFFF" ? "#1A1A1A" : s.color }]}>
                  <FontAwesome5 name={s.icon} size={18} color="#FFFFFF" brand solid={false} />
                </View>
                <Text style={[styles.sheetRowName, { color: colors.text, flex: 1, fontSize: 15 }]}>{s.name}</Text>
                <ExternalLink size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.socialClose, { borderColor: colors.border }]}
              onPress={() => setShowSocialModal(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.socialCloseText, { color: colors.text }]}>{t("profile.close")}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  profileCard:        { flexDirection: "row", alignItems: "center", gap: 16, marginHorizontal: 16, padding: 18, borderRadius: 18, borderWidth: 1, marginBottom: 12 },
  avatarCircle:       { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText:         { fontSize: 28, fontFamily: "Inter_700Bold", color: "#00E5FF" },
  accountInfo:        { flex: 1, gap: 4 },
  displayName:        { fontSize: 18, fontFamily: "Inter_700Bold" },
  emailText:          { fontSize: 12, fontFamily: "Inter_400Regular" },
  tierRow:            { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  tierBadge:          { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  tierText:           { fontSize: 11, fontFamily: "Inter_700Bold" },
  upgradeBtn:         { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  upgradeBtnText:     { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  referralCard:       { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 16, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  referralTitle:      { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  referralLink:       { fontSize: 11, fontFamily: "Inter_400Regular" },
  copyBtn:            { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  copyBtnText:        { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statsStrip:         { flexDirection: "row", gap: 8, marginHorizontal: 16, marginBottom: 20 },
  statCell:           { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1, gap: 3 },
  statCellValue:      { fontSize: 13, fontFamily: "Inter_700Bold" },
  statCellLabel:      { fontSize: 10, fontFamily: "Inter_400Regular" },
  sectionHeader:      { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginHorizontal: 16, marginBottom: 8 },
  settingGroup:       { marginHorizontal: 16, marginBottom: 20, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  settingRow:         { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, borderBottomWidth: 1 },
  settingIconWrap:    { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  settingLabel:       { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  settingRight:       { flexDirection: "row", alignItems: "center", gap: 6 },
  settingValue:       { fontSize: 13, fontFamily: "Inter_400Regular" },
  versionBlock:       { alignItems: "center", gap: 4, paddingBottom: 20 },
  versionText:        { fontSize: 12, fontFamily: "Inter_400Regular" },
  versionDisclaimer:  { fontSize: 11, fontFamily: "Inter_400Regular" },

  // Modals
  modalOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  bottomSheet:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 12, gap: 4 },
  sheetHandle:    { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle:     { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 6 },
  sheetSub:       { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12, lineHeight: 18 },
  sheetRow:       { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1 },
  sheetRowFlag:   { fontSize: 22 },
  sheetRowName:   { fontSize: 15, fontFamily: "Inter_400Regular" },
  sheetRowNative: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },

  // Betting experience options
  expRow:   { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 1.5, marginBottom: 10 },
  expLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  expDesc:  { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 17 },

  // Follow Us social links
  socialIcon:      { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  socialClose:     { marginTop: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  socialCloseText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
