// PM2 deployment config for the PrediQs AI API server.
//
// Deploy flow on the server (run from the repo root):
//   pnpm install
//   pnpm --filter @workspace/api-server build
//   pm2 start artifacts/api-server/ecosystem.config.cjs
//
// Replace every "REPLACE_ME" placeholder below with your real values.
// Prefer providing secrets via the server environment (or a PM2 env file)
// rather than committing real values into this file.

module.exports = {
  apps: [
    {
      name: "prediqs-api",
      script: "./dist/index.mjs",
      cwd: __dirname,
      node_args: "--enable-source-maps",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",

        // --- Core (required) ---
        // Port the Express server binds to.
        PORT: "8080",
        // PostgreSQL connection string.
        DATABASE_URL: "REPLACE_ME",
        // Secret used to sign JWT/session tokens.
        SESSION_SECRET: "REPLACE_ME",

        // --- AI (required for predictions + chat assistant) ---
        // On Replit these are auto-provisioned by the Anthropic integration.
        // Off-Replit, point BASE_URL at Anthropic directly and use a real key:
        //   AI_INTEGRATIONS_ANTHROPIC_BASE_URL = "https://api.anthropic.com"
        //   AI_INTEGRATIONS_ANTHROPIC_API_KEY  = your Anthropic API key
        AI_INTEGRATIONS_ANTHROPIC_BASE_URL: "REPLACE_ME",
        AI_INTEGRATIONS_ANTHROPIC_API_KEY: "REPLACE_ME",

        // --- Sports / odds / news data providers (optional) ---
        API_SPORTS_KEY: "REPLACE_ME",
        FOOTBALL_DATA_API_KEY: "REPLACE_ME",
        ODDS_API_KEY: "REPLACE_ME",
        NEWS_API_KEY: "REPLACE_ME",
        WEATHER_API_KEY: "REPLACE_ME",

        // --- Push notifications (OneSignal, optional) ---
        ONESIGNAL_APP_ID: "REPLACE_ME",
        ONESIGNAL_API_KEY: "REPLACE_ME",

        // --- Telegram bot (optional) ---
        TELEGRAM_BOT_TOKEN: "REPLACE_ME",

        // --- First-admin bootstrap (optional) ---
        ADMIN_EMAIL: "REPLACE_ME",
        ADMIN_PASSWORD: "REPLACE_ME",

        // --- Misc (optional) ---
        // pino log level: trace|debug|info|warn|error|fatal
        LOG_LEVEL: "info",
      },
    },
  ],
};
