import { eq } from "drizzle-orm";
import { Router } from "express";

import { db, users } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import {
  type ArbRegion,
  BOOKMAKER_META,
  CURRENCIES,
  REGION_DISCLAIMERS,
  calculateStakes,
  getLiveExchangeRates,
  scanByRegion,
} from "../services/arbitrage-engine";

const router = Router();

function parseRegion(raw: unknown): ArbRegion {
  const valid: ArbRegion[] = ["global", "us", "uk", "africa", "asia"];
  return valid.includes(raw as ArbRegion) ? (raw as ArbRegion) : "global";
}

/**
 * Returns the user's effective tier, considering admin overrides and active free trials.
 * This mirrors the logic in the admin panel and frontend.
 */
function getEffectiveTier(user: {
  tier: string;
  manualTierOverride: string | null;
  freeTrialUntil: Date | null;
} | undefined): string {
  if (!user) return "free";
  if (user.manualTierOverride) return user.manualTierOverride;
  if (user.freeTrialUntil && new Date(user.freeTrialUntil) > new Date()) return "premium";
  return user.tier === "premium" ? "premium" : (user.tier ?? "free");
}

// GET /api/arbitrage — scan for current opportunities (tier-gated)
router.get("/arbitrage", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
    const effectiveTier = getEffectiveTier(user);
    const region = parseRegion(req.query["region"]);

    const all = await scanByRegion(region);

    // Tier gating: premium gets everything, free gets a locked teaser
    let opportunities;
    if (effectiveTier === "premium") {
      opportunities = all;
    } else {
      opportunities = all.slice(0, 1).map((o) => ({ ...o, legs: [] as typeof o.legs }));
    }

    res.json({
      opportunities,
      totalFound: all.length,
      lastScanned: new Date().toISOString(),
      hasApiKey: !!process.env["ODDS_API_KEY"],
      tier: user?.tier ?? "free",
      effectiveTier,
      region,
      disclaimer: REGION_DISCLAIMERS[region] ?? REGION_DISCLAIMERS["global"],
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
    if (getEffectiveTier(user) !== "premium") {
      res.status(403).json({ error: "Real-time scanning requires Premium tier" });
      return;
    }
    const region = parseRegion((req.body as Record<string, unknown>)?.["region"]);
    const opportunities = await scanByRegion(region, true);
    res.json({
      opportunities,
      totalFound: opportunities.length,
      lastScanned: new Date().toISOString(),
      region,
      disclaimer: REGION_DISCLAIMERS[region] ?? REGION_DISCLAIMERS["global"],
    });
  } catch (err) {
    req.log.error({ err }, "Arbitrage force scan failed");
    res.status(500).json({ error: "Scan failed" });
  }
});

// POST /api/arbitrage/calculate — stake calculator
router.post("/arbitrage/calculate", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
    if (getEffectiveTier(user) !== "premium") {
      res.status(403).json({ error: "Stake calculator requires Premium tier" });
      return;
    }

    const { arbId, budget, region: rawRegion } = req.body as {
      arbId: string;
      budget: number;
      region?: unknown;
    };
    if (!arbId || !budget || budget <= 0) {
      res.status(400).json({ error: "arbId and budget required" });
      return;
    }

    const region = parseRegion(rawRegion);
    const all = await scanByRegion(region);
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

// GET /api/arbitrage/meta — bookmaker trust + currency data
router.get("/arbitrage/meta", requireAuth, async (_req, res) => {
  res.json({ bookmakers: BOOKMAKER_META, currencies: CURRENCIES });
});

// GET /api/arbitrage/rates — live exchange rates (public, no auth needed)
router.get("/arbitrage/rates", async (_req, res) => {
  try {
    const rates = await getLiveExchangeRates();
    const hasApiKey = !!process.env["EXCHANGE_RATE_API_KEY"];
    res.json({
      rates,
      base: "USD",
      source: hasApiKey ? "live" : "static_fallback",
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    // Return static fallback so the mobile app never breaks
    void err;
    res.json({
      rates: { USD: 1, NGN: 1580, KES: 129, GHS: 15.5, ZAR: 18.8, UGX: 3720, GBP: 0.79, EUR: 0.93 },
      base: "USD",
      source: "static_fallback",
      updatedAt: new Date().toISOString(),
    });
  }
});

export default router;
