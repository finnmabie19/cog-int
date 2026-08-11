import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// --- Platform tables -------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  roles: text("roles").array().notNull().default([]),
});

// Append-only. A database trigger (see db/migrations/0001_audit_append_only.sql)
// rejects UPDATE and DELETE on this table, so history cannot be rewritten even
// with the writable connection.
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  timestamp: timestamp("timestamp", { withTimezone: true })
    .notNull()
    .defaultNow(),
  actorId: text("actor_id").notNull(),
  actorEmail: text("actor_email").notNull(),
  tool: text("tool").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  reason: text("reason").notNull(),
});

// --- Tool tables -------------------------------------------------------------
// Each tool adds its tables below (or in its own file re-exported here).

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: text("updated_by"),
});

export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  description: text("description").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  /** 0–100. Percentage of traffic the flag is rolled out to when enabled. */
  rolloutPercentage: integer("rollout_percentage").notNull().default(0),
  lastChangedBy: text("last_changed_by"),
  lastChangedByName: text("last_changed_by_name"),
  lastChangedAt: timestamp("last_changed_at", { withTimezone: true }),
});

export const kycCases = pgTable("kyc_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  country: text("country").notNull(),
  documentType: text("document_type").notNull(),
  documentNumber: text("document_number").notNull(),
  riskSignals: text("risk_signals").array().notNull().default([]),
  /** "pending" | "approved" | "rejected" */
  status: text("status").notNull().default("pending"),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  claimedBy: text("claimed_by"),
  claimedByName: text("claimed_by_name"),
  decidedBy: text("decided_by"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
});
