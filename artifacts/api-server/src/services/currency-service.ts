import { logger } from "../lib/logger";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CurrencyRate {
  code: string;
  symbol: string;
  name: string;
  rateFromUSD: number; // units of this currency per 1 USD
}

export const SUPPORTED_CURRENCIES: Record<string, Omit<CurrencyRate, "rateFromUSD">> = {
  USD: { code: "USD", symbol: "$",     name: "US Dollar"           },
  NGN: { code: "NGN", symbol: "₦",     name: "Nigerian Naira"      },
  KES: { code: "KES", symbol: "KES ",  name: "Kenyan Shilling"     },
  GHS: { code: "GHS", symbol: "GHS ",  name: "Ghanaian Cedi"       },
  ZAR: { code: "ZAR", symbol: "R",     name: "South African Rand"  },
  UGX: { code: "UGX", symbol: "UGX ",  name: "Ugandan Shilling"    },
  TZS: { code: "TZS", symbol: "TZS ",  name: "Tanzanian Shilling"  },
  ZMW: { code: "ZMW", symbol: "ZMW ",  name: "Zambian Kwacha"      },
  GBP: { code: "GBP", symbol: "£",     name: "British Pound"       },
  EUR: { code: "EUR", symbol: "€",     name: "Euro"                },
  CAD: { code: "CAD", symbol: "CA$",   name: "Canadian Dollar"     },
  AUD: { code: "AUD", symbol: "AU$",   name: "Australian Dollar"   },
};

// Fallback static rates (updated periodically — live rates take priority)
const STATIC_FALLBACK_RATES: Record<string, number> = {
  USD: 1,      NGN: 1580,  KES: 129,   GHS: 15.5,
  ZAR: 18.8,   UGX: 3720,  TZS: 2650,  ZMW: 27.5,
  GBP: 0.79,   EUR: 0.93,  CAD: 1.36,  AUD: 1.55,
};

// ─── Cache ─────────────────────────────────────────────────────────────────────

interface RatesCache { rates: Record<string, number>; fetchedAt: number; source: "live" | "fallback" }
let _cache: RatesCache | null = null;
const CACHE_MS = 60 * 60 * 1_000; // 1 hour

// ─── Fetch live rates ──────────────────────────────────────────────────────────

export async function getLiveRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (_cache && now - _cache.fetchedAt < CACHE_MS) return _cache.rates;

  const key = process.env["EXCHANGE_RATE_API_KEY"];

  try {
    let rates: Record<string, number>;

    if (key) {
      // v6 API — authenticated, 1 500 requests/month free tier
      const url = `https://v6.exchangerate-api.com/v6/${key}/latest/USD`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      if (!resp.ok) throw new Error(`ExchangeRate v6 status ${resp.status}`);
      const json = await resp.json() as { result: string; conversion_rates: Record<string, number> };
      if (json.result !== "success") throw new Error("ExchangeRate v6 returned error");
      rates = json.conversion_rates;
      logger.info({ currencies: Object.keys(rates).length }, "Exchange rates refreshed (v6 API)");
    } else {
      // v4 open endpoint — no key, lower rate limit
      const resp = await fetch("https://api.exchangerate-api.com/v4/latest/USD", { signal: AbortSignal.timeout(8_000) });
      if (!resp.ok) throw new Error(`ExchangeRate v4 status ${resp.status}`);
      const json = await resp.json() as { rates: Record<string, number> };
      rates = json.rates;
      logger.info({ currencies: Object.keys(rates).length }, "Exchange rates refreshed (v4 open)");
    }

    _cache = { rates, fetchedAt: now, source: "live" };
    return rates;
  } catch (err) {
    logger.warn({ err }, "Exchange rate fetch failed — using fallback");
    if (_cache) return _cache.rates;
    _cache = { rates: STATIC_FALLBACK_RATES, fetchedAt: now, source: "fallback" };
    return STATIC_FALLBACK_RATES;
  }
}

// ─── Convert helpers ───────────────────────────────────────────────────────────

/**
 * Convert a USD amount to the target currency.
 * Returns the raw number (caller formats).
 */
export async function convertFromUSD(usdAmount: number, targetCurrency: string): Promise<number> {
  const rates = await getLiveRates();
  const rate = rates[targetCurrency] ?? STATIC_FALLBACK_RATES[targetCurrency] ?? 1;
  return parseFloat((usdAmount * rate).toFixed(2));
}

/**
 * Convert an amount in a source currency to USD.
 */
export async function convertToUSD(amount: number, sourceCurrency: string): Promise<number> {
  const rates = await getLiveRates();
  const rate = rates[sourceCurrency] ?? STATIC_FALLBACK_RATES[sourceCurrency] ?? 1;
  return parseFloat((amount / rate).toFixed(6));
}

/**
 * Return full CurrencyRate for a given code (with live rate).
 */
export async function getCurrencyRate(code: string): Promise<CurrencyRate> {
  const upper = code.toUpperCase();
  const meta = SUPPORTED_CURRENCIES[upper] ?? SUPPORTED_CURRENCIES["USD"]!;
  const rates = await getLiveRates();
  const rateFromUSD = rates[upper] ?? STATIC_FALLBACK_RATES[upper] ?? 1;
  return { ...meta, rateFromUSD };
}

/**
 * For a budget in USD, return stakes converted to every supported African currency.
 * Used in the multi-currency arb display.
 */
export async function getMultiCurrencyStakes(
  stakes: Array<{ stake: number; returns: number; selection: string; bookmaker: string }>,
  guaranteedProfit: number,
  currencies: string[] = ["NGN", "KES", "ZAR", "GHS", "GBP"],
): Promise<Record<string, { code: string; symbol: string; name: string; stakes: Array<{ stake: number; returns: number; selection: string; bookmaker: string }>; profit: number }>> {
  const rates = await getLiveRates();
  const result: Record<string, { code: string; symbol: string; name: string; stakes: Array<{ stake: number; returns: number; selection: string; bookmaker: string }>; profit: number }> = {};

  for (const currCode of currencies) {
    const upper = currCode.toUpperCase();
    const meta = SUPPORTED_CURRENCIES[upper] ?? SUPPORTED_CURRENCIES["USD"]!;
    const rate = rates[upper] ?? STATIC_FALLBACK_RATES[upper] ?? 1;

    result[upper] = {
      code: upper,
      symbol: meta.symbol,
      name: meta.name,
      stakes: stakes.map((s) => ({
        ...s,
        stake:   parseFloat((s.stake   * rate).toFixed(0)),
        returns: parseFloat((s.returns * rate).toFixed(0)),
      })),
      profit: parseFloat((guaranteedProfit * rate).toFixed(0)),
    };
  }

  return result;
}

/**
 * Infer preferred display currency from region.
 */
export function currencyForRegion(region: string): string {
  switch (region) {
    case "africa": return "NGN";  // default Africa → Naira; client can override
    case "us":     return "USD";
    case "uk":     return "GBP";
    default:       return "USD";
  }
}

/**
 * Infer currency from country code (for user-profile-based detection).
 */
export function currencyForCountry(countryCode: string): string {
  const map: Record<string, string> = {
    NG: "NGN", KE: "KES", ZA: "ZAR", GH: "GHS", UG: "UGX",
    TZ: "TZS", ZM: "ZMW", GB: "GBP", US: "USD", CA: "CAD",
    AU: "AUD", DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR",
  };
  return map[countryCode.toUpperCase()] ?? "USD";
}
