"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { withAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { schema } from "@/lib/db";
import { PermissionError } from "@/lib/permissions";
import { notesTool } from "./definition";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * The tool's one mutation. Note the shape — every audited action on every
 * tool looks like this:
 *   1. resolve the current user,
 *   2. call withAudit() with before/mutate/after over the same transaction,
 *   3. revalidate and return a plain result object.
 */
export async function editNote(input: {
  noteId: string;
  body: string;
  reason: string;
}): Promise<ActionResult> {
  const user = await requireUser();

  try {
    await withAudit({
      user,
      tool: notesTool,
      action: "edit_note",
      entityType: "note",
      entityId: input.noteId,
      reason: input.reason,
      before: (tx) =>
        tx.query.notes
          .findFirst({ where: eq(schema.notes.id, input.noteId) })
          .then((note) => note ?? null),
      mutate: async (tx) => {
        await tx
          .update(schema.notes)
          .set({ body: input.body, updatedAt: new Date(), updatedBy: user.email })
          .where(eq(schema.notes.id, input.noteId));
      },
      after: (tx) =>
        tx.query.notes
          .findFirst({ where: eq(schema.notes.id, input.noteId) })
          .then((note) => note ?? null),
    });
  } catch (error) {
    if (error instanceof PermissionError) {
      return { ok: false, error: "You do not have permission to edit notes." };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Something went wrong.",
    };
  }

  revalidatePath("/tools/notes");
  return { ok: true };
}
