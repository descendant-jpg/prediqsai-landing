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
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
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