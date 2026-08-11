import { asc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { canPerform } from "@/lib/registry";
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
import { notesTool } from "./definition";
import { EditNoteDialog } from "./edit-note-dialog";

/**
 * The tool's page (a server component). Reads go through the read-only `db`
 * handle. Whether the edit button renders is derived from the same action
 * declaration that the server enforces — there is no separate role list here.
 */
export async function NotesPage() {
  const user = await requireUser();
  const notes = await db.query.notes.findMany({
    orderBy: asc(schema.notes.title),
  });
  const canEdit = canPerform(user, notesTool, "edit_note");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{notesTool.name}</CardTitle>
        <CardDescription>{notesTool.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Body</TableHead>
              <TableHead>Last updated</TableHead>
              {canEdit && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {notes.map((note) => (
              <TableRow key={note.id}>
                <TableCell className="font-medium">{note.title}</TableCell>
                <TableCell className="max-w-md whitespace-pre-wrap">
                  {note.body}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {note.updatedAt.toLocaleString()}
                  {note.updatedBy ? ` by ${note.updatedBy}` : ""}
                </TableCell>
                {canEdit && (
                  <TableCell>
                    <EditNoteDialog noteId={note.id} currentBody={note.body} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
