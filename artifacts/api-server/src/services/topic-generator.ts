import { GoogleGenerativeAI } from "@google/generative-ai";
import { inArray, sql } from "drizzle-orm";
import Parser from "rss-parser";

import { blogQueue, db } from "@workspace/db";
import { logger } from "../lib/logger";

// Gemini retires flash models regularly (gemini-1.5-flash already 404s for
// new keys) and the newest models intermittently 503/429 under demand spikes
// or free-tier quota limits, so generation walks this chain until one
// answers: preferred flash models first, then the open Gemma model as the
// last-resort workhorse (it keeps serving when the flash pool is saturated).
const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemma-4-31b-it",
] as const;
const HEADLINE_TARGET = 20;
const TOPIC_COUNT = 5;
const FEED_TIMEOUT_MS = 15_000;
const GEMINI_TIMEOUT_MS = 90_000;

// High-volume sports feeds: Premier League focus plus major US leagues.
// (ESPN's RSS endpoints now return HTML instead of XML; CBS Sports covers
// the NFL/NBA US-sports requirement with working feeds.)
const RSS_FEEDS = [
  "https://feeds.bbci.co.uk/sport/football/premier-league/rss.xml",
  "https://feeds.bbci.co.uk/sport/rss.xml",
  "https://www.skysports.com/rss/12040", // Sky Sports Football
  "https://www.cbssports.com/rss/headlines/nfl/",
  "https://www.cbssports.com/rss/headlines/nba/",
] as const;

const rss = new Parser();

/**
 * Fetch the top trending sports headlines across the configured RSS feeds.
 * Returns up to HEADLINE_TARGET deduplicated titles; never throws — per-feed
 * failures are logged and skipped so one bad feed cannot kill the run.
 * Feeds are fetched with fetch + AbortSignal so a hung server is genuinely
 * aborted (rss-parser's own timeout rejects but leaks the socket).
 * Exported for diagnostics/tests.
 */
export async function fetchHeadlines(): Promise<string[]> {
  const settled = await Promise.allSettled(
    RSS_FEEDS.map(async (url) => {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
        headers: {
          "user-agent": "PrediQsAI-TopicGenerator/1.0",
          accept: "application/rss+xml, application/xml, text/xml",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const feed = await rss.parseString(await res.text());
      return (feed.items ?? [])
        .map((item) => item.title?.trim())
        .filter((title): title is string => Boolean(title))
        .slice(0, 6);
    }),
  );

  const headlines: string[] = [];
  const seen = new Set<string>();
  settled.forEach((result, index) => {
    if (result.status === "rejected") {
      logger.warn({ err: result.reason, feed: RSS_FEEDS[index] }, "RSS feed fetch failed");
      return;
    }
    for (const title of result.value) {
      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      headlines.push(title);
    }
  });

  return headlines.slice(0, HEADLINE_TARGET);
}

/**
 * Parse the model's raw output into exactly TOPIC_COUNT unique topics.
 * Throws (triggering fallback to the next model) unless the output is a JSON
 * array yielding at least TOPIC_COUNT valid, case-insensitively unique
 * strings — extras are trimmed, fewer is a model failure.
 */
export function parseTopics(raw: string): string[] {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned non-JSON output");
  }
  if (!Array.isArray(parsed)) throw new Error("Gemini output was not a JSON array");

  const seen = new Set<string>();
  const topics: string[] = [];
  for (const item of parsed) {
    if (typeof item !== "string") continue;
    const topic = item.trim();
    if (topic.length < 3 || topic.length > 300) continue;
    const key = topic.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    topics.push(topic);
  }
  if (topics.length < TOPIC_COUNT) {
    throw new Error(`Gemini returned ${topics.length} usable topics, expected ${TOPIC_COUNT}`);
  }
  return topics.slice(0, TOPIC_COUNT);
}

/**
 * Ask the AI Editor (Gemini) for exactly TOPIC_COUNT SEO-optimized blog topics.
 * Walks the model fallback chain; per model, retries transient failures
 * (503/overload/timeout) with backoff while permanent failures (404 retired,
 * 429 quota, malformed output) fall through to the next model immediately.
 * Exported for diagnostics/tests.
 */
export async function generateTopics(headlines: string[]): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const gemini = new GoogleGenerativeAI(apiKey);

  const prompt = `You are the Editor-in-Chief of a premium sports prediction app. Review the following trending sports headlines. Generate exactly 5 highly engaging, SEO-optimized blog post topics that focus on sports betting angles, tactical analysis, managerial shifts, or expected value (EV). Output ONLY a valid JSON array of 5 strings. No markdown formatting, no explanations.

Headlines:
${headlines.map((h, i) => `${i + 1}. ${h}`).join("\n")}`;

  let lastErr: unknown;
  for (const modelName of GEMINI_MODELS) {
    const model = gemini.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
    });
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await model.generateContent(prompt, {
          timeout: GEMINI_TIMEOUT_MS,
          signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
        });
        const topics = parseTopics(result.response.text());
        if (modelName !== GEMINI_MODELS[0]) {
          logger.info({ model: modelName }, "Gemini topic generation used fallback model");
        }
        return topics;
      } catch (err) {
        lastErr = err;
        const message = err instanceof Error ? err.message : String(err);
        const transient = /503|overloaded|high demand|timed out|timeout|aborted/i.test(message);
        const moveOn = /404|429|not found|not supported|quota|non-JSON|not a JSON array|usable topics/i.test(message);
        if (moveOn) {
          logger.warn({ model: modelName, err: message.slice(0, 200) }, "Gemini model failed — trying next model");
          break;
        }
        if (transient && attempt < 3) {
          const delayMs = 3_000 * attempt;
          logger.warn({ model: modelName, attempt, delayMs }, "Gemini transient failure — retrying");
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        logger.warn({ model: modelName }, "Gemini model failed — trying next model");
        break;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Gemini returned no usable topics");
}

let runInFlight = false;

/**
 * One AI Editor run: fetch trending headlines, generate 5 topics with Gemini,
 * and enqueue them as pending blog_queue rows. Dedupe is case-insensitive and
 * enforced by a functional unique index on lower(topic), with
 * onConflictDoNothing so concurrent runs/replicas cannot duplicate a topic.
 * Overlapping runs are skipped, and the run never throws — failures are
 * logged and reported so the cron schedule always survives.
 */
export async function runTopicGeneration(): Promise<{ inserted: number; topics: string[] }> {
  if (runInFlight) {
    logger.warn("Topic generation already in flight — skipping overlapping run");
    return { inserted: 0, topics: [] };
  }
  runInFlight = true;
  try {
    const headlines = await fetchHeadlines();
    if (headlines.length < 5) {
      logger.warn({ count: headlines.length }, "Too few trending headlines — skipping topic generation");
      return { inserted: 0, topics: [] };
    }

    const topics = await generateTopics(headlines);

    // Skip topics already in the queue (case-insensitive exact match).
    const existing = await db
      .select({ topic: blogQueue.topic })
      .from(blogQueue)
      .where(inArray(sql`lower(${blogQueue.topic})`, topics.map((t) => t.toLowerCase())));
    const taken = new Set(existing.map((row) => row.topic.toLowerCase()));
    const fresh = topics.filter((topic) => !taken.has(topic.toLowerCase()));

    if (fresh.length === 0) {
      logger.info("All generated topics already queued — nothing inserted");
      return { inserted: 0, topics: [] };
    }

    const inserted = await db
      .insert(blogQueue)
      .values(fresh.map((topic) => ({ topic, status: "pending" })))
      .onConflictDoNothing()
      .returning({ topic: blogQueue.topic });
    const insertedTopics = inserted.map((row) => row.topic);
    logger.info({ inserted: insertedTopics.length, topics: insertedTopics }, "AI Editor enqueued blog topics");
    return { inserted: insertedTopics.length, topics: insertedTopics };
  } catch (err) {
    logger.error({ err }, "AI Editor topic generation failed — cron continues on next schedule");
    return { inserted: 0, topics: [] };
  } finally {
    runInFlight = false;
  }
}

/** Check whether the topic generator is configured (Gemini key present). */
export function isTopicGeneratorEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
