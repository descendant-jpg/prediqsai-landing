import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { Pool } from "pg";
import {
  assertIsolatedTestSchemaConnection,
  databaseUrlForIsolatedSchema,
} from "./assert-isolated-test-connection.mjs";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set to run database-backed integration tests.");
}

// Database-backed API tests must use the .integration.test.ts suffix. Keep the
// Vitest config aligned with artifacts/api-server's test:unit exclusion so they
// never run against a developer's working schema.
const databaseIntegrationTestConfig = "vitest.integration.config.ts";
const schemaNamePattern = /^integration_test_[a-f0-9]{32}$/;
const schemaMetadataPrefix = "replit-isolated-integration-schema:";
const staleSchemaMinimumAgeMs = 60 * 60 * 1000;
const schemaName = `integration_test_${randomUUID().replaceAll("-", "")}`;
const quotedSchemaName = `"${schemaName}"`;
const adminPool = new Pool({ connectionString: process.env.DATABASE_URL });
let schemaLockClient;

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function schemaMetadata(createdAt = new Date()) {
  return `${schemaMetadataPrefix}${JSON.stringify({ createdAt: createdAt.toISOString() })}`;
}

function schemaLockName(schemaName) {
  return `isolated-schema-runner:${schemaName}`;
}

async function removeStaleSchemas() {
  const { rows } = await adminPool.query(
    `SELECT n.nspname AS schema_name, obj_description(n.oid, 'pg_namespace') AS schema_comment
     FROM pg_namespace n
     WHERE n.nspname ~ $1
       AND obj_description(n.oid, 'pg_namespace') LIKE $2`,
    [schemaNamePattern.source, `${schemaMetadataPrefix}%`],
  );

  const cutoff = Date.now() - staleSchemaMinimumAgeMs;
  for (const { schema_name: staleSchemaName, schema_comment: schemaComment } of rows) {
    if (!schemaNamePattern.test(staleSchemaName) || !schemaComment?.startsWith(schemaMetadataPrefix)) {
      continue;
    }

    let createdAt;
    try {
      createdAt = Date.parse(JSON.parse(schemaComment.slice(schemaMetadataPrefix.length)).createdAt);
    } catch {
      continue;
    }
    if (!Number.isFinite(createdAt) || createdAt > cutoff) {
      continue;
    }

    const lockClient = await adminPool.connect();
    let lockAcquired = false;
    try {
      const { rows: lockRows } = await lockClient.query(
        "SELECT pg_try_advisory_lock(hashtext($1)) AS acquired",
        [schemaLockName(staleSchemaName)],
      );
      lockAcquired = lockRows[0]?.acquired === true;
      if (!lockAcquired) {
        continue;
      }

      await adminPool.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(staleSchemaName)} CASCADE`);
      console.info(`Removed stale isolated test schema: ${staleSchemaName}`);
    } finally {
      if (lockAcquired) {
        await lockClient.query("SELECT pg_advisory_unlock(hashtext($1))", [schemaLockName(staleSchemaName)]);
      }
      lockClient.release();
    }
  }
}

function run(command, args, env, { captureOutput = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: captureOutput ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let output = "";
    if (captureOutput) {
      child.stdout.on("data", (chunk) => {
        output += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        output += chunk.toString();
      });
    }
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve(output);
        return;
      }
      const error = new Error(
        signal
          ? `${command} exited after receiving ${signal}`
          : `${command} exited with code ${code}`,
      );
      error.output = output;
      reject(error);
    });
  });
}

try {
  await removeStaleSchemas();
  await adminPool.query(`CREATE SCHEMA ${quotedSchemaName}`);
  await adminPool.query(
    `COMMENT ON SCHEMA ${quotedSchemaName} IS '${schemaMetadata().replaceAll("'", "''")}'`,
  );
  schemaLockClient = await adminPool.connect();
  await schemaLockClient.query("SELECT pg_advisory_lock(hashtext($1))", [schemaLockName(schemaName)]);
  console.info(`ISOLATED_TEST_SCHEMA=${schemaName}`);

  const testEnv = {
    ...process.env,
    DATABASE_URL: databaseUrlForIsolatedSchema(process.env.DATABASE_URL, schemaName),
    DATABASE_SCHEMA: schemaName,
  };

  // Use the same connection string Vitest will inherit. This blocks schema
  // provisioning before it can touch public if connection options are ignored.
  await assertIsolatedTestSchemaConnection(testEnv.DATABASE_URL, schemaName);

  try {
    await run(
      "pnpm",
      ["--filter", "@workspace/db", "run", "push-force"],
      testEnv,
      { captureOutput: true },
    );
  } catch (error) {
    const output = error instanceof Error && "output" in error ? String(error.output) : "";
    const knownCleanupIssue =
      output.includes(`cannot drop schema ${schemaName}`) &&
      output.includes("because other objects depend on it");
    const { rows } = await adminPool.query(
      "SELECT to_regclass($1)::text AS users_table",
      [`${schemaName}.users`],
    );
    if (!knownCleanupIssue || rows[0]?.users_table !== `${schemaName}.users`) {
      if (output) process.stderr.write(output);
      throw error;
    }
    console.info("Disposable schema provisioned; ignored Drizzle's known post-provisioning cleanup error.");
  }
  await assertIsolatedTestSchemaConnection(testEnv.DATABASE_URL, schemaName, {
    requireUsersTable: true,
  });
  console.info("Disposable schema provisioned and verified.");
  await run("pnpm", ["exec", "vitest", "run", "--config", databaseIntegrationTestConfig], testEnv);
} finally {
  try {
    await adminPool.query(`DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`);
  } finally {
    if (schemaLockClient) {
      await schemaLockClient.query("SELECT pg_advisory_unlock(hashtext($1))", [schemaLockName(schemaName)]);
      schemaLockClient.release();
    }
    await adminPool.end();
  }
}