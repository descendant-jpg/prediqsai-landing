import { Feather } from "@expo/vector-icons";
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
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={[styles.logoCircle, { borderColor: colors.cyan }]}>
            <Text style={[styles.logoText, { color: colors.cyan }]}>PQ</Text>
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>PrediQs AI</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Start winning smarter today
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Create account</Text>

          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: "rgba(255,77,77,0.1)", borderColor: "rgba(255,77,77,0.3)" }]}>
              <Feather name="alert-circle" size={14} color={colors.red} />
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
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.cyan, opacity: isLoading ? 0.7 : 1 }]}
            onPress={handleRegister}
            disabled={isLoading || !username || !email || !password}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.submitText, { color: colors.background }]}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Perks */}
          <View style={styles.perks}>
            {[
              "Free AI predictions every day",
              "Track your bankroll & P&L",
              "Kelly Criterion calculator",
            ].map((perk) => (
              <View key={perk} style={styles.perkRow}>
                <Feather name="check-circle" size={14} color={colors.green} />
                <Text style={[styles.perkText, { color: colors.textSecondary }]}>{perk}</Text>
              </View>
            ))}
          </View>
        </View>

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
  logoText: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  appName: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 20, padding: 24, borderWidth: 1, gap: 16 },
  cardTitle: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  submitBtn: {
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  perks: { gap: 8 },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  perkText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  footerLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  disclaimer: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
});
