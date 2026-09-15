---
name: Disposable Drizzle test schemas
description: Isolating PostgreSQL integration tests from development data while retaining real Drizzle constraints.
---

Use a unique schema for each database-backed integration-test run, and set its PostgreSQL `search_path` in the test-only database URL itself. That effective path must contain only the generated schema—never append `public` as a fallback. Build the Drizzle table definitions under `pgSchema(DATABASE_SCHEMA)` only in that test environment, and assert the full effective path, `current_schema()`, and a required test table before any test fixture or trigger is created.

**Why:** Node-postgres connection-string options override a separately supplied pool `options` value in this environment, so a pool-level `search_path` can silently leave tests on `public`. Even when a disposable schema is first, appending `public` permits unqualified missing relations to resolve against developer data. Drizzle Kit's filtered custom-schema push currently creates all required tables but then attempts to drop the same pre-existing schema, returning an error after provisioning.

**How to apply:** Create the disposable schema first; run the schema push with the test schema environment; continue past the known push cleanup error only after checking that the required table exists in that exact schema. Always drop that schema with `CASCADE` in `finally`, rather than deleting tables or test rows from the development schema.