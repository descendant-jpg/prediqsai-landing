import { getSharedOddsSnapshotWithMetadata } from "./arbitrage-engine";

const ODDS_API_KEY = process.env.ODDS_API_KEY;
const CACHE_TTL_MS = 5 * 60 * 1000;
const TICKER_HORIZON_MS = 6 * 60 * 60 * 1000;

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

export interface TickerItem {
  id: string;
  icon: string;
  match: string;
  market: string;
  odds: number;
  direction: "up" | "down";
  detail: string;
  commenceTime?: string;
  fetchedAt?: string;
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

export interface TickerCacheResult {
  items: TickerItem[];
  cached: boolean;
  cachedAt: string | null;
  stale: boolean;
  cacheStatus: "hit" | "empty";
}

const tickerItemsBySport = new Map<string, { items: TickerItem[]; fetchedAt: number }>();
let tickerSportOffset = 0;
const lastPrices = new Map<string, number>();

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

async function fetchSportTicker(
  sportKey: string,
  icon: string,
): Promise<{ items: TickerItem[]; fetchedAt: number | null }> {
  const snapshot = await getSharedOddsSnapshotWithMetadata(sportKey, "us,uk,eu,au");
  const events = snapshot.games as unknown as OddsEvent[];
  const items: TickerItem[] = [];

  for (const ev of events.slice(0, 4)) {
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
      commenceTime: ev.commence_time,
      fetchedAt: snapshot.fetchedAt ? new Date(snapshot.fetchedAt).toISOString() : undefined,
    });
  }
  return { items, fetchedAt: snapshot.fetchedAt };
}

export function getCachedOddsTicker(): TickerCacheResult {
  const now = Date.now();
  const retainedEntries = Array.from(tickerItemsBySport.values());
  const includedEntries = retainedEntries.filter(
    (entry) => now - entry.fetchedAt <= TICKER_HORIZON_MS,
  );
  const items = includedEntries.flatMap((entry) =>
    entry.items.filter((item) => {
      if (!item.commenceTime) return true;
      const commenceMs = new Date(item.commenceTime).getTime();
      return Number.isNaN(commenceMs) || commenceMs > now;
    }),
  );
  const includedTimestamps = includedEntries
    .filter((entry) => entry.items.some((item) => items.includes(item)))
    .map((entry) => entry.fetchedAt);
  const oldestIncluded = includedTimestamps.length > 0 ? Math.min(...includedTimestamps) : null;
  const retainedTimestamps = retainedEntries.map((entry) => entry.fetchedAt);
  const oldestRetained = retainedTimestamps.length > 0 ? Math.min(...retainedTimestamps) : null;
  return {
    items,
    cached: items.length > 0,
    cachedAt: oldestIncluded ? new Date(oldestIncluded).toISOString() : oldestRetained ? new Date(oldestRetained).toISOString() : null,
    stale: oldestIncluded
      ? now - oldestIncluded >= CACHE_TTL_MS
      : retainedEntries.some((entry) => entry.items.length > 0),
    cacheStatus: items.length > 0 ? "hit" : "empty",
  };
}

export async function refreshOddsTicker(coldOnly = false): Promise<TickerCacheResult> {
  if (coldOnly && getCachedOddsTicker().cacheStatus === "hit") return getCachedOddsTicker();
  if (!ODDS_API_KEY) throw new Error("ODDS_API_KEY not configured");

  const selectedSports = Array.from({ length: Math.min(3, TICKER_SPORTS.length) }, (_, index) =>
    TICKER_SPORTS[(tickerSportOffset + index) % TICKER_SPORTS.length],
  );
  tickerSportOffset = (tickerSportOffset + selectedSports.length) % TICKER_SPORTS.length;
  const results = await Promise.allSettled(
    selectedSports.map(({ key, icon }) => fetchSportTicker(key, icon)),
  );
  results.forEach((result, index) => {
    if (result.status !== "fulfilled") return;
    const sportKey = selectedSports[index].key;
    if (result.value.fetchedAt === null) return;
    if (result.value.items.length > 0 || !tickerItemsBySport.has(sportKey)) {
      tickerItemsBySport.set(sportKey, {
        items: result.value.items,
        fetchedAt: result.value.fetchedAt,
      });
    }
  });
  return getCachedOddsTicker();
}