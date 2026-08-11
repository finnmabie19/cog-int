/**
 * Proves a permission check rejects: a viewer cannot perform an action their
 * roles don't cover — including when the attempt goes through withAudit.
 */
import { expect, test } from "vitest";
import { withAudit } from "@/lib/audit";
import { PermissionError, requirePermission } from "@/lib/permissions";
import { notesTool } from "@/tools/notes/definition";

const viewer = {
  userId: "test-viewer-id",
  email: "viewer@example.com",
  name: "Vera Viewer",
  roles: ["viewer"],
};

test("requirePermission rejects a viewer editing a note", () => {
  expect(() => requirePermission(viewer, notesTool, "edit_note")).toThrow(
    PermissionError,
  );
});

test("withAudit enforces the same check inside the transaction", async () => {
  let mutated = false;
  await expect(
    withAudit({
      user: viewer,
      tool: notesTool,
      action: "edit_note",
      entityType: "note",
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
