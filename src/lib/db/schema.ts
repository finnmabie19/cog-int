import {
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
