import { pgSchema, pgTable, type PgTableFn } from "drizzle-orm/pg-core";

// Production uses PostgreSQL's default schema. Database integration tests set
// DATABASE_SCHEMA before this module is loaded so Drizzle builds the same schema
// definitions inside a disposable namespace.
export const table = (process.env.DATABASE_SCHEMA
  ? pgSchema(process.env.DATABASE_SCHEMA).table
  : pgTable) as PgTableFn<string | undefined>;