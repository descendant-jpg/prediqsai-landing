import { defineConfig } from "vitest/config";

// Database-backed tests must use the .integration.test.ts suffix. They are
// executed only by the isolated-schema runner, never by the unit-test command.
export default defineConfig({
  test: {
    include: ["src/tests/**/*.integration.test.ts"],
  },
});