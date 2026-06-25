import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { AlertCircle, Eye, EyeOff, Globe, Lock, Mail, MapPin, User } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
import { api } from "@/lib/api";
import { GOOGLE_CANCELLED, GOOGLE_UNAVAILABLE } from "@/lib/google";
import { LANGUAGES, useLanguage } from "@/context/LanguageContext";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const BG        = "#070B12";
const CARD_BG   = "#0C1422";
const INPUT_BG  = "#131E2E";
const GOLD      = "#FFD700";
const BORDER    = "#1A2535";
const MUTED     = "#3A5060";
const TEXT      = "#E0EAF5";
const PLACEHOLDER = "#3A5060";

// ─── Countries ─────────────────────────────────────────────────────────────────
const COUNTRIES = [
  { code: "US", flag: "🇺🇸", name: "United States" },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom" },
  { code: "NG", flag: "🇳🇬", name: "Nigeria" },
  { code: "GH", flag: "🇬🇭", name: "Ghana" },
  { code: "KE", flag: "🇰🇪", name: "Kenya" },
  { code: "ZA", flag: "🇿🇦", name: "South Africa" },
  { code: "IN", flag: "🇮🇳", name: "India" },
  { code: "DE", flag: "🇩🇪", name: "Germany" },
  { code: "FR", flag: "🇫🇷", name: "France" },
  { code: "BR", flag: "🇧🇷", name: "Brazil" },
  { code: "AU", flag: "🇦🇺", name: "Australia" },
  { code: "CA", flag: "🇨🇦", name: "Canada" },
  { code: "ES", flag: "🇪🇸", name: "Spain" },
  { code: "TZ", flag: "🇹🇿", name: "Tanzania" },
  { code: "UG", flag: "🇺🇬", name: "Uganda" },
  { code: "RW", flag: "🇷🇼", name: "Rwanda" },
  { code: "ZW", flag: "🇿🇼", name: "Zimbabwe" },
  { code: "ET", flag: "🇪🇹", name: "Ethiopia" },
  { code: "SN", flag: "🇸🇳", name: "Senegal" },
  { code: "CI", flag: "🇨🇮", name: "Côte d'Ivoire" },
  { code: "CM", flag: "🇨🇲", name: "Cameroon" },
  { code: "EG", flag: "🇪🇬", name: "Egypt" },
  { code: "MA", flag: "🇲🇦", name: "Morocco" },
  { code: "AR", flag: "🇦🇷", name: "Argentina" },
  { code: "MX", flag: "🇲🇽", name: "Mexico" },
  { code: "IT", flag: "🇮🇹", name: "Italy" },
  { code: "PT", flag: "🇵🇹", name: "Portugal" },
  { code: "NL", flag: "🇳🇱", name: "Netherlands" },
  { code: "BE", flag: "🇧🇪", name: "Belgium" },
  { code: "JP", flag: "🇯🇵", name: "Japan" },
  { code: "KR", flag: "🇰🇷", name: "South Korea" },
  { code: "CN", flag: "🇨🇳", name: "China" },
  { code: "PK", flag: "🇵🇰", name: "Pakistan" },
  { code: "BD", flag: "🇧🇩", name: "Bangladesh" },
  { code: "PH", flag: "🇵🇭", name: "Philippines" },
  { code: "ID", flag: "🇮🇩", name: "Indonesia" },
  { code: "MY", flag: "🇲🇾", name: "Malaysia" },
  { code: "SG", flag: "🇸🇬", name: "Singapore" },
  { code: "TH", flag: "🇹🇭", name: "Thailand" },
  { code: "VN", flag: "🇻🇳", name: "Vietnam" },
  { code: "RU", flag: "🇷🇺", name: "Russia" },
  { code: "PL", flag: "🇵🇱", name: "Poland" },
  { code: "SE", flag: "🇸🇪", name: "Sweden" },
  { code: "NO", flag: "🇳🇴", name: "Norway" },
  { code: "DK", flag: "🇩🇰", name: "Denmark" },
  { code: "TR", flag: "🇹🇷", name: "Turkey" },
  { code: "GR", flag: "🇬🇷", name: "Greece" },
];

type Mode = "signin" | "signup";
type Country = (typeof COUNTRIES)[number];

function InputField({
  icon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  onSubmitEditing,
  returnKeyType,
  autoComplete,
  onToggleSecure,
  showSecure,
  editable = true,
}: {
  icon: React.ReactNode;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "email-address" | "default";
  autoCapitalize?: "none" | "words";
  onSubmitEditing?: () => void;
  returnKeyType?: "next" | "done" | "go";
  autoComplete?: string;
  onToggleSecure?: () => void;
  showSecure?: boolean;
  editable?: boolean;
}) {
  return (
    <View style={s.inputRow}>
      <View style={s.inputIconWrap}>{icon}</View>
      <TextInput
        style={[s.inputText, !editable && { color: MUTED }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={PLACEHOLDER}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "none"}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        autoComplete={autoComplete as any}
        editable={editable}
      />
      {onToggleSecure && (
        <TouchableOpacity
          onPress={onToggleSecure}
          style={s.eyeWrap}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {showSecure
            ? <EyeOff size={17} color={MUTED} />
            : <Eye size={17} color={MUTED} />}
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, register, loginWithGoogle } = useAuth();
  const { language, setLanguage } = useLanguage();

  const [mode, setMode] = useState<Mode>("signin");
  const [googleLoading, setGoogleLoading] = useState(false);

  // Sign-in fields
  const [siEmail, setSiEmail]       = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [showSiPwd, setShowSiPwd]   = useState(false);
  const [siLoading, setSiLoading]   = useState(false);
  const [siError, setSiError]       = useState("");

  // Sign-up fields
  const [suUsername, setSuUsername] = useState("");
  const [suEmail, setSuEmail]       = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [showSuPwd, setShowSuPwd]   = useState(false);
  const [suCountry, setSuCountry]   = useState<Country | null>(null);
  const [suLoading, setSuLoading]   = useState(false);
  const [suError, setSuError]       = useState("");

  // Modals
  const [showLang, setShowLang]           = useState(false);
  const [showCountry, setShowCountry]     = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [showForgot, setShowForgot]       = useState(false);
  const [forgotEmail, setForgotEmail]     = useState("");
  const [forgotSent, setForgotSent]       = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const isSignInReady = siEmail.trim().length > 0 && siPassword.length > 0;
  const isSignUpReady =
    suUsername.trim().length > 0 &&
    suEmail.trim().length > 0 &&
    suPassword.length >= 8;

  function switchMode(next: Mode) {
    Haptics.selectionAsync();
    setSiError("");
    setSuError("");
    setMode(next);
  }

  async function handleSignIn() {
    if (!isSignInReady) return;
    setSiError("");
    setSiLoading(true);
    try {
      await login(siEmail.trim().toLowerCase(), siPassword);
    } catch (err) {
      setSiError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSiLoading(false);
    }
  }

  async function handleSignUp() {
    if (!isSignUpReady) return;
    if (suPassword.length < 8) {
      setSuError("Password must be at least 8 characters");
      return;
    }
    setSuError("");
    setSuLoading(true);
    try {
      await register(suUsername.trim(), suEmail.trim().toLowerCase(), suPassword);
    } catch (err) {
      setSuError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setSuLoading(false);
    }
  }

  async function handleForgotPassword() {
    const email = forgotEmail.trim().toLowerCase();
    if (!email || forgotLoading) return;
    setForgotLoading(true);
    try {
      await api.auth.forgotPassword(email);
    } catch {
      // The server always responds generically (to avoid revealing whether an
      // email is registered), so surface the same success state regardless.
    } finally {
      setForgotLoading(false);
      setForgotSent(true);
    }
  }

  async function handleSocial(provider: "Google" | "Apple") {
    if (provider === "Apple") {
      Alert.alert(
        "Apple Sign In",
        "Apple sign-in is coming soon. Please use email or Google for now.",
        [{ text: "OK" }],
      );
      return;
    }

    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      // Root guard routes the user into the app on success.
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      if (msg === GOOGLE_CANCELLED) return;
      if (msg === GOOGLE_UNAVAILABLE) {
        Alert.alert(
          "Google Sign-In",
          "Google Sign-In only works in the installed PrediQs AI app, not the web preview. Please use email and password here.",
          [{ text: "OK" }],
        );
        return;
      }
      Alert.alert("Google Sign-In failed", msg, [{ text: "OK" }]);
    } finally {
      setGoogleLoading(false);
    }
  }

  const filteredCountries = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()),
  );

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: BG }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Language button */}
      <TouchableOpacity
        style={[s.langBtn, { top: insets.top + 14 }]}
        onPress={() => { Haptics.selectionAsync(); setShowLang(true); }}
        activeOpacity={0.8}
      >
        <Globe size={13} color={MUTED} />
        <Text style={s.langBtnText}>{language.flag} {language.name}</Text>
        <Text style={[s.langBtnText, { color: GOLD }]}>✓</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo ── */}
        <View style={s.logoSection}>
          <View style={s.logoCircle}>
            <Text style={s.logoText}>PQ</Text>
          </View>
          <Text style={s.appName}>PrediQs AI</Text>
          <Text style={s.appSub}>SPORTS INTELLIGENCE AI</Text>
        </View>

        {/* ── Card ── */}
        <View style={s.card}>
          {/* Mode heading */}
          <Text style={s.cardHeading}>
            {mode === "signin" ? "Welcome back" : "Create account"}
          </Text>
          <Text style={s.cardSub}>
            {mode === "signin"
              ? "Sign in to access your predictions"
              : "Join thousands of smart bettors"}
          </Text>

          {/* ── Sign-in form ── */}
          {mode === "signin" && (
            <View style={s.form}>
              {siError ? (
                <View style={s.errorRow}>
                  <AlertCircle size={13} color="#FF4D4D" />
                  <Text style={s.errorText}>{siError}</Text>
                </View>
              ) : null}

              <InputField
                icon={<Mail size={16} color={MUTED} />}
                value={siEmail}
                onChangeText={setSiEmail}
                placeholder="Email address"
                keyboardType="email-address"
                returnKeyType="next"
                autoComplete="email"
              />
              <InputField
                icon={<Lock size={16} color={MUTED} />}
                value={siPassword}
                onChangeText={setSiPassword}
                placeholder="Password"
                secureTextEntry={!showSiPwd}
                onToggleSecure={() => setShowSiPwd((v) => !v)}
                showSecure={showSiPwd}
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
                autoComplete="password"
              />

              {/* Sign In button */}
              <TouchableOpacity
                style={[s.primaryBtn, !isSignInReady && s.primaryBtnDisabled]}
                onPress={handleSignIn}
                disabled={siLoading || !isSignInReady}
                activeOpacity={0.85}
              >
                {siLoading
                  ? <ActivityIndicator color={isSignInReady ? BG : MUTED} />
                  : <Text style={[s.primaryBtnText, !isSignInReady && s.disabledBtnText]}>Sign In</Text>}
              </TouchableOpacity>

              {/* Sign Up button */}
              <TouchableOpacity
                style={s.outlineBtn}
                onPress={() => switchMode("signup")}
                activeOpacity={0.8}
              >
                <Text style={s.outlineBtnText}>Create Account</Text>
              </TouchableOpacity>

              {/* Forgot password */}
              <TouchableOpacity
                style={s.forgotWrap}
                onPress={() => { setForgotSent(false); setForgotEmail(siEmail); setShowForgot(true); }}
                activeOpacity={0.7}
              >
                <Text style={s.forgotLink}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Sign-up form ── */}
          {mode === "signup" && (
            <View style={s.form}>
              {suError ? (
                <View style={s.errorRow}>
                  <AlertCircle size={13} color="#FF4D4D" />
                  <Text style={s.errorText}>{suError}</Text>
                </View>
              ) : null}

              <InputField
                icon={<User size={16} color={MUTED} />}
                value={suUsername}
                onChangeText={setSuUsername}
                placeholder="Username"
                autoCapitalize="none"
                returnKeyType="next"
                autoComplete="username"
              />
              <InputField
                icon={<Mail size={16} color={MUTED} />}
                value={suEmail}
                onChangeText={setSuEmail}
                placeholder="Email address"
                keyboardType="email-address"
                returnKeyType="next"
                autoComplete="email"
              />
              <InputField
                icon={<Lock size={16} color={MUTED} />}
                value={suPassword}
                onChangeText={setSuPassword}
                placeholder="Password (min 8 chars)"
                secureTextEntry={!showSuPwd}
                onToggleSecure={() => setShowSuPwd((v) => !v)}
                showSecure={showSuPwd}
                returnKeyType="next"
                autoComplete="new-password"
              />

              {/* Country picker */}
              <TouchableOpacity
                style={s.inputRow}
                onPress={() => { Haptics.selectionAsync(); setCountrySearch(""); setShowCountry(true); }}
                activeOpacity={0.8}
              >
                <View style={s.inputIconWrap}>
                  <MapPin size={16} color={MUTED} />
                </View>
                <Text style={[s.inputText, !suCountry && { color: PLACEHOLDER }]}>
                  {suCountry ? `${suCountry.flag}  ${suCountry.name}` : "Select country (optional)"}
                </Text>
              </TouchableOpacity>

              {/* Create Account button */}
              <TouchableOpacity
                style={[s.primaryBtn, !isSignUpReady && s.primaryBtnDisabled]}
                onPress={handleSignUp}
                disabled={suLoading || !isSignUpReady}
                activeOpacity={0.85}
              >
                {suLoading
                  ? <ActivityIndicator color={isSignUpReady ? BG : MUTED} />
                  : <Text style={[s.primaryBtnText, !isSignUpReady && s.disabledBtnText]}>Create Account</Text>}
              </TouchableOpacity>

              {/* Back to Sign In */}
              <TouchableOpacity
                style={s.outlineBtn}
                onPress={() => switchMode("signin")}
                activeOpacity={0.8}
              >
                <Text style={s.outlineBtnText}>Already have an account? Sign In</Text>
              </TouchableOpacity>

              <Text style={s.tosLine}>
                By signing up you agree to our{" "}
                <Text style={s.tosLink} onPress={() => router.push("/terms-of-service" as any)}>
                  Terms of Service
                </Text>
                {" "}and{" "}
                <Text style={s.tosLink} onPress={() => router.push("/privacy-policy" as any)}>
                  Privacy Policy
                </Text>
              </Text>
            </View>
          )}
        </View>

        {/* ── OR CONTINUE WITH ── */}
        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>OR CONTINUE WITH</Text>
          <View style={s.dividerLine} />
        </View>

        <View style={s.socialRow}>
          <TouchableOpacity style={s.socialBtn} onPress={() => handleSocial("Google")} activeOpacity={0.8} disabled={googleLoading}>
            {googleLoading
              ? <ActivityIndicator color={TEXT} />
              : <Text style={s.socialBtnText}>G  Google</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.socialBtn} onPress={() => handleSocial("Apple")} activeOpacity={0.8}>
            <Text style={s.socialBtnText}>🍎  Apple</Text>
          </TouchableOpacity>
        </View>

        {/* Trust badges */}
        <View style={s.trustRow}>
          {[
            { icon: "🔒", label: "Encrypted" },
            { icon: "🔐", label: "Secure" },
            { icon: "🌐", label: "Global" },
          ].map((b) => (
            <View key={b.label} style={s.trustBadge}>
              <Text style={s.trustIcon}>{b.icon}</Text>
              <Text style={s.trustLabel}>{b.label}</Text>
            </View>
          ))}
        </View>

        <Text style={s.disclaimer}>
          PrediQs AI provides sports intelligence for educational purposes only.{"\n"}
          Not gambling advice. Please gamble responsibly. 18+
        </Text>
      </ScrollView>

      {/* ── Language Modal ── */}
      <Modal visible={showLang} transparent animationType="slide" onRequestClose={() => setShowLang(false)}>
        <TouchableOpacity style={s.modalOverlay} onPress={() => setShowLang(false)} activeOpacity={1}>
          <View style={s.bottomSheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Select Language</Text>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(l) => l.code}
              style={{ maxHeight: 440 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.sheetRow, item.code === language.code && s.sheetRowActive]}
                  onPress={() => { Haptics.selectionAsync(); setLanguage(item); setShowLang(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={s.sheetRowFlag}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.sheetRowName, item.code === language.code && { color: GOLD }]}>{item.name}</Text>
                    <Text style={s.sheetRowNative}>{item.nativeName}</Text>
                  </View>
                  {item.code === language.code && <Text style={{ color: GOLD, fontSize: 16 }}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Country Modal ── */}
      <Modal visible={showCountry} transparent animationType="slide" onRequestClose={() => setShowCountry(false)}>
        <TouchableOpacity style={s.modalOverlay} onPress={() => setShowCountry(false)} activeOpacity={1}>
          <View style={[s.bottomSheet, { maxHeight: "75%" }]}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Select Country</Text>
            <TextInput
              style={s.searchInput}
              value={countrySearch}
              onChangeText={setCountrySearch}
              placeholder="Search countries..."
              placeholderTextColor={PLACEHOLDER}
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(c) => c.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.sheetRow, suCountry?.code === item.code && s.sheetRowActive]}
                  onPress={() => { Haptics.selectionAsync(); setSuCountry(item); setShowCountry(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={s.sheetRowFlag}>{item.flag}</Text>
                  <Text style={[s.sheetRowName, suCountry?.code === item.code && { color: GOLD }]}>{item.name}</Text>
                  {suCountry?.code === item.code && <Text style={{ color: GOLD }}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Forgot Password Modal ── */}
      <Modal visible={showForgot} transparent animationType="slide" onRequestClose={() => setShowForgot(false)}>
        <TouchableOpacity style={s.modalOverlay} onPress={() => setShowForgot(false)} activeOpacity={1}>
          <View style={[s.bottomSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Reset Password</Text>
            {forgotSent ? (
              <View style={s.forgotSuccess}>
                <Text style={s.forgotSuccessIcon}>✅</Text>
                <Text style={s.forgotSuccessTitle}>Check your email</Text>
                <Text style={s.forgotSuccessText}>
                  If that email is registered, a reset link has been sent.
                </Text>
                <TouchableOpacity style={s.primaryBtn} onPress={() => setShowForgot(false)}>
                  <Text style={s.primaryBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 14, marginTop: 8 }}>
                <Text style={s.forgotDesc}>Enter your email and we'll send a reset link.</Text>
                <TextInput
                  style={s.searchInput}
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  placeholder="your@email.com"
                  placeholderTextColor={PLACEHOLDER}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[s.primaryBtn, (!forgotEmail.trim() || forgotLoading) && s.primaryBtnDisabled]}
                  onPress={handleForgotPassword}
                  disabled={!forgotEmail.trim() || forgotLoading}
                  activeOpacity={0.85}
                >
                  {forgotLoading
                    ? <ActivityIndicator color={BG} />
                    : <Text style={[s.primaryBtnText, !forgotEmail.trim() && s.disabledBtnText]}>
                        Send Reset Link
                      </Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24 },

  // Language button
  langBtn: {
    position: "absolute", right: 16, zIndex: 10,
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: CARD_BG, borderColor: BORDER, borderWidth: 1,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
  },
  langBtnText: { fontSize: 12, color: MUTED },

  // Logo
  logoSection: { alignItems: "center", gap: 8, marginBottom: 28 },
  logoCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: CARD_BG, borderWidth: 2, borderColor: GOLD,
    alignItems: "center", justifyContent: "center",
  },
  logoText:  { fontSize: 24, color: GOLD, fontWeight: "700", letterSpacing: -0.5 },
  appName:   { fontSize: 28, color: TEXT, fontWeight: "700", letterSpacing: -0.5 },
  appSub:    { fontSize: 11, color: GOLD, letterSpacing: 2.5 },

  // Card
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
  },
  cardHeading: { fontSize: 20, color: TEXT, fontWeight: "700", marginBottom: 4 },
  cardSub:     { fontSize: 13, color: MUTED, marginBottom: 20 },

  // Form
  form: { gap: 12 },
  errorRow: {
    flexDirection: "row", gap: 8, alignItems: "center",
    backgroundColor: "rgba(255,77,77,0.1)",
    borderColor: "rgba(255,77,77,0.3)", borderWidth: 1,
    borderRadius: 10, padding: 10,
  },
  errorText: { color: "#FF4D4D", fontSize: 12, flex: 1 },

  // Input
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: INPUT_BG, borderRadius: 13,
    borderWidth: 1, borderColor: BORDER,
    paddingLeft: 14, minHeight: 52,
  },
  inputIconWrap: { marginRight: 10 },
  inputText: { flex: 1, color: TEXT, fontSize: 15, paddingVertical: 14 },
  eyeWrap:   { paddingHorizontal: 14, paddingVertical: 14 },

  // Primary button (gold)
  primaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnDisabled: {
    backgroundColor: "#1C2A3A",
    borderWidth: 1,
    borderColor: BORDER,
  },
  primaryBtnText:  { color: BG, fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  disabledBtnText: { color: MUTED },

  // Outline button (secondary)
  outlineBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  outlineBtnText: { color: GOLD, fontSize: 15, fontWeight: "600" },

  // Forgot
  forgotWrap: { alignItems: "center", paddingVertical: 4 },
  forgotLink: { color: MUTED, fontSize: 13 },

  // ToS
  tosLine: { color: MUTED, fontSize: 11, textAlign: "center", lineHeight: 17, marginTop: 2 },
  tosLink: { color: GOLD, textDecorationLine: "underline" },

  // Divider
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { fontSize: 10, color: MUTED, letterSpacing: 1.5 },

  // Social
  socialRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  socialBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: INPUT_BG, borderRadius: 13,
    borderWidth: 1, borderColor: BORDER, paddingVertical: 14,
  },
  socialBtnText: { color: TEXT, fontSize: 14, fontWeight: "600" },

  // Trust
  trustRow:  { flexDirection: "row", justifyContent: "center", gap: 28, marginBottom: 16 },
  trustBadge: { alignItems: "center", gap: 4 },
  trustIcon:  { fontSize: 16 },
  trustLabel: { fontSize: 10, color: MUTED, letterSpacing: 0.5 },

  // Disclaimer
  disclaimer: { textAlign: "center", fontSize: 10, color: MUTED, lineHeight: 16 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  bottomSheet: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingTop: 12, gap: 0,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: BORDER, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle:  { fontSize: 16, color: TEXT, fontWeight: "700", marginBottom: 14 },
  sheetRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 13, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  sheetRowActive: { backgroundColor: "rgba(255,215,0,0.06)" },
  sheetRowFlag:   { fontSize: 22 },
  sheetRowName:   { fontSize: 15, color: TEXT },
  sheetRowNative: { fontSize: 12, color: MUTED, marginTop: 1 },
  searchInput: {
    backgroundColor: INPUT_BG, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 12,
    color: TEXT, fontSize: 14, marginBottom: 8,
  },

  // Forgot modal content
  forgotDesc:         { color: MUTED, fontSize: 13, lineHeight: 19 },
  forgotSuccess:      { alignItems: "center", gap: 12, paddingVertical: 12 },
  forgotSuccessIcon:  { fontSize: 40 },
  forgotSuccessTitle: { fontSize: 18, color: TEXT, fontWeight: "700" },
  forgotSuccessText:  { color: MUTED, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
