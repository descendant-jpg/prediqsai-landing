import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function DisclaimerFooter() {
  const colors = useColors();
  return (
    <View style={[styles.container, { borderTopColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.textMuted }]}>
        PrediQs AI provides sports intelligence for educational and informational purposes only. We do not accept bets or wagers. All analysis is educational. Please gamble responsibly. 18+
      </Text>
      <Text style={[styles.helpline, { color: colors.textMuted }]}>
        ncpgambling.org · 1-800-522-4700
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingTop: 14,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    gap: 4,
    alignItems: "center",
  },
  text: { fontSize: 11, textAlign: "center", lineHeight: 16 },
  helpline: { fontSize: 11, textAlign: "center" },
});
