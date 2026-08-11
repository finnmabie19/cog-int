/**
 * Seeds the three demo users and a few notes.
 * Run with: npm run db:seed
 *
 * Uses the writable connection directly — seed/migration scripts are
 * infrastructure, not application code, so they don't go through withAudit.
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";

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
        roles: ["ops"],
      },
      {
        email: "viewer@example.com",
        name: "Vera Viewer",
        roles: ["viewer"],
      },
    ])
    .onConflictDoNothing();

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

  console.log("Seeded 3 users (admin@, ops@, viewer@example.com) and notes.");
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
