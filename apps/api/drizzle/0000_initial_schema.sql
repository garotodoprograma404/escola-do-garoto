CREATE TYPE "public"."affiliate_application_status" AS ENUM('pending', 'under_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."affiliate_attribution_model" AS ENUM('last_click');--> statement-breakpoint
CREATE TYPE "public"."affiliate_partnership_status" AS ENUM('pending', 'approved', 'rejected', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'approve', 'reject', 'activate', 'deactivate', 'login', 'logout');--> statement-breakpoint
CREATE TYPE "public"."audit_decision" AS ENUM('approved', 'rejected', 'changes_requested');--> statement-breakpoint
CREATE TYPE "public"."banner_device" AS ENUM('desktop', 'mobile', 'both');--> statement-breakpoint
CREATE TYPE "public"."blog_post_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."certificate_event_type" AS ENUM('issued_automatic', 'issued_manual', 'issue_failed', 'reissued_same_code', 'reissued_new_code', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."certificate_issue_mode" AS ENUM('automatic', 'manual', 'reissue');--> statement-breakpoint
CREATE TYPE "public"."certificate_status" AS ENUM('active', 'revoked', 'replaced', 'issue_failed');--> statement-breakpoint
CREATE TYPE "public"."certificate_template_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."coupon_type" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."course_level" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."course_status" AS ENUM('draft', 'pending_review', 'approved', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('active', 'completed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."lesson_type" AS ENUM('video', 'text', 'quiz', 'file');--> statement-breakpoint
CREATE TYPE "public"."producer_application_status" AS ENUM('pending', 'under_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('multiple_choice', 'multiple_answer', 'true_false');--> statement-breakpoint
CREATE TYPE "public"."showcase_type" AS ENUM('dynamic', 'manual');--> statement-breakpoint
CREATE TYPE "public"."ticket_category" AS ENUM('technical', 'billing', 'course_content', 'account', 'other');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'waiting_customer', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('sale', 'commission', 'refund', 'withdrawal', 'affiliate_commission');--> statement-breakpoint
CREATE TYPE "public"."user_role_type" AS ENUM('admin', 'producer', 'student', 'affiliate');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_method" AS ENUM('bank_transfer', 'pix');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_status" AS ENUM('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"account_exists_notice_at" timestamp with time zone,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_email_lowercase" CHECK ("users"."email" = lower("users"."email"))
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"pending_name" text NOT NULL,
	"pending_password_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"changes" jsonb,
	"metadata" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"link" varchar(500),
	"read" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "platform_settings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_settings_key_key" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"cpf" text,
	"phone" text,
	"avatar_url" text,
	"bio" text,
	"birth_date" date,
	"address" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notification_preferences" jsonb DEFAULT '{"email_promotions":false,"push_new_content":true,"email_new_content":true,"push_course_updates":true,"email_course_updates":true,"email_weekly_summary":true}'::jsonb,
	"display_name" text,
	"slug" text,
	"expertise_areas" text[],
	"cover_url" text,
	"social_links" jsonb,
	"commission_rate" numeric(5, 2) DEFAULT 10,
	"total_students" integer DEFAULT 0,
	"total_courses" integer DEFAULT 0,
	"total_revenue" numeric(10, 2) DEFAULT 0,
	"average_rating" numeric(3, 2),
	"is_verified" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"public_profile_enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "profiles_cpf_key" UNIQUE("cpf"),
	CONSTRAINT "profiles_average_rating_check" CHECK ((average_rating IS NULL) OR ((average_rating >= (0)::numeric) AND (average_rating <= (5)::numeric))),
	CONSTRAINT "profiles_commission_rate_check" CHECK ((commission_rate IS NULL) OR ((commission_rate >= (0)::numeric) AND (commission_rate <= (100)::numeric)))
);
--> statement-breakpoint
CREATE TABLE "search_history" (
	"id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "search_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"query" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"badge_type" varchar(50) NOT NULL,
	"badge_name" varchar(100) NOT NULL,
	"badge_description" text,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_gamification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"last_activity_date" date,
	"total_watch_time_minutes" integer DEFAULT 0 NOT NULL,
	"courses_completed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_gamification_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_roles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"role" "user_role_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by" uuid,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_role_key" UNIQUE("user_id","role")
);
--> statement-breakpoint
CREATE TABLE "academy_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"content_type" text NOT NULL,
	"category" text NOT NULL,
	"video_url" text,
	"article_content" text,
	"thumbnail_url" text,
	"duration_minutes" integer,
	"difficulty" text DEFAULT 'beginner' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academy_content_category_check" CHECK (category = ANY (ARRAY['getting_started'::text, 'course_creation'::text, 'marketing'::text, 'sales'::text, 'analytics'::text, 'best_practices'::text])),
	CONSTRAINT "academy_content_content_type_check" CHECK (content_type = ANY (ARRAY['video'::text, 'article'::text, 'quiz'::text, 'resource'::text])),
	CONSTRAINT "academy_content_difficulty_check" CHECK (difficulty = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text]))
);
--> statement-breakpoint
CREATE TABLE "academy_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"progress_percentage" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academy_progress_user_id_content_id_key" UNIQUE("user_id","content_id"),
	CONSTRAINT "academy_progress_progress_percentage_check" CHECK ((progress_percentage >= 0) AND (progress_percentage <= 100))
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"parent_id" bigint,
	"icon" text,
	"color" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_featured" boolean DEFAULT false,
	"cover_image_url" text,
	"meta_title" text,
	"meta_description" text,
	CONSTRAINT "categories_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "course_audits" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "course_audits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"course_id" bigint NOT NULL,
	"auditor_id" uuid NOT NULL,
	"decision" "audit_decision" NOT NULL,
	"feedback" text,
	"changes_requested" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_lessons" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "course_lessons_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"module_id" bigint NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "lesson_type" DEFAULT 'video' NOT NULL,
	"content_url" text,
	"content_text" text,
	"duration_minutes" integer,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_free_preview" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_modules" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "course_modules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"course_id" bigint NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" bigint NOT NULL,
	"lesson_id" bigint,
	"user_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text,
	"answered_by" uuid,
	"answered_at" timestamp with time zone,
	"is_public" boolean DEFAULT true,
	"upvotes" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" bigint NOT NULL,
	"user_id" uuid NOT NULL,
	"enrollment_id" bigint NOT NULL,
	"rating" integer NOT NULL,
	"title" varchar(200),
	"review" text,
	"response" text,
	"responded_by" uuid,
	"responded_at" timestamp with time zone,
	"is_verified_purchase" boolean DEFAULT true,
	"is_featured" boolean DEFAULT false,
	"helpful_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "course_reviews_enrollment_id_key" UNIQUE("enrollment_id"),
	CONSTRAINT "course_reviews_rating_check" CHECK ((rating >= 1) AND (rating <= 5))
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "courses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"producer_id" uuid NOT NULL,
	"category_id" bigint NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"short_description" text,
	"thumbnail_url" text,
	"trailer_url" text,
	"level" "course_level" DEFAULT 'beginner' NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"discount_price" numeric(10, 2),
	"status" "course_status" DEFAULT 'draft' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"total_duration_minutes" integer DEFAULT 0 NOT NULL,
	"total_lessons" integer DEFAULT 0 NOT NULL,
	"total_students" integer DEFAULT 0 NOT NULL,
	"average_rating" numeric(3, 2),
	"total_reviews" integer DEFAULT 0 NOT NULL,
	"requirements" text[],
	"what_you_will_learn" text[],
	"target_audience" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_featured" boolean DEFAULT false,
	"price_locked_by_admin" boolean DEFAULT false,
	"coupons_enabled" boolean DEFAULT true,
	"admin_notes" text,
	"cover_image_url" text,
	"has_lifetime_access" boolean DEFAULT true NOT NULL,
	"has_certificate" boolean DEFAULT true NOT NULL,
	CONSTRAINT "courses_slug_key" UNIQUE("slug"),
	CONSTRAINT "courses_average_rating_check" CHECK ((average_rating IS NULL) OR ((average_rating >= (0)::numeric) AND (average_rating <= (5)::numeric))),
	CONSTRAINT "courses_check" CHECK ((discount_price IS NULL) OR (discount_price < price)),
	CONSTRAINT "courses_discount_price_check" CHECK ((discount_price IS NULL) OR (discount_price >= (0)::numeric)),
	CONSTRAINT "courses_price_check" CHECK (price >= (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "enrollments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"student_id" uuid NOT NULL,
	"course_id" bigint NOT NULL,
	"status" "enrollment_status" DEFAULT 'active' NOT NULL,
	"progress_percentage" integer DEFAULT 0 NOT NULL,
	"completed_lessons" integer DEFAULT 0 NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"certificate_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_student_id_course_id_key" UNIQUE("student_id","course_id"),
	CONSTRAINT "enrollments_progress_percentage_check" CHECK ((progress_percentage >= 0) AND (progress_percentage <= 100))
);
--> statement-breakpoint
CREATE TABLE "lesson_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_id" bigint NOT NULL,
	"course_id" bigint NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"video_timestamp" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_id" bigint NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"watch_time_seconds" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_user_id_lesson_id_key" UNIQUE("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" bigint NOT NULL,
	"course_id" bigint NOT NULL,
	"student_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"score_percentage" integer NOT NULL,
	"scored_points" integer DEFAULT 0 NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"feedback" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"finalized_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_attempts_student_lesson_attempt_unique" UNIQUE("lesson_id","student_id","attempt_number"),
	CONSTRAINT "quiz_attempts_attempt_number_check" CHECK (attempt_number > 0),
	CONSTRAINT "quiz_attempts_score_percentage_check" CHECK ((score_percentage >= 0) AND (score_percentage <= 100)),
	CONSTRAINT "quiz_attempts_scored_points_check" CHECK (scored_points >= 0),
	CONSTRAINT "quiz_attempts_total_points_check" CHECK (total_points >= 0)
);
--> statement-breakpoint
CREATE TABLE "quiz_options" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "quiz_options_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"question_id" bigint NOT NULL,
	"option_text" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "quiz_questions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"lesson_id" bigint NOT NULL,
	"type" "question_type" DEFAULT 'multiple_choice' NOT NULL,
	"question_text" text NOT NULL,
	"explanation" text,
	"points" integer DEFAULT 1 NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"question_image_url" text,
	"question_image_alt" text,
	CONSTRAINT "quiz_questions_points_check" CHECK (points > 0),
	CONSTRAINT "quiz_questions_question_image_url_scheme_check" CHECK ((question_image_url IS NULL) OR (question_image_url ~* '^https://'::text)),
	CONSTRAINT "quiz_questions_question_image_alt_length_check" CHECK ((question_image_alt IS NULL) OR (char_length(question_image_alt) <= 180))
);
--> statement-breakpoint
CREATE TABLE "quiz_settings" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "quiz_settings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"lesson_id" bigint NOT NULL,
	"passing_score" integer DEFAULT 70 NOT NULL,
	"time_limit_minutes" integer,
	"allow_retake" boolean DEFAULT true NOT NULL,
	"show_answers_after" boolean DEFAULT true NOT NULL,
	"shuffle_questions" boolean DEFAULT false NOT NULL,
	"shuffle_options" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_settings_lesson_id_key" UNIQUE("lesson_id"),
	CONSTRAINT "quiz_settings_passing_score_check" CHECK ((passing_score >= 0) AND (passing_score <= 100)),
	CONSTRAINT "quiz_settings_time_limit_minutes_check" CHECK ((time_limit_minutes IS NULL) OR (time_limit_minutes > 0))
);
--> statement-breakpoint
CREATE TABLE "checkout_order_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "checkout_order_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_id" bigint NOT NULL,
	"course_id" bigint NOT NULL,
	"course_title" text NOT NULL,
	"producer_id" uuid NOT NULL,
	"listed_price" numeric(10, 2) NOT NULL,
	"final_price" numeric(10, 2) NOT NULL,
	"platform_commission_rate" numeric(5, 2) DEFAULT 10 NOT NULL,
	"platform_amount" numeric(10, 2) DEFAULT 0 NOT NULL,
	"producer_amount" numeric(10, 2) DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	CONSTRAINT "checkout_order_items_order_course_key" UNIQUE("order_id","course_id"),
	CONSTRAINT "checkout_order_items_final_price_check" CHECK (final_price >= (0)::numeric),
	CONSTRAINT "checkout_order_items_listed_price_check" CHECK (listed_price >= (0)::numeric),
	CONSTRAINT "checkout_order_items_platform_amount_check" CHECK (platform_amount >= (0)::numeric),
	CONSTRAINT "checkout_order_items_platform_commission_rate_check" CHECK ((platform_commission_rate >= (0)::numeric) AND (platform_commission_rate <= (100)::numeric)),
	CONSTRAINT "checkout_order_items_producer_amount_check" CHECK (producer_amount >= (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "checkout_orders" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "checkout_orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"provider" text DEFAULT 'mercadopago' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider_status" text,
	"external_reference" text NOT NULL,
	"preference_id" text,
	"payment_id" text,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"subtotal_amount" numeric(10, 2) NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT 0 NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"coupon_id" bigint,
	"coupon_code" text,
	"coupon_eligible_course_ids" bigint[],
	"buyer_full_name" text NOT NULL,
	"buyer_email" text NOT NULL,
	"buyer_phone" text,
	"buyer_cpf" text,
	"requested_payment_method" text,
	"checkout_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"paid_at" timestamp with time zone,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	CONSTRAINT "checkout_orders_public_id_key" UNIQUE("public_id"),
	CONSTRAINT "checkout_orders_external_reference_key" UNIQUE("external_reference"),
	CONSTRAINT "checkout_orders_preference_id_key" UNIQUE("preference_id"),
	CONSTRAINT "checkout_orders_discount_amount_check" CHECK (discount_amount >= (0)::numeric),
	CONSTRAINT "checkout_orders_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'in_process'::text, 'rejected'::text, 'cancelled'::text, 'refunded'::text, 'free_completed'::text, 'failed'::text])),
	CONSTRAINT "checkout_orders_subtotal_amount_check" CHECK (subtotal_amount >= (0)::numeric),
	CONSTRAINT "checkout_orders_total_amount_check" CHECK (total_amount >= (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "coupon_usage" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "coupon_usage_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"coupon_id" bigint NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" bigint,
	"enrollment_id" bigint,
	"original_amount" numeric(10, 2) NOT NULL,
	"discount_amount" numeric(10, 2) NOT NULL,
	"final_amount" numeric(10, 2) NOT NULL,
	"used_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_usage_check" CHECK (original_amount >= final_amount),
	CONSTRAINT "coupon_usage_discount_amount_check" CHECK (discount_amount >= (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "coupons_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" "coupon_type" NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"min_purchase_amount" numeric(10, 2),
	"max_discount_amount" numeric(10, 2),
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"applicable_course_ids" bigint[],
	"applicable_category_ids" bigint[],
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_key" UNIQUE("code"),
	CONSTRAINT "coupons_check" CHECK ((type = 'fixed'::coupon_type) OR ((type = 'percentage'::coupon_type) AND (value <= (100)::numeric))),
	CONSTRAINT "coupons_usage_count_check" CHECK (usage_count >= 0),
	CONSTRAINT "coupons_usage_limit_check" CHECK ((usage_limit IS NULL) OR (usage_limit > 0)),
	CONSTRAINT "coupons_value_check" CHECK (value > (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"transaction_id" bigint NOT NULL,
	"invoice_number" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT 0 NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'paid' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"pdf_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_key" UNIQUE("invoice_number"),
	CONSTRAINT "invoices_status_check" CHECK (status = ANY (ARRAY['paid'::text, 'pending'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payment_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"provider" text DEFAULT 'mercadopago' NOT NULL,
	"event_key" text NOT NULL,
	"event_type" text NOT NULL,
	"resource_id" text,
	"action" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"order_id" bigint,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	CONSTRAINT "payment_events_provider_event_key_key" UNIQUE("provider","event_key")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"course_id" bigint,
	"enrollment_id" bigint,
	"withdrawal_id" bigint,
	"payment_method" text,
	"payment_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "withdrawals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"method" "withdrawal_method" DEFAULT 'pix' NOT NULL,
	"status" "withdrawal_status" DEFAULT 'pending' NOT NULL,
	"bank_data" jsonb NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"processed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"transaction_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_scope" text DEFAULT 'producer' NOT NULL,
	CONSTRAINT "withdrawals_amount_check" CHECK (amount > (0)::numeric),
	CONSTRAINT "withdrawals_account_scope_check" CHECK (account_scope = ANY (ARRAY['producer'::text, 'affiliate'::text]))
);
--> statement-breakpoint
CREATE TABLE "affiliate_applications" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "affiliate_applications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"instagram_handle" text,
	"youtube_channel" text,
	"website_url" text,
	"audience_size" text,
	"audience_summary" text NOT NULL,
	"promotion_channels" text[] DEFAULT '{""}' NOT NULL,
	"experience_summary" text NOT NULL,
	"why_affiliate" text NOT NULL,
	"status" "affiliate_application_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_applications_user_id_key" UNIQUE("user_id"),
	CONSTRAINT "affiliate_applications_full_name_check" CHECK (length(btrim(full_name)) >= 3),
	CONSTRAINT "affiliate_applications_email_check" CHECK (length(btrim(email)) >= 5),
	CONSTRAINT "affiliate_applications_phone_check" CHECK (length(btrim(phone)) >= 10),
	CONSTRAINT "affiliate_applications_audience_summary_check" CHECK (length(btrim(audience_summary)) >= 30),
	CONSTRAINT "affiliate_applications_experience_summary_check" CHECK (length(btrim(experience_summary)) >= 30),
	CONSTRAINT "affiliate_applications_why_affiliate_check" CHECK (length(btrim(why_affiliate)) >= 30),
	CONSTRAINT "affiliate_applications_reviewed_at_check" CHECK ((status = ANY (ARRAY['pending'::affiliate_application_status, 'under_review'::affiliate_application_status])) OR (reviewed_at IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "affiliate_attributions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "affiliate_attributions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"affiliate_id" uuid NOT NULL,
	"affiliate_link_id" bigint NOT NULL,
	"course_id" bigint NOT NULL,
	"session_key" text NOT NULL,
	"visitor_key" text,
	"attribution_model" "affiliate_attribution_model" DEFAULT 'last_click' NOT NULL,
	"attributed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_attributions_session_key_check" CHECK (length(btrim(session_key)) > 0),
	CONSTRAINT "affiliate_attributions_expires_at_check" CHECK (expires_at > attributed_at)
);
--> statement-breakpoint
CREATE TABLE "affiliate_course_partnerships" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "affiliate_course_partnerships_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"affiliate_id" uuid NOT NULL,
	"course_id" bigint NOT NULL,
	"status" "affiliate_partnership_status" DEFAULT 'pending' NOT NULL,
	"commission_rate" numeric(5, 2) NOT NULL,
	"cookie_window_days" integer DEFAULT 30 NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"rejection_reason" text,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_course_partnerships_affiliate_course_key" UNIQUE("affiliate_id","course_id"),
	CONSTRAINT "affiliate_course_partnerships_commission_rate_check" CHECK ((commission_rate > (0)::numeric) AND (commission_rate <= (100)::numeric)),
	CONSTRAINT "affiliate_course_partnerships_cookie_window_days_check" CHECK ((cookie_window_days >= 1) AND (cookie_window_days <= 90)),
	CONSTRAINT "affiliate_course_partnerships_approved_at_check" CHECK ((status <> 'approved'::affiliate_partnership_status) OR (approved_at IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "affiliate_links" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "affiliate_links_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"partnership_id" bigint NOT NULL,
	"code" text NOT NULL,
	"slug" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_links_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "certificate_events" (
	"id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "certificate_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"certificate_id" bigint,
	"enrollment_id" bigint NOT NULL,
	"event_type" "certificate_event_type" NOT NULL,
	"actor_user_id" uuid,
	"previous_status" "certificate_status",
	"new_status" "certificate_status",
	"reason" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"event_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificate_template_versions" (
	"id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "certificate_template_versions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"template_id" bigint NOT NULL,
	"version_number" integer NOT NULL,
	"schema_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"html_snapshot" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	CONSTRAINT "certificate_template_versions_id_template_key" UNIQUE("id","template_id"),
	CONSTRAINT "certificate_template_versions_template_version_key" UNIQUE("template_id","version_number"),
	CONSTRAINT "certificate_template_versions_version_number_check" CHECK (version_number > 0)
);
--> statement-breakpoint
CREATE TABLE "certificate_templates" (
	"id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "certificate_templates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"description" text,
	"status" "certificate_template_status" DEFAULT 'draft' NOT NULL,
	"orientation" text DEFAULT 'landscape' NOT NULL,
	"page_size" text DEFAULT 'A4' NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	CONSTRAINT "certificate_templates_orientation_check" CHECK (orientation = ANY (ARRAY['landscape'::text, 'portrait'::text]))
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "certificates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"enrollment_id" bigint NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" bigint NOT NULL,
	"template_id" bigint NOT NULL,
	"template_version_id" bigint NOT NULL,
	"status" "certificate_status" DEFAULT 'active' NOT NULL,
	"issue_mode" "certificate_issue_mode" DEFAULT 'automatic' NOT NULL,
	"issued_by" uuid,
	"issued_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text,
	"replaced_from_id" bigint,
	"file_path" text,
	"file_mime_type" text DEFAULT 'application/pdf' NOT NULL,
	"file_size_bytes" bigint,
	"integrity_hash" text NOT NULL,
	"payload_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	CONSTRAINT "certificates_code_key" UNIQUE("code"),
	CONSTRAINT "certificates_code_format_check" CHECK (code ~ '^VXEAD-[0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$'::text),
	CONSTRAINT "certificates_failure_reason_check" CHECK (((status = 'issue_failed'::certificate_status) AND (COALESCE(NULLIF(TRIM(BOTH FROM failure_reason), ''::text), ''::text) <> ''::text)) OR (status <> 'issue_failed'::certificate_status)),
	CONSTRAINT "certificates_file_size_bytes_check" CHECK ((file_size_bytes IS NULL) OR (file_size_bytes >= 0)),
	CONSTRAINT "certificates_revocation_fields_check" CHECK (((status = 'revoked'::certificate_status) AND (revoked_at IS NOT NULL) AND (COALESCE(NULLIF(TRIM(BOTH FROM revoked_reason), ''::text), ''::text) <> ''::text)) OR (status <> 'revoked'::certificate_status))
);
--> statement-breakpoint
CREATE TABLE "course_certificate_templates" (
	"id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "course_certificate_templates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"course_id" bigint NOT NULL,
	"template_id" bigint NOT NULL,
	"template_version_id" bigint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"activated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"deactivated_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "banners_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"subtitle" text,
	"image_url" text NOT NULL,
	"mobile_image_url" text,
	"link_url" text,
	"link_text" text,
	"device" "banner_device" DEFAULT 'both' NOT NULL,
	"background_color" text,
	"text_color" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"total_clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"position" text DEFAULT 'hero',
	"total_views" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "banners_position_check" CHECK ("position" = ANY (ARRAY['hero'::text, 'mid-page'::text, 'popup'::text]))
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "blog_posts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"featured_image_url" text,
	"category" text,
	"tags" text[],
	"status" "blog_post_status" DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"seo_title" text,
	"seo_description" text,
	"seo_keywords" text[],
	"total_views" integer DEFAULT 0 NOT NULL,
	"total_likes" integer DEFAULT 0 NOT NULL,
	"total_comments" integer DEFAULT 0 NOT NULL,
	"reading_time_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "post_likes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"post_id" bigint NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unique_like_per_user" UNIQUE("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "post_views" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"post_id" bigint NOT NULL,
	"user_id" uuid,
	"session_id" text NOT NULL,
	"ip_address" "inet",
	"user_agent" text,
	"referrer" text,
	"viewed_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unique_view_per_session" UNIQUE("post_id","session_id")
);
--> statement-breakpoint
CREATE TABLE "producer_applications" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "producer_applications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"cpf" text NOT NULL,
	"expertise_area" text NOT NULL,
	"experience_years" integer NOT NULL,
	"bio" text NOT NULL,
	"portfolio_url" text,
	"social_links" jsonb,
	"why_produce" text NOT NULL,
	"status" "producer_application_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "producer_applications_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "producer_leads" (
	"id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "producer_leads_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"has_online_experience" boolean NOT NULL,
	"has_recorded_content" boolean NOT NULL,
	"topic" text,
	"notes" text,
	"status" text DEFAULT 'new' NOT NULL,
	"source" text DEFAULT 'become_producer_page' NOT NULL,
	"handled_by" uuid,
	"contacted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"email" text NOT NULL,
	"city" text NOT NULL,
	"admin_notes" text,
	CONSTRAINT "producer_leads_status_check" CHECK (status = ANY (ARRAY['new'::text, 'contacted'::text, 'qualified'::text, 'archived'::text]))
);
--> statement-breakpoint
CREATE TABLE "showcases" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "showcases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"description" text,
	"type" "showcase_type" DEFAULT 'manual' NOT NULL,
	"dynamic_filter" jsonb,
	"course_ids" bigint[],
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "chat_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"ticket_id" bigint NOT NULL,
	"sender_id" uuid NOT NULL,
	"message" text NOT NULL,
	"is_staff" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "support_tickets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"category" "ticket_category" NOT NULL,
	"priority" "ticket_priority" DEFAULT 'medium' NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"assigned_to" uuid,
	"course_id" bigint,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ticket_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"ticket_id" bigint NOT NULL,
	"user_id" uuid NOT NULL,
	"message" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"attachments" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "typing_indicators" (
	"id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "typing_indicators_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"ticket_id" bigint NOT NULL,
	"user_id" uuid NOT NULL,
	"is_typing" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "typing_indicators_ticket_id_user_id_key" UNIQUE("ticket_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_gamification" ADD CONSTRAINT "user_gamification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_progress" ADD CONSTRAINT "academy_progress_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."academy_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_progress" ADD CONSTRAINT "academy_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_audits" ADD CONSTRAINT "course_audits_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_audits" ADD CONSTRAINT "course_audits_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_lessons" ADD CONSTRAINT "course_lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_questions" ADD CONSTRAINT "course_questions_answered_by_fkey" FOREIGN KEY ("answered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_questions" ADD CONSTRAINT "course_questions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_questions" ADD CONSTRAINT "course_questions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_questions" ADD CONSTRAINT "course_questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_responded_by_fkey" FOREIGN KEY ("responded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_notes" ADD CONSTRAINT "lesson_notes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_notes" ADD CONSTRAINT "lesson_notes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_notes" ADD CONSTRAINT "lesson_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_options" ADD CONSTRAINT "quiz_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_settings" ADD CONSTRAINT "quiz_settings_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_order_items" ADD CONSTRAINT "checkout_order_items_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_order_items" ADD CONSTRAINT "checkout_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."checkout_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_order_items" ADD CONSTRAINT "checkout_order_items_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_orders" ADD CONSTRAINT "checkout_orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_orders" ADD CONSTRAINT "checkout_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."checkout_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_withdrawal_id_fkey" FOREIGN KEY ("withdrawal_id") REFERENCES "public"."withdrawals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_applications" ADD CONSTRAINT "affiliate_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_applications" ADD CONSTRAINT "affiliate_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_attributions" ADD CONSTRAINT "affiliate_attributions_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_attributions" ADD CONSTRAINT "affiliate_attributions_affiliate_link_id_fkey" FOREIGN KEY ("affiliate_link_id") REFERENCES "public"."affiliate_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_attributions" ADD CONSTRAINT "affiliate_attributions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_course_partnerships" ADD CONSTRAINT "affiliate_course_partnerships_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_course_partnerships" ADD CONSTRAINT "affiliate_course_partnerships_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_course_partnerships" ADD CONSTRAINT "affiliate_course_partnerships_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_course_partnerships" ADD CONSTRAINT "affiliate_course_partnerships_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "public"."affiliate_course_partnerships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_events" ADD CONSTRAINT "certificate_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_events" ADD CONSTRAINT "certificate_events_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "public"."certificates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_events" ADD CONSTRAINT "certificate_events_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_template_versions" ADD CONSTRAINT "certificate_template_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_template_versions" ADD CONSTRAINT "certificate_template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."certificate_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_templates" ADD CONSTRAINT "certificate_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_templates" ADD CONSTRAINT "certificate_templates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_replaced_from_id_fkey" FOREIGN KEY ("replaced_from_id") REFERENCES "public"."certificates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."certificate_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "public"."certificate_template_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_certificate_templates" ADD CONSTRAINT "course_certificate_templates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_certificate_templates" ADD CONSTRAINT "course_certificate_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_certificate_templates" ADD CONSTRAINT "course_certificate_templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."certificate_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_certificate_templates" ADD CONSTRAINT "course_certificate_templates_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "public"."certificate_template_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_certificate_templates" ADD CONSTRAINT "course_certificate_templates_version_matches_template_fkey" FOREIGN KEY ("template_id","template_version_id") REFERENCES "public"."certificate_template_versions"("id","template_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_applications" ADD CONSTRAINT "producer_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_applications" ADD CONSTRAINT "producer_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_leads" ADD CONSTRAINT "producer_leads_handled_by_fkey" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typing_indicators" ADD CONSTRAINT "typing_indicators_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typing_indicators" ADD CONSTRAINT "typing_indicators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_index" ON "email_verification_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "email_verification_tokens_user_id_index" ON "email_verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_index" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_index" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_index" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_id_index" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_index" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "admin_audit_log_user_id_idx" ON "admin_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_created_at" ON "notifications" USING btree ("created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_platform_settings_updated_by" ON "platform_settings" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "profiles_full_name_idx" ON "profiles" USING gin (to_tsvector('portuguese'::regconfig, full_name));--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_slug_unique" ON "profiles" USING btree ("slug") WHERE (slug IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_search_history_created_at" ON "search_history" USING btree ("created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_search_history_user_id" ON "search_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_badges_user_id" ON "user_badges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_granted_by" ON "user_roles" USING btree ("granted_by");--> statement-breakpoint
CREATE INDEX "idx_user_roles_revoked_by" ON "user_roles" USING btree ("revoked_by");--> statement-breakpoint
CREATE INDEX "user_roles_user_id_idx" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_academy_content_category" ON "academy_content" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_academy_content_order" ON "academy_content" USING btree ("order_index");--> statement-breakpoint
CREATE INDEX "idx_academy_content_published" ON "academy_content" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "idx_academy_progress_completed" ON "academy_progress" USING btree ("completed");--> statement-breakpoint
CREATE INDEX "idx_academy_progress_content" ON "academy_progress" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "categories_is_active_idx" ON "categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "course_audits_course_id_idx" ON "course_audits" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_course_audits_auditor_id" ON "course_audits" USING btree ("auditor_id");--> statement-breakpoint
CREATE INDEX "course_lessons_module_id_idx" ON "course_lessons" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "course_modules_course_id_idx" ON "course_modules" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_course_questions_answered_by" ON "course_questions" USING btree ("answered_by");--> statement-breakpoint
CREATE INDEX "idx_course_questions_course_id" ON "course_questions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_course_questions_course_lesson_created" ON "course_questions" USING btree ("course_id","lesson_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_course_questions_created_at" ON "course_questions" USING btree ("created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_course_questions_lesson_id" ON "course_questions" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "idx_course_questions_user_id" ON "course_questions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_course_reviews_course_id" ON "course_reviews" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_course_reviews_created_at" ON "course_reviews" USING btree ("created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_course_reviews_is_featured" ON "course_reviews" USING btree ("is_featured") WHERE (is_featured = true);--> statement-breakpoint
CREATE INDEX "idx_course_reviews_rating" ON "course_reviews" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "idx_course_reviews_responded_by" ON "course_reviews" USING btree ("responded_by");--> statement-breakpoint
CREATE INDEX "idx_course_reviews_user_id" ON "course_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "courses_category_id_idx" ON "courses" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "courses_is_published_idx" ON "courses" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "courses_producer_id_idx" ON "courses" USING btree ("producer_id");--> statement-breakpoint
CREATE INDEX "courses_status_idx" ON "courses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "enrollments_course_id_idx" ON "enrollments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "enrollments_status_idx" ON "enrollments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_lesson_notes_course_id" ON "lesson_notes" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_lesson_notes_created_at" ON "lesson_notes" USING btree ("created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_lesson_notes_lesson_id" ON "lesson_notes" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "idx_lesson_notes_user_id" ON "lesson_notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_lesson_notes_user_lesson_created" ON "lesson_notes" USING btree ("user_id","lesson_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_lesson_progress_completed" ON "lesson_progress" USING btree ("completed");--> statement-breakpoint
CREATE INDEX "idx_lesson_progress_lesson" ON "lesson_progress" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "idx_quiz_attempts_course_finalized" ON "quiz_attempts" USING btree ("course_id","finalized_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_quiz_attempts_lesson" ON "quiz_attempts" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "idx_quiz_attempts_student_lesson_finalized" ON "quiz_attempts" USING btree ("student_id","lesson_id","finalized_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_quiz_options_question_id" ON "quiz_options" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "idx_quiz_questions_lesson_id" ON "quiz_questions" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "checkout_order_items_course_id_idx" ON "checkout_order_items" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "checkout_orders_buyer_email_idx" ON "checkout_orders" USING btree ("buyer_email");--> statement-breakpoint
CREATE INDEX "checkout_orders_created_at_idx" ON "checkout_orders" USING btree ("created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "checkout_orders_payment_id_idx" ON "checkout_orders" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "checkout_orders_status_idx" ON "checkout_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "checkout_orders_user_id_idx" ON "checkout_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "coupon_usage_coupon_id_idx" ON "coupon_usage" USING btree ("coupon_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_usage_coupon_user_course_key" ON "coupon_usage" USING btree ("coupon_id","user_id","course_id") WHERE (course_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "coupon_usage_used_at_idx" ON "coupon_usage" USING btree ("used_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "coupon_usage_user_id_idx" ON "coupon_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_coupon_usage_course_id" ON "coupon_usage" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_coupon_usage_enrollment_id" ON "coupon_usage" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "coupons_is_active_idx" ON "coupons" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "coupons_valid_from_idx" ON "coupons" USING btree ("valid_from");--> statement-breakpoint
CREATE INDEX "coupons_valid_until_idx" ON "coupons" USING btree ("valid_until");--> statement-breakpoint
CREATE INDEX "idx_coupons_created_by" ON "coupons" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_invoices_transaction_id" ON "invoices" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "payment_events_order_id_idx" ON "payment_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_events_processed_idx" ON "payment_events" USING btree ("processed","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "payment_events_resource_id_idx" ON "payment_events" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_enrollment_id" ON "transactions" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_withdrawal_id" ON "transactions" USING btree ("withdrawal_id");--> statement-breakpoint
CREATE INDEX "transactions_course_id_idx" ON "transactions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "transactions_created_at_idx" ON "transactions" USING btree ("created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_sale_payment_course_user_key" ON "transactions" USING btree ("payment_id","course_id","user_id") WHERE ((payment_id IS NOT NULL) AND (type = 'sale'::transaction_type) AND (course_id IS NOT NULL));--> statement-breakpoint
CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transactions_type_idx" ON "transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "transactions_user_id_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_withdrawals_approved_by" ON "withdrawals" USING btree ("approved_by");--> statement-breakpoint
CREATE INDEX "withdrawals_requested_at_idx" ON "withdrawals" USING btree ("requested_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "withdrawals_status_idx" ON "withdrawals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "withdrawals_user_id_idx" ON "withdrawals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "withdrawals_user_scope_status_idx" ON "withdrawals" USING btree ("user_id","account_scope","status");--> statement-breakpoint
CREATE INDEX "affiliate_applications_created_at_idx" ON "affiliate_applications" USING btree ("created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "affiliate_applications_reviewed_by_idx" ON "affiliate_applications" USING btree ("reviewed_by") WHERE (reviewed_by IS NOT NULL);--> statement-breakpoint
CREATE INDEX "affiliate_applications_status_idx" ON "affiliate_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_affiliate_attributions_affiliate_course" ON "affiliate_attributions" USING btree ("affiliate_id","course_id","attributed_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_affiliate_attributions_course_id" ON "affiliate_attributions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_affiliate_attributions_link_id" ON "affiliate_attributions" USING btree ("affiliate_link_id");--> statement-breakpoint
CREATE INDEX "idx_affiliate_attributions_session_course_expiry" ON "affiliate_attributions" USING btree ("session_key","course_id","expires_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_affiliate_attributions_visitor_expiry" ON "affiliate_attributions" USING btree ("visitor_key","expires_at" DESC NULLS FIRST) WHERE (visitor_key IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_affiliate_course_partnerships_affiliate_status" ON "affiliate_course_partnerships" USING btree ("affiliate_id","status","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_affiliate_course_partnerships_approved_by" ON "affiliate_course_partnerships" USING btree ("approved_by") WHERE (approved_by IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_affiliate_course_partnerships_course_status" ON "affiliate_course_partnerships" USING btree ("course_id","status","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_affiliate_course_partnerships_reviewed_by" ON "affiliate_course_partnerships" USING btree ("reviewed_by") WHERE (reviewed_by IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_affiliate_links_partnership_active" ON "affiliate_links" USING btree ("partnership_id","is_active","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_affiliate_links_slug_unique" ON "affiliate_links" USING btree ("slug") WHERE (slug IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_certificate_events_actor_user_id" ON "certificate_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "idx_certificate_events_certificate_id_event_at" ON "certificate_events" USING btree ("certificate_id","event_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_certificate_events_enrollment_id_event_at" ON "certificate_events" USING btree ("enrollment_id","event_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_certificate_events_type_event_at" ON "certificate_events" USING btree ("event_type","event_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_certificate_template_versions_created_by" ON "certificate_template_versions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_certificate_template_versions_template_id_created_at" ON "certificate_template_versions" USING btree ("template_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_certificate_templates_created_by" ON "certificate_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_certificate_templates_status_updated_at" ON "certificate_templates" USING btree ("status","updated_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_certificate_templates_updated_by" ON "certificate_templates" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "idx_certificates_course_id_issued_at" ON "certificates" USING btree ("course_id","issued_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_certificates_issued_by" ON "certificates" USING btree ("issued_by");--> statement-breakpoint
CREATE INDEX "idx_certificates_replaced_from_id" ON "certificates" USING btree ("replaced_from_id");--> statement-breakpoint
CREATE INDEX "idx_certificates_status_issued_at" ON "certificates" USING btree ("status","issued_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_certificates_student_id_issued_at" ON "certificates" USING btree ("student_id","issued_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_certificates_template_id" ON "certificates" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_certificates_template_version_id" ON "certificates" USING btree ("template_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_certificates_enrollment_active" ON "certificates" USING btree ("enrollment_id") WHERE (status = 'active'::certificate_status);--> statement-breakpoint
CREATE INDEX "idx_course_certificate_templates_course_id" ON "course_certificate_templates" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_course_certificate_templates_created_by" ON "course_certificate_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_course_certificate_templates_template_id" ON "course_certificate_templates" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_course_certificate_templates_template_version_id" ON "course_certificate_templates" USING btree ("template_version_id");--> statement-breakpoint
CREATE INDEX "idx_course_certificate_templates_template_version_template" ON "course_certificate_templates" USING btree ("template_version_id","template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_course_certificate_templates_course_active" ON "course_certificate_templates" USING btree ("course_id") WHERE (is_active = true);--> statement-breakpoint
CREATE INDEX "banners_display_order_idx" ON "banners" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "banners_end_date_idx" ON "banners" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "banners_is_active_idx" ON "banners" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "banners_start_date_idx" ON "banners" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "blog_posts_author_id_idx" ON "blog_posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "blog_posts_category_idx" ON "blog_posts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "blog_posts_published_at_idx" ON "blog_posts" USING btree ("published_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "blog_posts_status_idx" ON "blog_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blog_posts_tags_idx" ON "blog_posts" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "idx_post_likes_created" ON "post_likes" USING btree ("created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_post_likes_user_id" ON "post_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_post_views_post_id" ON "post_views" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_post_views_user_id_fk" ON "post_views" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_producer_applications_reviewed_by" ON "producer_applications" USING btree ("reviewed_by");--> statement-breakpoint
CREATE INDEX "producer_applications_created_at_idx" ON "producer_applications" USING btree ("created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "producer_applications_status_idx" ON "producer_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_producer_leads_created_at" ON "producer_leads" USING btree ("created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_producer_leads_status_created_at" ON "producer_leads" USING btree ("status","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "showcases_display_order_idx" ON "showcases" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "showcases_is_active_idx" ON "showcases" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_chat_messages_created_at" ON "chat_messages" USING btree ("created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_chat_messages_ticket_id" ON "chat_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "idx_support_tickets_assigned_to" ON "support_tickets" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_support_tickets_course_id" ON "support_tickets" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_support_tickets_created_at" ON "support_tickets" USING btree ("created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_support_tickets_status" ON "support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_support_tickets_user_id" ON "support_tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_tickets_category_idx" ON "support_tickets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "support_tickets_priority_idx" ON "support_tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_ticket_messages_created_at" ON "ticket_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ticket_messages_ticket_id" ON "ticket_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_messages_user_id" ON "ticket_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_typing_indicators_ticket_id" ON "typing_indicators" USING btree ("ticket_id");