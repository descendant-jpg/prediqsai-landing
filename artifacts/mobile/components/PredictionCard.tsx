import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { RiskBadge } from "@/components/RiskBadge";
import { SportBadge } from "@/components/SportBadge";
import { TierGate } from "@/components/TierGate";
import { useColors } from "@/hooks/useColors";
import type { Prediction } from "@/types";

function predictionLabel(p: Prediction["prediction"]): string {
  switch (p) {
    case "home_win": return "HOME WIN";
    case "away_win": return "AWAY WIN";
    case "draw": return "DRAW";
    case "over": return "OVER";
    case "under": return "UNDER";
  }
}

interface Props {
  prediction: Prediction;
}

export function PredictionCard({ prediction }: Props) {
  const colors = useColors();
  const [modalVisible, setModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  function openModal() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalVisible(true);
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={openModal}
        activeOpacity={0.85}
      >
        {prediction.avoidMatch && (
          <View style={styles.avoidBanner}>
            <Ionicons name="warning" size={12} color="#FF4D4D" />
            <Text style={styles.avoidText}>AVOID</Text>
          </View>
        )}

        <View style={styles.header}>
          <View style={styles.badges}>
            <SportBadge sport={prediction.sport} size="sm" />
            <Text style={[styles.league, { color: colors.textMuted }]}>{prediction.league}</Text>
          </View>
          {prediction.valueDetected && (
            <View style={[styles.valueBadge, { borderColor: colors.gold }]}>
              <Text style={[styles.valueText, { color: colors.gold }]}>VALUE</Text>
            </View>
          )}
        </View>

        <View style={styles.matchup}>
          <Text style={[styles.team, { color: colors.text }]}>{prediction.homeTeam}</Text>
          <Text style={[styles.vs, { color: colors.textMuted }]}>vs</Text>
          <Text style={[styles.team, { color: colors.text }]}>{prediction.awayTeam}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <View style={[styles.predBadge, { backgroundColor: "rgba(0,229,255,0.1)", borderColor: colors.cyan }]}>
              <Text style={[styles.predText, { color: colors.cyan }]}>
                {predictionLabel(prediction.prediction)}
              </Text>
            </View>
            <RiskBadge risk={prediction.riskLevel} />
          </View>
          <ConfidenceMeter value={prediction.confidence} size={52} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Full Analysis</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Feather name="x" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalMatchup}>
              <SportBadge sport={prediction.sport} />
              <Text style={[styles.modalTeams, { color: colors.text }]}>
                {prediction.homeTeam} vs {prediction.awayTeam}
              </Text>
            </View>

            <View style={styles.meterRow}>
              <ConfidenceMeter value={prediction.confidence} size={90} />
              <View style={styles.meterInfo}>
                <Text style={[styles.meterLabel, { color: colors.textSecondary }]}>AI Confidence</Text>
                <View style={[styles.predBadge, { backgroundColor: "rgba(0,229,255,0.1)", borderColor: colors.cyan, alignSelf: "flex-start" }]}>
                  <Text style={[styles.predText, { color: colors.cyan }]}>
                    {predictionLabel(prediction.prediction)}
                  </Text>
                </View>
                <RiskBadge risk={prediction.riskLevel} />
              </View>
            </View>

            <TierGate requiredTier={prediction.tierRequired}>
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.sectionTitle, { color: colors.cyan }]}>AI Reasoning</Text>
                <Text style={[styles.sectionText, { color: colors.text }]}>{prediction.reasoning}</Text>
              </View>
            </TierGate>

            <TierGate requiredTier={prediction.tierRequired === "free" ? "free" : "pro"}>
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.sectionTitle, { color: colors.cyan }]}>Key Factors</Text>
                {prediction.keyFactors.map((f, i) => (
                  <View key={i} style={styles.factorRow}>
                    <Feather name="check-circle" size={14} color={colors.green} />
                    <Text style={[styles.factorText, { color: colors.text }]}>{f}</Text>
                  </View>
                ))}
              </View>
            </TierGate>

            {prediction.againstFactors?.length > 0 && (
              <TierGate requiredTier={prediction.tierRequired === "free" ? "free" : "pro"}>
                <View style={[styles.section, { backgroundColor: "rgba(255,165,0,0.05)", borderColor: "rgba(255,165,0,0.3)" }]}>
                  <Text style={[styles.sectionTitle, { color: "#FFA500" }]}>Risks &amp; Against Factors</Text>
                  {prediction.againstFactors.map((f, i) => (
                    <View key={i} style={styles.factorRow}>
                      <Feather name="alert-triangle" size={14} color="#FFA500" />
                      <Text style={[styles.factorText, { color: colors.text }]}>{f}</Text>
                    </View>
                  ))}
                </View>
              </TierGate>
            )}

            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.cyan }]}>Probability Comparison</Text>
              <View style={styles.probRow}>
                <Text style={[styles.probLabel, { color: colors.textSecondary }]}>AI Model</Text>
                <View style={[styles.probBar, { backgroundColor: colors.border }]}>
                  <View style={[styles.probFill, { width: `${prediction.aiProbability}%` as any, backgroundColor: colors.cyan }]} />
                </View>
                <Text style={[styles.probValue, { color: colors.cyan }]}>{prediction.aiProbability}%</Text>
              </View>
              <View style={styles.probRow}>
                <Text style={[styles.probLabel, { color: colors.textSecondary }]}>Bookmaker</Text>
                <View style={[styles.probBar, { backgroundColor: colors.border }]}>
                  <View style={[styles.probFill, { width: `${prediction.bookmakerProbability}%` as any, backgroundColor: colors.textSecondary }]} />
                </View>
                <Text style={[styles.probValue, { color: colors.textSecondary }]}>{prediction.bookmakerProbability}%</Text>
              </View>
            </View>

            {prediction.sharpMoneySignal && (
              <View style={[styles.section, { backgroundColor: "rgba(0,229,255,0.05)", borderColor: colors.cyan }]}>
                <Text style={[styles.sectionTitle, { color: colors.cyan }]}>Sharp Money Signal</Text>
                <Text style={[styles.sectionText, { color: colors.text }]}>{prediction.sharpMoneySignal}</Text>
              </View>
            )}

            {prediction.avoidMatch && prediction.avoidReason && (
              <View style={[styles.section, { backgroundColor: "rgba(255,77,77,0.08)", borderColor: colors.red }]}>
                <View style={styles.avoidHeader}>
                  <Ionicons name="warning" size={16} color={colors.red} />
                  <Text style={[styles.sectionTitle, { color: colors.red }]}>Avoid Warning</Text>
                </View>
                <Text style={[styles.sectionText, { color: colors.text }]}>{prediction.avoidReason}</Text>
              </View>
            )}

            <View style={styles.disclaimer}>
              <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
                For informational purposes only. Gamble responsibly. 18+ only.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  avoidBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    position: "absolute",
    top: 10,
    right: 12,
  },
  avoidText: {
    color: "#FF4D4D",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  league: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  valueBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "rgba(255,215,0,0.08)",
  },
  valueText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  matchup: {
    alignItems: "center",
    gap: 2,
  },
  team: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  vs: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerLeft: {
    gap: 6,
  },
  predBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  predText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  modal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalMatchup: {
    gap: 8,
    marginBottom: 20,
  },
  modalTeams: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  meterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 20,
  },
  meterInfo: {
    flex: 1,
    gap: 8,
  },
  meterLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  section: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  factorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  factorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  probRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  probLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    width: 72,
  },
  probBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  probFill: {
    height: "100%",
    borderRadius: 3,
  },
  probValue: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    width: 36,
    textAlign: "right",
  },
  avoidHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  disclaimer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  disclaimerText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 16,
  },
});
