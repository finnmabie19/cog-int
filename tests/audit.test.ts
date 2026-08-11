/**
 * Proves the audit wrapper records a mutation: the change and its audit row
 * commit together, with before/after captured inside the same transaction.
 *
 * Requires the local database (docker compose up -d && npm run db:migrate).
 */
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, expect, test } from "vitest";
import { withAudit } from "@/lib/audit";
import * as schema from "@/lib/db/schema";
import { notesTool } from "@/tools/notes/definition";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

afterAll(() => client.end());

const admin = {
  userId: "test-admin-id",
  email: "admin@example.com",
  name: "Ada Admin",
  roles: ["platform_admin"],
};

test("withAudit records the mutation in an audit row", async () => {
  const [note] = await db
    .insert(schema.notes)
    .values({ title: "audit-test", body: "original body" })
    .returning();

  await withAudit({
    user: admin,
    tool: notesTool,
    action: "edit_note",
    entityType: "note",
    entityId: note.id,
    reason: "testing the audit wrapper",
    before: (tx) =>
      tx.query.notes
        .findFirst({ where: eq(schema.notes.id, note.id) })
        .then((n) => n ?? null),
    mutate: (tx) =>
      tx
        .update(schema.notes)
        .set({ body: "updated body" })
        .where(eq(schema.notes.id, note.id)),
    after: (tx) =>
      tx.query.notes
        .findFirst({ where: eq(schema.notes.id, note.id) })
        .then((n) => n ?? null),
  });

  const [updated] = await db
    .select()
    .from(schema.notes)
    .where(eq(schema.notes.id, note.id));
  expect(updated.body).toBe("updated body");

  const [auditRow] = await db
    .select()
    .from(schema.auditLog)
    .where(eq(schema.auditLog.entityId, note.id))
    .orderBy(desc(schema.auditLog.timestamp))
    .limit(1);

  expect(auditRow).toBeDefined();
  expect(auditRow.tool).toBe("notes");
  expect(auditRow.action).toBe("edit_note");
  expect(auditRow.actorEmail).toBe("admin@example.com");
  expect(auditRow.reason).toBe("testing the audit wrapper");
  expect((auditRow.before as { body: string }).body).toBe("original body");
  expect((auditRow.after as { body: string }).body).toBe("updated body");

  // cleanup the note (audit rows are append-only by design and stay)
  await db.delete(schema.notes).where(eq(schema.notes.id, note.id));
});

test("withAudit rejects an empty reason", async () => {
  await expect(
    withAudit({
      user: admin,
      tool: notesTool,
      action: "edit_note",
      entityType: "note",
      entityId: "irrelevant",
      reason: "   ",
      before: async () => null,
      mutate: async () => undefined,
      after: async () => null,
    }),
  ).rejects.toThrow(/requires a non-empty reason/);
});
