import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { getTodaysFixtures, getLiveFixtures } from "../services/soccer-engine";

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

export default router;
