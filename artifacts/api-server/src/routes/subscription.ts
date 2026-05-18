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
    features: ["5 picks per day", "Basic confidence scores", "AI assistant (10 messages/day)"],
  },
  pro: {
    name: "Pro",
    price: 9.99,
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
    .select({ tier: users.tier })
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);

  res.json({ tier: user?.tier ?? "pro" });
});

// Dev-mode tier switcher — no payment required
const setTierSchema = z.object({
  tier: z.enum(["free", "pro", "elite"]),
});

router.put("/subscription/tier", requireAuth, async (req, res) => {
  const body = setTierSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "tier must be free, pro, or elite" });
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
