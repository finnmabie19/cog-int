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
import { kycTool } from "./definition";
import { CaseDetailDialog, type KycCaseView } from "./case-detail-dialog";
import { toHistoryEntries } from "./history";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { dateStyle: "medium" });
}

/**
 * The tool's page (a server component). Reads go through the read-only `db`
 * handle; whether the claim/decide controls render is derived from the same
 * action declarations the server enforces.
 */
export async function KycPage() {
  const user = await requireUser();
  const canReview = canPerform(user, kycTool, "claim_case");

  const [cases, auditRows, users] = await Promise.all([
    db.query.kycCases.findMany({
      orderBy: asc(schema.kycCases.submittedAt),
    }),
    db.query.auditLog.findMany({
      where: eq(schema.auditLog.tool, kycTool.slug),
      orderBy: desc(schema.auditLog.timestamp),
    }),
    db.query.users.findMany(),
  ]);

  const nameByEmail = new Map(users.map((u) => [u.email, u.name]));

  const toView = (c: (typeof cases)[number]): KycCaseView => ({
    id: c.id,
    customerName: c.customerName,
    customerEmail: c.customerEmail,
    dateOfBirth: c.dateOfBirth,
    country: c.country,
    documentType: c.documentType,
    documentNumber: c.documentNumber,
    riskSignals: c.riskSignals,
    status: c.status,
    submittedAt: formatDate(c.submittedAt),
    claimedBy: c.claimedBy,
    claimedByName: c.claimedByName,
    decidedByName: c.decidedBy
      ? (nameByEmail.get(c.decidedBy) ?? c.decidedBy)
      : null,
    decidedAt: c.decidedAt ? formatDate(c.decidedAt) : null,
    history: toHistoryEntries(
      auditRows.filter((row) => row.entityId === c.id),
      nameByEmail,
    ),
  });

  const pending = cases.filter((c) => c.status === "pending").map(toView);
  const decided = cases
    .filter((c) => c.status !== "pending")
    .map(toView)
    .reverse();

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{kycTool.name} — pending queue</CardTitle>
          <CardDescription>
            {kycTool.description} Oldest submissions first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Risk signals</TableHead>
                <TableHead>Claimed by</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.customerName}</TableCell>
                  <TableCell>{c.submittedAt}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.riskSignals.map((signal) => (
                        <Badge key={signal} variant="secondary">
                          {signal}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.claimedByName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <CaseDetailDialog
                      kycCase={c}
                      canReview={canReview}
                      userEmail={user.email}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {pending.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No pending cases.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Decided cases</CardTitle>
          <CardDescription>
            Most recent decisions first. Open a case to read its full history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Decided by</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {decided.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.customerName}</TableCell>
                  <TableCell>{c.submittedAt}</TableCell>
                  <TableCell>
                    <Badge
                      variant={c.status === "approved" ? "secondary" : "destructive"}
                    >
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.decidedByName ?? "—"}
                    {c.decidedAt ? ` on ${c.decidedAt}` : ""}
                  </TableCell>
                  <TableCell>
                    <CaseDetailDialog
                      kycCase={c}
                      canReview={canReview}
                      userEmail={user.email}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {decided.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No decided cases yet.
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
