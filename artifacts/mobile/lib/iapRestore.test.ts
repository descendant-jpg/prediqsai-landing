import { describe, expect, it } from "vitest";

import { buildIAPRestoreRequest } from "./iapRestore";

describe("buildIAPRestoreRequest", () => {
  it("sends the Android Play purchase token and excludes incomplete purchases", () => {
    expect(buildIAPRestoreRequest("android", [
      { productId: "prediqsai_pro_monthly", purchaseToken: "play-token" },
      { productId: "prediqsai_pro_monthly" },
    ])).toEqual({
      platform: "android",
      purchases: [{ productId: "prediqsai_pro_monthly", purchaseToken: "play-token" }],
    });
  });

  it("sends the iOS receipt returned by react-native-iap", () => {
    expect(buildIAPRestoreRequest("ios", [
      { productId: "prediqsai_pro_monthly", purchaseToken: "storekit-signed-jws" },
    ], "base64-app-receipt")).toEqual({
      platform: "ios",
      purchases: [{ productId: "prediqsai_pro_monthly", transactionReceipt: "base64-app-receipt" }],
    });
  });
});