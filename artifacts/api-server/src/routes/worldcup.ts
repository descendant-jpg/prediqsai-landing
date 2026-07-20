import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  AFRICAN_TEAMS,
  WC_WINNER_ODDS,
  generateWCPrediction,
  getCountdown,
  getDemoWCArb,
  getWCFixtures,
} from "../services/worldcup-engine";

const router = Router();

// GET /api/worldcup/countdown
router.get("/worldcup/countdown", async (_req, res) => {
  res.json(getCountdown());
});

// GET /api/worldcup/overview  (public — no auth needed for countdown/splash)
router.get("/worldcup/overview", async (_req, res) => {
  res.json({
    countdown: getCountdown(),
    winnerOdds: WC_WINNER_ODDS,
    africanTeams: AFRICAN_TEAMS.slice(0, 6),
    demoArb: getDemoWCArb(),
  });
});

// GET /api/worldcup/fixtures  (auth required)
router.get("/worldcup/fixtures", requireAuth, async (req, res) => {
  try {
    const fixtures = await getWCFixtures();
    // Attach predictions for first 4 upcoming fixtures
    const upcoming = fixtures
      .filter((f) => f.status === "NS" || f.status === "1H" || f.status === "2H")
      .slice(0, 6);

    const withPreds = await Promise.all(
      upcoming.map(async (f) => {
        const prediction = await generateWCPrediction(f.homeTeam, f.awayTeam).catch(() => null);
        return { ...f, prediction };
      }),
    );
    res.json({ fixtures: withPreds, total: fixtures.length });
  } catch (err) {
    req.log.error({ err }, "WC fixtures failed");
    res.status(500).json({ error: "Failed to load fixtures" });
  }
});

// GET /api/worldcup/african-teams
router.get("/worldcup/african-teams", requireAuth, async (_req, res) => {
  res.json({ teams: AFRICAN_TEAMS });
});

// POST /api/worldcup/predict  (auth required)
router.post("/worldcup/predict", requireAuth, async (req, res) => {
  const { homeTeam, awayTeam } = req.body as { homeTeam?: string; awayTeam?: string };
  // Team names go into an AI prompt — restrict to a plausible team-name shape
  // (letters, spaces, common punctuation, max 60 chars) to block injected instructions.
  const TEAM_RE = /^[\p{L}\p{M}0-9 .'&()-]{2,60}$/u;
  if (!homeTeam || !awayTeam || !TEAM_RE.test(homeTeam) || !TEAM_RE.test(awayTeam)) {
    res.status(400).json({ error: "Valid homeTeam and awayTeam required" });
    return;
  }
  try {
    const prediction = await generateWCPrediction(homeTeam, awayTeam);
    if (!prediction) {
      res.status(503).json({ error: "Prediction unavailable" });
      return;
    }
    res.json(prediction);
  } catch (err) {
    req.log.error({ err }, "WC prediction route failed");
    res.status(500).json({ error: "Prediction failed" });
  }
});

export default router;
