import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Prefer the authenticated user ID (set by requireAuth) so limits follow the
// account, falling back to an IPv6-safe IP key for unauthenticated traffic.
function userOrIpKey(req: Request): string {
  const userId = (req as Request & { userId?: number }).userId;
  return userId != null ? `user:${userId}` : `ip:${ipKeyGenerator(req.ip ?? "")}`;
}

// Global limiter: general API traffic, per IP.
export const globalLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many requests" });
  },
});

// Strict limiter for costly AI endpoints (Claude calls), per user (or IP).
export const aiUsageLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many requests" });
  },
});
