/**
 * Proves the flags tool sits on the same rails as every other tool: a
 * viewer's mutation is rejected (including through withAudit), an admin's
 * toggle commits with its audit row, and the "authenticated" sentinel lets
 * any signed-in user open the tool without granting mutations.
 *
 * Requires the local database (docker compose up -d && npm run db:migrate).
 */
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, expect, test } from "vitest";
import { withAudit } from "@/lib/audit";
import * as schema from "@/lib/db/schema";
import { PermissionError, requirePermission } from "@/lib/permissions";
import { canAccessTool, canPerform } from "@/lib/registry";
import { flagsTool } from "@/tools/flags/definition";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

afterAll(() => client.end());

const admin = {
  userId: "test-admin-id",
  email: "admin@example.com",
  name: "Ada Admin",
  roles: ["platform_admin"],
};

const viewer = {
  userId: "test-viewer-id",
  email: "viewer@example.com",
  name: "Vera Viewer",
  roles: ["viewer"],
};

test("any authenticated user can open the tool; only platform_admin can mutate", () => {
  expect(canAccessTool(viewer, flagsTool)).toBe(true);
  expect(canAccessTool({ ...viewer, roles: [] }, flagsTool)).toBe(true);
  expect(canPerform(viewer, flagsTool, "toggle_flag")).toBe(false);
  expect(canPerform(admin, flagsTool, "toggle_flag")).toBe(true);
});

test("requirePermission rejects a viewer toggling a flag", () => {
  expect(() => requirePermission(viewer, flagsTool, "toggle_flag")).toThrow(
    PermissionError,
  );
});

test("withAudit enforces the same check inside the transaction", async () => {
  let mutated = false;
  await expect(
    withAudit({
      user: viewer,
      tool: flagsTool,
      action: "toggle_flag",
      entityType: "feature_flag",
      entityId: "irrelevant",
      reason: "attempting without permission",
      before: async () => null,
      mutate: async () => {
        mutated = true;
      },
      after: async () => null,
    }),
  ).rejects.toThrow(PermissionError);
  expect(mutated).toBe(false);
});

test("withAudit records a flag toggle in an audit row", async () => {
  const [flag] = await db
    .insert(schema.featureFlags)
    .values({
      name: "Audit test flag",
      key: `test.audit-${Date.now()}`,
      description: "created by tests/flags.test.ts",
    })
    .returning();

  await withAudit({
    user: admin,
    tool: flagsTool,
    action: "toggle_flag",
    entityType: "feature_flag",
    entityId: flag.id,
    reason: "testing the audit wrapper",
    before: (tx) =>
      tx.query.featureFlags
        .findFirst({ where: eq(schema.featureFlags.id, flag.id) })
        .then((f) => f ?? null),
    mutate: (tx) =>
      tx
        .update(schema.featureFlags)
        .set({ enabled: true })
        .where(eq(schema.featureFlags.id, flag.id)),
    after: (tx) =>
      tx.query.featureFlags
        .findFirst({ where: eq(schema.featureFlags.id, flag.id) })
        .then((f) => f ?? null),
  });

  const [updated] = await db
    .select()
    .from(schema.featureFlags)
    .where(eq(schema.featureFlags.id, flag.id));
  expect(updated.enabled).toBe(true);

  const [auditRow] = await db
    .select()
    .from(schema.auditLog)
    .where(eq(schema.auditLog.entityId, flag.id))
    .orderBy(desc(schema.auditLog.timestamp))
    .limit(1);

  expect(auditRow).toBeDefined();
  expect(auditRow.tool).toBe("flags");
  expect(auditRow.action).toBe("toggle_flag");
  expect(auditRow.actorEmail).toBe("admin@example.com");
  expect(auditRow.reason).toBe("testing the audit wrapper");
  expect((auditRow.before as { enabled: boolean }).enabled).toBe(false);
  expect((auditRow.after as { enabled: boolean }).enabled).toBe(true);

  // cleanup the flag (audit rows are append-only by design and stay)
  await db.delete(schema.featureFlags).where(eq(schema.featureFlags.id, flag.id));
});
