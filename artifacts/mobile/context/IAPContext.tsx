import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import type { Purchase, PurchaseError } from "react-native-iap";

import { useAuth } from "./AuthContext";
import { api } from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

export const IAP_PRODUCT_ID = "prediqsai_premium_monthly";

// ─── Safe IAP import (not available on web or bare Expo Go) ──────────────────

type IAPModule = typeof import("react-native-iap");

function getIAP(): IAPModule | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-iap") as IAPModule;
  } catch {
    return null;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface IAPContextType {
  subscribe: () => Promise<void>;
  restore: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const IAPContext = createContext<IAPContextType>({
  subscribe: async () => {},
  restore: async () => {},
  isLoading: false,
  error: null,
  clearError: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function IAPProvider({ children }: { children: React.ReactNode }) {
  const { token, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const purchaseListener = useRef<{ remove: () => void } | null>(null);
  const errorListener = useRef<{ remove: () => void } | null>(null);
  const connectedRef = useRef(false);

  useEffect(() => {
    const iap = getIAP();
    if (!iap || !token) return;

    let cancelled = false;

    iap.initConnection()
      .then(() => {
        if (cancelled) return;
        connectedRef.current = true;

        purchaseListener.current = iap.purchaseUpdatedListener(async (purchase: Purchase) => {
          if (!purchase.purchaseToken) return;

          try {
            await api.subscription.verifyIAPPurchase(token, {
              // v15: purchase.platform is IapPlatform ("ios"|"android")
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
      })
      .catch(() => {
        // IAP unavailable — simulator, Expo Go without dev client, etc.
      });

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
        "In-app purchases require the iOS or Android app. They are not available in a web browser.",
      );
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      // v15 API: requestPurchase with platform-specific request objects
      await iap.requestPurchase({
        request: {
          apple: { sku: IAP_PRODUCT_ID },
          google: { skus: [IAP_PRODUCT_ID] },
        },
        type: "subs",
      });
      // Purchase result handled asynchronously by purchaseUpdatedListener
    } catch (err: unknown) {
      const code = (err as any)?.code as string | undefined;
      if (code !== "E_USER_CANCELLED") {
        setError((err as any)?.message ?? "Could not start purchase. Please try again.");
      }
      setIsLoading(false);
    }
  }, []);

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

  return (
    <IAPContext.Provider value={{ subscribe, restore, isLoading, error, clearError }}>
      {children}
    </IAPContext.Provider>
  );
}

export function useIAP() {
  return useContext(IAPContext);
}
