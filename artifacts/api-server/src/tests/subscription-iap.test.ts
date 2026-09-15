import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import express, { type Router } from "express";
import jwt from "jsonwebtoken";
import pino from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_SECRET = "subscription-iap-regression-test-secret";
process.env.SESSION_SECRET = TEST_SECRET;
const testLogger = pino({ enabled: false });

const mocks = vi.hoisted(() => {
  const selectChain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
  selectChain.from.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);

  const updateChain = {
    set: vi.fn(),
    where: vi.fn(),
    returning: vi.fn(),
  };
  updateChain.set.mockReturnValue(updateChain);
  updateChain.where.mockReturnValue(updateChain);
  const transaction = vi.fn(async (
    callback: (tx: { update: (...args: unknown[]) => typeof updateChain }) => unknown,
  ) =>
    callback({ update: vi.fn(() => updateChain) }),
  );

  return {
    selectChain,
    updateChain,
    transaction,
    validateAppleReceipt: vi.fn(),
    validateGooglePurchase: vi.fn(),
    isGoogleConfigured: vi.fn(() => true),
  };
});

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn(() => mocks.selectChain),
    update: vi.fn(() => mocks.updateChain),
    transaction: mocks.transaction,
  },
  users: {
    id: {},
    tier: {},
    iapPurchaseToken: {},
    iapTransactionId: {},
    iapOriginalTransactionId: {},
    iapPlatform: {},
    iapExpiresAt: {},
  },
}));

vi.mock("../services/iap-validation", () => ({
  isAppleConfigured: vi.fn(() => true),
  isGoogleConfigured: mocks.isGoogleConfigured,
  validateAppleReceipt: mocks.validateAppleReceipt,
  validateGooglePurchase: mocks.validateGooglePurchase,
}));

let server: Server;
let baseUrl: string;

function token(): string {
  return jwt.sign({ userId: 42 }, TEST_SECRET, { algorithm: "HS256", expiresIn: "1h" });
}

async function post(path: string, body: unknown): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
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
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isGoogleConfigured.mockReturnValue(true);
  mocks.selectChain.limit.mockResolvedValue([]);
  mocks.updateChain.returning.mockResolvedValue([{ id: 42, tier: "premium" }]);
  mocks.validateGooglePurchase.mockResolvedValue({
    valid: true,
    expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    transactionId: "GPA.store-confirmed",
  });
  mocks.validateAppleReceipt.mockResolvedValue({
    valid: true,
    expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    transactionId: "apple-store-confirmed",
    originalTransactionId: "apple-original-transaction",
  });
});

describe("Android subscription verification", () => {
  it("rejects an Android request without a purchase token before validation or writes", async () => {
    const response = await post("/subscription/iap/verify", {
      platform: "android",
      productId: "prediqsai_pro_monthly",
    });

    expect(response.status).toBe(400);
    expect(mocks.validateGooglePurchase).not.toHaveBeenCalled();
    expect(mocks.updateChain.set).not.toHaveBeenCalled();
  });

  it.each([
    ["expired", { valid: false, reason: "Subscription has expired" }],
    ["pending", { valid: false, reason: "Subscription is not active" }],
    ["wrong product", { valid: false, reason: "Purchase token is not for this product" }],
  ])("does not upgrade when Google reports a %s purchase", async (_name, result) => {
    mocks.validateGooglePurchase.mockResolvedValue(result);

    const response = await post("/subscription/iap/verify", {
      platform: "android",
      productId: "prediqsai_pro_monthly",
      purchaseToken: "invalid-play-token",
    });

    expect(response.status).toBe(400);
    expect(mocks.updateChain.set).not.toHaveBeenCalled();
  });

  it("rejects a token already linked to another account without upgrading the requester", async () => {
    mocks.selectChain.limit.mockResolvedValue([{ id: 99 }]);

    const response = await post("/subscription/iap/verify", {
      platform: "android",
      productId: "prediqsai_pro_monthly",
      purchaseToken: "linked-play-token",
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "This Google Play purchase is already linked to another account",
    });
    expect(mocks.updateChain.set).not.toHaveBeenCalled();
  });

  it("returns the account-linking conflict when a simultaneous token claim hits the unique constraint", async () => {
    mocks.updateChain.returning.mockRejectedValue(Object.assign(
      new Error("duplicate key value violates unique constraint"),
      { code: "23505", constraint: "users_iap_purchase_token_unique" },
    ));

    const response = await post("/subscription/iap/verify", {
      platform: "android",
      productId: "prediqsai_pro_monthly",
      purchaseToken: "simultaneously-claimed-play-token",
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "This Google Play purchase is already linked to another account",
    });
    expect(mocks.updateChain.returning).toHaveBeenCalledTimes(1);
  });

  it("does not restore premium when every Android candidate fails Google validation", async () => {
    mocks.validateGooglePurchase.mockResolvedValue({
      valid: false,
      reason: "Subscription is not active",
    });

    const response = await post("/subscription/iap/restore", {
      platform: "android",
      purchases: [{
        productId: "prediqsai_pro_monthly",
        purchaseToken: "pending-play-token",
      }],
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ tier: "free", restored: false });
    expect(mocks.updateChain.set).not.toHaveBeenCalled();
  });

  it("restores an Android purchase using only the supported payload fields", async () => {
    const response = await post("/subscription/iap/restore", {
      platform: "android",
      purchases: [{
        productId: "prediqsai_pro_monthly",
        purchaseToken: "active-play-token",
      }],
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ tier: "premium", restored: true });
    expect(mocks.validateGooglePurchase).toHaveBeenCalledWith(
      "active-play-token",
      "prediqsai_pro_monthly",
    );
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("restores an iOS purchase using only the supported payload fields", async () => {
    const response = await post("/subscription/iap/restore", {
      platform: "ios",
      purchases: [{
        productId: "prediqsai_pro_monthly",
        transactionReceipt: "base64-app-receipt",
      }],
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ tier: "premium", restored: true });
    expect(mocks.validateAppleReceipt).toHaveBeenCalledWith(
      "base64-app-receipt",
      "prediqsai_pro_monthly",
    );
  });

  it("verifies an iOS purchase with receiptData and persists Apple's original transaction ID", async () => {
    const response = await post("/subscription/iap/verify", {
      platform: "ios",
      productId: "prediqsai_pro_monthly",
      receiptData: "base64-app-receipt",
    });

    expect(response.status).toBe(200);
    expect(mocks.validateAppleReceipt).toHaveBeenCalledWith(
      "base64-app-receipt",
      "prediqsai_pro_monthly",
    );
    expect(mocks.updateChain.set).toHaveBeenCalledWith(expect.objectContaining({
      iapOriginalTransactionId: "apple-original-transaction",
      iapPlatform: "ios",
    }));
  });

  it("requires receiptData for iOS purchase verification", async () => {
    const response = await post("/subscription/iap/verify", {
      platform: "ios",
      productId: "prediqsai_pro_monthly",
      transactionReceipt: "legacy-receipt-field",
    });

    expect(response.status).toBe(400);
    expect(mocks.validateAppleReceipt).not.toHaveBeenCalled();
  });

  it("blocks an iOS subscription already linked to another account", async () => {
    mocks.selectChain.limit.mockResolvedValue([{ id: 99 }]);

    const response = await post("/subscription/iap/verify", {
      platform: "ios",
      productId: "prediqsai_pro_monthly",
      receiptData: "linked-apple-receipt",
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "This App Store subscription is already linked to another account",
    });
    expect(mocks.updateChain.set).not.toHaveBeenCalled();
  });

  it("accepts and ignores legacy metadata from a previously released Android client", async () => {
    const response = await post("/subscription/iap/restore", {
      platform: "android",
      purchases: [{
        productId: "prediqsai_pro_monthly",
        purchaseToken: "active-play-token",
        transactionId: "ignored-client-transaction-id",
      }],
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ tier: "premium", restored: true });
    expect(mocks.validateGooglePurchase).toHaveBeenCalledWith(
      "active-play-token",
      "prediqsai_pro_monthly",
    );
  });
});