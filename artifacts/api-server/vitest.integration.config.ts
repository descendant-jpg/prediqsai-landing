import { defineConfig } from "vitest/config";

// Database-backed tests must use the .integration.test.ts suffix. They are
// executed only by the isolated-schema runner, never by the unit-test command.
export default defineConfig({
  test: {
    include: ["src/tests/**/*.integration.test.ts"],
    // CI does not load a local .env file. This value exists only in the
    // integration-test process and meets jwt.ts's minimum secret length.
    env: {
      SESSION_SECRET: "test-session-secret-for-ci-32-chars!",
    },
  },
});