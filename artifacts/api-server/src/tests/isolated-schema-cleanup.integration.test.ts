import { describe, expect, it } from "vitest";

describe("isolated schema cleanup failure fixture", () => {
  const forceFailure = process.env.FORCE_ISOLATED_SCHEMA_TEST_FAILURE === "1";

  it.skipIf(!forceFailure)(
    "fails only when the runner cleanup test explicitly requests it",
    () => {
      expect.fail("Forced integration-test failure used to verify schema cleanup.");
    },
  );
});