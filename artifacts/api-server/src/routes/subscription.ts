import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod/v4";

import { db, users } from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router = Router();

const PLANS = {
  free: {
    name: "Free",
    price: 0,
    features: [
      "2 picks/day (soccer + Premier League only)",
      "Basic confidence % shown",
      "3 Oracle AI messages/day",
      "Bankroll tracker (basic)",
      "Leaderboard (view only)",
    ],
  },
  premium: {
    name: "Premium",
    price: 39.99,
    annualPrice: 433,
    annualSavePct: 5,
    features: [
      "Unlimited picks all sports & leagues",
      "Full AI reasoning + risk badges",
      "ARB Scanner (40+ bookmakers)",
      "Slip Analyzer (unlimited)",
      "Unlimited Oracle AI",
      "Full match detail, H2H & stats",
      "Kelly Criterion calculator",
      "Performance charts & ROI",
      "World Cup 2026 full coverage",
      "All notification types",
      "Priority support",
    ],
  },
};

router.get("/subscription/plans", (_req, res) => {
  res.json(PLANS);
});

router.get("/subscription/status", requireAuth, async (req, res) => {
  const [user] = await db
    .select({ tier: users.tier })
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);

  const raw = user?.tier ?? "free";
  const tier = (raw === "pro" || raw === "elite") ? "premium" : raw;
  res.json({ tier });
});

// Tier switcher — accepts "premium" as well as legacy "pro"/"elite"
const setTierSchema = z.object({
  tier: z.enum(["free", "premium", "pro", "elite"]),
});

router.put("/subscription/tier", requireAuth, async (req, res) => {
  const body = setTierSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "tier must be free or premium" });
    return;
  }

  // Normalize "pro"/"elite" → "premium" on write
  const dbTier = (body.data.tier === "pro" || body.data.tier === "elite")
    ? "premium"
    : body.data.tier;

  const [updated] = await db
    .update(users)
    .set({ tier: dbTier })
    .where(eq(users.id, req.userId!))
    .returning({ id: users.id, tier: users.tier });

  res.json({ tier: updated.tier });
});

export default router;
