---
name: Disposable schema stale-run cleanup
description: Safely reaping schemas left by interrupted PostgreSQL integration-test runners.
---

Only reap schemas that have both the generated integration-test namespace and an explicit runner ownership marker. Require a conservative age threshold, then use a session-level PostgreSQL advisory lock keyed to the schema identity as the active-run check.

**Why:** Database activity views may not expose another session's state reliably under managed-database permissions. An advisory lock is held throughout the runner lifecycle and is automatically released when a killed process loses its connection; lock contention therefore safely preserves a live run. Hash collisions are conservative because they skip cleanup rather than deleting a schema.

**How to apply:** Stamp new disposable schemas at creation and hold the lock until normal cleanup. At the start of a later run, only drop an old, stamped candidate after acquiring its lock; leave unmarked namespaces, recently-created candidates, and locked schemas untouched.