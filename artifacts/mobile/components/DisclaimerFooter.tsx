import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function DisclaimerFooter() {
  const colors = useColors();
  const router = useRouter();
  return (
    <View style={[styles.container, { borderTopColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.textMuted }]}>
        PrediQs AI is for educational purposes only. Not betting advice. 18+ | Gamble responsibly.
      </Text>
      <Text style={[styles.helpline, { color: colors.textMuted }]}>
        ncpgambling.org · 1-800-522-4700
      </Text>
      <View style={styles.links}>
        <TouchableOpacity onPress={() => router.push("/terms-of-service" as any)} activeOpacity={0.7}>
          <Text style={[styles.link, { color: colors.textMuted }]}>Terms</Text>
        </TouchableOpacity>
        <Text style={[styles.dot, { color: colors.textMuted }]}>·</Text>
        <TouchableOpacity onPress={() => router.push("/privacy-policy" as any)} activeOpacity={0.7}>
          <Text style={[styles.link, { color: colors.textMuted }]}>Privacy</Text>
        </TouchableOpacity>
        <Text style={[styles.dot, { color: colors.textMuted }]}>·</Text>
        <TouchableOpacity onPress={() => router.push("/responsible-gambling" as any)} activeOpacity={0.7}>
          <Text style={[styles.link, { color: colors.textMuted }]}>Responsible Gambling</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingTop: 14,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    gap: 6,
    alignItems: "center",
  },
  text: { fontSize: 11, textAlign: "center", lineHeight: 16 },
  helpline: { fontSize: 11, textAlign: "center" },
  links: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" },
  link: { fontSize: 11, textDecorationLine: "underline" },
  dot: { fontSize: 11 },
});
