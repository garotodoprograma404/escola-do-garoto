CREATE TABLE "mail_settings" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mail_settings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"provider" text NOT NULL,
	"host" text NOT NULL,
	"port" integer NOT NULL,
	"secure" boolean NOT NULL,
	"smtp_user" text,
	"password_sealed" text,
	"from_name" text NOT NULL,
	"from_email" text NOT NULL,
	"verified_at" timestamp with time zone,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_settings_provider_key" UNIQUE("provider"),
	CONSTRAINT "mail_settings_port_check" CHECK (port between 1 and 65535)
);
--> statement-breakpoint
ALTER TABLE "mail_settings" ADD CONSTRAINT "mail_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_mail_settings_updated_by" ON "mail_settings" USING btree ("updated_by");