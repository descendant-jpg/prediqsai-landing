---
name: Google Sign-In hybrid auth
description: Native Google Sign-In + email verification layered on the existing JWT backend; the non-obvious constraints.
---

# Hybrid auth (native Google Sign-In + email verification)

The JWT backend stays the source of truth. Google Sign-In and email verification
are layered on top, not a replacement.

## Backend `/auth/google` (token exchange)
- Mobile sends a Google **idToken**; the server verifies it with `google-auth-library`
  (`OAuth2Client.verifyIdToken`, audience = the **Web** client ID, client_type 3 in
  google-services.json).
- **Must enforce `payload.email_verified === true`** before trusting `payload.email`.
  Google may send it as boolean `true` or string `"true"` — accept both.
  **Why:** without this check an unverified Google email could take over an existing
  password account by email match.
- Find-or-create by email; created/linked users get `authProvider='google'` and
  `emailVerified=true`. Created users get a random bcrypt passwordHash (never empty).

## Email verification
- New password signups store a random token + 24h expiry and get a Resend email.
  Sending must **never throw / never block signup** (provider can be down).
- `GET /auth/verify-email?token` returns an HTML page (opened from the email, not the app).
- `POST /auth/resend-verification` is `requireAuth` (uses the just-issued JWT).
- Existing users were backfilled `emailVerified=true` so the new guard does not lock them out.

## Mobile route guard (Expo Router `_layout.tsx`)
- Guard order matters: `!user` first → then `user.emailVerified === false` → `/verify-email`,
  placed **before** the onboarding / app-guide gates.
- Use **strict `=== false`** so `undefined`/`true` pass (Google users are verified).
- Add `verify-email` to the `inAuthGroup || inOnboarding || inVerifyEmail` "leave for tabs"
  block, or a freshly-verified user gets stranded on the screen.
- The "I've Verified – Continue" button calls `checkEmailVerified()` (re-fetches /me,
  updates user state); the guard then auto-navigates. No manual router push needed.

## Native module limitation (same precedent as RN IAP)
- `@react-native-google-signin/google-signin` is native: **cannot run in Expo Go or web**.
  `lib/google.ts` guards with `Platform.OS === "web"` and `Constants.appOwnership === "expo"`,
  lazy-`require`s the module, and throws `GOOGLE_UNAVAILABLE` / `GOOGLE_CANCELLED` sentinels.
  Real Google sign-in only testable in a dev/prod build. See `rn-iap-v15-subscriptions.md`.
- `app.json` needs `android.googleServicesFile: "./google-services.json"` plus the
  `@react-native-google-signin/google-signin` plugin entry.
