"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface AuditEntry {
  id: string;
  /** ISO-8601 string; serialized across the server/client boundary. */
  timestamp: string;
  /** Timestamp already formatted for display on the server. */
  when: string;
  actorEmail: string;
  actorName: string;
  tool: string;
  action: string;
  entityType: string;
  entityId: string;
  reason: string;
}

const CSV_COLUMNS = [
  "timestamp",
  "actorEmail",
  "actorName",
  "tool",
  "action",
  "entityType",
  "entityId",
  "reason",
] as const;

function csvEscape(value: string): string {
  // Prefix formula-leading values so spreadsheets treat them as text.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

function toCsv(entries: AuditEntry[]): string {
  const header = CSV_COLUMNS.join(",");
  const lines = entries.map((entry) =>
    CSV_COLUMNS.map((column) => csvEscape(entry[column])).join(","),
  );
  return [header, ...lines].join("\n");
}

function downloadCsv(entries: AuditEntry[]) {
  const blob = new Blob([toCsv(entries)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function AuditTable({ entries }: { entries: AuditEntry[] }) {
  const [actor, setActor] = useState("all");
  const [tool, setTool] = useState("all");
  const [action, setAction] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const actors = useMemo(
    () => [...new Set(entries.map((e) => e.actorEmail))].sort(),
    [entries],
  );
  const tools = useMemo(
    () => [...new Set(entries.map((e) => e.tool))].sort(),
    [entries],
  );
  const actions = useMemo(
    () =>
      [
        ...new Set(
          entries
            .filter((e) => tool === "all" || e.tool === tool)
            .map((e) => e.action),
        ),
      ].sort(),
    [entries, tool],
  );

  const filtered = useMemo(() => {
    // Date inputs are the viewer's local dates; "to" is inclusive of that day.
    const fromMs = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toMs = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
    return entries.filter((e) => {
      if (actor !== "all" && e.actorEmail !== actor) return false;
      if (tool !== "all" && e.tool !== tool) return false;
      if (action !== "all" && e.action !== action) return false;
      const ts = new Date(e.timestamp).getTime();
      if (fromMs !== null && ts < fromMs) return false;
      if (toMs !== null && ts > toMs) return false;
      return true;
    });
  }, [entries, actor, tool, action, from, to]);

  const selectClass =
    "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="audit-actor">Actor</Label>
          <select
            id="audit-actor"
            className={selectClass}
            value={actor}
            onChange={(e) => setActor(e.target.value)}
          >
            <option value="all">All actors</option>
            {actors.map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="audit-tool">Tool</Label>
          <select
            id="audit-tool"
            className={selectClass}
            value={tool}
            onChange={(e) => {
              setTool(e.target.value);
              setAction("all");
            }}
          >
            <option value="all">All tools</option>
            {tools.map((slug) => (
              <option key={slug} value={slug}>
                {slug}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="audit-action">Action</Label>
          <select
            id="audit-action"
            className={selectClass}
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="all">All actions</option>
            {actions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="audit-from">From</Label>
          <Input
            id="audit-from"
            type="date"
            className="w-40"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="audit-to">To</Label>
          <Input
            id="audit-to"
            type="date"
            className="w-40"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="ml-auto flex items-end gap-3">
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {entries.length} entries
          </p>
          <Button
            variant="outline"
            onClick={() => downloadCsv(filtered)}
            disabled={filtered.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Tool</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {entry.when}
              </TableCell>
              <TableCell>
                <p className="font-medium">{entry.actorName}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.actorEmail}
                </p>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{entry.tool}</Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">
                {entry.action}
              </TableCell>
              <TableCell>
                <p>{entry.entityType}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {entry.entityId}
                </p>
              </TableCell>
              <TableCell className="max-w-sm text-muted-foreground">
                {entry.reason}
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                No audit entries match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
