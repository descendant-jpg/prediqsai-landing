import { eq } from "drizzle-orm";
import { Router } from "express";

import { db, users } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { calculateStakes, scanForArbitrage } from "../services/arbitrage-engine";

const router = Router();

// GET /api/arbitrage — scan for current opportunities (tier-gated)
router.get("/arbitrage", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
    const tier = user?.tier ?? "free";

    const all = await scanForArbitrage();

    // Tier gating
    let opportunities;
    if (tier === "elite") {
      opportunities = all; // Unlimited, 2-way + 3-way
    } else if (tier === "pro") {
      opportunities = all.filter((o) => o.marketType === "2way").slice(0, 3);
    } else {
      // Free: teaser — single entry, no leg details
      opportunities = all.slice(0, 1).map((o) => ({
        ...o,
        legs: [] as typeof o.legs,
      }));
    }

    res.json({
      opportunities,
      totalFound: all.length,
      lastScanned: new Date().toISOString(),
      hasApiKey: !!process.env["ODDS_API_KEY"],
      tier,
    });
  } catch (err) {
    req.log.error({ err }, "Arbitrage GET failed");
    res.status(500).json({ error: "Failed to scan for arbitrage" });
  }
});

// POST /api/arbitrage/scan — force refresh (Elite only)
router.post("/arbitrage/scan", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
    if (user?.tier !== "elite") {
      res.status(403).json({ error: "Real-time scanning requires Elite tier" });
      return;
    }
    const opportunities = await scanForArbitrage(true);
    res.json({ opportunities, totalFound: opportunities.length, lastScanned: new Date().toISOString() });
  } catch (err) {
    req.log.error({ err }, "Arbitrage force scan failed");
    res.status(500).json({ error: "Scan failed" });
  }
});

// POST /api/arbitrage/calculate — stake calculator
router.post("/arbitrage/calculate", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
    const tier = user?.tier ?? "free";
    if (tier === "free") {
      res.status(403).json({ error: "Stake calculator requires Pro or Elite" });
      return;
    }

    const { arbId, budget } = req.body as { arbId: string; budget: number };
    if (!arbId || !budget || budget <= 0) {
      res.status(400).json({ error: "arbId and budget required" });
      return;
    }

    const all = await scanForArbitrage();
    const arb = all.find((a) => a.id === arbId);
    if (!arb) {
      res.status(404).json({ error: "Opportunity not found or expired" });
      return;
    }

    const stakes = calculateStakes(arb, budget);
    const guaranteedReturn = parseFloat((budget / arb.totalImplied).toFixed(2));
    const guaranteedProfit = parseFloat((guaranteedReturn - budget).toFixed(2));

    res.json({ arb, stakes, guaranteedReturn, guaranteedProfit, profitPercent: arb.profitPercent });
  } catch (err) {
    req.log.error({ err }, "Arb calculation failed");
    res.status(500).json({ error: "Calculation failed" });
  }
});

export default router;
