import Constants from "expo-constants";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import type { Purchase, PurchaseError, ProductSubscription } from "react-native-iap";

import { useAuth } from "./AuthContext";
import { api } from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

// IMPORTANT: this must match the subscription product ID configured in
// App Store Connect AND Google Play Console *exactly*. On Google Play the
// product must also have an active base plan — the Android offer token used
// for the purchase is read from that base plan at runtime.
export const IAP_PRODUCT_ID = "prediqsai_pro_monthly";

// ─── Environment detection ────────────────────────────────────────────────────

// True when running inside Expo Go (not a custom dev/production native build).
// Expo Go cannot run NitroModules (required by react-native-iap v15) — attempting
// to require the module causes a hard crash, so we skip IAP entirely here.
const IS_EXPO_GO = Constants.appOwnership === "expo";

// Also skip on web — no native modules at all there.
const IAP_SUPPORTED = Platform.OS !== "web" && !IS_EXPO_GO;

// ─── Safe IAP import ──────────────────────────────────────────────────────────

type IAPModule = typeof import("react-native-iap");

function getIAP(): IAPModule | null {
  if (!IAP_SUPPORTED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-iap") as IAPModule;
  } catch {
    return null;
  }
}

// Pull the Android base-plan offer token from a fetched subscription product.
// Google Play subscriptions can only be purchased by referencing a concrete
// offer; without this token the purchase fails with "SKU not found".
function getAndroidOfferToken(product: ProductSubscription): string | undefined {
  if ("subscriptionOfferDetailsAndroid" in product) {
    return product.subscriptionOfferDetailsAndroid?.[0]?.offerToken ?? undefined;
  }
  return undefined;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface IAPContextType {
  subscribe: () => Promise<void>;
  restore: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  /** The dynamically-fetched subscription product, or null if not yet loaded. */
  product: ProductSubscription | null;
  /** True once offerings have been fetched and a purchasable product is available. */
  productsReady: boolean;
  /** Localised price string from the store (e.g. "$19.99"), when available. */
  priceLabel: string | null;
  /** Whether native IAP is available at all (false on web / Expo Go). */
  iapSupported: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const IAPContext = createContext<IAPContextType>({
  subscribe: async () => {},
  restore: async () => {},
  isLoading: false,
  error: null,
  clearError: () => {},
  product: null,
  productsReady: false,
  priceLabel: null,
  iapSupported: IAP_SUPPORTED,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function IAPProvider({ children }: { children: React.ReactNode }) {
  const { token, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductSubscription | null>(null);
  const [productsReady, setProductsReady] = useState(false);
  const purchaseListener = useRef<{ remove: () => void } | null>(null);
  const errorListener = useRef<{ remove: () => void } | null>(null);
  const connectedRef = useRef(false);

  useEffect(() => {
    // Skip IAP setup entirely in Expo Go / web — no native modules available.
    const iap = getIAP();
    if (!iap || !token) return;

    let cancelled = false;

    const setup = async () => {
      try {
        await iap.initConnection();
        if (cancelled) return;
        connectedRef.current = true;

        purchaseListener.current = iap.purchaseUpdatedListener(async (purchase: Purchase) => {
          if (!purchase.purchaseToken) return;

          try {
            await api.subscription.verifyIAPPurchase(token, {
              platform: purchase.platform === "ios" ? "ios" : "android",
              productId: purchase.productId,
              transactionId: purchase.id,
              purchaseToken: purchase.purchaseToken ?? undefined,
            });

            await iap.finishTransaction({ purchase, isConsumable: false });
            await refreshUser();
          } catch {
            setError("Purchase verification failed. Please contact support.");
          } finally {
            setIsLoading(false);
          }
        });

        errorListener.current = iap.purchaseErrorListener((err: PurchaseError) => {
          const code = err.code as string;
          if (code !== "E_USER_CANCELLED") {
            setError(err.message ?? "Purchase failed. Please try again.");
          }
          setIsLoading(false);
        });

        // Dynamically fetch the offering from the store rather than relying on a
        // hardcoded SKU that might be missing/mismatched in the store console.
        const items = (await iap.fetchProducts({
          skus: [IAP_PRODUCT_ID],
          type: "subs",
        })) as ProductSubscription[];
        if (cancelled) return;

        const match =
          (items ?? []).find((p) => p.id === IAP_PRODUCT_ID) ?? (items ?? [])[0] ?? null;

        if (!match) {
          setProductsReady(false);
          setError(
            "Subscription plans are currently unavailable. Please try again later.",
          );
          return;
        }

        // On Android a base-plan offer token is mandatory to start the purchase.
        // If the product exists but has no offer, surface a precise message
        // instead of enabling a button that would fail mid-purchase.
        if (Platform.OS === "android" && !getAndroidOfferToken(match)) {
          setProduct(match);
          setProductsReady(false);
          setError(
            "This subscription has no active plan available in the store yet. Please try again later.",
          );
          return;
        }

        setProduct(match);
        setProductsReady(true);
      } catch {
        if (cancelled) return;
        setProductsReady(false);
        setError(
          "Couldn't load subscription details. Please check your connection and try again.",
        );
      }
    };

    void setup();

    return () => {
      cancelled = true;
      purchaseListener.current?.remove();
      errorListener.current?.remove();
      if (connectedRef.current) {
        iap.endConnection();
        connectedRef.current = false;
      }
    };
  }, [token]);

  const subscribe = useCallback(async () => {
    const iap = getIAP();
    if (!iap) {
      Alert.alert(
        "Not Available",
        IS_EXPO_GO
          ? "In-app purchases are not available in Expo Go. Install the PrediQs app to subscribe."
          : "In-app purchases require the iOS or Android app.",
      );
      return;
    }
    if (!product) {
      setError(
        "Subscription plan is unavailable right now. Please try again in a moment.",
      );
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const offerToken = getAndroidOfferToken(product);

      await iap.requestPurchase({
        request: {
          apple: { sku: product.id },
          google: {
            skus: [product.id],
            // Android subscriptions must reference a concrete base-plan offer.
            ...(offerToken
              ? { subscriptionOffers: [{ sku: product.id, offerToken }] }
              : {}),
          },
        },
        type: "subs",
      });
    } catch (err: unknown) {
      const code = (err as any)?.code as string | undefined;
      if (code !== "E_USER_CANCELLED") {
        setError((err as any)?.message ?? "Could not start purchase. Please try again.");
      }
      setIsLoading(false);
    }
  }, [product]);

  const restore = useCallback(async () => {
    const iap = getIAP();
    if (!iap || !token) {
      Alert.alert("Not Available", "Restore purchases is only available on iOS and Android.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const purchases = await iap.getAvailablePurchases();

      const result = await api.subscription.restoreIAPPurchases(token, {
        platform: Platform.OS === "ios" ? "ios" : "android",
        purchases: (purchases ?? []).map((p: Purchase) => ({
          productId: p.productId,
          transactionId: p.id,
          purchaseToken: p.purchaseToken ?? undefined,
        })),
      });

      await refreshUser();

      if (result.restored) {
        Alert.alert("Restored!", "Your Premium subscription has been restored successfully.");
      } else {
        Alert.alert(
          "No Purchases Found",
          "No active Premium subscription was found for this Apple ID / Google account.",
        );
      }
    } catch {
      setError("Could not restore purchases. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const clearError = useCallback(() => setError(null), []);

  const priceLabel =
    product && "displayPrice" in product && typeof product.displayPrice === "string"
      ? product.displayPrice
      : null;

  return (
    <IAPContext.Provider
      value={{
        subscribe,
        restore,
        isLoading,
        error,
        clearError,
        product,
        productsReady,
        priceLabel,
        iapSupported: IAP_SUPPORTED,
      }}
    >
      {children}
    </IAPContext.Provider>
  );
}

export function useIAP() {
  return useContext(IAPContext);
}
