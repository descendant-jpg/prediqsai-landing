import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod/v4";

import { db, users } from "@workspace/db";
import { signToken } from "../lib/jwt";

const router = Router();

const registerSchema = z.object({
  username: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function publicUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    tier: u.tier,
    bankroll: u.bankroll,
    dailyLossLimit: u.dailyLossLimit,
    isAdmin: u.isAdmin ?? false,
  };
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
  const [user] = await db
    .insert(users)
    .values({ username, email: email.toLowerCase(), passwordHash, tier: "pro" })
    .returning();

  const token = signToken(user.id);
  res.status(201).json({ token, user: publicUser(user) });
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
