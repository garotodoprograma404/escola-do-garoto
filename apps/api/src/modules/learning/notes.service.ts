import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { and, asc, desc, eq, gte, ilike, or, sql, type SQL } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import { courseLessons, courses, enrollments, lessonNotes } from '../../database/schema/index.js'
import { LearningAccessService } from './learning-access.service.js'
import type { CreateNoteInput, ListNotesQuery, UpdateNoteInput } from './learning.schemas.js'
import { toContainsPattern } from './like.js'

/** Forma que as telas "Minhas notas" esperam (snake_case, ids como texto). */
export type StudentNote = {
  id: string
  user_id: string
  lesson_id: string
  course_id: string
  title: string
  content: string
  video_timestamp: number | null
  created_at: Date
  updated_at: Date
  lesson_title: string
  course_title: string
  course_slug: string
}

/** Forma que a aba "Notas" do player espera (camelCase). */
export type PlayerNote = {
  id: string
  lessonId: number
  title: string
  content: string
  videoTimestamp: number | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Notas de aula do aluno. Dono = usuário da sessão em TODA consulta, para um aluno
 * nunca ler, editar nem apagar nota de outro. Criar exige matrícula ativa/concluída e que a aula
 * seja do curso informado.
 */
@Injectable()
export class NotesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(LearningAccessService) private readonly access: LearningAccessService,
  ) {}

  private noteFields = {
    id: lessonNotes.id,
    user_id: lessonNotes.userId,
    lesson_id: sql<string>`${lessonNotes.lessonId}::text`,
    course_id: sql<string>`${lessonNotes.courseId}::text`,
    title: lessonNotes.title,
    content: lessonNotes.content,
    video_timestamp: lessonNotes.videoTimestamp,
    created_at: lessonNotes.createdAt,
    updated_at: lessonNotes.updatedAt,
    lesson_title: courseLessons.title,
    course_title: courses.title,
    course_slug: courses.slug,
  }

  private filters(userId: string, query: Pick<ListNotesQuery, 'course' | 'search'>): SQL {
    const conditions: (SQL | undefined)[] = [eq(lessonNotes.userId, userId)]
    if (query.course) conditions.push(eq(lessonNotes.courseId, query.course))
    if (query.search) {
      const pattern = toContainsPattern(query.search)
      conditions.push(or(ilike(lessonNotes.title, pattern), ilike(lessonNotes.content, pattern)))
    }
    return and(...conditions)!
  }

  async listMyNotes(userId: string, query: ListNotesQuery) {
    const where = this.filters(userId, query)

    const [totalRow] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(lessonNotes)
      .where(where)
    const total = totalRow?.total ?? 0

    const notes = await this.db
      .select(this.noteFields)
      .from(lessonNotes)
      .innerJoin(courseLessons, eq(courseLessons.id, lessonNotes.lessonId))
      .innerJoin(courses, eq(courses.id, lessonNotes.courseId))
      .where(where)
      .orderBy(query.sort === 'oldest' ? asc(lessonNotes.createdAt) : desc(lessonNotes.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize)

    return {
      notes,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    }
  }

  async getStats(userId: string) {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [row] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        thisWeek: sql<number>`count(*) filter (where ${gte(lessonNotes.createdAt, oneWeekAgo)})::int`,
        courses: sql<number>`count(distinct ${lessonNotes.courseId})::int`,
        last: sql<Date | null>`max(${lessonNotes.createdAt})`,
      })
      .from(lessonNotes)
      .where(eq(lessonNotes.userId, userId))

    return {
      total_notes: row?.total ?? 0,
      notes_this_week: row?.thisWeek ?? 0,
      courses_with_notes: row?.courses ?? 0,
      last_note_date: row?.last ? new Date(row.last).toISOString() : null,
    }
  }

  async getNotesByCourse(userId: string) {
    const rows = await this.db
      .select({
        course_id: sql<string>`${lessonNotes.courseId}::text`,
        course_title: courses.title,
        course_slug: courses.slug,
        notes_count: sql<number>`count(*)::int`,
        last_note_date: sql<Date>`max(${lessonNotes.createdAt})`,
      })
      .from(lessonNotes)
      .innerJoin(courses, eq(courses.id, lessonNotes.courseId))
      .where(eq(lessonNotes.userId, userId))
      .groupBy(lessonNotes.courseId, courses.title, courses.slug)
      .orderBy(desc(sql`count(*)`))
    return rows.map((row) => ({
      ...row,
      last_note_date: new Date(row.last_note_date).toISOString(),
    }))
  }

  /** Cursos do aluno para o filtro da tela de notas (qualquer matrícula dele). */
  getCoursesForFilter(userId: string) {
    return this.db
      .select({
        id: sql<string>`${courses.id}::text`,
        title: courses.title,
        slug: courses.slug,
      })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .where(eq(enrollments.studentId, userId))
      .orderBy(desc(enrollments.createdAt))
  }

  async getNote(userId: string, noteId: string): Promise<StudentNote> {
    const [note] = await this.db
      .select(this.noteFields)
      .from(lessonNotes)
      .innerJoin(courseLessons, eq(courseLessons.id, lessonNotes.lessonId))
      .innerJoin(courses, eq(courses.id, lessonNotes.courseId))
      .where(and(eq(lessonNotes.id, noteId), eq(lessonNotes.userId, userId)))
      .limit(1)
    // Nota de outra pessoa "não existe": 404, nunca 403.
    if (!note) throw new NotFoundException('Anotação não encontrada')
    return note
  }

  /** Notas do aluno numa aula (aba "Notas" do player). */
  async listLessonNotes(userId: string, lessonId: number): Promise<PlayerNote[]> {
    return this.db
      .select({
        id: lessonNotes.id,
        lessonId: lessonNotes.lessonId,
        title: lessonNotes.title,
        content: lessonNotes.content,
        videoTimestamp: lessonNotes.videoTimestamp,
        createdAt: lessonNotes.createdAt,
        updatedAt: lessonNotes.updatedAt,
      })
      .from(lessonNotes)
      .where(and(eq(lessonNotes.userId, userId), eq(lessonNotes.lessonId, lessonId)))
      .orderBy(desc(lessonNotes.createdAt))
  }

  async createNote(userId: string, input: CreateNoteInput): Promise<{ id: string }> {
    await this.access.requireEnrolledLessonInCourse(userId, input.courseId, input.lessonId)
    const [created] = await this.db
      .insert(lessonNotes)
      .values({
        userId,
        lessonId: input.lessonId,
        courseId: input.courseId,
        title: input.title,
        content: input.content,
        videoTimestamp: input.videoTimestamp ?? null,
      })
      .returning({ id: lessonNotes.id })
    return { id: created!.id }
  }

  async updateNote(userId: string, noteId: string, input: UpdateNoteInput): Promise<void> {
    const updated = await this.db
      .update(lessonNotes)
      .set({
        title: input.title,
        content: input.content,
        videoTimestamp: input.videoTimestamp ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(lessonNotes.id, noteId), eq(lessonNotes.userId, userId)))
      .returning({ id: lessonNotes.id })
    if (updated.length === 0) throw new NotFoundException('Anotação não encontrada')
  }

  async deleteNote(userId: string, noteId: string): Promise<void> {
    const deleted = await this.db
      .delete(lessonNotes)
      .where(and(eq(lessonNotes.id, noteId), eq(lessonNotes.userId, userId)))
      .returning({ id: lessonNotes.id })
    if (deleted.length === 0) throw new NotFoundException('Anotação não encontrada')
  }
}
