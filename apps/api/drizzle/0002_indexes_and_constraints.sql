ALTER TABLE "quiz_questions" DROP CONSTRAINT "quiz_questions_question_image_url_scheme_check";--> statement-breakpoint
ALTER TABLE "course_certificate_templates" DROP CONSTRAINT "course_certificate_templates_version_matches_template_fkey";
--> statement-breakpoint
ALTER TABLE "course_certificate_templates" ADD CONSTRAINT "course_certificate_templates_version_matches_template_fkey" FOREIGN KEY ("template_version_id","template_id") REFERENCES "public"."certificate_template_versions"("id","template_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_notifications_user_created" ON "notifications" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_profiles_created_at" ON "profiles" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_search_history_user_created" ON "search_history" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_user_roles_active_role" ON "user_roles" USING btree ("role") WHERE (is_active = true AND revoked_at IS NULL);--> statement-breakpoint
CREATE INDEX "courses_status_created_at_idx" ON "courses" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "courses_public_created_idx" ON "courses" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE (status = 'approved' AND is_published = true);--> statement-breakpoint
CREATE INDEX "idx_support_tickets_updated_at" ON "support_tickets" USING btree ("updated_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_question_image_url_scheme_check" CHECK ((question_image_url IS NULL) OR (question_image_url ~* '^https://'::text) OR (question_image_url ~ '^/api/files/public/[A-Za-z0-9._/-]+$'::text));