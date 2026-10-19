import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { courses, enrollments } from './courses.js'
import {
  certificateEventType,
  certificateIssueMode,
  certificateStatus,
  certificateTemplateStatus,
} from './enums.js'
import { users } from './users.js'

export const certificates = pgTable(
  'certificates',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity({ name: 'certificates_id_seq' }),
    code: text().notNull(),
    enrollmentId: bigint('enrollment_id', { mode: 'number' }).notNull(),
    studentId: uuid('student_id').notNull(),
    courseId: bigint('course_id', { mode: 'number' }).notNull(),
    templateId: bigint('template_id', { mode: 'number' }).notNull(),
    templateVersionId: bigint('template_version_id', { mode: 'number' }).notNull(),
    status: certificateStatus().default('active').notNull(),
    issueMode: certificateIssueMode('issue_mode').default('automatic').notNull(),
    issuedBy: uuid('issued_by'),
    issuedAt: timestamp('issued_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedReason: text('revoked_reason'),
    replacedFromId: bigint('replaced_from_id', { mode: 'number' }),
    filePath: text('file_path'),
    fileMimeType: text('file_mime_type').default('application/pdf').notNull(),
    fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }),
    integrityHash: text('integrity_hash').notNull(),
    payloadSnapshot: jsonb('payload_snapshot').default({}).notNull(),
    metadata: jsonb().default({}).notNull(),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table) => [
    index('idx_certificates_course_id_issued_at').using(
      'btree',
      table.courseId.asc().nullsLast(),
      table.issuedAt.desc().nullsFirst(),
    ),
    index('idx_certificates_issued_by').using('btree', table.issuedBy.asc().nullsLast()),
    index('idx_certificates_replaced_from_id').using(
      'btree',
      table.replacedFromId.asc().nullsLast(),
    ),
    index('idx_certificates_status_issued_at').using(
      'btree',
      table.status.asc().nullsLast(),
      table.issuedAt.desc().nullsFirst(),
    ),
    index('idx_certificates_student_id_issued_at').using(
      'btree',
      table.studentId.asc().nullsLast(),
      table.issuedAt.desc().nullsFirst(),
    ),
    index('idx_certificates_template_id').using('btree', table.templateId.asc().nullsLast()),
    index('idx_certificates_template_version_id').using(
      'btree',
      table.templateVersionId.asc().nullsLast(),
    ),
    uniqueIndex('uq_certificates_enrollment_active')
      .using('btree', table.enrollmentId.asc().nullsLast())
      .where(sql`(status = 'active'::certificate_status)`),
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [courses.id],
      name: 'certificates_course_id_fkey',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.enrollmentId],
      foreignColumns: [enrollments.id],
      name: 'certificates_enrollment_id_fkey',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.issuedBy],
      foreignColumns: [users.id],
      name: 'certificates_issued_by_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.replacedFromId],
      foreignColumns: [table.id],
      name: 'certificates_replaced_from_id_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [users.id],
      name: 'certificates_student_id_fkey',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.templateId],
      foreignColumns: [certificateTemplates.id],
      name: 'certificates_template_id_fkey',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.templateVersionId],
      foreignColumns: [certificateTemplateVersions.id],
      name: 'certificates_template_version_id_fkey',
    }).onDelete('restrict'),
    unique('certificates_code_key').on(table.code),
    check(
      'certificates_code_format_check',
      sql`code ~ '^[A-Z]{2,8}-[0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$'::text`,
    ),
    check(
      'certificates_failure_reason_check',
      sql`((status = 'issue_failed'::certificate_status) AND (COALESCE(NULLIF(TRIM(BOTH FROM failure_reason), ''::text), ''::text) <> ''::text)) OR (status <> 'issue_failed'::certificate_status)`,
    ),
    check(
      'certificates_file_size_bytes_check',
      sql`(file_size_bytes IS NULL) OR (file_size_bytes >= 0)`,
    ),
    check(
      'certificates_revocation_fields_check',
      sql`((status = 'revoked'::certificate_status) AND (revoked_at IS NOT NULL) AND (COALESCE(NULLIF(TRIM(BOTH FROM revoked_reason), ''::text), ''::text) <> ''::text)) OR (status <> 'revoked'::certificate_status)`,
    ),
  ],
)

export const certificateTemplates = pgTable(
  'certificate_templates',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity({ name: 'certificate_templates_id_seq' }),
    name: text().notNull(),
    description: text(),
    status: certificateTemplateStatus().default('draft').notNull(),
    orientation: text().default('landscape').notNull(),
    pageSize: text('page_size').default('A4').notNull(),
    createdBy: uuid('created_by').notNull(),
    updatedBy: uuid('updated_by'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table) => [
    index('idx_certificate_templates_created_by').using('btree', table.createdBy.asc().nullsLast()),
    index('idx_certificate_templates_status_updated_at').using(
      'btree',
      table.status.asc().nullsLast(),
      table.updatedAt.desc().nullsFirst(),
    ),
    index('idx_certificate_templates_updated_by').using('btree', table.updatedBy.asc().nullsLast()),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'certificate_templates_created_by_fkey',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [users.id],
      name: 'certificate_templates_updated_by_fkey',
    }).onDelete('set null'),
    check(
      'certificate_templates_orientation_check',
      sql`orientation = ANY (ARRAY['landscape'::text, 'portrait'::text])`,
    ),
  ],
)

export const certificateTemplateVersions = pgTable(
  'certificate_template_versions',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity({ name: 'certificate_template_versions_id_seq' }),
    templateId: bigint('template_id', { mode: 'number' }).notNull(),
    versionNumber: integer('version_number').notNull(),
    schemaJson: jsonb('schema_json').default({}).notNull(),
    htmlSnapshot: text('html_snapshot'),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table) => [
    index('idx_certificate_template_versions_created_by').using(
      'btree',
      table.createdBy.asc().nullsLast(),
    ),
    index('idx_certificate_template_versions_template_id_created_at').using(
      'btree',
      table.templateId.asc().nullsLast(),
      table.createdAt.desc().nullsFirst(),
    ),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'certificate_template_versions_created_by_fkey',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.templateId],
      foreignColumns: [certificateTemplates.id],
      name: 'certificate_template_versions_template_id_fkey',
    }).onDelete('cascade'),
    unique('certificate_template_versions_id_template_key').on(table.id, table.templateId),
    unique('certificate_template_versions_template_version_key').on(
      table.templateId,
      table.versionNumber,
    ),
    check('certificate_template_versions_version_number_check', sql`version_number > 0`),
  ],
)

export const courseCertificateTemplates = pgTable(
  'course_certificate_templates',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity({ name: 'course_certificate_templates_id_seq' }),
    courseId: bigint('course_id', { mode: 'number' }).notNull(),
    templateId: bigint('template_id', { mode: 'number' }).notNull(),
    templateVersionId: bigint('template_version_id', { mode: 'number' }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    activatedAt: timestamp('activated_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table) => [
    index('idx_course_certificate_templates_course_id').using(
      'btree',
      table.courseId.asc().nullsLast(),
    ),
    index('idx_course_certificate_templates_created_by').using(
      'btree',
      table.createdBy.asc().nullsLast(),
    ),
    index('idx_course_certificate_templates_template_id').using(
      'btree',
      table.templateId.asc().nullsLast(),
    ),
    index('idx_course_certificate_templates_template_version_id').using(
      'btree',
      table.templateVersionId.asc().nullsLast(),
    ),
    index('idx_course_certificate_templates_template_version_template').using(
      'btree',
      table.templateVersionId.asc().nullsLast(),
      table.templateId.asc().nullsLast(),
    ),
    uniqueIndex('uq_course_certificate_templates_course_active')
      .using('btree', table.courseId.asc().nullsLast())
      .where(sql`(is_active = true)`),
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [courses.id],
      name: 'course_certificate_templates_course_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'course_certificate_templates_created_by_fkey',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.templateId],
      foreignColumns: [certificateTemplates.id],
      name: 'course_certificate_templates_template_id_fkey',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.templateVersionId],
      foreignColumns: [certificateTemplateVersions.id],
      name: 'course_certificate_templates_template_version_id_fkey',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.templateVersionId, table.templateId],
      foreignColumns: [certificateTemplateVersions.id, certificateTemplateVersions.templateId],
      name: 'course_certificate_templates_version_matches_template_fkey',
    }).onDelete('restrict'),
  ],
)

export const certificateEvents = pgTable(
  'certificate_events',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity({ name: 'certificate_events_id_seq' }),
    certificateId: bigint('certificate_id', { mode: 'number' }),
    enrollmentId: bigint('enrollment_id', { mode: 'number' }).notNull(),
    eventType: certificateEventType('event_type').notNull(),
    actorUserId: uuid('actor_user_id'),
    previousStatus: certificateStatus('previous_status'),
    newStatus: certificateStatus('new_status'),
    reason: text(),
    payload: jsonb().default({}).notNull(),
    eventAt: timestamp('event_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table) => [
    index('idx_certificate_events_actor_user_id').using(
      'btree',
      table.actorUserId.asc().nullsLast(),
    ),
    index('idx_certificate_events_certificate_id_event_at').using(
      'btree',
      table.certificateId.asc().nullsLast(),
      table.eventAt.desc().nullsFirst(),
    ),
    index('idx_certificate_events_enrollment_id_event_at').using(
      'btree',
      table.enrollmentId.asc().nullsLast(),
      table.eventAt.desc().nullsFirst(),
    ),
    index('idx_certificate_events_type_event_at').using(
      'btree',
      table.eventType.asc().nullsLast(),
      table.eventAt.desc().nullsFirst(),
    ),
    foreignKey({
      columns: [table.actorUserId],
      foreignColumns: [users.id],
      name: 'certificate_events_actor_user_id_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.certificateId],
      foreignColumns: [certificates.id],
      name: 'certificate_events_certificate_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.enrollmentId],
      foreignColumns: [enrollments.id],
      name: 'certificate_events_enrollment_id_fkey',
    }).onDelete('restrict'),
  ],
)
