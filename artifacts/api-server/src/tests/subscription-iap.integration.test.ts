import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { db, pool, users } from "@workspace/db";
import { inArray, sql } from "drizzle-orm";
import express, { type Router } from "express";
import jwt from "jsonwebtoken";
import pino from "pino";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const TEST_SECRET = "subscription-iap-integration-test-secret";
process.env.SESSION_SECRET = TEST_SECRET;
const testLogger = pino({ enabled: false });

const mocks = vi.hoisted(() => ({
  validateGooglePurchase: vi.fn(),
}));

vi.mock("../services/iap-validation", () => ({
  isAppleConfigured: vi.fn(() => true),
  isGoogleConfigured: vi.fn(() => true),
  validateAppleReceipt: vi.fn(),
  validateGooglePurchase: mocks.validateGooglePurchase,
}));

let server: Server;
let baseUrl: string;
let createdUserIds: number[] = [];

function authToken(userId: number): string {
  return jwt.sign({ userId }, TEST_SECRET, { algorithm: "HS256", expiresIn: "1h" });
}

async function claimPurchase(userId: number, purchaseToken: string): Promise<Response> {
  return fetch(`${baseUrl}/subscription/iap/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken(userId)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      platform: "android",
      productId: "prediqsai_pro_monthly",
      purchaseToken,
    }),
  });
}

async function restorePurchase(userId: number, purchaseToken: string): Promise<Response> {
  return fetch(`${baseUrl}/subscription/iap/restore`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken(userId)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      platform: "android",
      purchases: [{
        productId: "prediqsai_pro_monthly",
        purchaseToken,
      }],
    }),
  });
}

beforeAll(async () => {
  const { rows } = await pool.query<{
    currentSchema: string;
    hasUsersTable: boolean;
  }>(`
    SELECT
      current_schema() AS "currentSchema",
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name = 'users'
      ) AS "hasUsersTable"
  `);
  const isolatedSchema = process.env.DATABASE_SCHEMA;
  expect(isolatedSchema).toBeDefined();
  expect(rows[0]).toMatchObject({
    currentSchema: isolatedSchema,
    hasUsersTable: true,
  });

  const { default: subscriptionRouter } = await import("../routes/subscription") as {
    default: Router;
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.log = testLogger;
    next();
  });
  app.use(subscriptionRouter);

  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", (error?: Error) => error ? reject(error) : resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  // The isolated test schema is created and populated with the current Drizzle
  // schema by `pnpm run test:integration`.
  // Pause only this test's first update so both requests complete the ownership
  // lookup before PostgreSQL resolves the unique-index race.
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION delay_integration_iap_claim()
    RETURNS trigger AS $$
    BEGIN
      IF NEW.iap_purchase_token LIKE 'integration-play-token-%' THEN
        PERFORM pg_sleep(0.25);
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.execute(sql`
    CREATE TRIGGER delay_integration_iap_claim_trigger
    BEFORE UPDATE OF iap_purchase_token ON users
    FOR EACH ROW EXECUTE FUNCTION delay_integration_iap_claim()
  `);
});

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await db.delete(users).where(inArray(users.id, createdUserIds));
    createdUserIds = [];
  }
  vi.clearAllMocks();
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
  await db.execute(sql`DROP TRIGGER IF EXISTS delay_integration_iap_claim_trigger ON users`);
  await db.execute(sql`DROP FUNCTION IF EXISTS delay_integration_iap_claim()`);
  await pool.end();
});

describe("Android subscription verification with PostgreSQL", () => {
  it("returns an account-linking conflict and keeps the losing user free when concurrent claims collide", async () => {
    const warning = vi.spyOn(testLogger, "warn");
    const marker = crypto.randomUUID();
    const purchaseToken = `integration-play-token-${marker}`;
    const [firstUser, secondUser] = await db.insert(users).values([
      {
        email: `iap-integration-first-${marker}@example.test`,
        passwordHash: "test-password-hash",
        username: `iap-first-${marker}`,
      },
      {
        email: `iap-integration-second-${marker}@example.test`,
        passwordHash: "test-password-hash",
        username: `iap-second-${marker}`,
      },
    ]).returning({ id: users.id });
    createdUserIds = [firstUser.id, secondUser.id];

    let validationCalls = 0;
    let releaseValidation!: () => void;
    const bothRequestsValidated = new Promise<void>((resolve) => {
      releaseValidation = resolve;
    });
    mocks.validateGooglePurchase.mockImplementation(async () => {
      validationCalls += 1;
      if (validationCalls === 2) {
        releaseValidation();
      }
      await bothRequestsValidated;
      return {
        valid: true,
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
        transactionId: `GPA.integration-${marker}`,
      };
    });

    const [firstResponse, secondResponse] = await Promise.all([
      claimPurchase(firstUser.id, purchaseToken),
      claimPurchase(secondUser.id, purchaseToken),
    ]);
    const responses = [firstResponse, secondResponse];
    const successfulResponse = responses.find((response) => response.status === 200);
    const conflictResponse = responses.find((response) => response.status === 409);

    expect(successfulResponse).toBeDefined();
    expect(conflictResponse).toBeDefined();
    await expect(successfulResponse!.json()).resolves.toMatchObject({
      success: true,
      tier: "premium",
    });
    await expect(conflictResponse!.json()).resolves.toEqual({
      error: "This Google Play purchase is already linked to another account",
    });
    expect(warning).toHaveBeenCalledWith(
      { userId: expect.any(Number) },
      "IAP verification rejected — purchase token was linked to another user during verification",
    );

    const savedUsers = await db
      .select({
        id: users.id,
        tier: users.tier,
        iapPurchaseToken: users.iapPurchaseToken,
      })
      .from(users)
      .where(inArray(users.id, createdUserIds));
    const tokenOwner = savedUsers.find((user) => user.iapPurchaseToken === purchaseToken);
    const losingUser = savedUsers.find((user) => user.id !== tokenOwner?.id);

    expect(tokenOwner).toMatchObject({ tier: "premium", iapPurchaseToken: purchaseToken });
    expect(losingUser).toMatchObject({ tier: "free", iapPurchaseToken: null });
    expect(mocks.validateGooglePurchase).toHaveBeenCalledTimes(2);
  });

  it("moves a verified Play subscription from an old account to the restoring account", async () => {
    const marker = crypto.randomUUID();
    const purchaseToken = `integration-play-restore-${marker}`;
    const [previousOwner, restoringUser] = await db.insert(users).values([
      {
        email: `iap-restore-old-${marker}@example.test`,
        passwordHash: "test-password-hash",
        username: `iap-restore-old-${marker}`,
        tier: "premium",
        iapTransactionId: `GPA.old-${marker}`,
        iapPurchaseToken: purchaseToken,
        iapPlatform: "android",
        iapExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
      },
      {
        email: `iap-restore-new-${marker}@example.test`,
        passwordHash: "test-password-hash",
        username: `iap-restore-new-${marker}`,
      },
    ]).returning({ id: users.id });
    createdUserIds = [previousOwner.id, restoringUser.id];
    mocks.validateGooglePurchase.mockResolvedValue({
      valid: true,
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      transactionId: `GPA.restored-${marker}`,
    });

    const response = await restorePurchase(restoringUser.id, purchaseToken);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ tier: "premium", restored: true });

    const savedUsers = await db
      .select({
        id: users.id,
        tier: users.tier,
        iapPurchaseToken: users.iapPurchaseToken,
        iapTransactionId: users.iapTransactionId,
        iapPlatform: users.iapPlatform,
        iapExpiresAt: users.iapExpiresAt,
      })
      .from(users)
      .where(inArray(users.id, createdUserIds));

    expect(savedUsers.find((user) => user.id === previousOwner.id)).toMatchObject({
      tier: "free",
      iapPurchaseToken: null,
      iapTransactionId: null,
      iapPlatform: null,
      iapExpiresAt: null,
    });
    expect(savedUsers.find((user) => user.id === restoringUser.id)).toMatchObject({
      tier: "premium",
      iapPurchaseToken: purchaseToken,
      iapTransactionId: `GPA.restored-${marker}`,
      iapPlatform: "android",
    });
  });
});