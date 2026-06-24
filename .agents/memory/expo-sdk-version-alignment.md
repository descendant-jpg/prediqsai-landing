---
name: Expo SDK package version alignment
description: Why expo-* packages must match the installed Expo SDK, and how a mismatch shows up as a native startup crash
---

All `expo-*` packages must match the version the installed `expo` (SDK) expects. A mismatch is a **native ABI break**, not a JS error — `expo-localization`/`expo-notifications` etc. are compiled Kotlin/Swift that call into a specific `expo-modules-core` version.

**Symptom seen here:** Android production build booted, showed splash ~1-2s, then hard-crashed (terminated) on a **fresh install before login**. logcat showed:
`java.lang.NoSuchMethodError: No static method getDirectConverter(...) in class Lexpo/modules/kotlin/types/ReturnTypeKt;` thrown from `LocalizationModule.definition()` at `ModuleHolder.<init>`.

**Why it crashed pre-login and JS try/catch couldn't help:** the error is thrown when `expo-modules-core` *registers* the native module at process startup — before any JS runs. No JS guard can catch a native module-registration fatal.

**Root cause:** several expo packages were pinned to bogus future majors incompatible with SDK 54 — `expo-localization@56`, `expo-notifications@56`, `expo-secure-store@55` (SDK 54 wants `~17.0.9`, `~0.32.17`, `~15.0.8`). expo-localization just happened to be the first module the registry initialized.

**How to apply / fix:**
- Diagnose: `cd artifacts/mobile && CI=1 pnpm exec expo install --check` (lists every expo pkg whose version disagrees with the installed SDK).
- Fix: `expo install --fix` rewrites package.json to the SDK-correct versions. If it gets killed mid-run (long native installs), the package.json edits still land — just run `pnpm install` at the workspace root to reconcile node_modules, then re-check.
- A `NoSuchMethodError` referencing `expo.modules.kotlin...ReturnTypeKt`/`expo-modules-core` is the fingerprint of an expo-package-vs-SDK ABI mismatch — go straight to `expo install --check`.
