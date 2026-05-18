# PrediQs AI

AI-powered sports betting intelligence mobile app with real predictions, bankroll management, and JWT auth.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — build composite lib packages (run before api-server typecheck)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`, `ANTHROPIC_API_KEY`
- Optional env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ELITE`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Pino logging
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (bcryptjs + jsonwebtoken), expo-secure-store on native / localStorage on web
- AI: Claude claude-sonnet-4-6 via @workspace/integrations-anthropic-ai
- Sports data: ESPN public API (no key required)
- Payments: Stripe (scaffolded, requires keys)
- Validation: Zod (zod/v4), drizzle-zod
- Build: esbuild (ESM bundle)

## Where things live

- `lib/db/src/schema/` — DB schema source of truth (users, bankrollEntries, predictions, conversations, messages)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, user, bankroll, predictions, subscription, chat)
- `artifacts/api-server/src/services/prediction-engine.ts` — ESPN + Claude prediction generator
- `artifacts/api-server/src/middleware/auth.ts` — JWT requireAuth middleware
- `artifacts/api-server/src/lib/jwt.ts` — sign/verify JWT tokens
- `artifacts/mobile/lib/api.ts` — typed API client (all fetch calls)
- `artifacts/mobile/context/AuthContext.tsx` — auth state (login/register/logout/refreshUser)
- `artifacts/mobile/context/AppContext.tsx` — bankroll state backed by API
- `artifacts/mobile/app/(auth)/` — login and register screens
- `artifacts/mobile/app/(tabs)/` — 5 tab screens (dashboard, picks, bankroll, assistant, performance)

## Architecture decisions

- **Contract-first auth**: JWT stored in expo-secure-store (native) / localStorage (web). AuthProvider wraps AppProvider so AppProvider can call useAuth() for token.
- **Prediction engine**: Claude claude-sonnet-4-6 analyses live ESPN scoreboard data every 6h and writes structured JSON predictions to PostgreSQL. Falls back to demo predictions when no games are live.
- **Auth routing (Expo Router)**: `useSegments` + `useRouter` in root `_layout.tsx` redirects between `(auth)` and `(tabs)` groups based on auth state.
- **Bankroll delta tracking**: API server updates the user's `bankroll` column on every entry; client derives balance from the user object, not entry summation.
- **Stripe scaffold**: checkout and webhook routes exist but require `STRIPE_SECRET_KEY` env var — returns 503 gracefully if not set.

## Product

- **Auth**: email/password sign-up and sign-in with JWT, persisted securely on device
- **Dashboard**: live AI predictions featured pick, stats (win rate, bankroll), avoid warnings
- **Picks**: filterable list of all AI predictions by sport (NFL, NBA, MLB, Soccer), value bets, avoid picks
- **Bankroll**: balance tracker, daily loss limit with progress bar, Kelly Criterion calculator, transaction history
- **AI Assistant**: Claude-powered sports betting chat with streaming SSE
- **Performance**: win rate stats, ROI by sport, confidence accuracy breakdown
- **Subscriptions**: Free / Pro ($9.99) / Elite ($24.99) tier structure (Stripe scaffold)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm run typecheck:libs` before `pnpm --filter @workspace/api-server run typecheck` — lib packages must be built first.
- The `(auth)` route group in Expo Router must be listed in the root Stack or Expo Router won't know about it.
- ESPN API returns UTC timestamps; matchDate is stored as-is in PostgreSQL with timezone.
- Stripe webhook needs raw body — `express.raw()` is applied BEFORE `express.json()` only for `/api/subscription/webhook`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
