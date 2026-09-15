import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { pool } from "@workspace/db";
import { afterAll, describe, expect, it } from "vitest";

const runnerPath = resolve(process.cwd(), "../../lib/db/scripts/run-with-isolated-schema.mjs");
const assertionPath = resolve(process.cwd(), "../../lib/db/scripts/assert-isolated-test-connection.mjs");
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

  it("rejects a connection that resolves to the public schema", async () => {
    const { assertIsolatedTestSchemaConnection, databaseUrlForIsolatedSchema } = await import(assertionPath);
    const publicUrl = databaseUrlForIsolatedSchema(process.env.DATABASE_URL!, "public");

    await expect(
      assertIsolatedTestSchemaConnection(publicUrl, "integration_test_expected_schema"),
    ).rejects.toThrow(
      'Database integration tests must use only isolated schema "integration_test_expected_schema", received "public".',
    );
  });

  it("cannot use a second schema as an unqualified-relation fallback", async () => {
    const schemaName = `integration_test_${randomUUID().replaceAll("-", "")}`;
    const fallbackSchemaName = `integration_test_${randomUUID().replaceAll("-", "")}`;
    const sentinelName = `isolated_schema_runner_sentinel_${randomUUID().replaceAll("-", "")}`;
    const {
      assertIsolatedTestSchemaConnection,
      assertRelationIsNotResolvable,
      databaseUrlForIsolatedSchema,
    } = await import(assertionPath);
    const isolatedUrl = databaseUrlForIsolatedSchema(
      process.env.DATABASE_URL!,
      schemaName,
    );
    const unsafeUrl = new URL(process.env.DATABASE_URL!);
    unsafeUrl.searchParams.set(
      "options",
      `-c search_path=${schemaName},${fallbackSchemaName}`,
    );

    try {
      await pool.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`);
      await pool.query(`CREATE SCHEMA ${quoteIdentifier(fallbackSchemaName)}`);
      await pool.query(
        `CREATE TABLE ${quoteIdentifier(fallbackSchemaName)}.${quoteIdentifier(sentinelName)} (id integer)`,
      );

      await assertIsolatedTestSchemaConnection(isolatedUrl, schemaName);
      await expect(
        assertRelationIsNotResolvable(isolatedUrl, sentinelName),
      ).resolves.toBeUndefined();
      await expect(
        assertIsolatedTestSchemaConnection(unsafeUrl.toString(), schemaName),
      ).rejects.toThrow(
        `Database integration tests must use only isolated schema "${schemaName}", received "${schemaName},${fallbackSchemaName}".`,
      );
    } finally {
      await pool.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE`);
      await pool.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(fallbackSchemaName)} CASCADE`);
    }
  });

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