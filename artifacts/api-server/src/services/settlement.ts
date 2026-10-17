import { and, eq, isNull, lt } from "drizzle-orm";

import { db, predictions as predictionsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const API_SPORTS_SOCCER_FIXTURES = "https://v3.football.api-sports.io/fixtures";
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);
const SETTLE_AFTER_MS = 2.5 * 60 * 60 * 1000;
const MAX_LOOKBACK_DAYS = 14;
const OVER_UNDER_LINE = 2.5;
const DAY_MS = 24 * 60 * 60 * 1000;

interface FinishedFixture {
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
}

type Outcome = "win" | "loss";

function normalizeTeam(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(fc|cf|afc|sc|ac|as|ss|club|de|the)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function sameTeam(a: string, b: string): boolean {
  const x = normalizeTeam(a);
  const y = normalizeTeam(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

async function fetchFinishedFixtures(date: string, apiKey: string): Promise<FinishedFixture[]> {
  const resp = await fetch(`${API_SPORTS_SOCCER_FIXTURES}?date=${date}`, {
    headers: { "x-apisports-key": apiKey },
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) {
    logger.warn({ date, status: resp.status }, "Settlement: API-Sports returned non-OK");
    return [];
  }
  const data = (await resp.json()) as { response?: Record<string, unknown>[] };
  const out: FinishedFixture[] = [];
  for (const item of data.response ?? []) {
    const fixture = item.fixture as { status?: { short?: string } } | undefined;
    if (!FINISHED_STATUSES.has(fixture?.status?.short ?? "")) continue;
    const teams = item.teams as { home?: { name?: string }; away?: { name?: string } } | undefined;
    // Picks are graded on the 90-minute result: the fulltime score excludes extra time and penalties.
    const score = item.score as { fulltime?: { home: number | null; away: number | null } } | undefined;
    const goals = item.goals as { home: number | null; away: number | null } | undefined;
    const homeGoals = score?.fulltime?.home ?? goals?.home;
    const awayGoals = score?.fulltime?.away ?? goals?.away;
    if (!teams?.home?.name || !teams?.away?.name || homeGoals == null || awayGoals == null) continue;
    out.push({ home: teams.home.name, away: teams.away.name, homeGoals, awayGoals });
  }
  return out;
}

// Returns null when the pick text isn't a market we can grade.
export function evaluatePick(pick: string, homeGoals: number, awayGoals: number): Outcome | null {
  const p = pick.toLowerCase().replace(/[\s-]+/g, "_");
  const total = homeGoals + awayGoals;
  if (p.includes("home_win") || p === "home" || p === "1") {
    return homeGoals > awayGoals ? "win" : "loss";
  }
  if (p.includes("away_win") || p === "away" || p === "2") {
    return awayGoals > homeGoals ? "win" : "loss";
  }
  if (p.includes("draw") || p === "x") {
    return homeGoals === awayGoals ? "win" : "loss";
  }
  if (p.includes("over")) return total > OVER_UNDER_LINE ? "win" : "loss";
  if (p.includes("under")) return total < OVER_UNDER_LINE ? "win" : "loss";
  return null;
}

export async function settlePredictions(): Promise<{ checked: number; settled: number }> {
  const apiKey = process.env.API_SPORTS_KEY;
  if (!apiKey) return { checked: 0, settled: 0 };

  const now = Date.now();
  const unsettled = await db
    .select()
    .from(predictionsTable)
    .where(
      and(
        eq(predictionsTable.sport, "soccer"),
        isNull(predictionsTable.result),
        lt(predictionsTable.matchDate, new Date(now - SETTLE_AFTER_MS)),
      ),
    );

  const cutoff = now - MAX_LOOKBACK_DAYS * DAY_MS;
  const pending = unsettled.filter((p) => new Date(p.matchDate).getTime() >= cutoff);
  if (pending.length === 0) return { checked: 0, settled: 0 };

  const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  // A late-night kickoff can be indexed under the next UTC day, so look at the match day and the day after.
  const dates = new Set<string>();
  for (const p of pending) {
    const t = new Date(p.matchDate).getTime();
    dates.add(dayKey(t));
    dates.add(dayKey(t + DAY_MS));
  }

  const finishedByDate = new Map<string, FinishedFixture[]>();
  for (const date of dates) {
    try {
      finishedByDate.set(date, await fetchFinishedFixtures(date, apiKey));
    } catch (err) {
      logger.warn({ err, date }, "Settlement: fixture fetch failed");
    }
  }

  let settled = 0;
  for (const p of pending) {
    const t = new Date(p.matchDate).getTime();
    const candidates = [
      ...(finishedByDate.get(dayKey(t)) ?? []),
      ...(finishedByDate.get(dayKey(t + DAY_MS)) ?? []),
    ];
    const match = candidates.find((f) => sameTeam(f.home, p.homeTeam) && sameTeam(f.away, p.awayTeam));
    if (!match) continue;
    const outcome = evaluatePick(p.prediction, match.homeGoals, match.awayGoals);
    if (!outcome) continue;
    await db
      .update(predictionsTable)
      .set({ result: outcome })
      .where(and(eq(predictionsTable.id, p.id), isNull(predictionsTable.result)));
    settled++;
  }

  logger.info({ checked: pending.length, settled }, "Prediction settlement complete");
  return { checked: pending.length, settled };
}
