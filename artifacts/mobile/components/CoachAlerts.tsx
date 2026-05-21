import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { CoachAlert } from "@/lib/api";

const ALERT_COLORS: Record<CoachAlert["type"], string> = {
  danger: "#FF4D4D",
  warning: "#FFD700",
  info: "#00E5FF",
  positive: "#00FF94",
};

function AlertCard({ alert }: { alert: CoachAlert }) {
  const colors = useColors();
  const color = ALERT_COLORS[alert.type];

  return (
    <View style={[styles.alert, { backgroundColor: `${color}08`, borderColor: `${color}40` }]}>
      <View style={styles.alertTop}>
        <Text style={styles.alertIcon}>{alert.icon}</Text>
        <View style={styles.alertBody}>
          <Text style={[styles.alertTitle, { color }]}>{alert.title}</Text>
          <Text style={[styles.alertMessage, { color: colors.textSecondary }]}>{alert.message}</Text>
        </View>
      </View>
      <View style={[styles.actionPill, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
        <Text style={[styles.actionText, { color }]}>{alert.action}</Text>
      </View>
    </View>
  );
}

interface Props {
  alerts: CoachAlert[];
  riskProfile?: string;
}

export function CoachAlerts({ alerts, riskProfile }: Props) {
  const colors = useColors();
  const router = useRouter();

  if (alerts.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>🤖 Bankroll Coach</Text>
        <TouchableOpacity
          onPress={() => router.push("/risk-profile" as any)}
          style={[styles.profileBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.profileBtnText, { color: colors.textSecondary }]}>
            {riskProfile === "conservative" ? "🛡️" : riskProfile === "aggressive" ? "🚀" : "⚖️"} {riskProfile ?? "balanced"}
          </Text>
        </TouchableOpacity>
      </View>
      {alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  title: { fontSize: 15, fontFamily: "Inter_700Bold" },
  profileBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  profileBtnText: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "capitalize" },
  alert: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  alertTop: { flexDirection: "row", gap: 10 },
  alertIcon: { fontSize: 22, marginTop: 1 },
  alertBody: { flex: 1, gap: 3 },
  alertTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  alertMessage: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  actionPill: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  actionText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
