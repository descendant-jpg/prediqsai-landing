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

// Very strict limiter for password-guessing surfaces (admin password checks).
export const sensitiveLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many requests" });
  },
});

// Account creation: 5 signups per IP per hour — blocks bot mass-registration
// (each signup also sends a verification email via Resend).
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many requests" });
  },
});

// Login attempts: 10 per 15 min per IP — throttles credential stuffing and
// unauthenticated bcrypt CPU abuse without locking out legitimate retries.
export const loginLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many requests" });
  },
});

// Password reset per IP: 5 requests per hour.
export const passwordResetIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many requests" });
  },
});

// Password reset per target email: 3 per hour regardless of source IP,
// so a botnet can't flood one inbox (each request sends a Resend email).
export const passwordResetEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    return email ? `email:${email}` : `ip:${ipKeyGenerator(req.ip ?? "")}`;
  },
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
