import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { pool } from "@workspace/db";
import { afterAll, describe, expect, it } from "vitest";

const runnerPath = resolve(process.cwd(), "../../lib/db/scripts/run-with-isolated-schema.mjs");

async function runFailingIsolatedSuite(): Promise<{ code: number | null; output: string }> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [runnerPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        FORCE_ISOLATED_SCHEMA_TEST_FAILURE: "1",
      },
    });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.once("error", reject);
    child.once("exit", (code) => resolveRun({ code, output }));
  });
}

afterAll(async () => {
  await pool.end();
});

describe("isolated database schema runner", () => {
  it("removes its temporary schema after an integration-test failure", async () => {
    const result = await runFailingIsolatedSuite();
    expect(result.code).not.toBe(0);
    expect(result.output).toContain("Disposable schema provisioned and verified.");
    expect(result.output).not.toContain("cannot drop schema");

    const schemaName = result.output.match(/ISOLATED_TEST_SCHEMA=(integration_test_[a-f0-9]+)/)?.[1];
    expect(schemaName).toBeDefined();

    // This checks PostgreSQL system metadata only; it never reads or deletes
    // developer-owned records in the public schema.
    const { rows } = await pool.query<{ exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = $1) AS exists",
      [schemaName],
    );
    expect(rows[0]?.exists).toBe(false);
  }, 30_000);
});