import app from "./app";
import { logger } from "./lib/logger";
import { initTelegramBot } from "./telegram-bot";
import { getPredictions, refreshPredictions } from "./services/prediction-engine";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";

const PREDICTION_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h

function startPredictionScheduler() {
  // Background-only prediction generation. User GET requests NEVER trigger
  // external API fetches — all fetching/writing happens here.
  //
  // Warm-up: shortly after boot, check the DB cache (free, no external calls)
  // and run one background refresh ONLY if the cache is empty — otherwise a
  // fresh deploy would serve no picks for up to 6 hours.
  setTimeout(() => {
    getPredictions()
      .then(async (preds) => {
        if (preds.length > 0) {
          logger.info({ count: preds.length }, "Prediction cache warm — skipping boot refresh");
          return;
        }
        const rows = await refreshPredictions();
        logger.info({ count: rows.length }, "Boot-time prediction refresh complete (cache was empty)");
      })
      .catch((err) => logger.error({ err }, "Prediction warm-up failed"));
  }, 15_000);

  // Scheduled background worker: refresh exactly once every 6 hours.
  setInterval(() => {
    refreshPredictions()
      .then((rows) => logger.info({ count: rows.length }, "Scheduled prediction refresh complete"))
      .catch((err) => logger.error({ err }, "Scheduled prediction refresh failed"));
  }, PREDICTION_REFRESH_INTERVAL_MS);
}

async function autoBootstrapAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;
  try {
    const [updated] = await db
      .update(users)
      .set({ isAdmin: true })
      .where(eq(users.email, adminEmail.toLowerCase()))
      .returning({ email: users.email });
    if (updated) {
      logger.info({ email: updated.email }, "✅ Admin auto-bootstrapped on startup");
    }
  } catch (err) {
    logger.warn({ err }, "⚠️ Could not auto-bootstrap admin");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  autoBootstrapAdmin();
  initTelegramBot();
  startPredictionScheduler();
});
