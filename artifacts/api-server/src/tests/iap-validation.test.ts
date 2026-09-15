import { afterEach, describe, expect, it, vi } from "vitest";

const publisherGet = vi.hoisted(() => vi.fn());
const googleAuth = vi.hoisted(() => vi.fn());

vi.mock("googleapis", () => ({
  google: {
    auth: { GoogleAuth: googleAuth },
    androidpublisher: vi.fn(() => ({
      purchases: { subscriptionsv2: { get: publisherGet } },
    })),
  },
}));

function publisherPurchase(
  subscriptionState: string,
  options: { productId?: string; expiryTime?: string } = {},
) {
  return {
    subscriptionState,
    latestOrderId: "GPA.1234-5678-9012-34567",
    lineItems: [{
      productId: options.productId ?? "prediqsai_pro_monthly",
      expiryTime: options.expiryTime ?? "2030-01-01T00:00:00.000Z",
    }],
  };
}

describe("validateGooglePurchase", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    delete process.env.APPLE_IAP_SHARED_SECRET;
  });

  async function validate(response: unknown) {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: "billing@example.test",
      private_key: "test-key",
    });
    publisherGet.mockResolvedValue({ data: response });
    const { validateGooglePurchase } = await import("../services/iap-validation");
    return validateGooglePurchase("play-token-123", "prediqsai_pro_monthly");
  }

  it("accepts active purchases from Google Play and uses store fields", async () => {
    const result = await validate(publisherPurchase("SUBSCRIPTION_STATE_ACTIVE"));

    expect(result).toMatchObject({
      valid: true,
      transactionId: "GPA.1234-5678-9012-34567",
    });
    expect(result.expiresAt).toEqual(new Date("2030-01-01T00:00:00.000Z"));
    expect(publisherGet).toHaveBeenCalledWith({
      packageName: "com.prediqsai.app",
      token: "play-token-123",
    });
  });

  it("accepts a subscription in Google Play grace period", async () => {
    const result = await validate(publisherPurchase("SUBSCRIPTION_STATE_IN_GRACE_PERIOD"));

    expect(result.valid).toBe(true);
  });

  it.each([
    ["expired", "SUBSCRIPTION_STATE_EXPIRED"],
    ["pending", "SUBSCRIPTION_STATE_PENDING"],
    ["paused", "SUBSCRIPTION_STATE_PAUSED"],
    ["revoked", "SUBSCRIPTION_STATE_REVOKED"],
  ])("rejects %s Google Play purchases", async (_name, state) => {
    const result = await validate(publisherPurchase(state));

    expect(result).toEqual({
      valid: false,
      reason: "Subscription is not active",
    });
  });

  it("rejects an active token for a different product", async () => {
    const result = await validate(publisherPurchase("SUBSCRIPTION_STATE_ACTIVE", {
      productId: "another_product",
    }));

    expect(result).toEqual({
      valid: false,
      reason: "Purchase token is not for this product",
    });
  });

  it("rejects an active purchase whose store expiry is in the past", async () => {
    const result = await validate(publisherPurchase("SUBSCRIPTION_STATE_ACTIVE", {
      expiryTime: "2020-01-01T00:00:00.000Z",
    }));

    expect(result).toEqual({
      valid: false,
      reason: "Subscription has expired",
    });
  });
});

describe("validateAppleReceipt", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    delete process.env.APPLE_IAP_SHARED_SECRET;
  });

  function activeAppleReceipt(overrides: Record<string, unknown> = {}) {
    return {
      status: 0,
      receipt: { bundle_id: "com.prediqsai.app" },
      latest_receipt_info: [{
        product_id: "prediqsai_pro_monthly",
        transaction_id: "2000001234567890",
        original_transaction_id: "1000001234567890",
        expires_date_ms: "1893456000000",
      }],
      ...overrides,
    };
  }

  it("accepts a valid production receipt only for the PrediQs bundle and stores its original transaction ID", async () => {
    process.env.APPLE_IAP_SHARED_SECRET = "apple-test-secret";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => activeAppleReceipt(),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { validateAppleReceipt } = await import("../services/iap-validation");

    const result = await validateAppleReceipt("base64-receipt", "prediqsai_pro_monthly");

    expect(result).toMatchObject({
      valid: true,
      transactionId: "2000001234567890",
      originalTransactionId: "1000001234567890",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://buy.itunes.apple.com/verifyReceipt",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          "receipt-data": "base64-receipt",
          password: "apple-test-secret",
          "exclude-old-transactions": true,
        }),
      }),
    );
  });

  it("retries a sandbox receipt after Apple's production endpoint returns 21007", async () => {
    process.env.APPLE_IAP_SHARED_SECRET = "apple-test-secret";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 21007 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => activeAppleReceipt() });
    vi.stubGlobal("fetch", fetchMock);
    const { validateAppleReceipt } = await import("../services/iap-validation");

    const result = await validateAppleReceipt("sandbox-receipt", "prediqsai_pro_monthly");

    expect(result.valid).toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://sandbox.itunes.apple.com/verifyReceipt",
      expect.any(Object),
    );
  });

  it("rejects a receipt for another app even when it contains an active subscription", async () => {
    process.env.APPLE_IAP_SHARED_SECRET = "apple-test-secret";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => activeAppleReceipt({ receipt: { bundle_id: "com.other.app" } }),
    }));
    const { validateAppleReceipt } = await import("../services/iap-validation");

    await expect(validateAppleReceipt("wrong-bundle-receipt", "prediqsai_pro_monthly")).resolves.toEqual({
      valid: false,
      reason: "Receipt is not for this app",
    });
  });
});