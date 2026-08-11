import type { schema } from "@/lib/db";

/** One case-history line, already phrased for a compliance reviewer. */
export interface HistoryEntry {
  id: string;
  when: string;
  summary: string;
  reason: string;
}

type AuditRow = typeof schema.auditLog.$inferSelect;

const PHRASES: Record<string, string> = {
  claim_case: "took this case for review",
  release_case: "returned this case to the queue",
  approve_case: "approved the customer's identity verification",
  reject_case: "rejected the customer's identity verification",
};

/**
 * Turns raw audit rows into plain-language history lines: who did what,
 * when, and why. Falls back to the raw action name for anything unmapped.
 */
export function toHistoryEntries(
  rows: AuditRow[],
  nameByEmail: Map<string, string>,
): HistoryEntry[] {
  return rows.map((row) => {
    const actor = nameByEmail.get(row.actorEmail) ?? row.actorEmail;
    const phrase = PHRASES[row.action] ?? row.action.replaceAll("_", " ");
    return {
      id: row.id,
      when: row.timestamp.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      summary: `${actor} ${phrase}`,
      reason: row.reason,
    };
  });
}
