import type { ComponentType } from "react";
import type { Role } from "./roles";
import type { SessionUser } from "./session-user";

export interface ActionDefinition {
  /** Roles allowed to perform this action. */
  roles: readonly Role[];
  description: string;
}

export interface ToolDefinition<TActions extends string = string> {
  name: string;
  slug: string;
  description: string;
  /**
   * Roles allowed to see and open this tool at all, or the sentinel
   * "authenticated" — any signed-in user, regardless of roles.
   */
  requiredRoles: readonly Role[] | "authenticated";
  /** Every mutating action the tool can perform, with the roles allowed to perform it. */
  actions: Record<TActions, ActionDefinition>;
  /** The tool's page, rendered at /tools/[slug]. */
  page: ComponentType;
}

/**
 * Declares a tool. This is the single place a tool states its identity and
 * its permission model — the sidebar, the route guard, and every
 * `withAudit()` call all derive from this object.
 */
export function defineTool<TActions extends string>(
  tool: ToolDefinition<TActions>,
): ToolDefinition<TActions> {
  return tool;
}

export function canAccessTool(user: SessionUser, tool: ToolDefinition): boolean {
  if (tool.requiredRoles === "authenticated") return true;
  return tool.requiredRoles.some((role) => user.roles.includes(role));
}

export function canPerform(
  user: SessionUser,
  tool: ToolDefinition,
  action: string,
): boolean {
  const definition = tool.actions[action];
  if (!definition) return false;
  return (
    canAccessTool(user, tool) &&
    definition.roles.some((role) => user.roles.includes(role))
  );
}
