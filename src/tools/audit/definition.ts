import { defineTool } from "@/lib/registry";
import { AuditPage } from "./audit-page";

/**
 * The platform's global audit view. Read-only by design: it has no actions
 * and therefore no actions.ts — every row it shows was written by some other
 * tool's withAudit() call. Restricted to platform admins because it spans
 * every tool, including ones the viewer may not otherwise see.
 */
export const auditTool = defineTool({
  name: "Audit Log",
  slug: "audit",
  description:
    "Every audited change across the platform: who did what, when, and why. Filterable and exportable as CSV.",
  requiredRoles: ["platform_admin"],
  actions: {},
  page: AuditPage,
});
