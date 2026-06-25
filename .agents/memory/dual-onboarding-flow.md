---
name: Dual onboarding flow (mobile)
description: Why the app has TWO separate new-user flows that chain, and the shared flag that gates the second.
---

The mobile app intentionally has **two distinct new-user flows** that run in sequence:

1. `app/onboarding.tsx` — 6-step disclaimer / 18+ age-gate / sports + daily-limit prefs. Has legal value (age gate + disclaimer) — do NOT remove it when touching onboarding.
2. `app/app-guide.tsx` — 10-step feature tour. Its Step 2 captures the user's betting experience.

**Routing decision (in `RootLayoutNav`, `app/_layout.tsx`):** for a new user the order is
signup → (email only: `/verify-email`) → `/onboarding` (while `!onboardingSeen`) → `/(tabs)` → gate sees the guide unseen → `/app-guide` → `/(tabs)`.

**Both gates use a PERSISTED context flag, never ephemeral in-memory state.** Onboarding is gated by `onboardingSeen: boolean|null` and the guide by `appGuideSeen: boolean|null`, both in `AppContext`, both hydrated from AsyncStorage (`STORAGE_KEYS.onboardingComplete` / `appGuideComplete`), with `markOnboardingSeen()` / `markAppGuideSeen()` and a `resetOnboarding()`.
**Why persisted, not in-memory:** the old design gated onboarding on an in-memory `pendingOnboarding` set only in `AuthContext.register()` — Google sign-ups never set it, so new Google users skipped onboarding entirely, and any reload lost the flag. A persisted flag fixes both.
**Why a shared context value (not an independent AsyncStorage read in the gate):** the gate AND the completion screen's `finish()`/`complete()` must read/write the *same* context state. If the gate reads AsyncStorage independently, completing a step → `replace('/(tabs)')` re-fires the gate with stale state and **bounces the user back (infinite loop)**.
**Enforcing first-run for EVERY new account on a device that already has the flag true:** call `resetOnboarding()` on every genuinely-new signup. Email: call it AFTER a successful `register()` (a failed signup must not flag a later sign-in; the verify-email gate covers the window so there's no redirect race). Google: the server `/auth/google` returns `isNew = !existing`; only reset when `isNew`, else returning Google users get re-onboarded.

**How to apply:**
- `null` means still hydrating — the gate must wait (return) on it to avoid a flash/early redirect.
- Don't redirect a user out of `/onboarding` or `/app-guide` while they're in it (the gate excludes those segments).
- Profile "replay guide" uses `router.push('/app-guide')` and works because once `appGuideSeen` is true the gate never force-exits the guide screen.
- App Guide Step 2 selection calls `setBettingExperience(<canonical capitalized>)` immediately, which also sets the outbound `X-User-Experience` header → backend AI persona. Canonical values: Beginner/Intermediate/Advanced/Professional.
