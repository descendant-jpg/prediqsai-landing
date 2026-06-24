import { Router } from "express";

import { anthropic } from "@workspace/integrations-anthropic-ai";
import { requireAuth } from "../middleware/auth";
import { withExperiencePersona } from "../lib/experiencePersona";
import { logger } from "../lib/logger";

const router = Router();

const SLIP_SYSTEM_PROMPT = `You are PrediQs AI slip analyzer. You are an expert sports betting analyst.
Analyze this bet slip image carefully.

Extract every selection and return ONLY valid JSON with no markdown, no commentary, just the raw JSON object:
{
  "bookmaker": string,
  "slip_type": "single|accumulator|system",
  "total_odds": number,
  "stake": number or null,
  "potential_payout": number or null,
  "selections": [
    {
      "match": string,
      "home_team": string,
      "away_team": string,
      "market": string,
      "selection": string,
      "odds": number,
      "sport": string,
      "league": string,
      "match_date": string,
      "ai_confidence": number,
      "status": "STRONG|GOOD|RISKY|AVOID",
      "reasoning": string,
      "alternative": string or null
    }
  ],
  "overall_rating": number,
  "verdict": "PLACE IT|MODIFY|AVOID",
  "verdict_reason": string,
  "weakest_leg": string,
  "strongest_leg": string,
  "win_probability": number,
  "recommendations": [string],
  "safer_alternative": string or null,
  "kelly_stake": number or null
}`;

const TEXT_ANALYSIS_PROMPT = `You are PrediQs AI slip analyzer. You are an expert sports betting analyst.
The user has manually typed their bet slip selections. Analyze them carefully.

Return ONLY valid JSON with no markdown, no commentary:
{
  "bookmaker": string,
  "slip_type": "single|accumulator|system",
  "total_odds": number,
  "stake": number or null,
  "potential_payout": number or null,
  "selections": [
    {
      "match": string,
      "home_team": string,
      "away_team": string,
      "market": string,
      "selection": string,
      "odds": number,
      "sport": string,
      "league": string,
      "match_date": string,
      "ai_confidence": number,
      "status": "STRONG|GOOD|RISKY|AVOID",
      "reasoning": string,
      "alternative": string or null
    }
  ],
  "overall_rating": number,
  "verdict": "PLACE IT|MODIFY|AVOID",
  "verdict_reason": string,
  "weakest_leg": string,
  "strongest_leg": string,
  "win_probability": number,
  "recommendations": [string],
  "safer_alternative": string or null,
  "kelly_stake": number or null
}`;

// POST /api/slip/analyze — analyze a bet slip image (base64) or text
router.post("/slip/analyze", requireAuth, async (req, res) => {
  const { imageBase64, mediaType, textInput } = req.body as {
    imageBase64?: string;
    mediaType?: string;
    textInput?: string;
  };

  if (!imageBase64 && !textInput) {
    res.status(400).json({ error: "Provide imageBase64 or textInput" });
    return;
  }

  try {
    type ContentBlock =
      | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/webp"; data: string } }
      | { type: "text"; text: string };

    let content: ContentBlock[] | string;

    if (imageBase64) {
      const mimeType = (mediaType as "image/jpeg" | "image/png" | "image/webp") ?? "image/jpeg";
      content = [
        {
          type: "image" as const,
          source: { type: "base64" as const, media_type: mimeType, data: imageBase64 },
        },
        {
          type: "text" as const,
          text: "Analyze this bet slip and return JSON exactly as specified in the system prompt.",
        },
      ];
    } else {
      content = `Analyze these bet slip selections:\n\n${textInput}`;
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: withExperiencePersona(imageBase64 ? SLIP_SYSTEM_PROMPT : TEXT_ANALYSIS_PROMPT, req),
      messages: [{ role: "user", content: content as Parameters<typeof anthropic.messages.create>[0]["messages"][0]["content"] }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";

    // Strip any accidental markdown fences
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const analysis = JSON.parse(cleaned);
    res.json({ analysis });
  } catch (err) {
    req.log.error({ err }, "Slip analysis failed");
    res.status(500).json({ error: "Failed to analyze slip" });
  }
});

export default router;
