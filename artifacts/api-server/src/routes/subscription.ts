import { and, eq, ne } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod/v4";

import { db, users } from "@workspace/db";
import { getEffectiveTier, normalizeTier } from "../lib/tier";
import { requireAuth } from "../middleware/auth";
import {
  isAppleConfigured,
  isGoogleConfigured,
  validateAppleReceipt,
  validateGooglePurchase,
  type IAPValidationResult,
} from "../services/iap-validation";

const router = Router();

const PRODUCT_ID = "prediqsai_pro_monthly";
const PURCHASE_TOKEN_ALREADY_LINKED_ERROR =
  "This Google Play purchase is already linked to another account";

function isPurchaseTokenUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const databaseError = error as {
    code?: unknown;
    constraint?: unknown;
    cause?: unknown;
  };

  if (
    databaseError.code === "23505" &&
    typeof databaseError.constraint === "string" &&
    databaseError.constraint.includes("iap_purchase_token")
  ) {
    return true;
  }

  return isPurchaseTokenUniqueViolation(databaseError.cause);
}

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

const verifyIAPSchema = z.discriminatedUnion("platform", [
  z.object({
    platform: z.literal("android"),
    productId: z.string().min(1).max(255),
    purchaseToken: z.string().min(1).max(4096),
  }).strict(),
  z.object({
    platform: z.literal("ios"),
    productId: z.string().min(1).max(255),
    transactionReceipt: z.string().min(1).max(100_000),
  }).strict(),
]);

/**
 * Validates a purchase with the relevant store. The tier is upgraded ONLY when
 * the store explicitly confirms the receipt is valid and currently active —
 * client-supplied transaction IDs and expiry hints are never trusted.
 */
async function validateWithStore(input: {
  platform: "ios" | "android";
  productId: string;
  purchaseToken?: string;
  transactionReceipt?: string;
}): Promise<IAPValidationResult> {
  if (input.platform === "ios") {
    if (!isAppleConfigured()) {
      return { valid: false, reason: "not_configured" };
    }
    if (!input.transactionReceipt) {
      return { valid: false, reason: "transactionReceipt is required for iOS purchases" };
    }
    return validateAppleReceipt(input.transactionReceipt, input.productId);
  }

  if (!isGoogleConfigured()) {
    return { valid: false, reason: "not_configured" };
  }
  if (!input.purchaseToken) {
    return { valid: false, reason: "purchaseToken is required for Android purchases" };
  }
  return validateGooglePurchase(input.purchaseToken, input.productId);
}

router.post("/subscription/iap/verify", requireAuth, async (req, res) => {
  const body = verifyIAPSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid purchase data" });
    return;
  }

  const { platform, productId } = body.data;
  const purchaseToken = platform === "android" ? body.data.purchaseToken : undefined;
  const transactionReceipt = platform === "ios" ? body.data.transactionReceipt : undefined;

  if (productId !== PRODUCT_ID) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const result = await validateWithStore({ platform, productId, purchaseToken, transactionReceipt });

  if (result.reason === "not_configured") {
    req.log.error({ platform }, "IAP validation credentials missing — refusing to grant premium");
    res.status(503).json({ error: "Purchase verification is temporarily unavailable" });
    return;
  }

  if (!result.valid || !result.expiresAt) {
    req.log.warn({ platform, reason: result.reason, userId: req.userId }, "IAP verification rejected");
    res.status(400).json({ error: "Purchase could not be verified" });
    return;
  }

  // A verified Google Play token can belong to exactly one PrediQs account.
  // This blocks token replay against another authenticated user.
  if (platform === "android") {
    const [tokenOwner] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.iapPurchaseToken, purchaseToken!), ne(users.id, req.userId!)))
      .limit(1);
    if (tokenOwner) {
      req.log.warn({ userId: req.userId }, "IAP verification rejected — purchase token belongs to another user");
      res.status(409).json({ error: PURCHASE_TOKEN_ALREADY_LINKED_ERROR });
      return;
    }
  }

  // Expiry and transaction ID come from the store's response, never the client.
  let updated: { id: number; tier: string };
  try {
    [updated] = await db
      .update(users)
      .set({
        tier: "premium",
        // Only the store-confirmed transaction ID is persisted — never client input.
        iapTransactionId: result.transactionId ?? null,
        iapPurchaseToken: platform === "android" ? purchaseToken! : null,
        iapPlatform: platform,
        iapExpiresAt: result.expiresAt,
      })
      .where(eq(users.id, req.userId!))
      .returning({ id: users.id, tier: users.tier });
  } catch (error) {
    if (platform === "android" && isPurchaseTokenUniqueViolation(error)) {
      req.log.warn(
        { userId: req.userId },
        "IAP verification rejected — purchase token was linked to another user during verification",
      );
      res.status(409).json({ error: PURCHASE_TOKEN_ALREADY_LINKED_ERROR });
      return;
    }
    throw error;
  }

  res.json({ tier: updated.tier, success: true, expiresAt: result.expiresAt });
});

// ─── IAP: Restore purchases ──────────────────────────────────────────────────

const restoreIAPSchema = z.discriminatedUnion("platform", [
  z.object({
    platform: z.literal("android"),
    purchases: z.array(z.object({
      productId: z.string().min(1).max(255),
      purchaseToken: z.string().min(1).max(4096),
      // Accepted only so already-released clients can restore after an API update.
      transactionId: z.string().max(255).optional(),
      planMonths: z.union([z.literal(1), z.literal(6), z.literal(12)]).optional(),
    }).strict()),
  }).strict(),
  z.object({
    platform: z.literal("ios"),
    purchases: z.array(z.object({
      productId: z.string().min(1).max(255),
      transactionReceipt: z.string().min(1).max(100_000),
      transactionId: z.string().max(255).optional(),
      planMonths: z.union([z.literal(1), z.literal(6), z.literal(12)]).optional(),
    }).strict()),
  }).strict(),
]);

router.post("/subscription/iap/restore", requireAuth, async (req, res) => {
  const body = restoreIAPSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid restore data" });
    return;
  }

  const { platform, purchases } = body.data;
  const candidates = purchases.filter((p) => p.productId === PRODUCT_ID);

  if (candidates.length === 0) {
    res.json({ tier: "free", restored: false });
    return;
  }

  // Validate each candidate with the store; grant only on explicit confirmation.
  let confirmed: { result: IAPValidationResult; purchaseToken?: string } | null = null;
  let sawNotConfigured = false;

  for (const purchase of candidates) {
    const purchaseToken = "purchaseToken" in purchase ? purchase.purchaseToken : undefined;
    const transactionReceipt = "transactionReceipt" in purchase ? purchase.transactionReceipt : undefined;
    const result = await validateWithStore({
      platform,
      productId: purchase.productId,
      purchaseToken,
      transactionReceipt,
    });
    if (result.reason === "not_configured") {
      sawNotConfigured = true;
      break;
    }
    if (result.valid && result.expiresAt) {
      confirmed = { result, purchaseToken };
      break;
    }
  }

  if (sawNotConfigured) {
    req.log.error({ platform }, "IAP validation credentials missing — refusing to restore premium");
    res.status(503).json({ error: "Purchase verification is temporarily unavailable" });
    return;
  }

  if (!confirmed) {
    req.log.warn({ platform, userId: req.userId }, "IAP restore rejected — no store-confirmed active purchase");
    res.json({ tier: "free", restored: false });
    return;
  }

  const restoredSubscription = {
    tier: "premium",
    // Only the store-confirmed transaction ID is persisted — never client input.
    iapTransactionId: confirmed.result.transactionId ?? null,
    iapPurchaseToken: platform === "android" ? confirmed.purchaseToken! : null,
    iapPlatform: platform,
    iapExpiresAt: confirmed.result.expiresAt!,
  };

  const [updated] = platform === "android"
    ? await db.transaction(async (tx) => {
      // A valid Play entitlement follows the purchaser, not an abandoned
      // PrediQs account. Clear a prior owner before assigning the unique token
      // to the current user so both changes commit or roll back together.
      await tx
        .update(users)
        .set({
          tier: "free",
          iapTransactionId: null,
          iapPurchaseToken: null,
          iapPlatform: null,
          iapExpiresAt: null,
        })
        .where(and(eq(users.iapPurchaseToken, confirmed.purchaseToken!), ne(users.id, req.userId!)));

      return tx
        .update(users)
        .set(restoredSubscription)
        .where(eq(users.id, req.userId!))
        .returning({ id: users.id, tier: users.tier });
    })
    : await db
      .update(users)
      .set(restoredSubscription)
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
