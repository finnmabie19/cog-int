import { defineTool } from "@/lib/registry";
import { KycPage } from "./kyc-page";

/**
 * The tool's single source of truth: identity, who can open it, and who can
 * perform each action. Everything else (sidebar entry, route guard, audit
 * rows, button visibility) derives from this object.
 */
export const kycTool = defineTool({
  name: "KYC Review",
  slug: "kyc",
  description:
    "Review queue for customer identity verification. Claim a case, verify the submitted documents, and record a decision.",
  requiredRoles: ["platform_admin", "kyc_reviewer", "kyc_viewer"],
  actions: {
    claim_case: {
      roles: ["platform_admin", "kyc_reviewer"],
      description: "Claim a pending case for review",
    },
    release_case: {
      roles: ["platform_admin", "kyc_reviewer"],
      description: "Release a claimed case back to the queue",
    },
    approve_case: {
      roles: ["platform_admin", "kyc_reviewer"],
      description: "Approve the customer's identity verification",
    },
    reject_case: {
      roles: ["platform_admin", "kyc_reviewer"],
      description: "Reject the customer's identity verification",
    },
  },
  page: KycPage,
});
