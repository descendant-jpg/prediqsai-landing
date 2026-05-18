import { Router } from "express";

import { getEnvStatus } from "../lib/validateEnv";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/setup/status", requireAuth, (req, res) => {
  if (req.userId !== 1) {
    res.status(403).json({ error: "Admin access only" });
    return;
  }

  const statuses = getEnvStatus();
  const critical = statuses.filter((s) => s.critical);
  const optional = statuses.filter((s) => !s.critical);
  const allCriticalOk = critical.every((s) => s.configured);
  const configuredCount = statuses.filter((s) => s.configured).length;

  res.json({
    allCriticalOk,
    configuredCount,
    totalCount: statuses.length,
    critical,
    optional,
  });
});

export default router;
