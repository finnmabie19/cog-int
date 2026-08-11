/**
 * Seeds the three demo users, a few notes, and the KYC review queue.
 * Run with: npm run db:seed
 *
 * Uses the writable connection directly — seed/migration scripts are
 * infrastructure, not application code, so they don't go through withAudit.
 * The one exception: demo KYC decisions are driven through withAudit() so
 * the seeded case history is made of real audit rows, exactly as the app
 * would have produced them. (That is why the seed preloads
 * stub-server-only.cjs: audit.ts imports "server-only".)
 */
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { withAudit, type AuditTx } from "../src/lib/audit";
import * as schema from "../src/lib/db/schema";
import type { SessionUser } from "../src/lib/session-user";
import { kycTool } from "../src/tools/kyc/definition";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

async function main() {
  await db
    .insert(schema.users)
    .values([
      {
        email: "admin@example.com",
        name: "Ada Admin",
        roles: ["platform_admin"],
      },
      {
        email: "ops@example.com",
        name: "Omar Ops",
        roles: ["ops", "kyc_reviewer"],
      },
      {
        email: "viewer@example.com",
        name: "Vera Viewer",
        roles: ["viewer", "kyc_viewer"],
      },
    ])
    .onConflictDoUpdate({
      target: schema.users.email,
      set: { roles: sql`excluded.roles` },
    });

  const existingNotes = await db.query.notes.findMany();
  if (existingNotes.length === 0) {
    await db.insert(schema.notes).values([
      {
        title: "On-call escalation",
        body: "Primary: #ops-oncall. Escalate to engineering manager after 15 minutes without acknowledgement.",
      },
      {
        title: "Refund policy summary",
        body: "Refunds over $500 need two approvals. All refunds are audited.",
      },
      {
        title: "KYC review SLA",
        body: "New KYC submissions must be reviewed within 24 hours.",
      },
    ]);
  }

  await seedKycCases();

  console.log(
    "Seeded 3 users (admin@, ops@, viewer@example.com), notes, and KYC cases.",
  );
  await client.end();
  // audit.ts holds its own (writable) connection pool open; exit explicitly.
  process.exit(0);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function seedKycCases() {
  const existing = await db.query.kycCases.findMany();
  if (existing.length > 0) return;

  const opsRow = await db.query.users.findFirst({
    where: eq(schema.users.email, "ops@example.com"),
  });
  if (!opsRow) throw new Error("ops@example.com must be seeded first");
  const reviewer: SessionUser = {
    userId: opsRow.id,
    email: opsRow.email,
    name: opsRow.name,
    roles: opsRow.roles,
  };

  const c = (
    name: string,
    email: string,
    dob: string,
    country: string,
    docType: string,
    docNumber: string,
    signals: string[],
    submittedDaysAgo: number,
  ) => ({
    customerName: name,
    customerEmail: email,
    dateOfBirth: dob,
    country,
    documentType: docType,
    documentNumber: docNumber,
    riskSignals: signals,
    submittedAt: daysAgo(submittedDaysAgo),
  });

  // 8 pending (the queue), oldest ~9 days.
  const pending = await db
    .insert(schema.kycCases)
    .values([
      c("Margaret Ellis", "margaret.ellis@example.net", "1961-03-14", "United Kingdom", "Passport", "GB-P 55021983", ["Document near expiry", "Name mismatch with bank record"], 9),
      c("Thomas Reid", "thomas.reid@example.net", "1988-07-02", "Ireland", "Driving licence", "IE-DL 4471120", ["Address changed twice in 90 days"], 8),
      c("Susan Whitfield", "susan.whitfield@example.net", "1975-11-23", "United States", "Passport", "US-P 88213307", ["Photo quality low", "DOB mismatch with credit file"], 7),
      c("David Okafor", "david.okafor@example.net", "1992-01-30", "Nigeria", "National ID", "NG-ID 20419935", ["High-risk jurisdiction", "New device on signup"], 6),
      c("Helen Marsh", "helen.marsh@example.net", "1969-05-08", "United Kingdom", "Passport", "GB-P 61102748", ["PEP name similarity"], 4),
      c("Peter Lindqvist", "peter.lindqvist@example.net", "1983-09-17", "Sweden", "National ID", "SE-ID 8309171234", ["Document issued < 30 days ago"], 3),
      c("Angela Brennan", "angela.brennan@example.net", "1990-12-05", "Ireland", "Passport", "IE-P 33208114", ["Multiple accounts from same address", "VPN detected at signup"], 2),
      c("Robert Chen", "robert.chen@example.net", "1979-04-21", "Canada", "Driving licence", "CA-DL 5520914", ["Name transliteration variant"], 1),
    ])
    .returning();

  // 6 destined for history: claim + decide through withAudit, so the case
  // history screen shows real audit rows.
  const decided = await db
    .insert(schema.kycCases)
    .values([
      c("Alan Pritchard", "alan.pritchard@example.net", "1957-08-11", "United Kingdom", "Passport", "GB-P 40881259", ["Document near expiry"], 14),
      c("Grace Nakamura", "grace.nakamura@example.net", "1986-02-27", "Japan", "Passport", "JP-P 71190283", ["Photo quality low"], 13),
      c("Michael Duffy", "michael.duffy@example.net", "1971-06-19", "Ireland", "Driving licence", "IE-DL 2210476", ["Address mismatch with utility bill"], 12),
      c("Laura Stein", "laura.stein@example.net", "1994-10-03", "Germany", "National ID", "DE-ID 9410031187", ["New device on signup"], 12),
      c("James Holloway", "james.holloway@example.net", "1968-01-15", "United States", "Passport", "US-P 63329170", ["Sanctions list name similarity", "DOB mismatch with credit file"], 11),
      c("Fatima Al-Rashid", "fatima.al-rashid@example.net", "1981-03-09", "United Arab Emirates", "Passport", "AE-P 55274401", ["High-risk jurisdiction", "Large first deposit"], 10),
    ])
    .returning();

  const decisions: {
    outcome: "approve_case" | "reject_case";
    claimReason: string;
    decideReason: string;
  }[] = [
    { outcome: "approve_case", claimReason: "Picking up oldest case in the queue", decideReason: "Passport valid; renewal already submitted and details match the bank record" },
    { outcome: "approve_case", claimReason: "Reviewing photo-quality flags", decideReason: "Re-submitted photo is legible and matches the selfie check" },
    { outcome: "reject_case", claimReason: "Address flags need manual review", decideReason: "Utility bill address does not match the licence and customer did not respond to follow-up" },
    { outcome: "approve_case", claimReason: "Routine review of new-device flag", decideReason: "Device change explained by new phone; ID verified against registry" },
    { outcome: "reject_case", claimReason: "Sanctions similarity requires manual screening", decideReason: "Unable to rule out sanctions list match; escalated to compliance officer per policy" },
    { outcome: "approve_case", claimReason: "High-risk jurisdiction review", decideReason: "Source of funds documented; passport verified and deposit consistent with declared income" },
  ];

  for (let i = 0; i < decided.length; i++) {
    const kycCase = decided[i];
    const decision = decisions[i];
    const read = (tx: AuditTx) =>
      tx.query.kycCases
        .findFirst({ where: eq(schema.kycCases.id, kycCase.id) })
        .then((row) => row ?? null);

    await withAudit({
      user: reviewer,
      tool: kycTool,
      action: "claim_case",
      entityType: "kyc_case",
      entityId: kycCase.id,
      reason: decision.claimReason,
      before: read,
      mutate: (tx) =>
        tx
          .update(schema.kycCases)
          .set({ claimedBy: reviewer.email, claimedByName: reviewer.name })
          .where(eq(schema.kycCases.id, kycCase.id)),
      after: read,
    });

    await withAudit({
      user: reviewer,
      tool: kycTool,
      action: decision.outcome,
      entityType: "kyc_case",
      entityId: kycCase.id,
      reason: decision.decideReason,
      before: read,
      mutate: (tx) =>
        tx
          .update(schema.kycCases)
          .set({
            status: decision.outcome === "approve_case" ? "approved" : "rejected",
            decidedBy: reviewer.email,
            decidedAt: new Date(),
          })
          .where(eq(schema.kycCases.id, kycCase.id)),
      after: read,
    });
  }

  // Two of the pending cases are already claimed, so the queue shows a
  // visible in-progress claim.
  for (const claimed of [pending[0], pending[2]]) {
    await withAudit({
      user: reviewer,
      tool: kycTool,
      action: "claim_case",
      entityType: "kyc_case",
      entityId: claimed.id,
      reason: "Working the oldest unclaimed cases first",
      before: (tx) =>
        tx.query.kycCases
          .findFirst({ where: eq(schema.kycCases.id, claimed.id) })
          .then((row) => row ?? null),
      mutate: (tx) =>
        tx
          .update(schema.kycCases)
          .set({ claimedBy: reviewer.email, claimedByName: reviewer.name })
          .where(eq(schema.kycCases.id, claimed.id)),
      after: (tx) =>
        tx.query.kycCases
          .findFirst({ where: eq(schema.kycCases.id, claimed.id) })
          .then((row) => row ?? null),
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
