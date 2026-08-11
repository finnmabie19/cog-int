CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"description" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"rollout_percentage" integer DEFAULT 0 NOT NULL,
	"last_changed_by" text,
	"last_changed_by_name" text,
	"last_changed_at" timestamp with time zone,
	CONSTRAINT "feature_flags_key_unique" UNIQUE("key")
);
