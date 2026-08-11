import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema";
import { requirePermission } from "./permissions";
import type { ToolDefinition } from "./registry";
import type { SessionUser } from "./session-user";

/**
 * This module owns the application's ONLY writable database connection.
 * It is intentionally not exported: the sole way to mutate tool data is
 * `withAudit()`, which writes the audit row in the same transaction as the
 * mutation. Everything else in the app reads through the SELECT-only handle
 * in src/lib/db. See CONVENTIONS.md and the README for the full guarantee.
 */
const writableClient = postgres(process.env.DATABASE_URL!, { prepare: false });
const writableDb = drizzle(writableClient, { schema });

/** The transaction handle passed to `before`, `mutate`, and `after`. */
export type AuditTx = Parameters<
  Parameters<PostgresJsDatabase<typeof schema>["transaction"]>[0]
>[0];

export interface AuditedMutation<TEntity, TResult> {
  user: SessionUser;
  tool: ToolDefinition;
  /** Must be a key of `tool.actions`. */
  action: string;
  entityType: string;
  entityId: string;
  /** Why the actor is making this change. Required, never empty. */
  reason: string;
  /** Reads the entity's current state. Runs inside the transaction, before `mutate`. */
  before: (tx: AuditTx) => Promise<TEntity | null>;
  /** Performs the change. */
  mutate: (tx: AuditTx) => Promise<TResult>;
  /** Reads the entity's new state. Runs inside the transaction, after `mutate`. */
  after: (tx: AuditTx) => Promise<TEntity | null>;
}

/**
 * Runs a permission-checked, audited mutation.
 *
 * Everything — the permission check, the before-state read, the mutation, the
 * after-state read, and the audit_log insert — happens inside ONE database
 * transaction. Either the change and its audit row both commit, or neither
 * does, and the recorded before-state is exactly what the mutation saw.
 */
export async function withAudit<TEntity, TResult>(
  op: AuditedMutation<TEntity, TResult>,
): Promise<TResult> {
  const reason = op.reason.trim();
  if (!reason) {
    throw new Error(
      `Audited action "${op.tool.slug}.${op.action}" requires a non-empty reason`,
    );
  }

  return writableDb.transaction(async (tx) => {
    requirePermission(op.user, op.tool, op.action);

    const before = await op.before(tx);
    const result = await op.mutate(tx);
    const after = await op.after(tx);

    await tx.insert(schema.auditLog).values({
      actorId: op.user.userId,
      actorEmail: op.user.email,
      tool: op.tool.slug,
      action: op.action,
      entityType: op.entityType,
      entityId: op.entityId,
      before,
      after,
      reason,
    });

    return result;
  });
}
