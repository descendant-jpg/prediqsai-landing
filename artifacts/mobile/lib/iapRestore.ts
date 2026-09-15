import type { IAPRestoreRequest } from "./api";

type RestorePurchase = {
  productId: string;
  purchaseToken?: string | null;
};

/**
 * Android restores use each purchase's Play token. iOS restores use the
 * base64 app receipt returned by react-native-iap's getReceiptDataIOS().
 */
export function buildIAPRestoreRequest(
  platform: "ios" | "android",
  purchases: readonly RestorePurchase[],
  iosTransactionReceipt?: string | null,
): IAPRestoreRequest {
  if (platform === "ios") {
    return {
      platform,
      purchases: iosTransactionReceipt
        ? purchases.map((purchase) => ({
            productId: purchase.productId,
            transactionReceipt: iosTransactionReceipt,
          }))
        : [],
    };
  }

  return {
    platform,
    purchases: purchases.flatMap((purchase) =>
      purchase.purchaseToken
        ? [{ productId: purchase.productId, purchaseToken: purchase.purchaseToken }]
        : [],
    ),
  };
}