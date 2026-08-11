CREATE TABLE "kyc_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"date_of_birth" text NOT NULL,
	"country" text NOT NULL,
	"document_type" text NOT NULL,
	"document_number" text NOT NULL,
	"risk_signals" text[] DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_by" text,
	"claimed_by_name" text,
	"decided_by" text,
	"decided_at" timestamp with time zone
);
