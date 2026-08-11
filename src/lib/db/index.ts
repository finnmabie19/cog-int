import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * The application's ONLY generally-available database handle.
 *
 * It connects as the `app_readonly` Postgres role, which has SELECT-only
 * grants. Any attempt to write through it fails at the database level.
 *
 * Writes happen exclusively inside `withAudit()` (src/lib/audit.ts), which
 * owns the single writable connection. Do not create another writable
 * connection anywhere in src/ — see CONVENTIONS.md.
 */
const client = postgres(process.env.DATABASE_URL_READONLY!, { prepare: false });

export const db = drizzle(client, { schema });

export * as schema from "./schema";
