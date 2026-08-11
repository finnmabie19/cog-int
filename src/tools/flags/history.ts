import type { schema } from "@/lib/db";

/** One flag-history line, already phrased for a human reader. */
export interface HistoryEntry {
  id: string;
  when: string;
  summary: string;
  reason: string;
}

type AuditRow = typeof schema.auditLog.$inferSelect;

type FlagSnapshot = {
  enabled?: boolean;
  rolloutPercentage?: number;
} | null;

/**
 * Phrases an audit row for this tool. Toggle and rollout rows read their
 * before/after snapshots so the line says what actually changed.
 */
function phrase(row: AuditRow): string {
  const before = row.before as FlagSnapshot;
  const after = row.after as FlagSnapshot;
  switch (row.action) {
    case "create_flag":
      return "created this flag";
    case "toggle_flag":
      return after?.enabled ? "turned this flag on" : "turned this flag off";
    case "set_rollout":
      return `changed the rollout from ${before?.rolloutPercentage ?? "?"}% to ${after?.rolloutPercentage ?? "?"}%`;
    default:
      return row.action.replaceAll("_", " ");
  }
}

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
    return {
      id: row.id,
      when: row.timestamp.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      summary: `${actor} ${phrase(row)}`,
      reason: row.reason,
    };
  });
}
