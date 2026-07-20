import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";

import { db, users } from "@workspace/db";
import { verifyToken } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { userId } = verifyToken(auth.slice(7));
    req.userId = userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, async () => {
    const [user] = await db
      .select({ id: users.id, isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);
    if (!user?.isAdmin && user?.id !== 1) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}
