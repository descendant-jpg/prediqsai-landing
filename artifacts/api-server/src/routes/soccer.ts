import { Router } from "express";

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

export default router;
