import { defineTool } from "@/lib/registry";
import { FlagsPage } from "./flags-page";

/**
 * The tool's single source of truth: identity, who can open it, and who can
 * perform each action. Everything else (sidebar entry, route guard, audit
 * rows, button visibility) derives from this object.
 */
export const flagsTool = defineTool({
  name: "Feature Flags",
  slug: "flags",
  description:
    "Admin panel for feature flags. Toggle a flag, adjust its rollout percentage, or create a new one.",
  requiredRoles: "authenticated",
  actions: {
    create_flag: {
      roles: ["platform_admin"],
      description: "Create a new feature flag",
    },
    toggle_flag: {
      roles: ["platform_admin"],
      description: "Turn a flag on or off",
    },
    set_rollout: {
      roles: ["platform_admin"],
      description: "Set a flag's rollout percentage",
    },
  },
  page: FlagsPage,
});
