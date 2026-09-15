import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { Pool } from "pg";

const [command, ...args] = process.argv.slice(2);

if (!command) {
  throw new Error("Provide the test command to run in an isolated database schema.");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set to run database-backed integration tests.");
}

const schemaName = `integration_test_${randomUUID().replaceAll("-", "")}`;
const quotedSchemaName = `"${schemaName}"`;
const adminPool = new Pool({ connectionString: process.env.DATABASE_URL });

function databaseUrlForSchema(databaseUrl, schemaName) {
  const url = new URL(databaseUrl);
  url.searchParams.set("options", `-c search_path=${schemaName},public`);
  return url.toString();
}

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(
        signal
          ? `${command} exited after receiving ${signal}`
          : `${command} exited with code ${code}`,
      ));
    });
  });
}

try {
  await adminPool.query(`CREATE SCHEMA ${quotedSchemaName}`);

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
    );
  } catch (error) {
    // Drizzle Kit currently applies the table statements, then tries to drop a
    // pre-existing filtered schema. It fails because those newly created tables
    // depend on the schema. Only continue when the required table proves that
    // provisioning completed inside this disposable schema.
    const { rows } = await adminPool.query(
      "SELECT to_regclass($1)::text AS users_table",
      [`${schemaName}.users`],
    );
    if (rows[0]?.users_table !== `${schemaName}.users`) {
      throw error;
    }
  }
  const { rows } = await adminPool.query(
    "SELECT to_regclass($1)::text AS users_table",
    [`${schemaName}.users`],
  );
  if (rows[0]?.users_table !== `${schemaName}.users`) {
    throw new Error("Drizzle did not create the users table in the isolated test schema.");
  }
  await run(command, args, testEnv);
} finally {
  await adminPool.query(`DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`);
  await adminPool.end();
}