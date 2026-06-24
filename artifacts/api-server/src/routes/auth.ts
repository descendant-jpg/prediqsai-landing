import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod/v4";

import { db, users } from "@workspace/db";
import { sendVerificationEmail } from "../lib/email";
import { signToken, verifyToken } from "../lib/jwt";
import { requireAuth } from "../middleware/auth";

const router = Router();

/** Google OAuth Web client ID (client_type 3 in google-services.json). */
const GOOGLE_WEB_CLIENT_ID =
  process.env.GOOGLE_WEB_CLIENT_ID ??
  "674932625778-s0s7otnbqu2e4gptpm1nore79850sb59.apps.googleusercontent.com";

const googleClient = new OAuth2Client(GOOGLE_WEB_CLIENT_ID);

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const registerSchema = z.object({
  username: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const googleSchema = z.object({
  idToken: z.string().min(10),
});

function publicUser(u: typeof users.$inferSelect) {
  const tier = u.tier === "premium" ? "premium" : (u.tier ?? "free");
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    tier,
    bankroll: u.bankroll,
    dailyLossLimit: u.dailyLossLimit,
    isAdmin: u.isAdmin ?? false,
    emailVerified: u.emailVerified ?? false,
  };
}

function newVerificationToken() {
  return {
    token: crypto.randomBytes(32).toString("hex"),
    expires: new Date(Date.now() + VERIFICATION_TTL_MS),
  };
}

/** Public base URL used to build the email verification link. */
function publicBase(req: { get: (h: string) => string | undefined }): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const domains = process.env.REPLIT_DOMAINS?.split(",").map((d) => d.trim()).filter(Boolean);
  if (domains && domains.length > 0) return `https://${domains[0]}`;
  const host = req.get("x-forwarded-host") ?? req.get("host") ?? "localhost";
  const proto = req.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function htmlPage(title: string, message: string, ok: boolean): string {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head>
  <body style="margin:0;background:#070B12;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#E0EAF5;display:flex;min-height:100vh;align-items:center;justify-content:center">
    <div style="max-width:420px;text-align:center;padding:32px;background:#0C1422;border:1px solid #1A2535;border-radius:16px;margin:16px">
      <div style="font-size:44px;margin-bottom:8px">${ok ? "✅" : "⚠️"}</div>
      <h1 style="color:${ok ? "#FFD700" : "#FF6B6B"};font-size:22px;margin:0 0 8px">${title}</h1>
      <p style="color:#9FB1C1;font-size:15px;line-height:1.5;margin:0">${message}</p>
    </div>
  </body></html>`;
}

router.post("/auth/register", async (req, res) => {
  const body = registerSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid input", details: body.error.issues });
    return;
  }
  const { username, email, password } = body.data;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { token: verifyTokenValue, expires } = newVerificationToken();
  const [user] = await db
    .insert(users)
    .values({
      username,
      email: email.toLowerCase(),
      passwordHash,
      tier: "free",
      authProvider: "password",
      emailVerified: false,
      emailVerificationToken: verifyTokenValue,
      emailVerificationExpires: expires,
    })
    .returning();

  const verifyUrl = `${publicBase(req)}/api/auth/verify-email?token=${verifyTokenValue}`;
  await sendVerificationEmail(user.email, user.username, verifyUrl, req.log);

  const token = signToken(user.id);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post("/auth/google", async (req, res) => {
  const body = googleSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Missing Google ID token" });
    return;
  }

  let email: string | undefined;
  let name: string | undefined;
  let emailVerifiedByGoogle = false;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: body.data.idToken,
      audience: GOOGLE_WEB_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    email = payload?.email?.toLowerCase();
    name = payload?.name ?? payload?.given_name ?? undefined;
    // Google may set email_verified as a boolean or the string "true".
    emailVerifiedByGoogle =
      payload?.email_verified === true || (payload?.email_verified as unknown) === "true";
  } catch (err) {
    req.log.warn({ err }, "Google ID token verification failed");
    res.status(401).json({ error: "Invalid Google sign-in" });
    return;
  }

  if (!email) {
    res.status(400).json({ error: "Google account has no email" });
    return;
  }

  // Only trust the email claim when Google itself has verified it. Otherwise an
  // unverified Google email could be used to take over a password account.
  if (!emailVerifiedByGoogle) {
    res.status(401).json({ error: "Google email is not verified" });
    return;
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let user = existing;
  if (user) {
    // Google identities are pre-verified; ensure the flag and provider are set.
    if (!user.emailVerified || user.authProvider !== "google") {
      const [updated] = await db
        .update(users)
        .set({ emailVerified: true, authProvider: "google" })
        .where(eq(users.id, user.id))
        .returning();
      if (updated) user = updated;
    }
  } else {
    const randomHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 12);
    const username = (name?.trim() || email.split("@")[0]).slice(0, 50);
    const [created] = await db
      .insert(users)
      .values({
        username,
        email,
        passwordHash: randomHash,
        tier: "free",
        authProvider: "google",
        emailVerified: true,
      })
      .returning();
    user = created;
  }

  const token = signToken(user.id);
  res.json({ token, user: publicUser(user) });
});

router.get("/auth/verify-email", async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    res.status(400).send(htmlPage("Invalid link", "This verification link is missing its token.", false));
    return;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.emailVerificationToken, token))
    .limit(1);

  if (!user) {
    res.status(400).send(htmlPage("Link not valid", "This verification link is invalid or has already been used.", false));
    return;
  }

  if (user.emailVerificationExpires && user.emailVerificationExpires.getTime() < Date.now()) {
    res.status(400).send(htmlPage("Link expired", "This verification link has expired. Open the app and tap “Resend Verification Email”.", false));
    return;
  }

  await db
    .update(users)
    .set({ emailVerified: true, emailVerificationToken: null, emailVerificationExpires: null })
    .where(eq(users.id, user.id));

  res.send(htmlPage("Email verified", "Your email is verified. Return to the PrediQs AI app and tap “I’ve Verified – Continue”.", true));
});

router.post("/auth/resend-verification", requireAuth, async (req, res) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.emailVerified) {
    res.json({ ok: true, alreadyVerified: true });
    return;
  }

  const { token: verifyTokenValue, expires } = newVerificationToken();
  await db
    .update(users)
    .set({ emailVerificationToken: verifyTokenValue, emailVerificationExpires: expires })
    .where(eq(users.id, user.id));

  const verifyUrl = `${publicBase(req)}/api/auth/verify-email?token=${verifyTokenValue}`;
  const sent = await sendVerificationEmail(user.email, user.username, verifyUrl, req.log);
  res.json({ ok: true, sent });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8),
});

router.put("/auth/change-password", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  let payload: { userId: number };
  try {
    payload = verifyToken(authHeader.slice(7));
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const body = changePasswordSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }
  const { currentPassword, newPassword } = body.data;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await db
    .update(users)
    .set({ passwordHash: newHash })
    .where(eq(users.id, user.id));

  res.json({ ok: true });
});

router.post("/auth/login", async (req, res) => {
  const body = loginSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, password } = body.data;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Auto-promote admin email on every login
  let finalUser = user;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email === adminEmail.toLowerCase() && !user.isAdmin) {
    const [promoted] = await db
      .update(users)
      .set({ isAdmin: true })
      .where(eq(users.id, user.id))
      .returning();
    if (promoted) finalUser = promoted;
    req.log.info({ email: user.email }, "✅ Admin auto-promoted on login");
  }

  const token = signToken(finalUser.id);
  res.json({ token, user: publicUser(finalUser) });
});

export default router;
