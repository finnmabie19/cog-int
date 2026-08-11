"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { withAudit, type AuditTx } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { schema } from "@/lib/db";
import { PermissionError } from "@/lib/permissions";
import { kycTool } from "./definition";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const readCase = (caseId: string) => (tx: AuditTx) =>
  tx.query.kycCases
    .findFirst({ where: eq(schema.kycCases.id, caseId) })
    .then((c) => c ?? null);

function toResult(error: unknown): ActionResult {
  if (error instanceof PermissionError) {
    return { ok: false, error: "You do not have permission to do this." };
  }
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Something went wrong.",
  };
}

export async function claimCase(input: {
  caseId: string;
  reason: string;
}): Promise<ActionResult> {
  const user = await requireUser();

  try {
    await withAudit({
      user,
      tool: kycTool,
      action: "claim_case",
      entityType: "kyc_case",
      entityId: input.caseId,
      reason: input.reason,
      before: readCase(input.caseId),
      mutate: async (tx) => {
        const updated = await tx
          .update(schema.kycCases)
          .set({ claimedBy: user.email, claimedByName: user.name })
          .where(
            and(
              eq(schema.kycCases.id, input.caseId),
              eq(schema.kycCases.status, "pending"),
              isNull(schema.kycCases.claimedBy),
            ),
          )
          .returning();
        if (updated.length === 0) {
          throw new Error(
            "This case is no longer available to claim — it may have been claimed or decided by someone else.",
          );
        }
      },
      after: readCase(input.caseId),
    });
  } catch (error) {
    return toResult(error);
  }

  revalidatePath("/tools/kyc");
  return { ok: true };
}

export async function releaseCase(input: {
  caseId: string;
  reason: string;
}): Promise<ActionResult> {
  const user = await requireUser();

  try {
    await withAudit({
      user,
      tool: kycTool,
      action: "release_case",
      entityType: "kyc_case",
      entityId: input.caseId,
      reason: input.reason,
      before: readCase(input.caseId),
      mutate: async (tx) => {
        const updated = await tx
          .update(schema.kycCases)
          .set({ claimedBy: null, claimedByName: null })
          .where(
            and(
              eq(schema.kycCases.id, input.caseId),
              eq(schema.kycCases.status, "pending"),
              eq(schema.kycCases.claimedBy, user.email),
            ),
          )
          .returning();
        if (updated.length === 0) {
          throw new Error(
            "Only the reviewer who claimed a pending case can release it.",
          );
        }
      },
      after: readCase(input.caseId),
    });
  } catch (error) {
    return toResult(error);
  }

  revalidatePath("/tools/kyc");
  return { ok: true };
}

async function decideCase(
  action: "approve_case" | "reject_case",
  input: { caseId: string; reason: string },
): Promise<ActionResult> {
  const user = await requireUser();
  const status = action === "approve_case" ? "approved" : "rejected";

  try {
    await withAudit({
      user,
      tool: kycTool,
      action,
      entityType: "kyc_case",
      entityId: input.caseId,
      reason: input.reason,
      before: readCase(input.caseId),
      mutate: async (tx) => {
        const updated = await tx
          .update(schema.kycCases)
          .set({ status, decidedBy: user.email, decidedAt: new Date() })
          .where(
            and(
              eq(schema.kycCases.id, input.caseId),
              eq(schema.kycCases.status, "pending"),
              eq(schema.kycCases.claimedBy, user.email),
            ),
          )
          .returning();
        if (updated.length === 0) {
          throw new Error(
            "You must have claimed this case (and it must still be pending) to decide it.",
          );
        }
      },
      after: readCase(input.caseId),
    });
  } catch (error) {
    return toResult(error);
  }

  revalidatePath("/tools/kyc");
  return { ok: true };
}

export async function approveCase(input: {
  caseId: string;
  reason: string;
}): Promise<ActionResult> {
  return decideCase("approve_case", input);
}

export async function rejectCase(input: {
  caseId: string;
  reason: string;
}): Promise<ActionResult> {
  return decideCase("reject_case", input);
}
