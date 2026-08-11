"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { withAudit, type AuditTx } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { schema } from "@/lib/db";
import { PermissionError } from "@/lib/permissions";
import { flagsTool } from "./definition";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const readFlag = (flagId: string) => (tx: AuditTx) =>
  tx.query.featureFlags
    .findFirst({ where: eq(schema.featureFlags.id, flagId) })
    .then((f) => f ?? null);

function toResult(error: unknown): ActionResult {
  if (error instanceof PermissionError) {
    return { ok: false, error: "You do not have permission to do this." };
  }
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Something went wrong.",
  };
}

const FLAG_KEY_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

export async function createFlag(input: {
  name: string;
  key: string;
  description: string;
  reason: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const name = input.name.trim();
  const key = input.key.trim();
  const description = input.description.trim();

  if (!name) return { ok: false, error: "A flag name is required." };
  if (!FLAG_KEY_PATTERN.test(key)) {
    return {
      ok: false,
      error:
        "Keys are lowercase letters and digits separated by dots, dashes, or underscores (e.g. checkout.new-flow).",
    };
  }

  const flagId = crypto.randomUUID();

  try {
    await withAudit({
      user,
      tool: flagsTool,
      action: "create_flag",
      entityType: "feature_flag",
      entityId: flagId,
      reason: input.reason,
      before: async () => null,
      mutate: async (tx) => {
        const existing = await tx.query.featureFlags.findFirst({
          where: eq(schema.featureFlags.key, key),
        });
        if (existing) {
          throw new Error(`A flag with the key "${key}" already exists.`);
        }
        await tx.insert(schema.featureFlags).values({
          id: flagId,
          name,
          key,
          description,
          lastChangedBy: user.email,
          lastChangedByName: user.name,
          lastChangedAt: new Date(),
        });
      },
      after: readFlag(flagId),
    });
  } catch (error) {
    return toResult(error);
  }

  revalidatePath("/tools/flags");
  return { ok: true };
}

export async function toggleFlag(input: {
  flagId: string;
  enabled: boolean;
  reason: string;
}): Promise<ActionResult> {
  const user = await requireUser();

  try {
    await withAudit({
      user,
      tool: flagsTool,
      action: "toggle_flag",
      entityType: "feature_flag",
      entityId: input.flagId,
      reason: input.reason,
      before: readFlag(input.flagId),
      mutate: async (tx) => {
        const updated = await tx
          .update(schema.featureFlags)
          .set({
            enabled: input.enabled,
            lastChangedBy: user.email,
            lastChangedByName: user.name,
            lastChangedAt: new Date(),
          })
          .where(eq(schema.featureFlags.id, input.flagId))
          .returning();
        if (updated.length === 0) {
          throw new Error("This flag no longer exists.");
        }
      },
      after: readFlag(input.flagId),
    });
  } catch (error) {
    return toResult(error);
  }

  revalidatePath("/tools/flags");
  return { ok: true };
}

export async function setRollout(input: {
  flagId: string;
  rolloutPercentage: number;
  reason: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const rollout = input.rolloutPercentage;

  if (!Number.isInteger(rollout) || rollout < 0 || rollout > 100) {
    return {
      ok: false,
      error: "Rollout percentage must be a whole number between 0 and 100.",
    };
  }

  try {
    await withAudit({
      user,
      tool: flagsTool,
      action: "set_rollout",
      entityType: "feature_flag",
      entityId: input.flagId,
      reason: input.reason,
      before: readFlag(input.flagId),
      mutate: async (tx) => {
        const updated = await tx
          .update(schema.featureFlags)
          .set({
            rolloutPercentage: rollout,
            lastChangedBy: user.email,
            lastChangedByName: user.name,
            lastChangedAt: new Date(),
          })
          .where(eq(schema.featureFlags.id, input.flagId))
          .returning();
        if (updated.length === 0) {
          throw new Error("This flag no longer exists.");
        }
      },
      after: readFlag(input.flagId),
    });
  } catch (error) {
    return toResult(error);
  }

  revalidatePath("/tools/flags");
  return { ok: true };
}
