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
  Settings,
  Shield,
  Star,
  Users,
} from "lucide-react-native";
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

const TIER_COLORS: Record<string, string> = {
  free:    "#94A3B8",
  premium: "#FFD700",
};

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
  const [copied, setCopied] = useState(false);

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

  function handleLogout() {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel",    style: "cancel" },
        { text: "Sign Out",  style: "destructive", onPress: () => logout() },
      ],
    );
  }

  return (
    <ScrollView
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
                {tier === "premium" ? "Manage Plan" : "Upgrade"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Referral banner ── */}
      <View style={[styles.referralCard, { backgroundColor: "rgba(255,215,0,0.06)", borderColor: "rgba(255,215,0,0.2)" }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.referralTitle, { color: colors.gold }]}>🎁 Invite friends — earn rewards</Text>
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
            {copied ? "Copied!" : "Copy"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats strip ── */}
      <View style={styles.statsStrip}>
        {[
          { label: "Plan",      value: tier.toUpperCase(), color: tierColor     },
          { label: "Status",    value: "Active",           color: colors.green  },
          { label: "Referrals", value: "0",                color: colors.textSecondary },
        ].map((s) => (
          <View key={s.label} style={[styles.statCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statCellValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statCellLabel, { color: colors.textMuted }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Features ── */}
      <SectionHeader title="Features" />
      <SettingGroup>
        <SettingRow
          icon={Bell}    label="Notifications"
          onPress={() => Alert.alert("Notifications", "Go to device Settings → PrediQs AI to manage notifications.")}
        />
        <SettingRow icon={Globe}   label="Language"           value="English" onPress={() => {}} />
        <SettingRow icon={Percent} label="Betting Experience" value="Casual"  onPress={() => {}} />
        <SettingRow icon={Lock}    label="Change Password"    onPress={() => router.push("/change-password" as any)} />
      </SettingGroup>

      {/* ── Support ── */}
      <SectionHeader title="Support" />
      <SettingGroup>
        <SettingRow
          icon={Mail}          label="Contact Us"
          onPress={() => Alert.alert("Contact", "Email us at support@prediqs.ai")}
        />
        <SettingRow icon={HelpCircle}    label="Help & FAQ"         onPress={() => {}} />
        <SettingRow icon={BookOpen}      label="App Guide"          onPress={() => router.push("/about" as any)} />
        <SettingRow
          icon={MessageSquare} label="Telegram Community"
          right={<ExternalLink size={14} color="#3A5060" />}
          onPress={() => {}}
        />
        <SettingRow
          icon={Users}         label="Follow Us"
          right={<ExternalLink size={14} color="#3A5060" />}
          onPress={() => {}}
        />
      </SettingGroup>

      {/* ── Legal ── */}
      <SectionHeader title="Legal" />
      <SettingGroup>
        <SettingRow icon={BookOpen}  label="Terms of Service"     onPress={() => {}} />
        <SettingRow icon={Shield}    label="Privacy Policy"        onPress={() => {}} />
        <SettingRow
          icon={LifeBuoy}  label="Responsible Gambling"
          iconColor="#FF6B35"
          onPress={() => {}}
        />
      </SettingGroup>

      {/* ── Account Actions ── */}
      <SectionHeader title="Account" />
      <SettingGroup>
        {isAdmin && (
          <SettingRow
            icon={Settings} label="Admin Panel"
            iconColor={colors.gold}
            onPress={() => router.push("/setup" as any)}
          />
        )}
        <SettingRow icon={LogOut} label="Sign Out" danger onPress={handleLogout} />
      </SettingGroup>

      {/* ── App version ── */}
      <View style={styles.versionBlock}>
        <Text style={[styles.versionText,       { color: colors.textMuted }]}>PrediQs AI v1.0.0</Text>
        <Text style={[styles.versionDisclaimer, { color: colors.textMuted }]}>
          Educational purposes only
        </Text>
      </View>
    </ScrollView>
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
});
