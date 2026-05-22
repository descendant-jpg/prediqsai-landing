import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { matchDetailStore } from "@/lib/matchDetailStore";
import type { SoccerFixture } from "@/lib/api";
import type { Prediction } from "@/types";

function calcRTP(fixture: SoccerFixture): { rtpHome: number; rtpAway: number; dominant: string; diff: number } {
  const scoreDiff = (fixture.homeScore ?? 0) - (fixture.awayScore ?? 0);
  const momentum = scoreDiff * 8;
  const confBias = (fixture.confidence - 65) * 0.4;
  const rtpHome = Math.min(85, Math.max(20, 50 + momentum + confBias));
  const rtpAway = 100 - rtpHome;
  const dominant = rtpHome > 50 ? fixture.homeTeam : fixture.awayTeam;
  return {
    rtpHome: Math.round(rtpHome),
    rtpAway: Math.round(rtpAway),
    dominant,
    diff: Math.abs(Math.round(rtpHome - rtpAway)),
  };
}

function fixtureToPrediction(f: SoccerFixture): Prediction {
  return {
    id: `soccer-${f.id}`,
    sport: "soccer",
    league: f.leagueName,
    homeTeam: f.homeTeam,
    awayTeam: f.awayTeam,
    matchDate: f.kickoff,
    prediction: f.prediction,
    confidence: f.confidence,
    riskLevel: f.riskLevel,
    volatilityScore: 5,
    isTrapGame: false,
    avoidMatch: false,
    avoidReason: null,
    reasoning: `Live AI analysis for ${f.homeTeam} vs ${f.awayTeam} in ${f.leagueName}. Current score: ${f.homeScore ?? 0}-${f.awayScore ?? 0} (${f.elapsed ?? "?"}').`,
    keyFactors: [
      `${f.homeTeam} playing at home`,
      `Match in progress — ${f.elapsed ?? "?"}' elapsed`,
      `AI Confidence: ${f.confidence}%`,
    ],
    againstFactors: [],
    weatherImpact: null,
    sharpMoneySignal: null,
    aiProbability: f.confidence,
    bookmakerProbability: Math.max(30, f.confidence - 8),
    valueDetected: f.valueDetected,
    tierRequired: "free",
    simulationData: null,
    agentScores: null,
    publicBacking: null,
  };
}

interface Props {
  fixture: SoccerFixture;
}

export function LiveMatchCard({ fixture }: Props) {
  const colors = useColors();
  const router = useRouter();
  const rtp = calcRTP(fixture);
  const rtpPositive = rtp.rtpHome > 50;
  const rtpColor = rtpPositive ? "#00FF94" : "#FF6B35";
  const rtpLabel = `+${rtp.diff}% ${rtp.dominant}`;

  const predLabel =
    fixture.prediction === "home_win"
      ? fixture.homeTeam
      : fixture.prediction === "away_win"
        ? fixture.awayTeam
        : "DRAW";

  function handleTap() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    matchDetailStore.set(fixtureToPrediction(fixture), fixture.id);
    router.push("/match-detail");
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={handleTap}
      activeOpacity={0.85}
    >
      <View style={styles.liveRow}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <Text style={[styles.elapsed, { color: colors.textMuted }]}>{fixture.elapsed ?? "?"}'</Text>
        <Text style={[styles.league, { color: colors.textMuted }]}>
          {fixture.leagueFlag} {fixture.leagueName}
        </Text>
      </View>

      <View style={styles.scoreRow}>
        <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
          {fixture.homeTeam}
        </Text>
        <View style={[styles.scoreBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.scoreText, { color: colors.text }]}>
            {fixture.homeScore ?? 0} - {fixture.awayScore ?? 0}
          </Text>
        </View>
        <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
          {fixture.awayTeam}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.rtpBlock}>
          <Text style={[styles.rtpLabel, { color: colors.textMuted }]}>Real-Time Power</Text>
          <Text style={[styles.rtpValue, { color: rtpColor }]}>{rtpLabel} →</Text>
        </View>
        <View style={[styles.predBadge, { backgroundColor: "rgba(0,229,255,0.08)", borderColor: colors.cyan }]}>
          <Text style={[styles.predText, { color: colors.cyan }]}>{predLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 10,
  },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,77,77,0.15)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF4D4D" },
  liveText: { color: "#FF4D4D", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  elapsed: { fontSize: 12, fontFamily: "Inter_500Medium" },
  league: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  teamName: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  scoreBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  scoreText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rtpBlock: { gap: 2 },
  rtpLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  rtpValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  predBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  predText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
});
