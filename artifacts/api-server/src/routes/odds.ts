import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { getCachedOddsTicker } from "../services/odds-ticker";

const router = Router();

router.get("/odds/ticker", requireAuth, async (req, res) => {
  try {
    res.json(getCachedOddsTicker());
  } catch (err) {
    req.log.error({ err }, "Failed to read odds ticker cache");
    res.status(500).json({ error: "Failed to read odds ticker cache" });
  }
});

export default router;
