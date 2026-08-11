import { defineTool } from "@/lib/registry";
import { NotesPage } from "./notes-page";

/**
 * The tool's single source of truth: identity, who can open it, and who can
 * perform each action. Everything else (sidebar entry, route guard, audit
 * rows, button visibility) derives from this object.
 */
export const notesTool = defineTool({
  name: "Notes",
  slug: "notes",
  description: "Shared operational notes. The reference tool for the platform.",
  requiredRoles: ["platform_admin", "ops", "viewer"],
  actions: {
    edit_note: {
      roles: ["platform_admin", "ops"],
      description: "Edit the body of a note",
    },
  },
  page: NotesPage,
});
