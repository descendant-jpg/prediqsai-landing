---
name: Expo Router typed routes regeneration
description: Why router.push to a brand-new screen fails typecheck until the Expo dev server runs
---

When you add a new screen file under `artifacts/mobile/app/` and call `router.push("/newroute")`, `pnpm --filter @workspace/mobile run typecheck` fails with TS2345 ("not assignable to ... RelativePathString | ...") for the new path.

**Why:** Expo Router generates typed-route definitions (`.expo/types`) from the file tree, and that regeneration happens when the Expo dev server starts — not during a bare `tsc`. Until then, the new route literal is not in the union of known paths.

**How to apply:** After adding/renaming screens, restart the `artifacts/mobile: expo` workflow (which regenerates the route types), THEN run typecheck. Do not work around it by casting route strings to `as never`/`as any` — restarting the dev server is the correct fix and keeps full type safety.
