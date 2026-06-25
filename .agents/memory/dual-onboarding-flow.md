---
name: Dual onboarding flow (mobile)
description: Why the app has TWO separate new-user flows that chain, and the shared flag that gates the second.
---

The mobile app intentionally has **two distinct new-user flows** that run in sequence:

1. `app/onboarding.tsx` — 6-step disclaimer / 18+ age-gate / sports + daily-limit prefs. Triggered by the in-memory `pendingOnboarding` flag set in `AuthContext.register()`. Has legal value (age gate + disclaimer) — do NOT remove it when touching onboarding.
2. `app/app-guide.tsx` — 10-step feature tour. Its Step 2 captures the user's betting experience.

**Routing decision (in `RootLayoutNav`, `app/_layout.tsx`):** for a new user the order is
register → `/onboarding` (while `pendingOnboarding`) → `/(tabs)` → gate sees the guide unseen → `/app-guide` → `/(tabs)`.

**Why a shared flag:** the "has seen the guide" state lives in `AppContext` as `appGuideSeen: boolean|null` (hydrated from `STORAGE_KEYS.appGuideComplete`) with `markAppGuideSeen()`. Both the root-layout gate AND the guide's `complete()` read/write the *same* context value. If you instead read AsyncStorage independently in the gate, completing the guide → `replace('/(tabs)')` would re-fire the gate with stale state and **bounce the user back into the guide (infinite loop)**.

**How to apply:**
- `null` means still hydrating — the gate must wait (return) on it to avoid a flash/early redirect.
- Don't redirect a user out of `/onboarding` or `/app-guide` while they're in it (the gate excludes those segments).
- Profile "replay guide" uses `router.push('/app-guide')` and works because once `appGuideSeen` is true the gate never force-exits the guide screen.
- App Guide Step 2 selection calls `setBettingExperience(<canonical capitalized>)` immediately, which also sets the outbound `X-User-Experience` header → backend AI persona. Canonical values: Beginner/Intermediate/Advanced/Professional.
