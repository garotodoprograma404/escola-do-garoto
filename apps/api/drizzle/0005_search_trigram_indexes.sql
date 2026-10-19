CREATE INDEX "courses_title_trgm_idx" ON "courses" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "courses_description_trgm_idx" ON "courses" USING gin ("description" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "blog_posts_title_trgm_idx" ON "blog_posts" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "blog_posts_excerpt_trgm_idx" ON "blog_posts" USING gin ("excerpt" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "blog_posts_content_trgm_idx" ON "blog_posts" USING gin ("content" gin_trgm_ops);