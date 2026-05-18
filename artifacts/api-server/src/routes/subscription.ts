import { eq } from "drizzle-orm";
import { Router } from "express";

import { db, users } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAuth } from "../middleware/auth";

const router = Router();

const PLANS = {
  free: {
    name: "Free",
    price: 0,
    features: ["5 picks per day", "Basic confidence scores", "AI assistant (10 messages/day)"],
  },
  pro: {
    name: "Pro",
    price: 9.99,
    priceId: process.env.STRIPE_PRICE_PRO ?? null,
    features: [
      "Unlimited picks",
      "Full AI analysis & reasoning",
      "Sharp money signals",
      "Kelly criterion calculator",
      "AI assistant (unlimited)",
    ],
  },
  elite: {
    name: "Elite",
    price: 24.99,
    priceId: process.env.STRIPE_PRICE_ELITE ?? null,
    features: [
      "Everything in Pro",
      "Real-time odds & line movement",
      "Exclusive high-confidence models",
      "Performance analytics",
      "Priority support",
    ],
  },
};

router.get("/subscription/plans", (_req, res) => {
  res.json(PLANS);
});

router.get("/subscription/status", requireAuth, async (req, res) => {
  const [user] = await db
    .select({ tier: users.tier, stripeSubscriptionId: users.stripeSubscriptionId })
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);

  res.json({ tier: user?.tier ?? "free", subscriptionId: user?.stripeSubscriptionId ?? null });
});

router.post("/subscription/checkout", requireAuth, async (req, res) => {
  const { tier } = req.body as { tier: "pro" | "elite" };

  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(503).json({ error: "Payment system not yet configured — add STRIPE_SECRET_KEY" });
    return;
  }

  try {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const plan = PLANS[tier];

    if (!plan?.priceId) {
      res.status(400).json({ error: "Price ID not configured for this plan" });
      return;
    }

    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    const origin = req.headers.origin ?? `https://${req.headers.host}`;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${origin}/?subscription=success`,
      cancel_url: `${origin}/?subscription=cancel`,
      customer_email: user?.email,
      metadata: { userId: String(req.userId), tier },
    });

    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "Stripe checkout error");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Stripe webhook — needs raw body (configured in app.ts)
router.post("/subscription/webhook", async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(503).json({ error: "Webhook not configured" });
    return;
  }

  try {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers["stripe-signature"] as string;
    const event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as unknown as { metadata: { userId: string; tier: string }; customer: string; subscription: string };
      const { userId, tier } = session.metadata;
      await db
        .update(users)
        .set({ tier, stripeCustomerId: session.customer, stripeSubscriptionId: session.subscription })
        .where(eq(users.id, parseInt(userId)));
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as { id: string };
      await db
        .update(users)
        .set({ tier: "free", stripeSubscriptionId: null })
        .where(eq(users.stripeSubscriptionId, sub.id));
    }

    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, "Stripe webhook error");
    res.status(400).json({ error: "Webhook processing failed" });
  }
});

export default router;
