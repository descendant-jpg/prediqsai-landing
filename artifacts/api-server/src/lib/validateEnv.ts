import { logger } from "./logger";

export interface EnvVarStatus {
  key: string;
  label: string;
  configured: boolean;
  critical: boolean;
  description: string;
  affectsFeatures: string;
  howToGet: string;
  signupUrl: string | null;
  hasFree: boolean;
  steps: string[];
}

const ENV_VARS: Omit<EnvVarStatus, "configured">[] = [
  // ─── CRITICAL ──────────────────────────────────────────────────────────────
  {
    key: "DATABASE_URL",
    label: "PostgreSQL Database",
    critical: true,
    description: "PostgreSQL connection string for the app database",
    affectsFeatures: "Everything — auth, bankroll, predictions, chat history",
    howToGet: "Replit provides this automatically via the Database tab in your project",
    signupUrl: null,
    hasFree: true,
    steps: [
      "In your Replit project, click the database icon in the left sidebar",
      "Click 'Create a Database'",
      "Replit automatically sets DATABASE_URL as a secret",
      "Run: pnpm --filter @workspace/db run push",
    ],
  },
  {
    key: "SESSION_SECRET",
    label: "JWT Session Secret",
    critical: true,
    description: "Secret key used to sign JWT authentication tokens (min 32 characters)",
    affectsFeatures: "Authentication — users cannot log in or register without this",
    howToGet: "Generate a random string of at least 32 characters",
    signupUrl: null,
    hasFree: true,
    steps: [
      "Go to Replit Secrets (lock icon in sidebar)",
      "Click 'New Secret' → Key: SESSION_SECRET",
      "Value: run node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      "Save the secret",
    ],
  },
  {
    key: "ANTHROPIC_API_KEY",
    label: "Anthropic Claude AI",
    critical: true,
    description: "API key for Claude AI — generates predictions from ESPN data and powers the AI chat assistant",
    affectsFeatures: "AI predictions (Picks + Dashboard), AI chat assistant",
    howToGet: "Create an account at console.anthropic.com and generate an API key",
    signupUrl: "https://console.anthropic.com",
    hasFree: true,
    steps: [
      "Go to console.anthropic.com and sign up",
      "In the left sidebar, click 'API Keys'",
      "Click 'Create Key', name it 'PrediQs AI'",
      "Copy the key (starts with sk-ant-...)",
      "Add to Replit Secrets as ANTHROPIC_API_KEY",
      "New accounts get $5 free credit",
    ],
  },
  {
    key: "API_SPORTS_KEY",
    label: "API-Sports (Live Sports Data)",
    critical: true,
    description: "API key for api-sports.io — provides live scores, fixtures, standings, and player stats across 30+ sports",
    affectsFeatures: "Live game data for predictions, real-time scores in picks feed",
    howToGet: "Sign up at api-sports.io — free tier includes 100 requests/day",
    signupUrl: "https://api-sports.io",
    hasFree: true,
    steps: [
      "Go to api-sports.io and click 'Sign Up Free'",
      "Verify your email address",
      "In the dashboard, click 'My Account' → 'API Key'",
      "Copy your API key",
      "Add to Replit Secrets as API_SPORTS_KEY",
      "Free tier: 100 requests/day per sport",
    ],
  },
  {
    key: "ODDS_API_KEY",
    label: "The Odds API (Betting Odds)",
    critical: true,
    description: "Real-time betting odds from 40+ sportsbooks — used to calculate value bets and line movement",
    affectsFeatures: "Value bet detection, odds comparison, line movement alerts",
    howToGet: "Sign up at the-odds-api.com — free tier includes 500 requests/month",
    signupUrl: "https://the-odds-api.com",
    hasFree: true,
    steps: [
      "Go to the-odds-api.com and create a free account",
      "After sign-up, go to 'Account' → 'API Key'",
      "Copy your API key",
      "Add to Replit Secrets as ODDS_API_KEY",
      "Free tier: 500 requests/month across all sports",
    ],
  },
  // ─── OPTIONAL ──────────────────────────────────────────────────────────────
  {
    key: "NEWS_API_KEY",
    label: "News API (Sports News)",
    critical: false,
    description: "Aggregates sports news headlines from 150+ sources to inform AI prediction context",
    affectsFeatures: "AI predictions enriched with breaking news, injury reports",
    howToGet: "Sign up at newsapi.org — free tier includes 100 requests/day",
    signupUrl: "https://newsapi.org",
    hasFree: true,
    steps: [
      "Go to newsapi.org and click 'Get API Key'",
      "Create a free developer account",
      "Copy your API key from the dashboard",
      "Add to Replit Secrets as NEWS_API_KEY",
      "Free tier limited to developer use — upgrade for production",
    ],
  },
  {
    key: "WEATHER_API_KEY",
    label: "Weather API (Game Conditions)",
    critical: false,
    description: "Current weather conditions for outdoor game venues — improves prediction accuracy for outdoor sports",
    affectsFeatures: "Weather-adjusted predictions for NFL, MLB, Soccer outdoors games",
    howToGet: "Sign up at weatherapi.com — free tier includes 1M calls/month",
    signupUrl: "https://www.weatherapi.com",
    hasFree: true,
    steps: [
      "Go to weatherapi.com and sign up for free",
      "In the dashboard, find your API Key",
      "Copy the key",
      "Add to Replit Secrets as WEATHER_API_KEY",
      "Free tier: 1,000,000 calls/month",
    ],
  },
  {
    key: "STRIPE_SECRET_KEY",
    label: "Stripe Secret Key",
    critical: false,
    description: "Stripe server-side secret key for processing Pro/Elite subscription payments",
    affectsFeatures: "Subscription upgrades — all users stay on Free tier without this",
    howToGet: "Create a Stripe account and find the secret key in Developers section",
    signupUrl: "https://dashboard.stripe.com/register",
    hasFree: true,
    steps: [
      "Go to dashboard.stripe.com and create a free account",
      "Click 'Developers' in the top nav → 'API Keys'",
      "Copy the Secret key (starts with sk_test_... or sk_live_...)",
      "Add to Replit Secrets as STRIPE_SECRET_KEY",
      "Start in test mode — no real charges until you activate live keys",
    ],
  },
  {
    key: "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    label: "Stripe Publishable Key (Mobile)",
    critical: false,
    description: "Stripe client-side publishable key — safe to use in the mobile app for initializing Stripe SDK",
    affectsFeatures: "In-app payment sheet, card tokenization in mobile checkout",
    howToGet: "Same Stripe dashboard as the secret key — different field",
    signupUrl: "https://dashboard.stripe.com/apikeys",
    hasFree: true,
    steps: [
      "Go to dashboard.stripe.com → Developers → API Keys",
      "Copy the Publishable key (starts with pk_test_... or pk_live_...)",
      "Add to Replit Secrets as EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      "This key is safe to expose in client-side code",
    ],
  },
  {
    key: "STRIPE_WEBHOOK_SECRET",
    label: "Stripe Webhook Secret",
    critical: false,
    description: "Stripe signing secret to verify webhook events for subscription upgrades/cancellations",
    affectsFeatures: "Automatic tier upgrades after payment, subscription expiry handling",
    howToGet: "Create a webhook endpoint in Stripe Dashboard pointing to your server",
    signupUrl: "https://dashboard.stripe.com/webhooks",
    hasFree: true,
    steps: [
      "In Stripe Dashboard → Developers → Webhooks",
      "Click 'Add endpoint'",
      "URL: https://YOUR-REPLIT-DOMAIN/api/subscription/webhook",
      "Events: checkout.session.completed, customer.subscription.deleted",
      "Copy the Signing secret (starts with whsec_...)",
      "Add to Replit Secrets as STRIPE_WEBHOOK_SECRET",
    ],
  },
  {
    key: "STRIPE_PRICE_PRO",
    label: "Stripe Price ID — Pro ($9.99/mo)",
    critical: false,
    description: "Stripe Price ID for the PrediQs Pro plan at $9.99/month recurring",
    affectsFeatures: "Pro plan checkout button in Subscriptions tab",
    howToGet: "Create a product in Stripe and copy its price ID",
    signupUrl: "https://dashboard.stripe.com/products",
    hasFree: true,
    steps: [
      "In Stripe Dashboard → Products → Add product",
      "Name: PrediQs Pro, Price: $9.99 recurring monthly",
      "Save and copy the Price ID (starts with price_...)",
      "Add to Replit Secrets as STRIPE_PRICE_PRO",
    ],
  },
  {
    key: "STRIPE_PRICE_ELITE",
    label: "Stripe Price ID — Elite ($24.99/mo)",
    critical: false,
    description: "Stripe Price ID for the PrediQs Elite plan at $24.99/month recurring",
    affectsFeatures: "Elite plan checkout button in Subscriptions tab",
    howToGet: "Create a product in Stripe and copy its price ID",
    signupUrl: "https://dashboard.stripe.com/products",
    hasFree: true,
    steps: [
      "In Stripe Dashboard → Products → Add product",
      "Name: PrediQs Elite, Price: $24.99 recurring monthly",
      "Save and copy the Price ID (starts with price_...)",
      "Add to Replit Secrets as STRIPE_PRICE_ELITE",
    ],
  },
  {
    key: "ONESIGNAL_APP_ID",
    label: "OneSignal App ID (Push Notifications)",
    critical: false,
    description: "OneSignal App ID for sending push notifications to iOS and Android users",
    affectsFeatures: "Game alerts, prediction ready notifications, daily tip push",
    howToGet: "Create a free app at onesignal.com",
    signupUrl: "https://onesignal.com",
    hasFree: true,
    steps: [
      "Go to onesignal.com and sign up for free",
      "Click 'New App/Website'",
      "Name it 'PrediQs AI' and select 'Mobile App'",
      "Configure iOS (Apple Developer account) and/or Android (FCM key)",
      "Go to Settings → Keys & IDs → copy the App ID",
      "Add to Replit Secrets as ONESIGNAL_APP_ID",
    ],
  },
  {
    key: "ONESIGNAL_API_KEY",
    label: "OneSignal REST API Key",
    critical: false,
    description: "OneSignal REST API key — allows the server to send push notifications programmatically",
    affectsFeatures: "Server-triggered notifications (new predictions, bankroll alerts)",
    howToGet: "Same OneSignal dashboard as the App ID",
    signupUrl: "https://onesignal.com",
    hasFree: true,
    steps: [
      "In OneSignal dashboard → Settings → Keys & IDs",
      "Copy the REST API Key (different from the App ID)",
      "Add to Replit Secrets as ONESIGNAL_API_KEY",
      "Free plan supports unlimited notifications",
    ],
  },
  {
    key: "RESEND_API_KEY",
    label: "Resend (Transactional Email)",
    critical: false,
    description: "Resend API key for sending transactional emails — welcome emails, prediction digests, billing receipts",
    affectsFeatures: "Welcome email on signup, weekly picks digest, payment receipts",
    howToGet: "Sign up at resend.com — free tier includes 3,000 emails/month",
    signupUrl: "https://resend.com",
    hasFree: true,
    steps: [
      "Go to resend.com and create a free account",
      "In the dashboard, click 'API Keys' → 'Create API Key'",
      "Name it 'PrediQs AI' with full access",
      "Copy the key (starts with re_...)",
      "Add to Replit Secrets as RESEND_API_KEY",
      "Also verify your sending domain in Resend → Domains",
    ],
  },
  {
    key: "EXPO_PUBLIC_APP_URL",
    label: "App Public URL",
    critical: false,
    description: "Your Replit app's public URL — used for Stripe webhooks, email links, and deep links",
    affectsFeatures: "Stripe webhook routing, email magic links, sharing links",
    howToGet: "Your Replit deployment URL — found after publishing the app",
    signupUrl: null,
    hasFree: true,
    steps: [
      "Deploy your app via the 'Publish' button in Replit",
      "Copy your app URL (e.g. https://prediqs-ai.yourusername.replit.app)",
      "Add to Replit Secrets as EXPO_PUBLIC_APP_URL",
      "Update your Stripe webhook endpoint to use this URL",
    ],
  },
  {
    key: "GOOGLE_ANALYTICS_ID",
    label: "Google Analytics (App Analytics)",
    critical: false,
    description: "Google Analytics Measurement ID for tracking user behaviour, screen views, and conversion events",
    affectsFeatures: "Usage analytics, funnel tracking, subscription conversion metrics",
    howToGet: "Create a property in Google Analytics 4",
    signupUrl: "https://analytics.google.com",
    hasFree: true,
    steps: [
      "Go to analytics.google.com and sign in with your Google account",
      "Click 'Create' → 'Property'",
      "Name it 'PrediQs AI' and select 'Mobile App'",
      "Go to Data Streams → Add stream → Apple/Android app",
      "Copy the Measurement ID (starts with G-...)",
      "Add to Replit Secrets as GOOGLE_ANALYTICS_ID",
    ],
  },
];

export function getEnvStatus(): EnvVarStatus[] {
  return ENV_VARS.map((v) => ({
    ...v,
    configured: Boolean(process.env[v.key]),
  }));
}

export function validateEnv(): void {
  const statuses = getEnvStatus();
  const missingCritical = statuses.filter((s) => s.critical && !s.configured);
  const missingOptional = statuses.filter((s) => !s.critical && !s.configured);

  if (missingCritical.length > 0) {
    logger.warn(
      { missing: missingCritical.map((s) => s.key) },
      "⚠️  CRITICAL env vars missing — some features will not work",
    );
    missingCritical.forEach((s) => {
      logger.warn(`  ✗ ${s.key} — ${s.affectsFeatures}`);
    });
  }

  if (missingOptional.length > 0) {
    logger.info(
      { missing: missingOptional.map((s) => s.key) },
      "ℹ️  Optional env vars not set — some features gracefully disabled",
    );
  }

  if (missingCritical.length === 0) {
    logger.info("✓ All critical env vars configured");
  }
}
