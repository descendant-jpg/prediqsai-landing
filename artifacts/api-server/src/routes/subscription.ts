import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod/v4";

import { db, users } from "@workspace/db";
import { getEffectiveTier, normalizeTier } from "../lib/tier";
import { requireAuth } from "../middleware/auth";

const router = Router();

const PRODUCT_ID = "prediqsai_pro_monthly";

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
    price: 19.99,
    productId: PRODUCT_ID,
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
    .select({
      tier: users.tier,
      iapExpiresAt: users.iapExpiresAt,
      manualTierOverride: users.manualTierOverride,
      freeTrialUntil: users.freeTrialUntil,
    })
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);

  // Check if the paid IAP subscription has expired.
  // Manual overrides and active free trials are exempt from the downgrade.
  const trialActive = !!(user?.freeTrialUntil && new Date(user.freeTrialUntil) > new Date());
  if (
    normalizeTier(user?.tier) === "premium" &&
    !normalizeTier(user?.manualTierOverride) &&
    !trialActive &&
    user?.iapExpiresAt
  ) {
    const expired = new Date(user.iapExpiresAt) < new Date();
    if (expired) {
      await db.update(users).set({ tier: "free" }).where(eq(users.id, req.userId!));
      res.json({ tier: "free", expired: true });
      return;
    }
  }

  res.json({ tier: getEffectiveTier(user) });
});

// ─── IAP: Verify purchase ────────────────────────────────────────────────────

// Allowed access durations (months) — one per base plan: monthly / semi-annual / annual.
const planMonthsSchema = z.union([z.literal(1), z.literal(6), z.literal(12)]);

const verifyIAPSchema = z.object({
  platform: z.enum(["ios", "android"]),
  productId: z.string(),
  transactionId: z.string(),
  purchaseToken: z.string().optional(),
  transactionReceipt: z.string().optional(),
  planMonths: planMonthsSchema.optional(),
});

router.post("/subscription/iap/verify", requireAuth, async (req, res) => {
  const body = verifyIAPSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid purchase data" });
    return;
  }

  const { platform, productId, transactionId, planMonths } = body.data;

  if (productId !== PRODUCT_ID) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  // NOTE: For production, add server-side receipt validation:
  // iOS: POST https://buy.itunes.apple.com/verifyReceipt with APPLE_SHARED_SECRET
  // Android: Google Play Developer API with service account credentials
  // For now we trust the client and store the transaction for audit purposes.

  // All three base plans share the same product ID; the client reports which one
  // was purchased so we grant the correct access window (default monthly).
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + (planMonths ?? 1));

  const [updated] = await db
    .update(users)
    .set({
      tier: "premium",
      iapTransactionId: transactionId,
      iapPlatform: platform,
      iapExpiresAt: expiresAt,
    })
    .where(eq(users.id, req.userId!))
    .returning({ id: users.id, tier: users.tier });

  res.json({ tier: updated.tier, success: true, expiresAt });
});

// ─── IAP: Restore purchases ──────────────────────────────────────────────────

const restoreIAPSchema = z.object({
  platform: z.enum(["ios", "android"]),
  purchases: z.array(
    z.object({
      productId: z.string(),
      transactionId: z.string(),
      purchaseToken: z.string().optional(),
      planMonths: planMonthsSchema.optional(),
    }),
  ),
});

router.post("/subscription/iap/restore", requireAuth, async (req, res) => {
  const body = restoreIAPSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid restore data" });
    return;
  }

  const { platform, purchases } = body.data;
  const validPurchase = purchases.find((p) => p.productId === PRODUCT_ID);

  if (!validPurchase) {
    res.json({ tier: "free", restored: false });
    return;
  }

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + (validPurchase.planMonths ?? 1));

  const [updated] = await db
    .update(users)
    .set({
      tier: "premium",
      iapTransactionId: validPurchase.transactionId,
      iapPlatform: platform,
      iapExpiresAt: expiresAt,
    })
    .where(eq(users.id, req.userId!))
    .returning({ id: users.id, tier: users.tier });

  res.json({ tier: updated.tier, restored: true });
});

// ─── Self-service tier change (downgrade only) ───────────────────────────────

const setTierSchema = z.object({
  tier: z.enum(["free", "premium"]),
});

router.put("/subscription/tier", requireAuth, async (req, res) => {
  const body = setTierSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "tier must be free or premium" });
    return;
  }

  // Users may only self-downgrade. Upgrades must go through verified IAP
  // (POST /subscription/iap/verify) or the admin panel (PUT /admin/users/:id).
  if (body.data.tier !== "free") {
    res.status(403).json({ error: "Upgrades must be purchased" });
    return;
  }

  const [updated] = await db
    .update(users)
    .set({ tier: "free", manualTierOverride: null, freeTrialUntil: null })
    .where(eq(users.id, req.userId!))
    .returning({ id: users.id, tier: users.tier });

  res.json({ tier: updated.tier });
});

export default router;
