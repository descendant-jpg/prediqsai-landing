import { Router } from "express";

import { logger } from "../lib/logger";
import { requireAuth } from "../middleware/auth";

const router = Router();

const ODDS_API_KEY = process.env.ODDS_API_KEY;

const TICKER_SPORTS: { key: string; icon: string }[] = [
  { key: "soccer_epl", icon: "⚽" },
  { key: "soccer_spain_la_liga", icon: "⚽" },
  { key: "basketball_nba", icon: "🏀" },
  { key: "americanfootball_nfl", icon: "🏈" },
  { key: "baseball_mlb", icon: "⚾" },
  { key: "icehockey_nhl", icon: "🏒" },
  { key: "aussierules_afl", icon: "🏉" },
  { key: "rugbyleague_nrl", icon: "🏉" },
  { key: "mma_mixed_martial_arts", icon: "🥊" },
];

interface TickerItem {
  id: string;
  icon: string;
  match: string;
  market: string;
  odds: number;
  direction: "up" | "down";
  detail: string;
}

interface OddsEvent {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers?: {
    title: string;
    markets?: { key: string; outcomes?: { name: string; price: number }[] }[];
  }[];
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { items: TickerItem[]; fetchedAt: number } | null = null;
// Previous consensus price per event+outcome, used to derive line movement.
const lastPrices = new Map<string, number>();

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

async function fetchSportTicker(sportKey: string, icon: string): Promise<TickerItem[]> {
  const url =
    `https://api.the-odds-api.com/v4/sports/${sportKey}/odds` +
    `?apiKey=${ODDS_API_KEY}&regions=us,uk,eu&markets=h2h&oddsFormat=decimal`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!resp.ok) {
    logger.warn({ sportKey, status: resp.status }, "Odds ticker: Odds API non-OK");
    return [];
  }
  const events = (await resp.json()) as OddsEvent[];
  const items: TickerItem[] = [];

  for (const ev of events.slice(0, 4)) {
    // Collect all bookmaker prices for the home-team h2h outcome.
    const prices: { book: string; price: number }[] = [];
    for (const bm of ev.bookmakers ?? []) {
      const h2h = bm.markets?.find((m) => m.key === "h2h");
      const outcome = h2h?.outcomes?.find((o) => o.name === ev.home_team);
      if (outcome && typeof outcome.price === "number") {
        prices.push({ book: bm.title, price: outcome.price });
      }
    }
    if (prices.length < 2) continue;

    const consensus = median(prices.map((p) => p.price));
    const best = prices.reduce((a, b) => (b.price > a.price ? b : a));
    const key = `${ev.id}:${ev.home_team}`;
    const prev = lastPrices.get(key);
    lastPrices.set(key, consensus);

    const direction: "up" | "down" =
      prev != null ? (consensus >= prev ? "up" : "down") : best.price >= consensus ? "up" : "down";

    const detail =
      prev != null && prev !== consensus
        ? `Consensus price moved ${prev.toFixed(2)} → ${consensus.toFixed(2)} across ${prices.length} bookmakers. Best available: ${best.price.toFixed(2)} at ${best.book}.`
        : `Live consensus ${consensus.toFixed(2)} across ${prices.length} bookmakers. Best available: ${best.price.toFixed(2)} at ${best.book}.`;

    items.push({
      id: key,
      icon,
      match: `${ev.home_team} vs ${ev.away_team}`,
      market: `${ev.home_team} ML`,
      odds: Number(consensus.toFixed(2)),
      direction,
      detail,
    });
  }
  return items;
}

router.get("/odds/ticker", requireAuth, async (req, res) => {
  try {
    if (!ODDS_API_KEY) {
      res.status(503).json({ error: "Odds API not configured" });
      return;
    }

    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      res.json({ items: cache.items, cached: true });
      return;
    }

    const results = await Promise.allSettled(
      TICKER_SPORTS.map(({ key, icon }) => fetchSportTicker(key, icon)),
    );
    const items = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

    if (items.length > 0) {
      cache = { items, fetchedAt: Date.now() };
      res.json({ items, cached: false });
      return;
    }

    // Nothing live right now — serve stale cache if we have one, else empty.
    res.json({ items: cache?.items ?? [], cached: Boolean(cache) });
  } catch (err) {
    req.log.error({ err }, "Failed to build odds ticker");
    res.status(500).json({ error: "Failed to fetch live odds" });
  }
});

export default router;
