CREATE TABLE "xp_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "xp_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"course_id" bigint,
	"source" varchar(30) NOT NULL,
	"source_key" varchar(100) NOT NULL,
	"points" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "xp_events_points_positive" CHECK ("xp_events"."points" > 0)
);
--> statement-breakpoint
ALTER TABLE "user_gamification" ADD COLUMN "ranking_opt_out" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "xp_events_user_source_key" ON "xp_events" USING btree ("user_id","source","source_key");--> statement-breakpoint
CREATE INDEX "xp_events_course_created_idx" ON "xp_events" USING btree ("course_id","created_at");--> statement-breakpoint
CREATE INDEX "xp_events_user_created_idx" ON "xp_events" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_badge_type_key" UNIQUE("user_id","badge_type");