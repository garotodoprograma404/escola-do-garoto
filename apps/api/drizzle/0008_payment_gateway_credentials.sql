CREATE TABLE "payment_gateway_credentials" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payment_gateway_credentials_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"provider" text NOT NULL,
	"access_token_sealed" text NOT NULL,
	"webhook_secret_sealed" text,
	"token_hint" text NOT NULL,
	"live" boolean NOT NULL,
	"account_label" text,
	"verified_at" timestamp with time zone,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_gateway_credentials_provider_unique" UNIQUE("provider")
);
--> statement-breakpoint
ALTER TABLE "payment_gateway_credentials" ADD CONSTRAINT "payment_gateway_credentials_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;