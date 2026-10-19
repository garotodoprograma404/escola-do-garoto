import {
  bigint,
  bigserial,
  boolean,
  check,
  foreignKey,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { bannerDevice, blogPostStatus, producerApplicationStatus, showcaseType } from './enums.js'
import { users } from './users.js'

export const banners = pgTable(
  'banners',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'banners_id_seq' }),
    title: text().notNull(),
    subtitle: text(),
    imageUrl: text('image_url').notNull(),
    mobileImageUrl: text('mobile_image_url'),
    linkUrl: text('link_url'),
    linkText: text('link_text'),
    device: bannerDevice().default('both').notNull(),
    backgroundColor: text('background_color'),
    textColor: text('text_color'),
    displayOrder: integer('display_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    totalClicks: integer('total_clicks').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    position: text().default('hero'),
    totalViews: integer('total_views').default(0).notNull(),
  },
  (table) => [
    index('banners_display_order_idx').using('btree', table.displayOrder.asc().nullsLast()),
    index('banners_end_date_idx').using('btree', table.endDate.asc().nullsLast()),
    index('banners_is_active_idx').using('btree', table.isActive.asc().nullsLast()),
    index('banners_start_date_idx').using('btree', table.startDate.asc().nullsLast()),
    check(
      'banners_position_check',
      sql`"position" = ANY (ARRAY['hero'::text, 'mid-page'::text, 'popup'::text])`,
    ),
  ],
)

export const showcases = pgTable(
  'showcases',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'showcases_id_seq' }),
    title: text().notNull(),
    description: text(),
    type: showcaseType().default('manual').notNull(),
    dynamicFilter: jsonb('dynamic_filter'),
    courseIds: bigint('course_ids', { mode: 'number' }).array(),
    displayOrder: integer('display_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('showcases_display_order_idx').using('btree', table.displayOrder.asc().nullsLast()),
    index('showcases_is_active_idx').using('btree', table.isActive.asc().nullsLast()),
  ],
)

export const blogPosts = pgTable(
  'blog_posts',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'blog_posts_id_seq' }),
    authorId: uuid('author_id').notNull(),
    title: text().notNull(),
    slug: text().notNull(),
    excerpt: text(),
    content: text().notNull(),
    featuredImageUrl: text('featured_image_url'),
    category: text(),
    tags: text().array(),
    status: blogPostStatus().default('draft').notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    seoKeywords: text('seo_keywords').array(),
    totalViews: integer('total_views').default(0).notNull(),
    totalLikes: integer('total_likes').default(0).notNull(),
    totalComments: integer('total_comments').default(0).notNull(),
    readingTimeMinutes: integer('reading_time_minutes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('blog_posts_author_id_idx').using('btree', table.authorId.asc().nullsLast()),
    // Busca por texto (ILIKE '%termo%') usa trigramas: sem eles cada busca leria o texto de todos os posts.
    index('blog_posts_title_trgm_idx').using('gin', table.title.op('gin_trgm_ops')),
    index('blog_posts_excerpt_trgm_idx').using('gin', table.excerpt.op('gin_trgm_ops')),
    index('blog_posts_content_trgm_idx').using('gin', table.content.op('gin_trgm_ops')),
    index('blog_posts_category_idx').using('btree', table.category.asc().nullsLast()),
    index('blog_posts_published_at_idx').using('btree', table.publishedAt.desc().nullsFirst()),
    index('blog_posts_status_idx').using('btree', table.status.asc().nullsLast()),
    index('blog_posts_tags_idx').using('gin', table.tags.asc().nullsLast()),
    foreignKey({
      columns: [table.authorId],
      foreignColumns: [users.id],
      name: 'blog_posts_author_id_fkey',
    }),
    unique('blog_posts_slug_key').on(table.slug),
  ],
)

export const postLikes = pgTable(
  'post_likes',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    postId: bigint('post_id', { mode: 'number' }).notNull(),
    userId: uuid('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_post_likes_created').using('btree', table.createdAt.desc().nullsFirst()),
    index('idx_post_likes_user_id').using('btree', table.userId.asc().nullsLast()),
    foreignKey({
      columns: [table.postId],
      foreignColumns: [blogPosts.id],
      name: 'post_likes_post_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'post_likes_user_id_fkey',
    }).onDelete('cascade'),
    unique('unique_like_per_user').on(table.postId, table.userId),
  ],
)

export const postViews = pgTable(
  'post_views',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    postId: bigint('post_id', { mode: 'number' }).notNull(),
    userId: uuid('user_id'),
    sessionId: text('session_id').notNull(),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    referrer: text(),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_post_views_post_id').using('btree', table.postId.asc().nullsLast()),
    index('idx_post_views_user_id_fk').using('btree', table.userId.asc().nullsLast()),
    foreignKey({
      columns: [table.postId],
      foreignColumns: [blogPosts.id],
      name: 'post_views_post_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'post_views_user_id_fkey',
    }).onDelete('set null'),
    unique('unique_view_per_session').on(table.postId, table.sessionId),
  ],
)

export const producerApplications = pgTable(
  'producer_applications',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'producer_applications_id_seq' }),
    userId: uuid('user_id').notNull(),
    fullName: text('full_name').notNull(),
    email: text().notNull(),
    phone: text().notNull(),
    cpf: text().notNull(),
    expertiseArea: text('expertise_area').notNull(),
    experienceYears: integer('experience_years').notNull(),
    bio: text().notNull(),
    portfolioUrl: text('portfolio_url'),
    socialLinks: jsonb('social_links'),
    whyProduce: text('why_produce').notNull(),
    status: producerApplicationStatus().default('pending').notNull(),
    reviewedBy: uuid('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_producer_applications_reviewed_by').using(
      'btree',
      table.reviewedBy.asc().nullsLast(),
    ),
    index('producer_applications_created_at_idx').using(
      'btree',
      table.createdAt.desc().nullsFirst(),
    ),
    index('producer_applications_status_idx').using('btree', table.status.asc().nullsLast()),
    foreignKey({
      columns: [table.reviewedBy],
      foreignColumns: [users.id],
      name: 'producer_applications_reviewed_by_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'producer_applications_user_id_fkey',
    }).onDelete('cascade'),
    unique('producer_applications_user_id_key').on(table.userId),
  ],
)

export const producerLeads = pgTable(
  'producer_leads',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity({ name: 'producer_leads_id_seq' }),
    fullName: text('full_name').notNull(),
    phone: text().notNull(),
    hasOnlineExperience: boolean('has_online_experience').notNull(),
    hasRecordedContent: boolean('has_recorded_content').notNull(),
    topic: text(),
    notes: text(),
    status: text().default('new').notNull(),
    source: text().default('become_producer_page').notNull(),
    handledBy: uuid('handled_by'),
    contactedAt: timestamp('contacted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    email: text().notNull(),
    city: text().notNull(),
    adminNotes: text('admin_notes'),
  },
  (table) => [
    index('idx_producer_leads_created_at').using('btree', table.createdAt.desc().nullsFirst()),
    index('idx_producer_leads_status_created_at').using(
      'btree',
      table.status.asc().nullsLast(),
      table.createdAt.desc().nullsFirst(),
    ),
    foreignKey({
      columns: [table.handledBy],
      foreignColumns: [users.id],
      name: 'producer_leads_handled_by_fkey',
    }).onDelete('set null'),
    check(
      'producer_leads_status_check',
      sql`status = ANY (ARRAY['new'::text, 'contacted'::text, 'qualified'::text, 'archived'::text])`,
    ),
  ],
)
