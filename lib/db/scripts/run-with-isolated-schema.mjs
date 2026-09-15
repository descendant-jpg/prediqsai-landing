import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set to run database-backed integration tests.");
}

// Database-backed API tests must use the .integration.test.ts suffix. Keep the
// Vitest config aligned with artifacts/api-server's test:unit exclusion so they
// never run against a developer's working schema.
const databaseIntegrationTestConfig = "vitest.integration.config.ts";
const schemaName = `integration_test_${randomUUID().replaceAll("-", "")}`;
const quotedSchemaName = `"${schemaName}"`;
const adminPool = new Pool({ connectionString: process.env.DATABASE_URL });

function databaseUrlForSchema(databaseUrl, schemaName) {
  const url = new URL(databaseUrl);
  url.searchParams.set("options", `-c search_path=${schemaName},public`);
  return url.toString();
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
  await adminPool.query(`CREATE SCHEMA ${quotedSchemaName}`);
  console.info(`ISOLATED_TEST_SCHEMA=${schemaName}`);

  const testEnv = {
    ...process.env,
    DATABASE_URL: databaseUrlForSchema(process.env.DATABASE_URL, schemaName),
    DATABASE_SCHEMA: schemaName,
  };

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
  const { rows } = await adminPool.query(
    "SELECT to_regclass($1)::text AS users_table",
    [`${schemaName}.users`],
  );
  if (rows[0]?.users_table !== `${schemaName}.users`) {
    throw new Error("Drizzle did not create the users table in the isolated test schema.");
  }
  console.info("Disposable schema provisioned and verified.");
  await run("pnpm", ["exec", "vitest", "run", "--config", databaseIntegrationTestConfig], testEnv);
} finally {
  await adminPool.query(`DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`);
  await adminPool.end();
}