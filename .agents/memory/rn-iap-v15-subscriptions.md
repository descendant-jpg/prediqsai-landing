---
name: react-native-iap v15 (Nitro) subscriptions
description: How to correctly buy a subscription with react-native-iap v15 so Android does not throw "SKU not found".
---

# react-native-iap v15 (Nitro) subscriptions

**Rule:** Never call `requestPurchase` for a subscription with only a hardcoded SKU. Always fetch the product first, then purchase using the fetched product id, and on Android attach the base-plan offer token.

**Why:** v15 / Google Play Billing require a concrete *offer* to start a subscription purchase. Passing `google: { skus: [...] }` with no `subscriptionOffers`/`offerToken`, or buying a SKU that was never fetched from the store, surfaces as a red "SKU not found" on production Android. (App Store is more forgiving, so it can pass on iOS while failing on Android.)

**How to apply:**
- After `initConnection()`, call `fetchProducts({ skus: [PRODUCT_ID], type: "subs" })` → returns `ProductSubscription[]`.
- Each product has `id` (the store product id). On Android the base-plan offer token is at `product.subscriptionOfferDetailsAndroid[0].offerToken` (field only present on the Android union member — narrow with `"subscriptionOfferDetailsAndroid" in product`).
- Purchase:
  ```ts
  requestPurchase({
    request: {
      apple: { sku: product.id },
      google: { skus: [product.id], subscriptionOffers: [{ sku: product.id, offerToken }] },
    },
    type: "subs",
  })
  ```
- Treat the product as purchasable on Android ONLY if an offer token exists — otherwise the base plan isn't active in Play Console yet; show a precise message rather than enabling a button that fails mid-purchase.
- Gate the buy button on real availability, but keep web / Expo Go enabled (IAP module is absent there) so the explanatory alert still fires. Expo Go can't load the Nitro module at all — guard with `Constants.appOwnership === "expo"` and `Platform.OS !== "web"`.

The product/SKU string must match App Store Connect AND Google Play Console exactly, and Google Play needs an active base plan on that subscription.
