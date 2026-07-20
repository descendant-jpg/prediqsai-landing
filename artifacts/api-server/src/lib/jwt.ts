import jwt from "jsonwebtoken";

const JWT_ALGORITHM = "HS256" as const;
const TOKEN_TTL = "7d";
const MIN_SECRET_LENGTH = 32;

// Fail fast at startup: no hardcoded fallback secret, ever.
function loadSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET environment variable is required to sign JWTs. Refusing to start without it.",
    );
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters (got ${secret.length}).`,
    );
  }
  return secret;
}

const JWT_SECRET: string = loadSecret();

export function signToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: TOKEN_TTL,
  });
}

export function verifyToken(token: string): { userId: number } {
  // Pinning `algorithms` rejects "none" and any non-HS256 token outright.
  const payload = jwt.verify(token, JWT_SECRET, {
    algorithms: [JWT_ALGORITHM],
  });
  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof (payload as { userId?: unknown }).userId !== "number"
  ) {
    throw new Error("Invalid token payload");
  }
  return { userId: (payload as { userId: number }).userId };
}
