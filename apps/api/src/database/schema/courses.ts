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
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import {
  auditDecision,
  courseLevel,
  courseStatus,
  enrollmentStatus,
  lessonType,
  questionType,
} from './enums.js'
import { users } from './users.js'

export const categories = pgTable(
  'categories',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'categories_id_seq' }),
    name: text().notNull(),
    slug: text().notNull(),
    description: text(),
    parentId: bigint('parent_id', { mode: 'number' }),
    icon: text(),
    color: text(),
    displayOrder: integer('display_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    isFeatured: boolean('is_featured').default(false),
    coverImageUrl: text('cover_image_url'),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
  },
  (table) => [
    index('categories_is_active_idx').using('btree', table.isActive.asc().nullsLast()),
    index('categories_parent_id_idx').using('btree', table.parentId.asc().nullsLast()),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'categories_parent_id_fkey',
    }).onDelete('cascade'),
    unique('categories_slug_key').on(table.slug),
  ],
)

export const courses = pgTable(
  'courses',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'courses_id_seq' }),
    producerId: uuid('producer_id').notNull(),
    categoryId: bigint('category_id', { mode: 'number' }).notNull(),
    title: text().notNull(),
    slug: text().notNull(),
    description: text().notNull(),
    shortDescription: text('short_description'),
    thumbnailUrl: text('thumbnail_url'),
    trailerUrl: text('trailer_url'),
    level: courseLevel().default('beginner').notNull(),
    price: numeric({ precision: 10, scale: 2, mode: 'number' }).notNull(),
    discountPrice: numeric('discount_price', { precision: 10, scale: 2, mode: 'number' }),
    status: courseStatus().default('draft').notNull(),
    isPublished: boolean('is_published').default(false).notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    totalDurationMinutes: integer('total_duration_minutes').default(0).notNull(),
    totalLessons: integer('total_lessons').default(0).notNull(),
    totalStudents: integer('total_students').default(0).notNull(),
    averageRating: numeric('average_rating', { precision: 3, scale: 2, mode: 'number' }),
    totalReviews: integer('total_reviews').default(0).notNull(),
    requirements: text().array(),
    whatYouWillLearn: text('what_you_will_learn').array(),
    targetAudience: text('target_audience').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    isFeatured: boolean('is_featured').default(false),
    priceLockedByAdmin: boolean('price_locked_by_admin').default(false),
    couponsEnabled: boolean('coupons_enabled').default(true),
    adminNotes: text('admin_notes'),
    coverImageUrl: text('cover_image_url'),
    hasLifetimeAccess: boolean('has_lifetime_access').default(true).notNull(),
    hasCertificate: boolean('has_certificate').default(true).notNull(),
  },
  (table) => [
    index('courses_category_id_idx').using('btree', table.categoryId.asc().nullsLast()),
    // Busca por texto (ILIKE '%termo%') usa trigramas: sem eles cada busca varreria todos os cursos.
    index('courses_title_trgm_idx').using('gin', table.title.op('gin_trgm_ops')),
    index('courses_description_trgm_idx').using('gin', table.description.op('gin_trgm_ops')),
    index('courses_is_published_idx').using('btree', table.isPublished.asc().nullsLast()),
    index('courses_producer_id_idx').using('btree', table.producerId.asc().nullsLast()),
    index('courses_status_idx').using('btree', table.status.asc().nullsLast()),
    index('courses_status_created_at_idx').using(
      'btree',
      table.status.asc(),
      table.createdAt.desc(),
    ),
    index('courses_public_created_idx')
      .using('btree', table.createdAt.desc(), table.id.desc())
      .where(sql`(status = 'approved' AND is_published = true)`),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: 'courses_category_id_fkey',
    }),
    foreignKey({
      columns: [table.producerId],
      foreignColumns: [users.id],
      name: 'courses_producer_id_fkey',
    }).onDelete('cascade'),
    unique('courses_slug_key').on(table.slug),
    check(
      'courses_average_rating_check',
      sql`(average_rating IS NULL) OR ((average_rating >= (0)::numeric) AND (average_rating <= (5)::numeric))`,
    ),
    check('courses_check', sql`(discount_price IS NULL) OR (discount_price < price)`),
    check(
      'courses_discount_price_check',
      sql`(discount_price IS NULL) OR (discount_price >= (0)::numeric)`,
    ),
    check('courses_price_check', sql`price >= (0)::numeric`),
  ],
)

export const courseModules = pgTable(
  'course_modules',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'course_modules_id_seq' }),
    courseId: bigint('course_id', { mode: 'number' }).notNull(),
    title: text().notNull(),
    description: text(),
    displayOrder: integer('display_order').default(0).notNull(),
    isPublished: boolean('is_published').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('course_modules_course_id_idx').using('btree', table.courseId.asc().nullsLast()),
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [courses.id],
      name: 'course_modules_course_id_fkey',
    }).onDelete('cascade'),
  ],
)

export const courseLessons = pgTable(
  'course_lessons',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'course_lessons_id_seq' }),
    moduleId: bigint('module_id', { mode: 'number' }).notNull(),
    title: text().notNull(),
    description: text(),
    type: lessonType().default('video').notNull(),
    contentUrl: text('content_url'),
    contentText: text('content_text'),
    durationMinutes: integer('duration_minutes'),
    displayOrder: integer('display_order').default(0).notNull(),
    isFreePreview: boolean('is_free_preview').default(false).notNull(),
    isPublished: boolean('is_published').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('course_lessons_module_id_idx').using('btree', table.moduleId.asc().nullsLast()),
    foreignKey({
      columns: [table.moduleId],
      foreignColumns: [courseModules.id],
      name: 'course_lessons_module_id_fkey',
    }).onDelete('cascade'),
  ],
)

export const courseAudits = pgTable(
  'course_audits',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'course_audits_id_seq' }),
    courseId: bigint('course_id', { mode: 'number' }).notNull(),
    auditorId: uuid('auditor_id').notNull(),
    decision: auditDecision().notNull(),
    feedback: text(),
    changesRequested: text('changes_requested').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('course_audits_course_id_idx').using('btree', table.courseId.asc().nullsLast()),
    index('idx_course_audits_auditor_id').using('btree', table.auditorId.asc().nullsLast()),
    foreignKey({
      columns: [table.auditorId],
      foreignColumns: [users.id],
      name: 'course_audits_auditor_id_fkey',
    }),
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [courses.id],
      name: 'course_audits_course_id_fkey',
    }).onDelete('cascade'),
  ],
)

export const courseReviews = pgTable(
  'course_reviews',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    courseId: bigint('course_id', { mode: 'number' }).notNull(),
    userId: uuid('user_id').notNull(),
    enrollmentId: bigint('enrollment_id', { mode: 'number' }).notNull(),
    rating: integer().notNull(),
    title: varchar({ length: 200 }),
    review: text(),
    response: text(),
    respondedBy: uuid('responded_by'),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    isVerifiedPurchase: boolean('is_verified_purchase').default(true),
    isFeatured: boolean('is_featured').default(false),
    helpfulCount: integer('helpful_count').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_course_reviews_course_id').using('btree', table.courseId.asc().nullsLast()),
    index('idx_course_reviews_created_at').using('btree', table.createdAt.desc().nullsFirst()),
    index('idx_course_reviews_is_featured')
      .using('btree', table.isFeatured.asc().nullsLast())
      .where(sql`(is_featured = true)`),
    index('idx_course_reviews_rating').using('btree', table.rating.asc().nullsLast()),
    index('idx_course_reviews_responded_by').using('btree', table.respondedBy.asc().nullsLast()),
    index('idx_course_reviews_user_id').using('btree', table.userId.asc().nullsLast()),
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [courses.id],
      name: 'course_reviews_course_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.enrollmentId],
      foreignColumns: [enrollments.id],
      name: 'course_reviews_enrollment_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.respondedBy],
      foreignColumns: [users.id],
      name: 'course_reviews_responded_by_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'course_reviews_user_id_fkey',
    }).onDelete('cascade'),
    unique('course_reviews_enrollment_id_key').on(table.enrollmentId),
    check('course_reviews_rating_check', sql`(rating >= 1) AND (rating <= 5)`),
  ],
)

export const courseQuestions = pgTable(
  'course_questions',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    courseId: bigint('course_id', { mode: 'number' }).notNull(),
    lessonId: bigint('lesson_id', { mode: 'number' }),
    userId: uuid('user_id').notNull(),
    question: text().notNull(),
    answer: text(),
    answeredBy: uuid('answered_by'),
    answeredAt: timestamp('answered_at', { withTimezone: true }),
    isPublic: boolean('is_public').default(true),
    upvotes: integer().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_course_questions_answered_by').using('btree', table.answeredBy.asc().nullsLast()),
    index('idx_course_questions_course_id').using('btree', table.courseId.asc().nullsLast()),
    index('idx_course_questions_course_lesson_created').using(
      'btree',
      table.courseId.asc().nullsLast(),
      table.lessonId.asc().nullsLast(),
      table.createdAt.desc().nullsFirst(),
    ),
    index('idx_course_questions_created_at').using('btree', table.createdAt.desc().nullsFirst()),
    index('idx_course_questions_lesson_id').using('btree', table.lessonId.asc().nullsLast()),
    index('idx_course_questions_user_id').using('btree', table.userId.asc().nullsLast()),
    foreignKey({
      columns: [table.answeredBy],
      foreignColumns: [users.id],
      name: 'course_questions_answered_by_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [courses.id],
      name: 'course_questions_course_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.lessonId],
      foreignColumns: [courseLessons.id],
      name: 'course_questions_lesson_id_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'course_questions_user_id_fkey',
    }).onDelete('cascade'),
  ],
)

export const lessonProgress = pgTable(
  'lesson_progress',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    lessonId: bigint('lesson_id', { mode: 'number' }).notNull(),
    completed: boolean().default(false).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    watchTimeSeconds: integer('watch_time_seconds').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_lesson_progress_completed').using('btree', table.completed.asc().nullsLast()),
    index('idx_lesson_progress_lesson').using('btree', table.lessonId.asc().nullsLast()),
    foreignKey({
      columns: [table.lessonId],
      foreignColumns: [courseLessons.id],
      name: 'lesson_progress_lesson_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'lesson_progress_user_id_fkey',
    }).onDelete('cascade'),
    unique('lesson_progress_user_id_lesson_id_key').on(table.userId, table.lessonId),
  ],
)

export const lessonNotes = pgTable(
  'lesson_notes',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    lessonId: bigint('lesson_id', { mode: 'number' }).notNull(),
    courseId: bigint('course_id', { mode: 'number' }).notNull(),
    title: varchar({ length: 200 }).notNull(),
    content: text().notNull(),
    videoTimestamp: integer('video_timestamp'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_lesson_notes_course_id').using('btree', table.courseId.asc().nullsLast()),
    index('idx_lesson_notes_created_at').using('btree', table.createdAt.desc().nullsFirst()),
    index('idx_lesson_notes_lesson_id').using('btree', table.lessonId.asc().nullsLast()),
    index('idx_lesson_notes_user_id').using('btree', table.userId.asc().nullsLast()),
    index('idx_lesson_notes_user_lesson_created').using(
      'btree',
      table.userId.asc().nullsLast(),
      table.lessonId.asc().nullsLast(),
      table.createdAt.desc().nullsFirst(),
    ),
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [courses.id],
      name: 'lesson_notes_course_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.lessonId],
      foreignColumns: [courseLessons.id],
      name: 'lesson_notes_lesson_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'lesson_notes_user_id_fkey',
    }).onDelete('cascade'),
  ],
)

export const enrollments = pgTable(
  'enrollments',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'enrollments_id_seq' }),
    studentId: uuid('student_id').notNull(),
    courseId: bigint('course_id', { mode: 'number' }).notNull(),
    status: enrollmentStatus().default('active').notNull(),
    progressPercentage: integer('progress_percentage').default(0).notNull(),
    completedLessons: integer('completed_lessons').default(0).notNull(),
    lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    certificateUrl: text('certificate_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('enrollments_course_id_idx').using('btree', table.courseId.asc().nullsLast()),
    index('enrollments_status_idx').using('btree', table.status.asc().nullsLast()),
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [courses.id],
      name: 'enrollments_course_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [users.id],
      name: 'enrollments_student_id_fkey',
    }).onDelete('cascade'),
    unique('enrollments_student_id_course_id_key').on(table.studentId, table.courseId),
    check(
      'enrollments_progress_percentage_check',
      sql`(progress_percentage >= 0) AND (progress_percentage <= 100)`,
    ),
  ],
)

export const quizSettings = pgTable(
  'quiz_settings',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'quiz_settings_id_seq' }),
    lessonId: bigint('lesson_id', { mode: 'number' }).notNull(),
    passingScore: integer('passing_score').default(70).notNull(),
    timeLimitMinutes: integer('time_limit_minutes'),
    allowRetake: boolean('allow_retake').default(true).notNull(),
    showAnswersAfter: boolean('show_answers_after').default(true).notNull(),
    shuffleQuestions: boolean('shuffle_questions').default(false).notNull(),
    shuffleOptions: boolean('shuffle_options').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.lessonId],
      foreignColumns: [courseLessons.id],
      name: 'quiz_settings_lesson_id_fkey',
    }).onDelete('cascade'),
    unique('quiz_settings_lesson_id_key').on(table.lessonId),
    check(
      'quiz_settings_passing_score_check',
      sql`(passing_score >= 0) AND (passing_score <= 100)`,
    ),
    check(
      'quiz_settings_time_limit_minutes_check',
      sql`(time_limit_minutes IS NULL) OR (time_limit_minutes > 0)`,
    ),
  ],
)

export const quizQuestions = pgTable(
  'quiz_questions',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'quiz_questions_id_seq' }),
    lessonId: bigint('lesson_id', { mode: 'number' }).notNull(),
    type: questionType().default('multiple_choice').notNull(),
    questionText: text('question_text').notNull(),
    explanation: text(),
    points: integer().default(1).notNull(),
    displayOrder: integer('display_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    questionImageUrl: text('question_image_url'),
    questionImageAlt: text('question_image_alt'),
  },
  (table) => [
    index('idx_quiz_questions_lesson_id').using('btree', table.lessonId.asc().nullsLast()),
    foreignKey({
      columns: [table.lessonId],
      foreignColumns: [courseLessons.id],
      name: 'quiz_questions_lesson_id_fkey',
    }).onDelete('cascade'),
    check('quiz_questions_points_check', sql`points > 0`),
    check(
      'quiz_questions_question_image_url_scheme_check',
      sql`(question_image_url IS NULL) OR (question_image_url ~* '^https://'::text) OR (question_image_url ~ '^/api/files/public/[A-Za-z0-9._/-]+$'::text)`,
    ),
    check(
      'quiz_questions_question_image_alt_length_check',
      sql`(question_image_alt IS NULL) OR (char_length(question_image_alt) <= 180)`,
    ),
  ],
)

export const quizOptions = pgTable(
  'quiz_options',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'quiz_options_id_seq' }),
    questionId: bigint('question_id', { mode: 'number' }).notNull(),
    optionText: text('option_text').notNull(),
    isCorrect: boolean('is_correct').default(false).notNull(),
    displayOrder: integer('display_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_quiz_options_question_id').using('btree', table.questionId.asc().nullsLast()),
    foreignKey({
      columns: [table.questionId],
      foreignColumns: [quizQuestions.id],
      name: 'quiz_options_question_id_fkey',
    }).onDelete('cascade'),
  ],
)

export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    lessonId: bigint('lesson_id', { mode: 'number' }).notNull(),
    courseId: bigint('course_id', { mode: 'number' }).notNull(),
    studentId: uuid('student_id').notNull(),
    attemptNumber: integer('attempt_number').notNull(),
    scorePercentage: integer('score_percentage').notNull(),
    scoredPoints: integer('scored_points').default(0).notNull(),
    totalPoints: integer('total_points').default(0).notNull(),
    passed: boolean().default(false).notNull(),
    answers: jsonb().default([]).notNull(),
    feedback: jsonb().default([]).notNull(),
    finalizedAt: timestamp('finalized_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_quiz_attempts_course_finalized').using(
      'btree',
      table.courseId.asc().nullsLast(),
      table.finalizedAt.desc().nullsFirst(),
    ),
    index('idx_quiz_attempts_lesson').using('btree', table.lessonId.asc().nullsLast()),
    index('idx_quiz_attempts_student_lesson_finalized').using(
      'btree',
      table.studentId.asc().nullsLast(),
      table.lessonId.asc().nullsLast(),
      table.finalizedAt.desc().nullsFirst(),
    ),
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [courses.id],
      name: 'quiz_attempts_course_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.lessonId],
      foreignColumns: [courseLessons.id],
      name: 'quiz_attempts_lesson_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [users.id],
      name: 'quiz_attempts_student_id_fkey',
    }).onDelete('cascade'),
    unique('quiz_attempts_student_lesson_attempt_unique').on(
      table.lessonId,
      table.studentId,
      table.attemptNumber,
    ),
    check('quiz_attempts_attempt_number_check', sql`attempt_number > 0`),
    check(
      'quiz_attempts_score_percentage_check',
      sql`(score_percentage >= 0) AND (score_percentage <= 100)`,
    ),
    check('quiz_attempts_scored_points_check', sql`scored_points >= 0`),
    check('quiz_attempts_total_points_check', sql`total_points >= 0`),
  ],
)

export const academyContent = pgTable(
  'academy_content',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    title: text().notNull(),
    description: text(),
    contentType: text('content_type').notNull(),
    category: text().notNull(),
    videoUrl: text('video_url'),
    articleContent: text('article_content'),
    thumbnailUrl: text('thumbnail_url'),
    durationMinutes: integer('duration_minutes'),
    difficulty: text().default('beginner').notNull(),
    orderIndex: integer('order_index').default(0).notNull(),
    isPublished: boolean('is_published').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_academy_content_category').using('btree', table.category.asc().nullsLast()),
    index('idx_academy_content_order').using('btree', table.orderIndex.asc().nullsLast()),
    index('idx_academy_content_published').using('btree', table.isPublished.asc().nullsLast()),
    check(
      'academy_content_category_check',
      sql`category = ANY (ARRAY['getting_started'::text, 'course_creation'::text, 'marketing'::text, 'sales'::text, 'analytics'::text, 'best_practices'::text])`,
    ),
    check(
      'academy_content_content_type_check',
      sql`content_type = ANY (ARRAY['video'::text, 'article'::text, 'quiz'::text, 'resource'::text])`,
    ),
    check(
      'academy_content_difficulty_check',
      sql`difficulty = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text])`,
    ),
  ],
)

export const academyProgress = pgTable(
  'academy_progress',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    contentId: uuid('content_id').notNull(),
    completed: boolean().default(false).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    progressPercentage: integer('progress_percentage').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_academy_progress_completed').using('btree', table.completed.asc().nullsLast()),
    index('idx_academy_progress_content').using('btree', table.contentId.asc().nullsLast()),
    foreignKey({
      columns: [table.contentId],
      foreignColumns: [academyContent.id],
      name: 'academy_progress_content_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'academy_progress_user_id_fkey',
    }).onDelete('cascade'),
    unique('academy_progress_user_id_content_id_key').on(table.userId, table.contentId),
    check(
      'academy_progress_progress_percentage_check',
      sql`(progress_percentage >= 0) AND (progress_percentage <= 100)`,
    ),
  ],
)
