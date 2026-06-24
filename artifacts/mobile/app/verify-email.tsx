import * as Haptics from "expo-haptics";
import { CheckCircle2, Mail, RefreshCw } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";

const BG = "#070B12";
const CARD_BG = "#0C1422";
const GOLD = "#FFD700";
const BORDER = "#1A2535";
const MUTED = "#3A5060";
const TEXT = "#E0EAF5";
const SUBTLE = "#9FB1C1";
const GREEN = "#22C55E";
const RED = "#FF6B6B";

type Status = { kind: "idle" | "ok" | "error"; message: string };

export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets();
  const { user, resendVerification, checkEmailVerified, logout } = useAuth();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });

  async function handleContinue() {
    setChecking(true);
    setStatus({ kind: "idle", message: "" });
    try {
      const verified = await checkEmailVerified();
      if (verified) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Root guard navigates away automatically once the user is verified.
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setStatus({
          kind: "error",
          message: "Please click the link in your email first.",
        });
      }
    } catch {
      setStatus({
        kind: "error",
        message: "Could not check your status. Please try again.",
      });
    } finally {
      setChecking(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setStatus({ kind: "idle", message: "" });
    try {
      await resendVerification();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStatus({
        kind: "ok",
        message: "Verification email sent. Check your inbox (and spam).",
      });
    } catch {
      setStatus({
        kind: "error",
        message: "Could not resend the email. Please try again shortly.",
      });
    } finally {
      setResending(false);
    }
  }

  return (
    <View style={[s.root, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={s.content}>
        <View style={s.iconCircle}>
          <Mail size={34} color={GOLD} />
        </View>

        <Text style={s.title}>Verify your email</Text>
        <Text style={s.body}>
          We&apos;ve sent a verification link to your email. Please click the link to verify your account.
        </Text>

        {user?.email ? (
          <View style={s.emailPill}>
            <Text style={s.emailText}>{user.email}</Text>
          </View>
        ) : null}

        {status.kind !== "idle" ? (
          <View
            style={[
              s.statusRow,
              { borderColor: status.kind === "ok" ? GREEN : RED },
            ]}
          >
            <Text style={[s.statusText, { color: status.kind === "ok" ? GREEN : RED }]}>
              {status.message}
            </Text>
          </View>
        ) : null}

        {/* Primary: I've Verified - Continue */}
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={handleContinue}
          disabled={checking}
          activeOpacity={0.85}
        >
          {checking ? (
            <ActivityIndicator color={BG} />
          ) : (
            <View style={s.btnInner}>
              <CheckCircle2 size={18} color={BG} />
              <Text style={s.primaryBtnText}>I&apos;ve Verified – Continue</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Secondary: Resend */}
        <TouchableOpacity
          style={s.outlineBtn}
          onPress={handleResend}
          disabled={resending}
          activeOpacity={0.8}
        >
          {resending ? (
            <ActivityIndicator color={GOLD} />
          ) : (
            <View style={s.btnInner}>
              <RefreshCw size={16} color={GOLD} />
              <Text style={s.outlineBtnText}>Resend Verification Email</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.signOut} onPress={() => logout()} activeOpacity={0.7}>
        <Text style={s.signOutText}>Use a different account</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, paddingHorizontal: 24, justifyContent: "space-between" },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  iconCircle: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: CARD_BG, borderWidth: 2, borderColor: GOLD,
    alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  title: { fontSize: 26, color: TEXT, fontWeight: "700", letterSpacing: -0.5, marginBottom: 12, textAlign: "center" },
  body: { fontSize: 15, color: SUBTLE, lineHeight: 22, textAlign: "center", maxWidth: 320, marginBottom: 20 },
  emailPill: {
    backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 16,
  },
  emailText: { color: GOLD, fontSize: 14, fontWeight: "600" },
  statusRow: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 16, width: "100%",
  },
  statusText: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  primaryBtn: {
    backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16,
    width: "100%", alignItems: "center", marginTop: 8,
  },
  primaryBtnText: { color: BG, fontSize: 16, fontWeight: "700" },
  outlineBtn: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingVertical: 15,
    width: "100%", alignItems: "center", marginTop: 12,
  },
  outlineBtnText: { color: GOLD, fontSize: 15, fontWeight: "600" },
  btnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  signOut: { alignItems: "center", paddingVertical: 12 },
  signOutText: { color: MUTED, fontSize: 14 },
});
