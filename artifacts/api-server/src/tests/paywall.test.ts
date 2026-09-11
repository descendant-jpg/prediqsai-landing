import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import express, { type Router } from "express";
import jwt from "jsonwebtoken";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_SECRET = "paywall-regression-test-secret-at-least-32-chars";
process.env.SESSION_SECRET = TEST_SECRET;

const mocks = vi.hoisted(() => ({
  user: {
    tier: "free",
    manualTierOverride: null as string | null,
    freeTrialUntil: null as Date | null,
  },
  predictions: [
    {
      id: 1,
      sport: "soccer",
      league: "English Premier League",
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      matchDate: "2026-04-01T18:00:00.000Z",
      prediction: "Arsenal to win",
      confidence: 92,
      reasoning: "Strong home form",
      keyFactors: ["Home form", "Recent record"],
      againstFactors: ["Derby variance"],
      weatherImpact: "None",
      sharpMoneySignal: "home",
      aiProbability: 72,
      bookmakerProbability: 58,
      simulationData: { homeWin: 0.72 },
      agentScores: { form: 90 },
      publicBacking: 64,
      avoidMatch: false,
      avoidReason: "",
      riskLevel: "low",
      valueDetected: true,
    },
    {
      id: 2,
      sport: "nba",
      league: "NBA",
      homeTeam: "Celtics",
      awayTeam: "Knicks",
      matchDate: "2026-04-01T20:00:00.000Z",
      prediction: "Celtics -4",
      confidence: 88,
      reasoning: "Rest advantage",
      keyFactors: ["Rest"],
      againstFactors: [],
      weatherImpact: null,
      sharpMoneySignal: null,
      aiProbability: 68,
      bookmakerProbability: 55,
      simulationData: { cover: 0.68 },
      agentScores: { form: 84 },
      publicBacking: 55,
      avoidMatch: false,
      avoidReason: "",
      riskLevel: "medium",
      valueDetected: true,
    },
    {
      id: 3,
      sport: "soccer",
      league: "EPL",
      homeTeam: "Liverpool",
      awayTeam: "Everton",
      matchDate: "2026-04-02T18:00:00.000Z",
      prediction: "Over 2.5 goals",
      confidence: 81,
      reasoning: "Attacking matchup",
      keyFactors: ["Scoring form"],
      againstFactors: [],
      weatherImpact: null,
      sharpMoneySignal: null,
      aiProbability: 66,
      bookmakerProbability: 52,
      simulationData: { over: 0.66 },
      agentScores: { form: 79 },
      publicBacking: 61,
      avoidMatch: false,
      avoidReason: "",
      riskLevel: "medium",
      valueDetected: true,
    },
    {
      id: 4,
      sport: "soccer",
      league: "La Liga",
      homeTeam: "Barcelona",
      awayTeam: "Sevilla",
      matchDate: "2026-04-02T20:00:00.000Z",
      prediction: "Barcelona to win",
      confidence: 75,
      reasoning: "Superior attack",
      keyFactors: ["Attack"],
      againstFactors: [],
      weatherImpact: null,
      sharpMoneySignal: null,
      aiProbability: 63,
      bookmakerProbability: 57,
      simulationData: { homeWin: 0.63 },
      agentScores: { form: 76 },
      publicBacking: 70,
      avoidMatch: false,
      avoidReason: "",
      riskLevel: "medium",
      valueDetected: true,
    },
  ],
  opportunities: [
    {
      id: "arb-1",
      event: "Arsenal vs Chelsea",
      profitPercent: 4.2,
      totalImplied: 0.96,
      legs: [
        { bookmaker: "Book A", outcome: "Arsenal", odds: 2.1 },
        { bookmaker: "Book B", outcome: "Chelsea", odds: 2.15 },
      ],
    },
    {
      id: "arb-2",
      event: "Celtics vs Knicks",
      profitPercent: 2.8,
      totalImplied: 0.97,
      legs: [
        { bookmaker: "Book C", outcome: "Celtics", odds: 2.05 },
        { bookmaker: "Book D", outcome: "Knicks", odds: 2.12 },
      ],
    },
  ],
}));

vi.mock("@workspace/db", () => {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(async () => [mocks.user]),
  };
  return {
    db: { select: vi.fn(() => chain) },
    users: { id: {}, tier: {}, manualTierOverride: {}, freeTrialUntil: {} },
    predictions: {
      result: {},
      sport: {},
      createdAt: {},
      avoidMatch: {},
    },
  };
});

vi.mock("../services/prediction-engine", () => ({
  getPredictions: vi.fn(async () => mocks.predictions),
  refreshPredictions: vi.fn(async () => mocks.predictions),
}));

vi.mock("../services/arbitrage-engine", () => ({
  BOOKMAKER_META: {},
  CURRENCIES: {},
  REGION_DISCLAIMERS: {
    global: "Test disclaimer",
    us: "Test disclaimer",
    uk: "Test disclaimer",
    africa: "Test disclaimer",
    asia: "Test disclaimer",
  },
  calculateStakes: vi.fn(),
  getCachedArbitrage: vi.fn(() => ({
    data: mocks.opportunities,
    cachedAt: "2026-04-01T00:00:00.000Z",
    stale: false,
    cacheStatus: "fresh",
    cacheSourceRegion: "global",
  })),
  getCachedEVBets: vi.fn(),
  getCachedMiddles: vi.fn(),
  getLiveExchangeRates: vi.fn(),
}));

let server: Server;
let baseUrl: string;

function token(): string {
  return jwt.sign({ userId: 42 }, TEST_SECRET, {
    algorithm: "HS256",
    expiresIn: "1h",
  });
}

async function request(path: string, authenticated = true): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    headers: authenticated ? { Authorization: `Bearer ${token()}` } : {},
  });
}

beforeAll(async () => {
  const [{ default: predictionsRouter }, { default: arbitrageRouter }] = await Promise.all([
    import("../routes/predictions"),
    import("../routes/arbitrage"),
  ]) as [{ default: Router }, { default: Router }];

  const app = express();
  app.use(express.json());
  app.use(predictionsRouter);
  app.use("/api", arbitrageRouter);

  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", (error?: Error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

beforeEach(() => {
  mocks.user.tier = "free";
  mocks.user.manualTierOverride = null;
  mocks.user.freeTrialUntil = null;
});

describe("freemium paywall", () => {
  it("rejects unauthenticated prediction requests", async () => {
    const response = await request("/predictions", false);
    expect(response.status).toBe(401);
  });

  it("redacts all but two Premier League picks for free users", async () => {
    const response = await request("/predictions");
    const body = await response.json() as Array<Record<string, unknown>>;

    expect(response.status).toBe(200);
    const unlocked = body.filter((pick) => pick.locked === false);
    expect(unlocked).toHaveLength(2);
    expect(unlocked.every((pick) =>
      pick.sport === "soccer" &&
      ["premier league", "epl"].some((league) =>
        String(pick.league).toLowerCase().includes(league),
      ),
    )).toBe(true);

    const locked = body.filter((pick) => pick.locked === true);
    expect(locked.length).toBeGreaterThan(0);
    for (const pick of locked) {
      expect(pick).toMatchObject({
        prediction: "",
        confidence: 0,
        reasoning: "",
        keyFactors: [],
        aiProbability: 0,
        valueDetected: false,
        avoidMatch: false,
      });
      expect(pick).toHaveProperty("homeTeam");
      expect(pick).toHaveProperty("awayTeam");
      expect(pick).toHaveProperty("league");
      expect(pick).toHaveProperty("matchDate");
    }
  });

  it("returns full unlocked predictions for premium users", async () => {
    mocks.user.tier = "premium";
    const response = await request("/predictions");
    const body = await response.json() as Array<Record<string, unknown>>;

    expect(response.status).toBe(200);
    expect(body.every((pick) => pick.locked === false)).toBe(true);
    expect(body[0]).toMatchObject({
      prediction: mocks.predictions[0]?.prediction,
      confidence: mocks.predictions[0]?.confidence,
      reasoning: mocks.predictions[0]?.reasoning,
    });
  });

  it("redacts match of the day analysis for free users", async () => {
    const response = await request("/predictions/match-of-day");
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      match: "Arsenal vs Chelsea",
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      pick: "",
      confidence: 0,
      analysis: "",
      keyStats: [],
      locked: true,
    });
  });

  it("returns full match of the day analysis for premium users", async () => {
    mocks.user.tier = "premium";
    const response = await request("/predictions/match-of-day");
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      pick: mocks.predictions[0]?.prediction,
      confidence: mocks.predictions[0]?.confidence,
      analysis: mocks.predictions[0]?.reasoning,
      keyStats: mocks.predictions[0]?.keyFactors,
      locked: false,
    });
  });

  it("rejects unauthenticated arbitrage requests", async () => {
    const response = await request("/api/arbitrage", false);
    expect(response.status).toBe(401);
  });

  it("serves a legless teaser to free users and full arbitrage to premium users", async () => {
    const freeResponse = await request("/api/arbitrage");
    const freeBody = await freeResponse.json() as {
      opportunities: Array<{ legs: unknown[] }>;
    };
    expect(freeResponse.status).toBe(200);
    expect(freeBody.opportunities.length).toBeLessThanOrEqual(1);
    expect(freeBody.opportunities[0]?.legs).toEqual([]);

    mocks.user.tier = "premium";
    const premiumResponse = await request("/api/arbitrage");
    const premiumBody = await premiumResponse.json() as {
      opportunities: Array<{ legs: unknown[] }>;
    };
    expect(premiumResponse.status).toBe(200);
    expect(premiumBody.opportunities).toHaveLength(2);
    expect(premiumBody.opportunities.every((opportunity) => opportunity.legs.length > 0)).toBe(true);
  });
});