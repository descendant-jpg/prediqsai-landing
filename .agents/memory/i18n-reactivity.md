---
name: i18n reactivity (mobile)
description: How global localization is wired in artifacts/mobile and the gotchas that make translations actually re-render
---

The mobile app uses **i18n-js** (not react-i18next) with a `LanguageContext` wrapper.

Rules that are easy to get wrong:

- **Consume `t` from `useLanguage()`, never import the i18n singleton directly.** i18n-js's `t()` is not reactive on its own. `LanguageContext` exposes a `t` memoized with `[language]` so context consumers re-render when language changes. Importing `i18n` from `lib/i18n` and calling `i18n.t()` directly will NOT update on language switch.
- **Interpolation syntax is `%{var}`** (fnando i18n-js), e.g. `t("profile.newCount", { count: n })` with translation `"%{count} new"` — not `{{var}}`.
- **RTL (Arabic) needs a reload to take effect.** `I18nManager.forceRTL` only reflows after an app restart, so the context shows a restart `Alert` on user-initiated direction change, but stays silent at boot (`silent` flag). Web skips forceRTL.
- **Locale fallback:** `enableFallback = true` + `defaultLocale = "en"`. Variant locales fall back to base then en (e.g. `pt-BR` → `pt` → `en`). Only en/fr/es/pt/de/it/ar are fully translated; everything else falls back to en.
- **Outbound locale:** `lib/api.ts` keeps a module-level `currentLanguage` set via `setApiLanguage()` (called by `LanguageContext`) and sends it as `Accept-Language` on every `apiFetch`. Dependency is one-way (context → api), no import cycle.

**Why:** these are the non-obvious failure modes — silent non-reactivity, wrong interpolation braces, and RTL needing a reload — that cost time when adding new localized screens.

**How to apply:** when localizing a new screen, get `t` from `useLanguage()`, add the keys to every locale object in `lib/i18n.ts`, and use `%{}` for interpolation.
