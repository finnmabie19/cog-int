/**
 * All roles known to the platform. Adding a role means adding it here — the
 * union type keeps every `defineTool()` declaration in sync at compile time.
 *
 * In production these arrive as OIDC claims (Okta/Entra groups); locally they
 * are stored on the seeded users.
 */
export const ROLES = ["platform_admin", "ops", "viewer"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
