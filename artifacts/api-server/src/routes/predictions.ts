import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { getPredictions, refreshPredictions } from "../services/prediction-engine";

const router = Router();

router.get("/predictions", requireAuth, async (req, res) => {
  try {
    const preds = await getPredictions();
    res.json(preds);
  } catch (err) {
    req.log.error({ err }, "Failed to get predictions");
    res.status(500).json({ error: "Failed to fetch predictions" });
  }
});

router.post("/predictions/refresh", requireAuth, async (req, res) => {
  try {
    const preds = await refreshPredictions();
    res.json({ count: preds.length, message: "Predictions refreshed" });
  } catch (err) {
    req.log.error({ err }, "Failed to refresh predictions");
    res.status(500).json({ error: "Failed to refresh predictions" });
  }
});

export default router;
