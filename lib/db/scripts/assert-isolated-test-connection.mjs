import { Pool } from "pg";

export function databaseUrlForIsolatedSchema(databaseUrl, schemaName) {
  const url = new URL(databaseUrl);
  url.searchParams.set("options", `-c search_path=${schemaName}`);
  return url.toString();
}

export async function assertIsolatedTestSchemaConnection(
  connectionString,
  expectedSchema,
  { requireUsersTable = false } = {},
) {
  const testPool = new Pool({ connectionString });

  try {
    const { rows } = await testPool.query(
      `SELECT
         current_schema() AS current_schema,
         array_to_string(current_schemas(false), ',') AS search_path,
         EXISTS (
           SELECT 1
           FROM information_schema.tables
           WHERE table_schema = $1::text
             AND table_name = 'users'
         ) AS has_users_table`,
      [expectedSchema],
    );
    const {
      current_schema: currentSchema,
      search_path: searchPath,
      has_users_table: hasUsersTable,
    } = rows[0] ?? {};
    const usesOnlyExpectedSchema = searchPath === expectedSchema;

    if (currentSchema !== expectedSchema || !usesOnlyExpectedSchema) {
      throw new Error(
        `Database integration tests must use only isolated schema "${expectedSchema}", received "${searchPath ?? "none"}".`,
      );
    }
    if (requireUsersTable && hasUsersTable !== true) {
      throw new Error(
        `The users table is missing from isolated test schema "${expectedSchema}".`,
      );
    }
  } finally {
    await testPool.end();
  }
}

export async function assertRelationIsNotResolvable(
  connectionString,
  relationName,
) {
  const testPool = new Pool({ connectionString });

  try {
    const { rows } = await testPool.query(
      "SELECT to_regclass($1::text)::text AS relation",
      [relationName],
    );
    if (rows[0]?.relation !== null) {
      throw new Error(
        `Relation "${relationName}" must not be resolvable through the isolated test connection.`,
      );
    }
  } finally {
    await testPool.end();
  }
}
