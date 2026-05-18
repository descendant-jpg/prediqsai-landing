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
      "Click 'New Secret'",
      "Key: SESSION_SECRET",
      "Value: generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      "Save the secret",
    ],
  },
  {
    key: "ANTHROPIC_API_KEY",
    label: "Anthropic Claude API Key",
    critical: true,
    description: "API key for Claude AI — used to generate predictions from ESPN data and power the AI assistant",
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
    key: "STRIPE_SECRET_KEY",
    label: "Stripe Secret Key",
    critical: false,
    description: "Stripe secret key for processing Pro/Elite subscription payments",
    affectsFeatures: "Subscription upgrades — all users stay on Free tier without this",
    howToGet: "Create a Stripe account and find the secret key in the Developers section",
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
    key: "STRIPE_WEBHOOK_SECRET",
    label: "Stripe Webhook Secret",
    critical: false,
    description: "Stripe signing secret to verify webhook events for subscription upgrades",
    affectsFeatures: "Automatic tier upgrades after payment",
    howToGet: "Create a webhook endpoint in Stripe Dashboard pointing to your app",
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
    description: "Stripe Price ID for the PrediQs Pro plan at $9.99/month",
    affectsFeatures: "Pro plan checkout button",
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
    description: "Stripe Price ID for the PrediQs Elite plan at $24.99/month",
    affectsFeatures: "Elite plan checkout button",
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
