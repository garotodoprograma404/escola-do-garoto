import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { courses } from './courses.js'
import {
  affiliateApplicationStatus,
  affiliateAttributionModel,
  affiliatePartnershipStatus,
} from './enums.js'
import { profiles } from './profiles.js'
import { users } from './users.js'

export const affiliateCoursePartnerships = pgTable(
  'affiliate_course_partnerships',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'affiliate_course_partnerships_id_seq' }),
    affiliateId: uuid('affiliate_id').notNull(),
    courseId: bigint('course_id', { mode: 'number' }).notNull(),
    status: affiliatePartnershipStatus().default('pending').notNull(),
    commissionRate: numeric('commission_rate', {
      precision: 5,
      scale: 2,
      mode: 'number',
    }).notNull(),
    cookieWindowDays: integer('cookie_window_days').default(30).notNull(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvedBy: uuid('approved_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by'),
    rejectionReason: text('rejection_reason'),
    notes: text(),
    metadata: jsonb().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_affiliate_course_partnerships_affiliate_status').using(
      'btree',
      table.affiliateId.asc().nullsLast(),
      table.status.asc().nullsLast(),
      table.createdAt.desc().nullsFirst(),
    ),
    index('idx_affiliate_course_partnerships_approved_by')
      .using('btree', table.approvedBy.asc().nullsLast())
      .where(sql`(approved_by IS NOT NULL)`),
    index('idx_affiliate_course_partnerships_course_status').using(
      'btree',
      table.courseId.asc().nullsLast(),
      table.status.asc().nullsLast(),
      table.createdAt.desc().nullsFirst(),
    ),
    index('idx_affiliate_course_partnerships_reviewed_by')
      .using('btree', table.reviewedBy.asc().nullsLast())
      .where(sql`(reviewed_by IS NOT NULL)`),
    foreignKey({
      columns: [table.affiliateId],
      foreignColumns: [profiles.id],
      name: 'affiliate_course_partnerships_affiliate_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [courses.id],
      name: 'affiliate_course_partnerships_course_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.approvedBy],
      foreignColumns: [profiles.id],
      name: 'affiliate_course_partnerships_approved_by_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.reviewedBy],
      foreignColumns: [profiles.id],
      name: 'affiliate_course_partnerships_reviewed_by_fkey',
    }).onDelete('set null'),
    unique('affiliate_course_partnerships_affiliate_course_key').on(
      table.affiliateId,
      table.courseId,
    ),
    check(
      'affiliate_course_partnerships_commission_rate_check',
      sql`(commission_rate > (0)::numeric) AND (commission_rate <= (100)::numeric)`,
    ),
    check(
      'affiliate_course_partnerships_cookie_window_days_check',
      sql`(cookie_window_days >= 1) AND (cookie_window_days <= 90)`,
    ),
    check(
      'affiliate_course_partnerships_approved_at_check',
      sql`(status <> 'approved'::affiliate_partnership_status) OR (approved_at IS NOT NULL)`,
    ),
  ],
)

export const affiliateLinks = pgTable(
  'affiliate_links',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'affiliate_links_id_seq' }),
    partnershipId: bigint('partnership_id', { mode: 'number' }).notNull(),
    code: text().notNull(),
    slug: text(),
    isActive: boolean('is_active').default(true).notNull(),
    metadata: jsonb().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_affiliate_links_partnership_active').using(
      'btree',
      table.partnershipId.asc().nullsLast(),
      table.isActive.asc().nullsLast(),
      table.createdAt.desc().nullsFirst(),
    ),
    uniqueIndex('idx_affiliate_links_slug_unique')
      .using('btree', table.partnershipId.asc().nullsLast(), table.slug.asc().nullsLast())
      .where(sql`(slug IS NOT NULL)`),
    foreignKey({
      columns: [table.partnershipId],
      foreignColumns: [affiliateCoursePartnerships.id],
      name: 'affiliate_links_partnership_id_fkey',
    }).onDelete('cascade'),
    unique('affiliate_links_code_key').on(table.code),
  ],
)

export const affiliateAttributions = pgTable(
  'affiliate_attributions',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'affiliate_attributions_id_seq' }),
    affiliateId: uuid('affiliate_id').notNull(),
    affiliateLinkId: bigint('affiliate_link_id', { mode: 'number' }).notNull(),
    courseId: bigint('course_id', { mode: 'number' }).notNull(),
    sessionKey: text('session_key').notNull(),
    visitorKey: text('visitor_key'),
    attributionModel: affiliateAttributionModel('attribution_model')
      .default('last_click')
      .notNull(),
    attributedAt: timestamp('attributed_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    metadata: jsonb().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_affiliate_attributions_affiliate_course').using(
      'btree',
      table.affiliateId.asc().nullsLast(),
      table.courseId.asc().nullsLast(),
      table.attributedAt.desc().nullsFirst(),
    ),
    index('idx_affiliate_attributions_course_id').using('btree', table.courseId.asc().nullsLast()),
    index('idx_affiliate_attributions_link_id').using(
      'btree',
      table.affiliateLinkId.asc().nullsLast(),
    ),
    index('idx_affiliate_attributions_session_course_expiry').using(
      'btree',
      table.sessionKey.asc().nullsLast(),
      table.courseId.asc().nullsLast(),
      table.expiresAt.desc().nullsFirst(),
    ),
    index('idx_affiliate_attributions_visitor_expiry')
      .using('btree', table.visitorKey.asc().nullsLast(), table.expiresAt.desc().nullsFirst())
      .where(sql`(visitor_key IS NOT NULL)`),
    foreignKey({
      columns: [table.affiliateId],
      foreignColumns: [profiles.id],
      name: 'affiliate_attributions_affiliate_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.affiliateLinkId],
      foreignColumns: [affiliateLinks.id],
      name: 'affiliate_attributions_affiliate_link_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [courses.id],
      name: 'affiliate_attributions_course_id_fkey',
    }).onDelete('cascade'),
    check('affiliate_attributions_session_key_check', sql`length(btrim(session_key)) > 0`),
    check('affiliate_attributions_expires_at_check', sql`expires_at > attributed_at`),
  ],
)

export const affiliateApplications = pgTable(
  'affiliate_applications',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'affiliate_applications_id_seq' }),
    userId: uuid('user_id').notNull(),
    fullName: text('full_name').notNull(),
    email: text().notNull(),
    phone: text().notNull(),
    instagramHandle: text('instagram_handle'),
    youtubeChannel: text('youtube_channel'),
    websiteUrl: text('website_url'),
    audienceSize: text('audience_size'),
    audienceSummary: text('audience_summary').notNull(),
    promotionChannels: text('promotion_channels').array().default(['']).notNull(),
    experienceSummary: text('experience_summary').notNull(),
    whyAffiliate: text('why_affiliate').notNull(),
    status: affiliateApplicationStatus().default('pending').notNull(),
    reviewedBy: uuid('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    notes: text(),
    metadata: jsonb().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('affiliate_applications_created_at_idx').using(
      'btree',
      table.createdAt.desc().nullsFirst(),
    ),
    index('affiliate_applications_reviewed_by_idx')
      .using('btree', table.reviewedBy.asc().nullsLast())
      .where(sql`(reviewed_by IS NOT NULL)`),
    index('affiliate_applications_status_idx').using('btree', table.status.asc().nullsLast()),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'affiliate_applications_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.reviewedBy],
      foreignColumns: [users.id],
      name: 'affiliate_applications_reviewed_by_fkey',
    }),
    unique('affiliate_applications_user_id_key').on(table.userId),
    check('affiliate_applications_full_name_check', sql`length(btrim(full_name)) >= 3`),
    check('affiliate_applications_email_check', sql`length(btrim(email)) >= 5`),
    check('affiliate_applications_phone_check', sql`length(btrim(phone)) >= 10`),
    check(
      'affiliate_applications_audience_summary_check',
      sql`length(btrim(audience_summary)) >= 30`,
    ),
    check(
      'affiliate_applications_experience_summary_check',
      sql`length(btrim(experience_summary)) >= 30`,
    ),
    check('affiliate_applications_why_affiliate_check', sql`length(btrim(why_affiliate)) >= 30`),
    check(
      'affiliate_applications_reviewed_at_check',
      sql`(status = ANY (ARRAY['pending'::affiliate_application_status, 'under_review'::affiliate_application_status])) OR (reviewed_at IS NOT NULL)`,
    ),
  ],
)
