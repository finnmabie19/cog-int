import { canAccessTool, canPerform, type ToolDefinition } from "./registry";
import type { SessionUser } from "./session-user";

export class PermissionError extends Error {
  constructor(
    public readonly user: SessionUser,
    public readonly tool: string,
    public readonly action: string,
  ) {
    super(
      `${user.email} is not permitted to perform "${action}" on tool "${tool}"`,
    );
    this.name = "PermissionError";
  }
}

/**
 * The single server-side permission check. Throws PermissionError when the
 * user lacks any role required for the tool or the action.
 *
 * You rarely call this directly: `withAudit()` calls it inside the
 * transaction boundary for every mutation. Call it yourself only for
 * read-side guards (e.g. hiding a page).
 */
export function requirePermission(
  user: SessionUser,
  tool: ToolDefinition,
  action?: string,
): void {
  if (!canAccessTool(user, tool)) {
    throw new PermissionError(user, tool.slug, action ?? "access");
  }
  if (action !== undefined && !canPerform(user, tool, action)) {
    throw new PermissionError(user, tool.slug, action);
  }
}
