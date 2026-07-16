/**
 * Centralized tier resolution used by all routes that gate premium features.
 *
 * Canonical tier enum is "free" | "premium". Historical/legacy values such as
 * "PRO", "pro", "Premium", or "elite" (any casing) are normalized to "premium"
 * so manual DB edits and old rows keep working.
 */

interface TierFields {
  tier: string | null;
  manualTierOverride: string | null;
  freeTrialUntil: Date | null;
}

/** Normalize any stored tier string to the canonical enum, or null if unrecognized. */
export function normalizeTier(t: string | null | undefined): "free" | "premium" | null {
  const v = (t ?? "").trim().toLowerCase();
  if (v === "premium" || v === "pro" || v === "elite") return "premium";
  if (v === "free") return "free";
  return null;
}

/**
 * Effective tier: manual admin override wins, then an active free trial,
 * then the stored (paid) tier. Unrecognized values fail closed to "free".
 */
export function getEffectiveTier(u: TierFields | undefined | null): "free" | "premium" {
  if (!u) return "free";
  const override = normalizeTier(u.manualTierOverride);
  if (override) return override;
  if (u.freeTrialUntil && new Date(u.freeTrialUntil) > new Date()) return "premium";
  return normalizeTier(u.tier) ?? "free";
}

export function isPremium(u: TierFields | undefined | null): boolean {
  return getEffectiveTier(u) === "premium";
}
