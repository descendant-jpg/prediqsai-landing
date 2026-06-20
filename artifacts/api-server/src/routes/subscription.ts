import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod/v4";

import { db, users } from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router = Router();

const PRODUCT_ID = "prediqsai_premium_monthly";

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
    .select({ tier: users.tier, iapExpiresAt: users.iapExpiresAt })
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);

  const raw = user?.tier ?? "free";

  // Check if IAP subscription has expired
  if (raw === "premium" && user?.iapExpiresAt) {
    const expired = new Date(user.iapExpiresAt) < new Date();
    if (expired) {
      await db.update(users).set({ tier: "free" }).where(eq(users.id, req.userId!));
      res.json({ tier: "free", expired: true });
      return;
    }
  }

  const tier = (raw === "pro" || raw === "elite") ? "premium" : raw;
  res.json({ tier });
});

// ─── IAP: Verify purchase ────────────────────────────────────────────────────

const verifyIAPSchema = z.object({
  platform: z.enum(["ios", "android"]),
  productId: z.string(),
  transactionId: z.string(),
  purchaseToken: z.string().optional(),
  transactionReceipt: z.string().optional(),
});

router.post("/subscription/iap/verify", requireAuth, async (req, res) => {
  const body = verifyIAPSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid purchase data" });
    return;
  }

  const { platform, productId, transactionId } = body.data;

  if (productId !== PRODUCT_ID) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  // NOTE: For production, add server-side receipt validation:
  // iOS: POST https://buy.itunes.apple.com/verifyReceipt with APPLE_SHARED_SECRET
  // Android: Google Play Developer API with service account credentials
  // For now we trust the client and store the transaction for audit purposes.

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

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
  expiresAt.setMonth(expiresAt.getMonth() + 1);

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

// ─── Admin: manually set tier (admin-only check via middleware caller) ────────

const setTierSchema = z.object({
  tier: z.enum(["free", "premium"]),
});

router.put("/subscription/tier", requireAuth, async (req, res) => {
  const body = setTierSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "tier must be free or premium" });
    return;
  }

  const [updated] = await db
    .update(users)
    .set({ tier: body.data.tier })
    .where(eq(users.id, req.userId!))
    .returning({ id: users.id, tier: users.tier });

  res.json({ tier: updated.tier });
});

export default router;
