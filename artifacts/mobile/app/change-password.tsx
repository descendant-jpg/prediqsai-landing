import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react-native";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

export default function ChangePasswordScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { token } = useAuth();

  const [current,    setCurrent]    = useState("");
  const [next,       setNext]       = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [showCur,    setShowCur]    = useState(false);
  const [showNext,   setShowNext]   = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [loading,    setLoading]    = useState(false);

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  async function handleSubmit() {
    if (!current || !next || !confirm) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    if (next.length < 8) {
      Alert.alert("Too short", "New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      Alert.alert("Mismatch", "New passwords do not match.");
      return;
    }
    if (!token) {
      Alert.alert("Error", "You must be logged in to change your password.");
      return;
    }
    setLoading(true);
    try {
      await api.auth.changePassword(token, current, next);
      Alert.alert("Success", "Password changed successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setLoading(false);
    }
  }

  function PasswordInput({
    label, value, onChange, show, toggleShow, placeholder,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    toggleShow: () => void;
    placeholder: string;
  }) {
    return (
      <View style={styles.fieldWrap}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
        <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Lock size={16} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!show}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={toggleShow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {show
              ? <EyeOff size={16} color={colors.textMuted} />
              : <Eye    size={16} color={colors.textMuted} />}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Change Password</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <PasswordInput
            label="Current Password"
            value={current}
            onChange={setCurrent}
            show={showCur}
            toggleShow={() => setShowCur((v) => !v)}
            placeholder="Enter current password"
          />
          <PasswordInput
            label="New Password"
            value={next}
            onChange={setNext}
            show={showNext}
            toggleShow={() => setShowNext((v) => !v)}
            placeholder="At least 8 characters"
          />
          <PasswordInput
            label="Confirm New Password"
            value={confirm}
            onChange={setConfirm}
            show={showConf}
            toggleShow={() => setShowConf((v) => !v)}
            placeholder="Repeat new password"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.btn,
            { backgroundColor: loading ? colors.border : colors.cyan, opacity: loading ? 0.7 : 1 },
          ]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { color: loading ? colors.textMuted : colors.background }]}>
            {loading ? "Saving…" : "Update Password"}
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:      { flex: 1 },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  content:     { padding: 16, gap: 16 },
  card:        { borderRadius: 16, borderWidth: 1, padding: 20, gap: 18 },
  fieldWrap:   { gap: 6 },
  fieldLabel:  { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  inputRow:    { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  inputIcon:   {},
  input:       { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  btn:         { borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  btnText:     { fontSize: 15, fontFamily: "Inter_700Bold" },
});
