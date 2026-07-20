import Constants from "expo-constants";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import type { Purchase, PurchaseError, ProductSubscription } from "react-native-iap";

import { useAuth } from "./AuthContext";
import { api } from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

// IMPORTANT: this must match the subscription product ID configured in
// App Store Connect AND Google Play Console *exactly*. On Google Play this single
// product holds three *base plans* (monthly / semi-annual / annual); the Android
// offer token used for the purchase is read from the selected base plan at runtime.
export const IAP_PRODUCT_ID = "prediqsai_pro_monthly";

// Google Play base-plan IDs that live INSIDE the product above. Base plan IDs use
// hyphens (product IDs use underscores) — these must match Play Console exactly.
export const SEMIANNUAL_BASE_PLAN_ID = "prediqsai-pro-semiannual";
export const ANNUAL_BASE_PLAN_ID = "prediqsai-pro-annual";

// ─── Tier definitions ─────────────────────────────────────────────────────────

export type TierKey = "monthly" | "semiannual" | "annual";

interface TierDef {
  key: TierKey;
  /** Android base-plan id; null = monthly (resolved as the offer that is neither of the named plans). */
  basePlanId: string | null;
  label: string;
  /** Period shown inside the option box, e.g. "/ 6 months". */
  periodLabel: string;
  /** Compact period shown on the Subscribe button, e.g. "/6mo". */
  buttonPeriod: string;
  /** Shown until the store returns a localised price. */
  fallbackPrice: string;
  saveLabel: string | null;
  /** Months of access this plan grants — used by the server to set expiry. */
  months: 1 | 6 | 12;
}

const TIER_DEFS: readonly TierDef[] = [
  {
    key: "monthly",
    basePlanId: null,
    label: "Monthly",
    periodLabel: "/ month",
    buttonPeriod: "/mo",
    fallbackPrice: "$19.99",
    saveLabel: null,
    months: 1,
  },
  {
    key: "semiannual",
    basePlanId: SEMIANNUAL_BASE_PLAN_ID,
    label: "Semi-Annual",
    periodLabel: "/ 6 months",
    buttonPeriod: "/6mo",
    fallbackPrice: "$117.54",
    saveLabel: "Save 2%",
    months: 6,
  },
  {
    key: "annual",
    basePlanId: ANNUAL_BASE_PLAN_ID,
    label: "Annual",
    periodLabel: "/ year",
    buttonPeriod: "/yr",
    fallbackPrice: "$227.89",
    saveLabel: "Save 5%",
    months: 12,
  },
];

export interface ResolvedTier extends TierDef {
  /** Localised store price when available, otherwise the fallback. */
  price: string;
  /** Android offer token for this base plan; required to start the purchase. */
  offerToken?: string;
  /** True when this plan can actually be purchased on the current platform. */
  available: boolean;
}

// Map a base-plan id returned on a Purchase back to its access duration. Any id
// that isn't one of the named long plans is treated as the monthly base plan.
function monthsFromBasePlanId(id?: string | null): 1 | 6 | 12 | null {
  if (!id) return null;
  if (id === SEMIANNUAL_BASE_PLAN_ID) return 6;
  if (id === ANNUAL_BASE_PLAN_ID) return 12;
  return 1;
}

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

// All Android base-plan offers attached to a fetched subscription product.
function getAndroidOffers(product: ProductSubscription) {
  if ("subscriptionOfferDetailsAndroid" in product) {
    return product.subscriptionOfferDetailsAndroid ?? [];
  }
  return [];
}

// The ongoing (last) pricing phase holds the recurring price; earlier phases may
// be free trials or intro offers.
function offerPrice(offer: { pricingPhases?: { pricingPhaseList?: { formattedPrice: string }[] } }): string | null {
  const phases = offer.pricingPhases?.pricingPhaseList;
  if (phases && phases.length > 0) return phases[phases.length - 1].formattedPrice;
  return null;
}

// Resolve every tier against the fetched product, attaching live price + offer
// token + purchasability. Always returns all three tiers so the UI is stable.
function resolveTiers(product: ProductSubscription | null): ResolvedTier[] {
  return TIER_DEFS.map((def) => {
    let price = def.fallbackPrice;
    let offerToken: string | undefined;
    let available = false;

    if (product) {
      const offers = getAndroidOffers(product);
      if (offers.length > 0) {
        const offer = def.basePlanId
          ? offers.find((o) => o.basePlanId === def.basePlanId)
          : offers.find(
              (o) => o.basePlanId !== SEMIANNUAL_BASE_PLAN_ID && o.basePlanId !== ANNUAL_BASE_PLAN_ID,
            ) ?? offers[0];
        if (offer?.offerToken) {
          offerToken = offer.offerToken;
          available = true;
          const p = offerPrice(offer);
          if (p) price = p;
        }
      } else if (def.key === "monthly") {
        // iOS / no Android offers: the single product maps to the monthly plan.
        if ("displayPrice" in product && typeof product.displayPrice === "string") {
          price = product.displayPrice;
        }
        available = Platform.OS === "ios";
      }
    }

    return { ...def, price, offerToken, available };
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface IAPContextType {
  /** Start a purchase for the given tier (defaults to monthly). */
  subscribe: (tierKey?: TierKey) => Promise<void>;
  restore: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  /** The three subscription tiers with live price/availability. */
  tiers: ResolvedTier[];
  /** True once offerings have been fetched and the default (monthly) plan is purchasable. */
  productsReady: boolean;
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
  tiers: resolveTiers(null),
  productsReady: false,
  iapSupported: IAP_SUPPORTED,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function IAPProvider({ children }: { children: React.ReactNode }) {
  const { token, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductSubscription | null>(null);
  const purchaseListener = useRef<{ remove: () => void } | null>(null);
  const errorListener = useRef<{ remove: () => void } | null>(null);
  const connectedRef = useRef(false);
  // Fallback for the purchased duration when the Purchase omits currentPlanId.
  const selectedMonthsRef = useRef<1 | 6 | 12>(1);

  const tiers = useMemo(() => resolveTiers(product), [product]);
  const productsReady = useMemo(
    () => tiers.some((t) => t.key === "monthly" && t.available),
    [tiers],
  );

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

          const planMonths =
            monthsFromBasePlanId(purchase.currentPlanId) ?? selectedMonthsRef.current ?? 1;

          try {
            await api.subscription.verifyIAPPurchase(token, {
              platform: purchase.platform === "ios" ? "ios" : "android",
              productId: purchase.productId,
              transactionId: purchase.id,
              purchaseToken: purchase.purchaseToken ?? undefined,
              transactionReceipt:
                (purchase as Purchase & { transactionReceipt?: string }).transactionReceipt ??
                undefined,
              planMonths,
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
          setError("Subscription plans are currently unavailable. Please try again later.");
          return;
        }

        setProduct(match);

        // On Android the monthly base plan must have an active offer token or the
        // default purchase can't start — surface a precise message rather than
        // enabling a button that would fail mid-purchase.
        if (Platform.OS === "android") {
          const offers = getAndroidOffers(match);
          const hasMonthly = offers.some(
            (o) =>
              o.basePlanId !== SEMIANNUAL_BASE_PLAN_ID &&
              o.basePlanId !== ANNUAL_BASE_PLAN_ID &&
              !!o.offerToken,
          );
          if (offers.length === 0 || !hasMonthly) {
            setError(
              "This subscription has no active plan available in the store yet. Please try again later.",
            );
          }
        }
      } catch {
        if (cancelled) return;
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

  const subscribe = useCallback(
    async (tierKey: TierKey = "monthly") => {
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
        setError("Subscription plan is unavailable right now. Please try again in a moment.");
        return;
      }

      const tier = tiers.find((t) => t.key === tierKey);
      if (!tier || !tier.available) {
        setError("That plan isn't available right now. Please choose another option.");
        return;
      }

      setError(null);
      setIsLoading(true);
      selectedMonthsRef.current = tier.months;
      try {
        const offerToken = tier.offerToken;

        await iap.requestPurchase({
          request: {
            apple: { sku: product.id },
            google: {
              skus: [product.id],
              // Android subscriptions must reference the selected base-plan offer.
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
    },
    [product, tiers],
  );

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
          transactionReceipt:
            (p as Purchase & { transactionReceipt?: string }).transactionReceipt ?? undefined,
          planMonths: monthsFromBasePlanId(p.currentPlanId) ?? undefined,
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
    <IAPContext.Provider
      value={{
        subscribe,
        restore,
        isLoading,
        error,
        clearError,
        tiers,
        productsReady,
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
