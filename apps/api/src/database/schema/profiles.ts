import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  inet,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { auditAction, userRoleType } from './enums.js'
import { users } from './users.js'

export const profiles = pgTable(
  'profiles',
  {
    id: uuid().primaryKey().notNull(),
    fullName: text('full_name').notNull(),
    cpf: text(),
    phone: text(),
    avatarUrl: text('avatar_url'),
    bio: text(),
    birthDate: date('birth_date'),
    address: jsonb(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    notificationPreferences: jsonb('notification_preferences').default({
      email_promotions: false,
      push_new_content: true,
      email_new_content: true,
      push_course_updates: true,
      email_course_updates: true,
      email_weekly_summary: true,
    }),
    displayName: text('display_name'),
    slug: text(),
    expertiseAreas: text('expertise_areas').array(),
    coverUrl: text('cover_url'),
    socialLinks: jsonb('social_links'),
    commissionRate: numeric('commission_rate', { precision: 5, scale: 2, mode: 'number' }).default(
      10,
    ),
    totalStudents: integer('total_students').default(0),
    totalCourses: integer('total_courses').default(0),
    totalRevenue: numeric('total_revenue', { precision: 10, scale: 2, mode: 'number' }).default(0),
    averageRating: numeric('average_rating', { precision: 3, scale: 2, mode: 'number' }),
    isVerified: boolean('is_verified').default(false),
    isActive: boolean('is_active').default(true),
    publicProfileEnabled: boolean('public_profile_enabled').default(false).notNull(),
  },
  (table) => [
    index('idx_profiles_created_at').using('btree', table.createdAt.desc(), table.id.desc()),
    index('profiles_full_name_idx').using(
      'gin',
      sql`to_tsvector('portuguese'::regconfig, full_name)`,
    ),
    uniqueIndex('profiles_slug_unique')
      .using('btree', table.slug.asc().nullsLast())
      .where(sql`(slug IS NOT NULL)`),
    foreignKey({
      columns: [table.id],
      foreignColumns: [users.id],
      name: 'profiles_id_fkey',
    }).onDelete('cascade'),
    unique('profiles_cpf_key').on(table.cpf),
    check(
      'profiles_average_rating_check',
      sql`(average_rating IS NULL) OR ((average_rating >= (0)::numeric) AND (average_rating <= (5)::numeric))`,
    ),
    check(
      'profiles_commission_rate_check',
      sql`(commission_rate IS NULL) OR ((commission_rate >= (0)::numeric) AND (commission_rate <= (100)::numeric))`,
    ),
  ],
)

export const userRoles = pgTable(
  'user_roles',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'user_roles_id_seq' }),
    userId: uuid('user_id').notNull(),
    role: userRoleType().notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
    grantedBy: uuid('granted_by'),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedBy: uuid('revoked_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_user_roles_granted_by').using('btree', table.grantedBy.asc().nullsLast()),
    index('idx_user_roles_revoked_by').using('btree', table.revokedBy.asc().nullsLast()),
    index('idx_user_roles_active_role')
      .using('btree', table.role.asc())
      .where(sql`(is_active = true AND revoked_at IS NULL)`),
    index('user_roles_user_id_idx').using('btree', table.userId.asc().nullsLast()),
    foreignKey({
      columns: [table.grantedBy],
      foreignColumns: [users.id],
      name: 'user_roles_granted_by_fkey',
    }),
    foreignKey({
      columns: [table.revokedBy],
      foreignColumns: [users.id],
      name: 'user_roles_revoked_by_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'user_roles_user_id_fkey',
    }).onDelete('cascade'),
    unique('user_roles_user_id_role_key').on(table.userId, table.role),
  ],
)

export const searchHistory = pgTable(
  'search_history',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity({ name: 'search_history_id_seq' }),
    userId: uuid('user_id').notNull(),
    query: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_search_history_created_at').using('btree', table.createdAt.desc().nullsFirst()),
    index('idx_search_history_user_id').using('btree', table.userId.asc().nullsLast()),
    index('idx_search_history_user_created').using(
      'btree',
      table.userId.asc(),
      table.createdAt.desc(),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [profiles.id],
      name: 'search_history_user_id_fkey',
    }).onDelete('cascade'),
  ],
)

export const notifications = pgTable(
  'notifications',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    type: varchar({ length: 50 }).notNull(),
    title: varchar({ length: 255 }).notNull(),
    message: text().notNull(),
    link: varchar({ length: 500 }),
    read: boolean().default(false),
    metadata: jsonb().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_notifications_created_at').using('btree', table.createdAt.desc().nullsFirst()),
    index('idx_notifications_user_id').using('btree', table.userId.asc().nullsLast()),
    index('idx_notifications_user_created').using(
      'btree',
      table.userId.asc(),
      table.createdAt.desc(),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'notifications_user_id_fkey',
    }).onDelete('cascade'),
  ],
)

export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'admin_audit_log_id_seq' }),
    userId: uuid('user_id').notNull(),
    action: auditAction().notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id'),
    changes: jsonb(),
    metadata: jsonb(),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('admin_audit_log_user_id_idx').using('btree', table.userId.asc().nullsLast()),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'admin_audit_log_user_id_fkey',
    }),
  ],
)

export const platformSettings = pgTable(
  'platform_settings',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'platform_settings_id_seq' }),
    key: text().notNull(),
    value: jsonb().notNull(),
    description: text(),
    isPublic: boolean('is_public').default(false).notNull(),
    updatedBy: uuid('updated_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_platform_settings_updated_by').using('btree', table.updatedBy.asc().nullsLast()),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [users.id],
      name: 'platform_settings_updated_by_fkey',
    }),
    unique('platform_settings_key_key').on(table.key),
  ],
)
