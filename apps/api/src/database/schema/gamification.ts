import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { courses } from './courses.js'
import { users } from './users.js'

/**
 * Gamificação do aluno: cada ponto ganho vira uma linha em `xp_events` (com a origem, para nunca
 * pontuar duas vezes a mesma coisa); `user_gamification` guarda os totais já calculados e
 * `user_badges` as medalhas. O catálogo de medalhas e as regras de pontos vivem no código
 * (`modules/gamification/gamification.rules.ts`).
 */
export const xpEvents = pgTable(
  'xp_events',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'xp_events_id_seq' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Curso de onde veio o ponto (ranking por curso). Nulo para pontos gerais, como a sequência. */
    courseId: bigint('course_id', { mode: 'number' }).references(() => courses.id, {
      onDelete: 'set null',
    }),
    /** `lesson_completed`, `quiz_passed`, `quiz_perfect`, `course_completed`, `review`, `question`, `streak_day`. */
    source: varchar({ length: 30 }).notNull(),
    /** Identifica o fato (id da aula, do curso, data...): o mesmo fato nunca pontua duas vezes. */
    sourceKey: varchar('source_key', { length: 100 }).notNull(),
    points: integer().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('xp_events_user_source_key').on(table.userId, table.source, table.sourceKey),
    index('xp_events_course_created_idx').on(table.courseId, table.createdAt),
    index('xp_events_user_created_idx').on(table.userId, table.createdAt),
    check('xp_events_points_positive', sql`${table.points} > 0`),
  ],
)

export const userBadges = pgTable(
  'user_badges',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    badgeType: varchar('badge_type', { length: 50 }).notNull(),
    badgeName: varchar('badge_name', { length: 100 }).notNull(),
    badgeDescription: text('badge_description'),
    earnedAt: timestamp('earned_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_user_badges_user_id').using('btree', table.userId.asc().nullsLast()),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'user_badges_user_id_fkey',
    }).onDelete('cascade'),
    // Cada medalha uma vez por pessoa.
    unique('user_badges_user_id_badge_type_key').on(table.userId, table.badgeType),
  ],
)

export const userGamification = pgTable(
  'user_gamification',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    level: integer().default(1).notNull(),
    xp: integer().default(0).notNull(),
    streakDays: integer('streak_days').default(0).notNull(),
    lastActivityDate: date('last_activity_date'),
    totalWatchTimeMinutes: integer('total_watch_time_minutes').default(0).notNull(),
    coursesCompleted: integer('courses_completed').default(0).notNull(),
    /** O aluno pode sair do ranking dos cursos (preferência dele). */
    rankingOptOut: boolean('ranking_opt_out').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'user_gamification_user_id_fkey',
    }).onDelete('cascade'),
    unique('user_gamification_user_id_key').on(table.userId),
  ],
)
