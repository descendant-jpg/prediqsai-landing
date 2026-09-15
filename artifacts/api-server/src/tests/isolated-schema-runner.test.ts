import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { pool } from "@workspace/db";
import { afterAll, describe, expect, it } from "vitest";

const runnerPath = resolve(process.cwd(), "../../lib/db/scripts/run-with-isolated-schema.mjs");
const schemaMetadataPrefix = "replit-isolated-integration-schema:";

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

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function createRunnerSchema(schemaName: string, createdAt: Date) {
  const metadata = `${schemaMetadataPrefix}${JSON.stringify({ createdAt: createdAt.toISOString() })}`;
  await pool.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`);
  await pool.query(`COMMENT ON SCHEMA ${quoteIdentifier(schemaName)} IS '${metadata.replaceAll("'", "''")}'`);
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

  it("removes only inactive, runner-stamped schemas older than the safety window", async () => {
    const staleSchemaName = "integration_test_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const activeSchemaName = "integration_test_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const unmarkedSchemaName = "integration_test_cccccccccccccccccccccccccccccccc";
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const activeClient = await pool.connect();

    try {
      await createRunnerSchema(staleSchemaName, twoHoursAgo);
      await createRunnerSchema(activeSchemaName, twoHoursAgo);
      await pool.query(`CREATE SCHEMA ${quoteIdentifier(unmarkedSchemaName)}`);
      await activeClient.query("SELECT pg_advisory_lock(hashtext($1))", [
        `isolated-schema-runner:${activeSchemaName}`,
      ]);

      const result = await runFailingIsolatedSuite();
      expect(result.code).not.toBe(0);
      expect(result.output).toContain(`Removed stale isolated test schema: ${staleSchemaName}`);

      const { rows } = await pool.query<{ schema_name: string }>(
        `SELECT nspname AS schema_name
         FROM pg_namespace
         WHERE nspname = ANY($1::text[])`,
        [[staleSchemaName, activeSchemaName, unmarkedSchemaName, "public"]],
      );
      expect(rows.map((row) => row.schema_name)).not.toContain(staleSchemaName);
      expect(rows.map((row) => row.schema_name)).toEqual(
        expect.arrayContaining([activeSchemaName, unmarkedSchemaName, "public"]),
      );
    } finally {
      await activeClient.query("SELECT pg_advisory_unlock(hashtext($1))", [
        `isolated-schema-runner:${activeSchemaName}`,
      ]);
      activeClient.release();
      await pool.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(staleSchemaName)} CASCADE`);
      await pool.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(activeSchemaName)} CASCADE`);
      await pool.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(unmarkedSchemaName)} CASCADE`);
    }
  }, 30_000);
});