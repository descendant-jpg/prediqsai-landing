import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import {
  Environment,
  SignedDataVerifier,
} from "@apple/app-store-server-library";

import { logger } from "../lib/logger";

const APPLE_PRODUCTION_URL = "https://buy.itunes.apple.com/verifyReceipt";
const APPLE_SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";
const APPLE_BUNDLE_ID = "com.prediqsai.app";
const ANDROID_PACKAGE_NAME =
  process.env.ANDROID_PACKAGE_NAME ?? "com.prediqsai.app";

// Apple's published Root CA G3. App Store Server Notification JWS certificates
// chain to this root; it is deliberately bundled rather than trusted from x5c.
const APPLE_ROOT_CA_G3 = Buffer.from(
  "MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==",
  "base64",
);

export interface IAPValidationResult {
  valid: boolean;
  /** Subscription expiry confirmed by the store (only set when valid). */
  expiresAt?: Date;
  /** Store-confirmed transaction identifier (only set when valid). */
  transactionId?: string;
  /** Stable App Store subscription identifier (only set for valid iOS receipts). */
  originalTransactionId?: string;
  /** Human-readable reason when invalid. */
  reason?: string;
}

export function isAppleConfigured(): boolean {
  return !!process.env.APPLE_IAP_SHARED_SECRET;
}

export function isGoogleConfigured(): boolean {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
}

export function isAppleServerNotificationsConfigured(): boolean {
  return Number.isSafeInteger(Number(process.env.APPLE_APP_ID));
}

export function isGooglePlayServerNotificationsConfigured(): boolean {
  return !!(
    process.env.GOOGLE_PLAY_RTDN_AUDIENCE &&
    process.env.GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL
  );
}

// ─── Apple ────────────────────────────────────────────────────────────────────

export interface AppleServerNotification {
  notificationUUID: string;
  notificationType: string;
  originalTransactionId: string;
  transactionId: string;
}

/**
 * Decodes only an Apple-signed notification for this app and its embedded,
 * independently signed transaction using Apple's verifier, including its
 * certificate policy and revocation checks.
 */
export async function verifyAppleServerNotification(
  signedPayload: string,
): Promise<AppleServerNotification> {
  const appAppleId = Number(process.env.APPLE_APP_ID);
  if (!Number.isSafeInteger(appAppleId)) {
    throw new Error(
      "APPLE_APP_ID must be configured to verify production App Store notifications",
    );
  }
  const verifier = new SignedDataVerifier(
    [APPLE_ROOT_CA_G3],
    true,
    Environment.PRODUCTION,
    APPLE_BUNDLE_ID,
    appAppleId,
  );
  const notification =
    await verifier.verifyAndDecodeNotification(signedPayload);
  if (
    typeof notification.notificationUUID !== "string" ||
    typeof notification.notificationType !== "string" ||
    typeof notification.data?.signedTransactionInfo !== "string"
  ) {
    throw new Error("Apple notification has required fields missing");
  }

  const transaction = await verifier.verifyAndDecodeTransaction(
    notification.data.signedTransactionInfo,
  );
  if (
    transaction.bundleId !== APPLE_BUNDLE_ID ||
    transaction.productId !== "prediqsai_pro_monthly" ||
    typeof transaction.originalTransactionId !== "string" ||
    typeof transaction.transactionId !== "string"
  ) {
    throw new Error("Apple notification is not for this subscription");
  }

  return {
    notificationUUID: notification.notificationUUID,
    notificationType: notification.notificationType,
    originalTransactionId: transaction.originalTransactionId,
    transactionId: transaction.transactionId,
  };
}

interface AppleLatestReceiptInfo {
  product_id?: string;
  transaction_id?: string;
  original_transaction_id?: string;
  expires_date_ms?: string;
  cancellation_date_ms?: string;
}

interface AppleVerifyResponse {
  status: number;
  receipt?: {
    bundle_id?: string;
  };
  latest_receipt_info?: AppleLatestReceiptInfo[];
}

/**
 * Validates an iOS App Store receipt via Apple's verifyReceipt endpoint.
 * Follows Apple's guidance: try production first, retry against sandbox on
 * status 21007 (sandbox receipt sent to production).
 */
export async function validateAppleReceipt(
  receiptData: string,
  expectedProductId: string,
): Promise<IAPValidationResult> {
  const sharedSecret = process.env.APPLE_IAP_SHARED_SECRET;
  if (!sharedSecret) {
    return {
      valid: false,
      reason: "Apple receipt validation is not configured",
    };
  }

  const body = JSON.stringify({
    "receipt-data": receiptData,
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
      return {
        valid: false,
        reason: `Apple rejected the receipt (status ${data.status})`,
      };
    }
    if (data.receipt?.bundle_id !== APPLE_BUNDLE_ID) {
      return { valid: false, reason: "Receipt is not for this app" };
    }

    // Find the most recent transaction for our product.
    const now = Date.now();
    const matching = (data.latest_receipt_info ?? [])
      .filter((t) => t.product_id === expectedProductId)
      .map((t) => ({ ...t, expiresMs: parseInt(t.expires_date_ms ?? "0", 10) }))
      .sort((a, b) => b.expiresMs - a.expiresMs);

    const latest = matching[0];
    if (!latest) {
      return {
        valid: false,
        reason: "Receipt contains no transaction for this product",
      };
    }
    if (!latest.expiresMs || latest.expiresMs <= now) {
      return { valid: false, reason: "Subscription has expired" };
    }
    if (latest.cancellation_date_ms) {
      return { valid: false, reason: "Subscription has been revoked" };
    }
    if (!latest.original_transaction_id) {
      return {
        valid: false,
        reason: "Receipt is missing its original transaction ID",
      };
    }

    return {
      valid: true,
      expiresAt: new Date(latest.expiresMs),
      transactionId: latest.transaction_id,
      originalTransactionId: latest.original_transaction_id,
    };
  } catch (err) {
    logger.error({ err }, "Apple receipt validation failed");
    return {
      valid: false,
      reason: "Could not reach Apple receipt validation service",
    };
  }
}

// ─── Google ───────────────────────────────────────────────────────────────────

/**
 * Validates an Android subscription purchase via the Google Play Developer API
 * (purchases.subscriptionsv2.get), authenticated with a service account.
 */
export async function validateGooglePurchase(
  purchaseToken: string,
  productId: string,
): Promise<IAPValidationResult> {
  const rawCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!rawCredentials) {
    return {
      valid: false,
      reason: "Google purchase validation is not configured",
    };
  }

  try {
    const credentials = JSON.parse(rawCredentials);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
    const androidPublisher = google.androidpublisher({ version: "v3", auth });
    const { data: purchase } =
      await androidPublisher.purchases.subscriptionsv2.get({
        packageName: ANDROID_PACKAGE_NAME,
        token: purchaseToken,
      });

    // A token is accepted only when Google reports an active entitlement. Pending,
    // paused, expired, or revoked subscriptions must never grant Premium access.
    if (
      purchase.subscriptionState !== "SUBSCRIPTION_STATE_ACTIVE" &&
      purchase.subscriptionState !== "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
    ) {
      return { valid: false, reason: "Subscription is not active" };
    }

    // Google returns product and expiry per line item. Check the requested product
    // rather than trusting the client-supplied productId.
    const matchingLineItem = (purchase.lineItems ?? [])
      .filter((item) => item.productId === productId)
      .map((item) => ({
        ...item,
        expiryMs: item.expiryTime ? Date.parse(item.expiryTime) : 0,
      }))
      .sort((a, b) => b.expiryMs - a.expiryMs)[0];

    if (!matchingLineItem) {
      return { valid: false, reason: "Purchase token is not for this product" };
    }
    if (!matchingLineItem.expiryMs || matchingLineItem.expiryMs <= Date.now()) {
      return { valid: false, reason: "Subscription has expired" };
    }

    return {
      valid: true,
      expiresAt: new Date(matchingLineItem.expiryMs),
      transactionId: purchase.latestOrderId ?? purchaseToken,
    };
  } catch (err) {
    logger.error({ err }, "Google purchase validation failed");
    return { valid: false, reason: "Google rejected the purchase token" };
  }
}

export interface GooglePlayPushIdentity {
  email: string;
}

/**
 * Verifies that a Google Pub/Sub push request was signed for this endpoint by
 * the service account configured on the subscription. The notification body is
 * not trusted until this check succeeds.
 */
export async function verifyGooglePlayPushIdentity(
  authorization: string | undefined,
): Promise<GooglePlayPushIdentity> {
  const audience = process.env.GOOGLE_PLAY_RTDN_AUDIENCE;
  const expectedEmail = process.env.GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL;
  if (!audience || !expectedEmail) {
    throw new Error("Google Play RTDN verification is not configured");
  }

  const token = authorization?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!token) {
    throw new Error("Google Play RTDN request is missing its bearer token");
  }

  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({ idToken: token, audience });
  const payload = ticket.getPayload();
  if (
    !payload ||
    payload.email !== expectedEmail ||
    payload.email_verified !== true
  ) {
    throw new Error(
      "Google Play RTDN request has an unexpected service identity",
    );
  }

  return { email: payload.email };
}
