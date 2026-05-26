import { and, count, desc, eq, sql, sum } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod/v4";

import {
  affiliateClicks,
  affiliatePartners,
  affiliatePayouts,
  db,
  users,
} from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ─── requireAdmin (inline for this file) ──────────────────────────────────────

async function requireAdmin(
  req: Parameters<typeof requireAuth>[0],
  res: Parameters<typeof requireAuth>[1],
  next: Parameters<typeof requireAuth>[2],
): Promise<void> {
  requireAuth(req, res, async () => {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
    if (!user?.isAdmin && user?.id !== 1) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}

// ─── PUBLIC: GET /affiliate/partners ─────────────────────────────────────────
// Returns active partners for the mobile app (no auth required)

router.get("/affiliate/partners", async (req, res) => {
  try {
    const region = req.query["region"] as string | undefined;
    const partners = await db
      .select()
      .from(affiliatePartners)
      .where(eq(affiliatePartners.isActive, true))
      .orderBy(affiliatePartners.bookName);

    // Filter by region client-side (array contains check)
    const filtered = region
      ? partners.filter((p) => {
          const regions = p.regions ?? ["GLOBAL"];
          return regions.includes(region) || regions.includes("GLOBAL");
        })
      : partners;

    res.json({ partners: filtered });
  } catch {
    res.status(500).json({ error: "Failed to load affiliate partners" });
  }
});

// ─── AUTH: POST /affiliate/click ─────────────────────────────────────────────
// Track a user clicking an affiliate link

const clickSchema = z.object({
  partnerId: z.string().optional(),
  bookName: z.string(),
  affiliateUrl: z.string(),
  source: z.enum(["arb_card", "recommended", "modal"]),
  userRegion: z.string().optional(),
  userCountry: z.string().optional(),
});

router.post("/affiliate/click", requireAuth, async (req, res) => {
  const parsed = clickSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { partnerId, bookName, affiliateUrl, source, userRegion, userCountry } = parsed.data;
  try {
    await db.insert(affiliateClicks).values({
      userId: req.userId!,
      partnerId: partnerId ?? null,
      bookName,
      affiliateUrl,
      source,
      userRegion: userRegion ?? null,
      userCountry: userCountry ?? null,
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to track click" });
  }
});

// ─── ADMIN: GET /admin/affiliates/partners ────────────────────────────────────

router.get("/admin/affiliates/partners", requireAdmin, async (req, res) => {
  try {
    const partners = await db
      .select()
      .from(affiliatePartners)
      .orderBy(desc(affiliatePartners.createdAt));

    // Attach click stats per partner
    const stats = await db
      .select({
        partnerId: affiliateClicks.partnerId,
        totalClicks: count(),
        totalConversions: sql<number>`sum(case when ${affiliateClicks.converted} = true then 1 else 0 end)`,
      })
      .from(affiliateClicks)
      .groupBy(affiliateClicks.partnerId);

    const earningsMap = await db
      .select({
        partnerId: affiliateClicks.partnerId,
        totalEarned: sum(affiliateClicks.commissionEarned),
      })
      .from(affiliateClicks)
      .where(eq(affiliateClicks.converted, true))
      .groupBy(affiliateClicks.partnerId);

    const statsMap = Object.fromEntries(stats.map((s) => [s.partnerId ?? "", s]));
    const earningsMapById = Object.fromEntries(earningsMap.map((e) => [e.partnerId ?? "", e]));

    const result = partners.map((p) => ({
      ...p,
      totalClicks: statsMap[p.id]?.totalClicks ?? 0,
      totalConversions: Number(statsMap[p.id]?.totalConversions ?? 0),
      totalEarned: Number(earningsMapById[p.id]?.totalEarned ?? 0),
    }));

    res.json({ partners: result });
  } catch {
    res.status(500).json({ error: "Failed to load partners" });
  }
});

// ─── ADMIN: POST /admin/affiliates/partners ───────────────────────────────────

const partnerSchema = z.object({
  bookName: z.string().min(1),
  logo: z.string().optional(),
  affiliateUrl: z.string().min(1),
  bonusText: z.string().optional(),
  commissionType: z.string().optional(),
  commissionAmount: z.number().optional(),
  commissionCurrency: z.string().optional(),
  minPayout: z.number().optional(),
  paymentSchedule: z.string().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

router.post("/admin/affiliates/partners", requireAdmin, async (req, res) => {
  const parsed = partnerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid partner data", details: parsed.error.issues });
    return;
  }
  try {
    const [partner] = await db
      .insert(affiliatePartners)
      .values(parsed.data)
      .returning();
    res.json({ partner });
  } catch {
    res.status(500).json({ error: "Failed to create partner" });
  }
});

// ─── ADMIN: PUT /admin/affiliates/partners/:id ────────────────────────────────

router.put("/admin/affiliates/partners/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const parsed = partnerSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  try {
    const [updated] = await db
      .update(affiliatePartners)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(affiliatePartners.id, String(id)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Partner not found" });
      return;
    }
    res.json({ partner: updated });
  } catch {
    res.status(500).json({ error: "Failed to update partner" });
  }
});

// ─── ADMIN: DELETE /admin/affiliates/partners/:id ─────────────────────────────

router.delete("/admin/affiliates/partners/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await db.delete(affiliatePartners).where(eq(affiliatePartners.id, String(id)));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete partner" });
  }
});

// ─── ADMIN: GET /admin/affiliates/earnings ────────────────────────────────────

router.get("/admin/affiliates/earnings", requireAdmin, async (req, res) => {
  try {
    const [allClicks] = await db.select({ total: count() }).from(affiliateClicks);
    const [conversions] = await db
      .select({ total: count() })
      .from(affiliateClicks)
      .where(eq(affiliateClicks.converted, true));
    const [totalEarned] = await db
      .select({ total: sum(affiliateClicks.commissionEarned) })
      .from(affiliateClicks)
      .where(eq(affiliateClicks.converted, true));
    const [pendingPayout] = await db
      .select({ total: sum(affiliateClicks.commissionEarned) })
      .from(affiliateClicks)
      .where(
        and(
          eq(affiliateClicks.converted, true),
          eq(affiliateClicks.paymentStatus, "pending")
        )
      );

    const totalPaid = await db
      .select({ total: sum(affiliatePayouts.amount) })
      .from(affiliatePayouts);

    const clicksTotal = allClicks?.total ?? 0;
    const conversionsTotal = conversions?.total ?? 0;
    const conversionRate = clicksTotal > 0 ? ((conversionsTotal / clicksTotal) * 100).toFixed(1) : "0";

    // Clicks per partner
    const byPartner = await db
      .select({
        partnerId: affiliateClicks.partnerId,
        bookName: affiliateClicks.bookName,
        clicks: count(),
        earned: sum(affiliateClicks.commissionEarned),
      })
      .from(affiliateClicks)
      .groupBy(affiliateClicks.partnerId, affiliateClicks.bookName)
      .orderBy(desc(count()));

    // Recent earnings (last 50 entries)
    const recent = await db
      .select()
      .from(affiliateClicks)
      .orderBy(desc(affiliateClicks.clickedAt))
      .limit(50);

    res.json({
      summary: {
        totalClicks: clicksTotal,
        totalConversions: conversionsTotal,
        totalEarned: Number(totalEarned?.total ?? 0),
        pendingPayout: Number(pendingPayout?.total ?? 0),
        totalPaid: Number(totalPaid[0]?.total ?? 0),
        conversionRate,
      },
      byPartner,
      recent,
    });
  } catch {
    res.status(500).json({ error: "Failed to load earnings" });
  }
});

// ─── ADMIN: POST /admin/affiliates/earnings ───────────────────────────────────
// Manual earning entry: marks a click as converted with commission amount

const manualEarningSchema = z.object({
  partnerId: z.string().min(1),
  clickId: z.string().optional(),
  userReference: z.string().optional(),
  commissionAmount: z.number().min(0),
  commissionCurrency: z.string().default("USD"),
  dateEarned: z.string().optional(),
  paymentStatus: z.string().default("pending"),
  notes: z.string().optional(),
});

router.post("/admin/affiliates/earnings", requireAdmin, async (req, res) => {
  const parsed = manualEarningSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const { partnerId, clickId, commissionAmount, commissionCurrency, paymentStatus, notes } = parsed.data;
  try {
    if (clickId) {
      // Update existing click record
      await db
        .update(affiliateClicks)
        .set({
          converted: true,
          commissionEarned: commissionAmount,
          commissionCurrency,
          paymentStatus,
          notes: notes ?? null,
        })
        .where(eq(affiliateClicks.id, clickId));
    } else {
      // Create a new click record as a manual entry
      const [partner] = await db
        .select()
        .from(affiliatePartners)
        .where(eq(affiliatePartners.id, String(partnerId)))
        .limit(1);
      await db.insert(affiliateClicks).values({
        partnerId,
        bookName: partner?.bookName ?? "",
        affiliateUrl: partner?.affiliateUrl ?? "",
        source: "arb_card",
        converted: true,
        commissionEarned: commissionAmount,
        commissionCurrency,
        paymentStatus,
        notes: notes ?? null,
      });
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to log earning" });
  }
});

// ─── ADMIN: GET /admin/affiliates/payouts ─────────────────────────────────────

router.get("/admin/affiliates/payouts", requireAdmin, async (req, res) => {
  try {
    const payouts = await db
      .select({
        payout: affiliatePayouts,
        partner: affiliatePartners,
      })
      .from(affiliatePayouts)
      .leftJoin(affiliatePartners, eq(affiliatePayouts.partnerId, affiliatePartners.id))
      .orderBy(desc(affiliatePayouts.paidAt));

    // Balance owed per partner
    const earned = await db
      .select({
        partnerId: affiliateClicks.partnerId,
        total: sum(affiliateClicks.commissionEarned),
      })
      .from(affiliateClicks)
      .where(eq(affiliateClicks.converted, true))
      .groupBy(affiliateClicks.partnerId);

    const paid = await db
      .select({
        partnerId: affiliatePayouts.partnerId,
        total: sum(affiliatePayouts.amount),
      })
      .from(affiliatePayouts)
      .groupBy(affiliatePayouts.partnerId);

    const earnedMap = Object.fromEntries(earned.map((e) => [e.partnerId ?? "", Number(e.total ?? 0)]));
    const paidMap = Object.fromEntries(paid.map((p) => [p.partnerId ?? "", Number(p.total ?? 0)]));

    const partners = await db.select().from(affiliatePartners);
    const balances = partners.map((p) => ({
      partnerId: p.id,
      bookName: p.bookName,
      logo: p.logo,
      totalEarned: earnedMap[p.id] ?? 0,
      totalPaid: paidMap[p.id] ?? 0,
      balanceOwed: (earnedMap[p.id] ?? 0) - (paidMap[p.id] ?? 0),
    }));

    res.json({ payouts, balances });
  } catch {
    res.status(500).json({ error: "Failed to load payouts" });
  }
});

// ─── ADMIN: POST /admin/affiliates/payouts ────────────────────────────────────

const payoutSchema = z.object({
  partnerId: z.string().min(1),
  amount: z.number().min(0.01),
  currency: z.string().default("USD"),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

router.post("/admin/affiliates/payouts", requireAdmin, async (req, res) => {
  const parsed = payoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payout data" });
    return;
  }
  try {
    const [payout] = await db.insert(affiliatePayouts).values(parsed.data).returning();
    // Mark pending clicks for this partner as paid
    await db
      .update(affiliateClicks)
      .set({ paymentStatus: "paid" })
      .where(
        and(
          eq(affiliateClicks.partnerId, parsed.data.partnerId),
          eq(affiliateClicks.paymentStatus, "pending"),
          eq(affiliateClicks.converted, true)
        )
      );
    res.json({ payout });
  } catch {
    res.status(500).json({ error: "Failed to log payout" });
  }
});

// ─── ADMIN: POST /admin/affiliates/seed ───────────────────────────────────────
// Seed default partners (safe to call multiple times — skips existing)

const DEFAULT_PARTNERS = [
  { bookName: "Bet365", logo: "🟢", affiliateUrl: "https://bet365.com", bonusText: "Bet £10 Get £30 in Bet Credits", commissionType: "revenue_share" },
  { bookName: "Betway", logo: "🔵", affiliateUrl: "https://betway.com", bonusText: "Bet £10 Get £10 Free Bet", commissionType: "revenue_share" },
  { bookName: "DraftKings", logo: "🏈", affiliateUrl: "https://sportsbook.draftkings.com", bonusText: "Bet $5 Get $200 Bonus Bets", commissionType: "cpa" },
  { bookName: "FanDuel", logo: "🦅", affiliateUrl: "https://fanduel.com/sports", bonusText: "Bet $5 Get $150 Bonus Bets", commissionType: "cpa" },
  { bookName: "BetMGM", logo: "👑", affiliateUrl: "https://sports.betmgm.com", bonusText: "Bet $10 Get $200 Bonus Bets", commissionType: "cpa" },
  { bookName: "1xBet", logo: "🌍", affiliateUrl: "https://1xbet.com", bonusText: "100% First Deposit Bonus", commissionType: "revenue_share" },
  { bookName: "SportyBet", logo: "🇳🇬", affiliateUrl: "https://sportybet.com", bonusText: "₦100,000 Welcome Bonus", commissionType: "cpa" },
  { bookName: "BetKing", logo: "🇳🇬", affiliateUrl: "https://betking.com", bonusText: "₦50,000 Welcome Bonus", commissionType: "cpa" },
];

router.post("/admin/affiliates/seed", requireAdmin, async (req, res) => {
  try {
    const existing = await db.select({ bookName: affiliatePartners.bookName }).from(affiliatePartners);
    const existingNames = new Set(existing.map((e) => e.bookName));
    const toInsert = DEFAULT_PARTNERS.filter((p) => !existingNames.has(p.bookName));
    if (toInsert.length > 0) {
      await db.insert(affiliatePartners).values(toInsert);
    }
    res.json({ ok: true, inserted: toInsert.length, skipped: DEFAULT_PARTNERS.length - toInsert.length });
  } catch {
    res.status(500).json({ error: "Failed to seed partners" });
  }
});

export default router;
