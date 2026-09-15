---
name: PostgreSQL race testing
description: Making database-backed integration tests reliably exercise a unique-constraint race.
---

When a route does a read-before-write ownership check, simply firing two requests concurrently may only test the early conflict branch. Synchronize the requests after the shared pre-check, then assert the conflict came from the database-error handling branch.

**Why:** Node request scheduling can let one request read, update, and commit before the other request reaches its read. That returns the right HTTP status without verifying that the PostgreSQL driver preserved the unique-violation metadata.

**How to apply:** In a database-backed test, use a narrowly scoped, short-lived synchronization mechanism that affects only unique test data; clean it up in teardown. Assert both the client response and a distinct observable from the database-error branch, plus the losing row's unchanged state.