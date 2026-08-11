import { asc, desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { canPerform } from "@/lib/registry";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { flagsTool } from "./definition";
import { CreateFlagDialog } from "./create-flag-dialog";
import { FlagDetailDialog, type FeatureFlagView } from "./flag-detail-dialog";
import { toHistoryEntries } from "./history";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { dateStyle: "medium" });
}

/**
 * The tool's page (a server component). Reads go through the read-only `db`
 * handle; whether the mutation controls render is derived from the same
 * action declarations the server enforces.
 */
export async function FlagsPage() {
  const user = await requireUser();
  const canMutate = canPerform(user, flagsTool, "toggle_flag");
  const canCreate = canPerform(user, flagsTool, "create_flag");

  const [flags, auditRows, users] = await Promise.all([
    db.query.featureFlags.findMany({
      orderBy: asc(schema.featureFlags.key),
    }),
    db.query.auditLog.findMany({
      where: eq(schema.auditLog.tool, flagsTool.slug),
      orderBy: desc(schema.auditLog.timestamp),
    }),
    db.query.users.findMany(),
  ]);

  const nameByEmail = new Map(users.map((u) => [u.email, u.name]));

  const toView = (f: (typeof flags)[number]): FeatureFlagView => ({
    id: f.id,
    name: f.name,
    key: f.key,
    description: f.description,
    enabled: f.enabled,
    rolloutPercentage: f.rolloutPercentage,
    lastChangedByName: f.lastChangedBy
      ? (nameByEmail.get(f.lastChangedBy) ?? f.lastChangedByName ?? f.lastChangedBy)
      : null,
    lastChangedAt: f.lastChangedAt ? formatDate(f.lastChangedAt) : null,
    history: toHistoryEntries(
      auditRows.filter((row) => row.entityId === f.id),
      nameByEmail,
    ),
  });

  const views = flags.map(toView);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{flagsTool.name}</CardTitle>
          <CardDescription>{flagsTool.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {canCreate && (
            <div>
              <CreateFlagDialog />
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flag</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Rollout</TableHead>
                <TableHead>Last changed</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {views.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <p className="font-medium">{f.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {f.key}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-xs text-muted-foreground">
                    {f.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.enabled ? "secondary" : "outline"}>
                      {f.enabled ? "On" : "Off"}
                    </Badge>
                  </TableCell>
                  <TableCell>{f.rolloutPercentage}%</TableCell>
                  <TableCell className="text-muted-foreground">
                    {f.lastChangedByName
                      ? `${f.lastChangedByName}${f.lastChangedAt ? ` on ${f.lastChangedAt}` : ""}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <FlagDetailDialog flag={f} canMutate={canMutate} />
                  </TableCell>
                </TableRow>
              ))}
              {views.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No flags yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
