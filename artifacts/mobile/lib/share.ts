import { Platform, Share } from "react-native";

import { bestBookmaker, type ProPick } from "@/lib/mockData";

function pickShareText(pick: ProPick): string {
  const best = bestBookmaker(pick.bookmakerOdds);
  return [
    "🎯 PrediqsAI Pick",
    `⚽ ${pick.homeTeam} vs ${pick.awayTeam}`,
    `📌 Pick: ${pick.aiPick}`,
    `💯 Confidence: ${pick.confidence}%`,
    `💰 Best Odds: ${best.odds.toFixed(2)} on ${best.name}`,
    "",
    "Get AI-powered picks at prediqsai.app",
  ].join("\n");
}

function slipShareText(picks: ProPick[]): string {
  const combined = picks.reduce((acc, p) => acc * p.odds, 1);
  const lines = [
    "🎯 PrediqsAI Bet Slip",
    "",
    ...picks.map(
      (p) => `⚽ ${p.homeTeam} vs ${p.awayTeam}\n📌 ${p.aiPick} @ ${p.odds.toFixed(2)}`,
    ),
    "",
    `💯 Combined Odds: ${combined.toFixed(2)}`,
    "",
    "Get AI-powered picks at prediqsai.app",
  ];
  return lines.join("\n");
}

async function shareText(text: string): Promise<"shared" | "copied"> {
  if (Platform.OS === "web") {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // best-effort
    }
    return "copied";
  }
  await Share.share({ message: text });
  return "shared";
}

export async function sharePick(pick: ProPick): Promise<"shared" | "copied"> {
  return shareText(pickShareText(pick));
}

export async function shareSlip(picks: ProPick[]): Promise<"shared" | "copied"> {
  return shareText(slipShareText(picks));
}
