import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

import { requireAuth } from "../middleware/auth";
import { getTodaysFixtures, getLiveFixtures, getFixtureDetail } from "../services/soccer-engine";

const router = Router();

router.get("/soccer/fixtures", requireAuth, async (req, res) => {
  try {
    const data = await getTodaysFixtures();
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to get soccer fixtures");
    res.status(500).json({ error: "Failed to fetch soccer fixtures" });
  }
});

router.get("/soccer/live", requireAuth, async (req, res) => {
  try {
    const live = await getLiveFixtures();
    res.json(live);
  } catch (err) {
    req.log.error({ err }, "Failed to get live fixtures");
    res.status(500).json({ error: "Failed to fetch live fixtures" });
  }
});

router.get("/soccer/fixture/:id/detail", requireAuth, async (req, res) => {
  try {
    const fixtureId = parseInt(String(req.params.id), 10);
    if (isNaN(fixtureId)) {
      res.status(400).json({ error: "Invalid fixture ID" });
      return;
    }
    const detail = await getFixtureDetail(fixtureId);
    if (!detail) {
      res.status(404).json({ error: "Match detail not available — API-Sports key required" });
      return;
    }
    res.json(detail);
  } catch (err) {
    req.log.error({ err }, "Failed to get fixture detail");
    res.status(500).json({ error: "Failed to fetch match detail" });
  }
});

router.post("/soccer/preview", requireAuth, async (req, res) => {
  try {
    const { homeTeam, awayTeam, league, sport, prediction, keyFactors, reasoning, confidence } =
      req.body as {
        homeTeam: string;
        awayTeam: string;
        league: string;
        sport: string;
        prediction: string;
        keyFactors: string[];
        reasoning: string;
        confidence: number;
      };

    const outcome = prediction.replace(/_/g, " ");
    const factors = Array.isArray(keyFactors) ? keyFactors.slice(0, 3).join("; ") : "";

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 280,
      messages: [
        {
          role: "user",
          content: `Write a punchy 110-word sports match preview for ${homeTeam} vs ${awayTeam} (${league}, ${sport}).
Oracle AI prediction: ${outcome} at ${confidence}% confidence.
Key factors: ${factors}.
Brief context: ${reasoning?.slice(0, 200) ?? ""}.

Style: concise sports journalist. Cover: team momentum, one key tactical battle, one stat or trend, one area to watch. End with a sharp one-liner. No bullet points — flowing text only. No disclaimers.`,
        },
      ],
    });

    const preview =
      msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    res.json({ preview });
  } catch (err) {
    req.log.error({ err }, "Failed to generate match preview");
    res.status(500).json({ error: "Preview generation failed" });
  }
});

export default router;
