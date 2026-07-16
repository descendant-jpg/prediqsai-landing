import app from "./app";
import { logger } from "./lib/logger";
import { initTelegramBot } from "./telegram-bot";
import { getPredictions, refreshPredictions } from "./services/prediction-engine";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";

const PREDICTION_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h

function startPredictionScheduler() {
  // Warm the cache shortly after boot (getPredictions self-refreshes when stale),
  // then refresh on a fixed 6-hour cadence.
  setTimeout(() => {
    getPredictions()
      .then((preds) => logger.info({ count: preds.length }, "Prediction warm-up complete"))
      .catch((err) => logger.error({ err }, "Prediction warm-up failed"));
  }, 15_000);

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
