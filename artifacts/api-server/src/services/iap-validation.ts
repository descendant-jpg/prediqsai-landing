import { GoogleAuth } from "google-auth-library";

import { logger } from "../lib/logger";

const APPLE_PRODUCTION_URL = "https://buy.itunes.apple.com/verifyReceipt";
const APPLE_SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";
const ANDROID_PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME ?? "com.prediqsai.app";

export interface IAPValidationResult {
  valid: boolean;
  /** Subscription expiry confirmed by the store (only set when valid). */
  expiresAt?: Date;
  /** Store-confirmed transaction identifier (only set when valid). */
  transactionId?: string;
  /** Human-readable reason when invalid. */
  reason?: string;
}

export function isAppleConfigured(): boolean {
  return !!process.env.APPLE_SHARED_SECRET;
}

export function isGoogleConfigured(): boolean {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
}

// ─── Apple ────────────────────────────────────────────────────────────────────

interface AppleLatestReceiptInfo {
  product_id?: string;
  transaction_id?: string;
  expires_date_ms?: string;
}

interface AppleVerifyResponse {
  status: number;
  latest_receipt_info?: AppleLatestReceiptInfo[];
}

/**
 * Validates an iOS App Store receipt via Apple's verifyReceipt endpoint.
 * Follows Apple's guidance: try production first, retry against sandbox on
 * status 21007 (sandbox receipt sent to production).
 */
export async function validateAppleReceipt(
  transactionReceipt: string,
  expectedProductId: string,
): Promise<IAPValidationResult> {
  const sharedSecret = process.env.APPLE_SHARED_SECRET;
  if (!sharedSecret) {
    return { valid: false, reason: "Apple receipt validation is not configured" };
  }

  const body = JSON.stringify({
    "receipt-data": transactionReceipt,
    password: sharedSecret,
    "exclude-old-transactions": true,
  });

  async function callApple(url: string): Promise<AppleVerifyResponse> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) throw new Error(`Apple verifyReceipt HTTP ${res.status}`);
    return (await res.json()) as AppleVerifyResponse;
  }

  try {
    let data = await callApple(APPLE_PRODUCTION_URL);
    if (data.status === 21007) {
      data = await callApple(APPLE_SANDBOX_URL);
    }

    if (data.status !== 0) {
      return { valid: false, reason: `Apple rejected the receipt (status ${data.status})` };
    }

    // Find the most recent transaction for our product.
    const now = Date.now();
    const matching = (data.latest_receipt_info ?? [])
      .filter((t) => t.product_id === expectedProductId)
      .map((t) => ({ ...t, expiresMs: parseInt(t.expires_date_ms ?? "0", 10) }))
      .sort((a, b) => b.expiresMs - a.expiresMs);

    const latest = matching[0];
    if (!latest) {
      return { valid: false, reason: "Receipt contains no transaction for this product" };
    }
    if (!latest.expiresMs || latest.expiresMs <= now) {
      return { valid: false, reason: "Subscription has expired" };
    }

    return {
      valid: true,
      expiresAt: new Date(latest.expiresMs),
      transactionId: latest.transaction_id,
    };
  } catch (err) {
    logger.error({ err }, "Apple receipt validation failed");
    return { valid: false, reason: "Could not reach Apple receipt validation service" };
  }
}

// ─── Google ───────────────────────────────────────────────────────────────────

interface GoogleSubscriptionPurchase {
  expiryTimeMillis?: string;
  paymentState?: number;
  orderId?: string;
  acknowledgementState?: number;
}

/**
 * Validates an Android subscription purchase via the Google Play Developer API
 * (purchases.subscriptions.get), authenticated with a service account.
 */
export async function validateGooglePurchase(
  purchaseToken: string,
  productId: string,
): Promise<IAPValidationResult> {
  const rawCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!rawCredentials) {
    return { valid: false, reason: "Google purchase validation is not configured" };
  }

  try {
    const credentials = JSON.parse(rawCredentials);
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
    const client = await auth.getClient();

    const url =
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
      `${encodeURIComponent(ANDROID_PACKAGE_NAME)}/purchases/subscriptions/` +
      `${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;

    const res = await client.request<GoogleSubscriptionPurchase>({ url });
    const purchase = res.data;

    const expiryMs = parseInt(purchase.expiryTimeMillis ?? "0", 10);
    if (!expiryMs || expiryMs <= Date.now()) {
      return { valid: false, reason: "Subscription has expired" };
    }

    // paymentState: 0 = pending, 1 = received, 2 = free trial, 3 = deferred.
    // Grant access for received payments and free trials only.
    if (purchase.paymentState !== 1 && purchase.paymentState !== 2) {
      return { valid: false, reason: "Payment is not confirmed by Google" };
    }

    return {
      valid: true,
      expiresAt: new Date(expiryMs),
      transactionId: purchase.orderId ?? purchaseToken,
    };
  } catch (err) {
    logger.error({ err }, "Google purchase validation failed");
    return { valid: false, reason: "Google rejected the purchase token" };
  }
}
