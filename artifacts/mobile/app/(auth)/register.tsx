import { AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react-native";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { register } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [ageVerified, setAgeVerified] = useState(false);

  async function handleRegister() {
    if (!username.trim() || !email.trim() || !password) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await register(username.trim(), email.trim().toLowerCase(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <View style={[styles.logoCircle, { borderColor: colors.cyan }]}>
            <Text style={[styles.logoText, { color: colors.cyan }]}>PQ</Text>
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>PrediQs AI</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Start winning smarter today
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Create account</Text>

          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: "rgba(255,77,77,0.1)", borderColor: "rgba(255,77,77,0.3)" }]}>
              <AlertCircle size={14} color={colors.red} />
              <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              value={username}
              onChangeText={setUsername}
              placeholder="e.g. SharpBettor99"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoComplete="username"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Password{" "}
              <Text style={{ color: colors.textMuted }}>(min. 8 characters)</Text>
            </Text>
            <View style={[styles.passwordRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff size={18} color={colors.textMuted} />
                ) : (
                  <Eye size={18} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.cyan, opacity: (isLoading || !ageVerified) ? 0.5 : 1 }]}
            onPress={handleRegister}
            disabled={isLoading || !username || !email || !password || !ageVerified}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.submitText, { color: colors.background }]}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.perks}>
            {[
              "Free AI predictions every day",
              "Track your bankroll & P&L",
              "Kelly Criterion calculator",
            ].map((perk) => (
              <View key={perk} style={styles.perkRow}>
                <CheckCircle size={14} color={colors.green} />
                <Text style={[styles.perkText, { color: colors.textSecondary }]}>{perk}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.ageCheckRow, { borderColor: ageVerified ? colors.cyan : colors.border, backgroundColor: ageVerified ? "rgba(0,229,255,0.06)" : "transparent" }]}
          onPress={() => setAgeVerified((v) => !v)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, { borderColor: ageVerified ? colors.cyan : colors.border, backgroundColor: ageVerified ? "rgba(0,229,255,0.15)" : "transparent" }]}>
            {ageVerified && <CheckCircle size={13} color={colors.cyan} />}
          </View>
          <Text style={[styles.ageCheckText, { color: colors.textSecondary }]}>
            I confirm I am 18 years or older and that online betting is legal in my jurisdiction
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Already have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
            <Text style={[styles.footerLink, { color: colors.cyan }]}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
          For informational purposes only. Gamble responsibly. 18+.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 24 },
  logoSection: { alignItems: "center", gap: 10, marginBottom: 8 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,229,255,0.08)",
  },
  logoText: { fontSize: 22, letterSpacing: -0.5 },
  appName: { fontSize: 28, letterSpacing: -0.5 },
  tagline: { fontSize: 14 },
  card: { borderRadius: 20, padding: 24, borderWidth: 1, gap: 16 },
  cardTitle: { fontSize: 20, letterSpacing: -0.3 },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { fontSize: 13, flex: 1 },
  field: { gap: 6 },
  label: { fontSize: 13 },
  input: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15 },
  passwordRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingLeft: 14 },
  passwordInput: { flex: 1, paddingVertical: 14, fontSize: 15 },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  submitBtn: { borderRadius: 14, padding: 16, alignItems: "center", marginTop: 4 },
  submitText: { fontSize: 16 },
  perks: { gap: 8 },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  perkText: { fontSize: 13 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14 },
  disclaimer: { fontSize: 11, textAlign: "center" },
  ageCheckRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  ageCheckText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
