import { desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auditTool } from "./definition";
import { AuditTable, type AuditEntry } from "./audit-table";

/** Most recent audit rows shown/filtered in the browser. */
const MAX_ROWS = 1000;

/**
 * Server component: reads the newest audit rows through the read-only `db`
 * and hands plain serializable entries to the client-side table, which owns
 * filtering and CSV export.
 */
export async function AuditPage() {
  await requireUser();

  const [rows, users] = await Promise.all([
    db.query.auditLog.findMany({
      orderBy: desc(schema.auditLog.timestamp),
      limit: MAX_ROWS,
    }),
    db.query.users.findMany(),
  ]);

  const nameByEmail = new Map(users.map((u) => [u.email, u.name]));

  const entries: AuditEntry[] = rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp.toISOString(),
    actorEmail: row.actorEmail,
    actorName: nameByEmail.get(row.actorEmail) ?? row.actorEmail,
    tool: row.tool,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    reason: row.reason,
  }));

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{auditTool.name}</CardTitle>
          <CardDescription>
            {auditTool.description} Showing the most recent {MAX_ROWS} entries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditTable entries={entries} />
        </CardContent>
      </Card>
    </div>
  );
}
