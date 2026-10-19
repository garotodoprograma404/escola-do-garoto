import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { and, count, eq, inArray, isNull } from 'drizzle-orm'
import { ENV } from '../../config/config.module.js'
import type { Env } from '../../config/env.js'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import {
  courseAudits,
  courses,
  enrollments,
  profiles,
  userRoles,
} from '../../database/schema/index.js'
import { AuditService } from '../audit/audit.service.js'
import { NotificationsService } from '../notifications/notifications.service.js'
import { courseDataFromComplete, courseDataFromDraft } from '../producer-courses/course-data.js'
import {
  insertCourseRow,
  recalculateCourseTotals,
  rethrowCourseWriteError,
  setCurriculumPublished,
  syncCurriculum,
  type CourseAdminSettings,
} from '../producer-courses/course-graph.js'
import { ProducerCoursesService } from '../producer-courses/producer-courses.service.js'
import { toCents } from '../producer-courses/course-input.schemas.js'
import type {
  AdminCourseEditorSettings,
  ApproveBody,
  ArchiveBody,
  CreateCompleteCourseBody,
  CreateCourseByAdminBody,
  EditCourseBody,
  EnrollStudentBody,
  MoveToDraftBody,
  RejectBody,
  RequestChangesBody,
  SaveDraftCourseBody,
  UpdateCompleteCourseBody,
} from './admin-courses.schemas.js'
import { buildAuditNotification, type CourseAuditDecision } from './audit-notification.js'

/** De onde veio a ação (vai para a trilha de auditoria). */
export type RequestContext = { ipAddress?: string | null; userAgent?: string | null }

type CourseRow = { id: number; title: string; producerId: string; status: string }

/** Escritas do painel admin de cursos. Toda rota que chega aqui já exige `@Roles(['admin'])`. */
@Injectable()
export class AdminCoursesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ProducerCoursesService) private readonly producerCourses: ProducerCoursesService,
  ) {}

  // ---- Decisões de moderação -------------------------------------------------------------------

  private async lockCourse(tx: DbExecutor, courseId: number): Promise<CourseRow> {
    const [course] = await tx
      .select({
        id: courses.id,
        title: courses.title,
        producerId: courses.producerId,
        status: courses.status,
      })
      .from(courses)
      .where(eq(courses.id, courseId))
      .for('update')
    if (!course) throw new NotFoundException('Curso não encontrado')
    return course
  }

  /** Registra a decisão, avisa o produtor e deixa rastro na auditoria, tudo na mesma transação. */
  private async recordDecision(
    tx: DbExecutor,
    admin: SessionUser,
    ctx: RequestContext,
    course: CourseRow,
    decision: CourseAuditDecision,
    details: {
      feedback?: string | null
      changesRequested?: string[] | null
      from: string
      to: string
    },
  ) {
    await tx.insert(courseAudits).values({
      courseId: course.id,
      auditorId: admin.id,
      decision,
      feedback: details.feedback ?? null,
      changesRequested: details.changesRequested ?? null,
    })
    await this.notifications.create(
      {
        userId: course.producerId,
        ...buildAuditNotification({
          courseId: course.id,
          courseTitle: course.title,
          decision,
          feedback: details.feedback,
          changesRequested: details.changesRequested,
        }),
      },
      tx,
    )
    await this.audit.log(
      {
        userId: admin.id,
        action: decision === 'approved' ? 'approve' : decision === 'rejected' ? 'reject' : 'update',
        resourceType: 'course',
        resourceId: course.id,
        changes: { status: { from: details.from, to: details.to } },
        metadata: { decision, feedback: details.feedback ?? null },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      tx,
    )
  }

  async approve(admin: SessionUser, ctx: RequestContext, courseId: number, body: ApproveBody) {
    await this.db.transaction(async (tx) => {
      const course = await this.lockCourse(tx, courseId)
      if (course.status === 'approved') throw new ConflictException('Curso já está aprovado')
      if (course.status === 'archived') {
        throw new ConflictException('Cursos arquivados não podem ser aprovados.')
      }
      // Só se aprova o que foi enviado para revisão (rascunho/rejeitado não passou pelas validações).
      if (course.status !== 'pending_review') {
        throw new ConflictException('Só cursos em revisão podem ser aprovados.')
      }
      const now = new Date()
      await tx
        .update(courses)
        .set({ status: 'approved', isPublished: true, publishedAt: now, updatedAt: now })
        .where(eq(courses.id, courseId))
      // Módulos e aulas ficam visíveis junto com o curso.
      await setCurriculumPublished(tx, courseId, true)
      await this.recordDecision(tx, admin, ctx, course, 'approved', {
        feedback: body.feedback || null,
        from: course.status,
        to: 'approved',
      })
    })
    return { success: true }
  }

  async reject(admin: SessionUser, ctx: RequestContext, courseId: number, body: RejectBody) {
    await this.db.transaction(async (tx) => {
      const course = await this.lockCourse(tx, courseId)
      if (course.status === 'archived') {
        throw new ConflictException('Cursos arquivados não podem ser rejeitados.')
      }
      await tx
        .update(courses)
        .set({ status: 'rejected', isPublished: false, updatedAt: new Date() })
        .where(eq(courses.id, courseId))
      await this.recordDecision(tx, admin, ctx, course, 'rejected', {
        feedback: body.reason,
        from: course.status,
        to: 'rejected',
      })
    })
    return { success: true }
  }

  /** Pede ajustes: o curso volta para rascunho (o produtor edita e reenvia). */
  async requestChanges(
    admin: SessionUser,
    ctx: RequestContext,
    courseId: number,
    body: RequestChangesBody,
  ) {
    await this.db.transaction(async (tx) => {
      const course = await this.lockCourse(tx, courseId)
      if (course.status === 'archived') {
        throw new ConflictException('Cursos arquivados não podem receber pedidos de alteração.')
      }
      await tx
        .update(courses)
        .set({ status: 'draft', isPublished: false, updatedAt: new Date() })
        .where(eq(courses.id, courseId))
      await this.recordDecision(tx, admin, ctx, course, 'changes_requested', {
        feedback: body.feedback,
        changesRequested: body.changes,
        from: course.status,
        to: 'draft',
      })
    })
    return { success: true }
  }

  async moveToDraft(
    admin: SessionUser,
    ctx: RequestContext,
    courseId: number,
    body: MoveToDraftBody,
  ) {
    await this.db.transaction(async (tx) => {
      const course = await this.lockCourse(tx, courseId)
      await tx
        .update(courses)
        .set({ status: 'draft', isPublished: false, publishedAt: null, updatedAt: new Date() })
        .where(eq(courses.id, courseId))
      await this.recordDecision(tx, admin, ctx, course, 'changes_requested', {
        feedback: body.reason?.trim() || 'Curso retornado para rascunho pelo administrador',
        from: course.status,
        to: 'draft',
      })
    })
    return { success: true }
  }

  /**
   * Tira o curso do ar sem apagar nada: quem já está matriculado continua com acesso, mas o curso
   * some do catálogo. Para voltar, o admin move o curso para rascunho.
   */
  async archive(admin: SessionUser, ctx: RequestContext, courseId: number, body: ArchiveBody) {
    await this.db.transaction(async (tx) => {
      const course = await this.lockCourse(tx, courseId)
      if (course.status === 'archived') throw new ConflictException('Curso já está arquivado.')
      await tx
        .update(courses)
        .set({ status: 'archived', isPublished: false, updatedAt: new Date() })
        .where(eq(courses.id, courseId))
      const reason = body.reason?.trim()
      await this.notifications.create(
        {
          userId: course.producerId,
          type: 'course_update',
          title: 'Curso arquivado',
          message: `Seu curso "${course.title}" foi arquivado e saiu do catálogo.${reason ? ` Motivo: ${reason}` : ''}`,
          link: `/producer/courses/${course.id}`,
          metadata: {
            course_id: String(course.id),
            decision: 'archived',
            feedback: reason ?? null,
          },
        },
        tx,
      )
      await this.audit.log(
        {
          userId: admin.id,
          action: 'update',
          resourceType: 'course',
          resourceId: course.id,
          changes: { status: { from: course.status, to: 'archived' } },
          metadata: { decision: 'archived', reason: reason ?? null },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
        tx,
      )
    })
    return { success: true }
  }

  // ---- Matrícula manual ------------------------------------------------------------------------

  /** Matricula um aluno sem pagamento. Cria o papel de aluno se a pessoa ainda não tiver. */
  async enrollStudent(
    admin: SessionUser,
    ctx: RequestContext,
    courseId: number,
    body: EnrollStudentBody,
  ) {
    await this.db.transaction(async (tx) => {
      // Trava o curso: dois admins matriculando ao mesmo tempo não desencontram `total_students`.
      const course = await this.lockCourse(tx, courseId)

      const [student] = await tx
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.id, body.studentId))
      if (!student) throw new NotFoundException('Usuário selecionado não foi encontrado')

      const [adminRole] = await tx
        .select({ id: userRoles.id })
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, body.studentId),
            eq(userRoles.role, 'admin'),
            eq(userRoles.isActive, true),
            isNull(userRoles.revokedAt),
          ),
        )
      if (adminRole) {
        throw new BadRequestException('Não é possível matricular um administrador como aluno')
      }

      // Papel de aluno: cria ou reativa (a tabela tem uma linha por usuário e papel).
      await tx
        .insert(userRoles)
        .values({ userId: body.studentId, role: 'student', grantedBy: admin.id })
        .onConflictDoUpdate({
          target: [userRoles.userId, userRoles.role],
          set: { isActive: true, revokedAt: null, revokedBy: null, updatedAt: new Date() },
          setWhere: eq(userRoles.isActive, false),
        })

      const [created] = await tx
        .insert(enrollments)
        .values({
          courseId,
          studentId: body.studentId,
          status: 'active',
          progressPercentage: 0,
          completedLessons: 0,
        })
        .onConflictDoNothing()
        .returning({ id: enrollments.id })
      if (!created) throw new ConflictException('Aluno já está matriculado neste curso')

      const [{ total }] = await tx
        .select({ total: count() })
        .from(enrollments)
        .where(eq(enrollments.courseId, courseId))
      await tx.update(courses).set({ totalStudents: total }).where(eq(courses.id, courseId))

      await this.audit.log(
        {
          userId: admin.id,
          action: 'create',
          resourceType: 'enrollment',
          resourceId: created.id,
          metadata: { courseId: course.id, studentId: body.studentId, manual: true },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
        tx,
      )
    })
    return { success: true }
  }

  // ---- Criação e edição ------------------------------------------------------------------------

  /** O dono do curso precisa ser alguém com papel de produtor (ou o próprio admin, no modo "eu"). */
  private async assertProducer(tx: DbExecutor, userId: string, allowAdmin = false) {
    const roles: Array<'producer' | 'admin'> = allowAdmin ? ['producer', 'admin'] : ['producer']
    const [row] = await tx
      .select({ id: userRoles.id })
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          inArray(userRoles.role, roles),
          eq(userRoles.isActive, true),
          isNull(userRoles.revokedAt),
        ),
      )
    if (!row) throw new BadRequestException('Produtor selecionado não é válido')
  }

  private async resolveOwner(
    tx: DbExecutor,
    admin: SessionUser,
    settings: AdminCourseEditorSettings,
  ): Promise<string> {
    if (settings.ownerMode === 'self') return admin.id
    await this.assertProducer(tx, settings.producerId!)
    return settings.producerId!
  }

  private toAdminSettings(settings: AdminCourseEditorSettings): CourseAdminSettings {
    return {
      isFeatured: settings.isFeatured,
      couponsEnabled: settings.couponsEnabled,
      priceLockedByAdmin: settings.priceLockedByAdmin,
      adminNotes: settings.adminNotes?.trim() || null,
    }
  }

  /** Modal "Novo curso": só os dados básicos (sem currículo), rascunho ou já publicado. */
  async createCourse(admin: SessionUser, ctx: RequestContext, body: CreateCourseByAdminBody) {
    try {
      const courseId = await this.db.transaction(async (tx) => {
        await this.assertProducer(tx, body.producerId)
        const publish = body.publishNow
        const created = await insertCourseRow(
          tx,
          {
            title: body.title,
            slug: body.slug,
            shortDescription: body.shortDescription?.trim() || null,
            description: body.description,
            categoryId: body.categoryId,
            level: body.level,
            thumbnailUrl: null,
            coverImageUrl: null,
            trailerUrl: null,
            price: toCents(body.price) / 100,
            discountPrice: typeof body.discountPrice === 'number' ? body.discountPrice : null,
            hasLifetimeAccess: true,
            hasCertificate: true,
            whatYouWillLearn: [],
            requirements: [],
            targetAudience: [],
            modules: [],
          },
          {
            producerId: body.producerId,
            status: publish ? 'approved' : 'draft',
            isPublished: publish,
            admin: {
              isFeatured: false,
              couponsEnabled: false,
              priceLockedByAdmin: false,
              adminNotes: null,
            },
          },
        )
        await this.audit.log(
          {
            userId: admin.id,
            action: 'create',
            resourceType: 'course',
            resourceId: created.id,
            metadata: { producerId: body.producerId, published: publish },
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
          },
          tx,
        )
        return created.id
      })
      return { courseId: String(courseId) }
    } catch (error) {
      return rethrowCourseWriteError(error)
    }
  }

  /** Assistente completo do admin: cria curso + currículo + quiz, já em revisão. */
  async createCompleteCourse(
    admin: SessionUser,
    ctx: RequestContext,
    body: CreateCompleteCourseBody,
  ) {
    const data = courseDataFromComplete(body.courseData, this.env.WEB_ORIGIN)
    try {
      const courseId = await this.db.transaction(async (tx) => {
        const ownerId = await this.resolveOwner(tx, admin, body.settings)
        const created = await insertCourseRow(
          tx,
          { ...data, categoryId: data.categoryId! },
          {
            producerId: ownerId,
            status: 'pending_review',
            admin: this.toAdminSettings(body.settings),
          },
        )
        await syncCurriculum(tx, created.id, data.modules)
        await recalculateCourseTotals(tx, created.id)
        await this.audit.log(
          {
            userId: admin.id,
            action: 'create',
            resourceType: 'course',
            resourceId: created.id,
            metadata: { producerId: ownerId },
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
          },
          tx,
        )
        return created.id
      })
      return { courseId: String(courseId) }
    } catch (error) {
      return rethrowCourseWriteError(error)
    }
  }

  async saveDraft(admin: SessionUser, ctx: RequestContext, body: SaveDraftCourseBody) {
    const data = courseDataFromDraft(body.courseData, this.env.WEB_ORIGIN)
    try {
      const courseId = await this.db.transaction(async (tx) => {
        const ownerId = await this.resolveOwner(tx, admin, body.settings)
        const categoryId = data.categoryId ?? (await this.producerCourses.firstActiveCategoryId(tx))
        if (!categoryId) {
          throw new BadRequestException('Nenhuma categoria ativa encontrada para salvar rascunho')
        }
        const slug = await this.producerCourses.freeSlug(tx, data.slug)
        const created = await insertCourseRow(
          tx,
          { ...data, slug, categoryId },
          { producerId: ownerId, status: 'draft', admin: this.toAdminSettings(body.settings) },
        )
        await syncCurriculum(tx, created.id, data.modules)
        await recalculateCourseTotals(tx, created.id)
        await this.audit.log(
          {
            userId: admin.id,
            action: 'create',
            resourceType: 'course',
            resourceId: created.id,
            metadata: { producerId: ownerId, draft: true },
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
          },
          tx,
        )
        return created.id
      })
      return { courseId: String(courseId) }
    } catch (error) {
      return rethrowCourseWriteError(error)
    }
  }

  /** Salva o assistente completo de um curso existente (qualquer dono). Arquivado não edita. */
  async updateCompleteCourse(
    admin: SessionUser,
    ctx: RequestContext,
    courseId: number,
    body: UpdateCompleteCourseBody,
  ) {
    const data = courseDataFromComplete(body.courseData, this.env.WEB_ORIGIN)
    try {
      await this.db.transaction(async (tx) => {
        const [current] = await tx
          .select({ status: courses.status, isPublished: courses.isPublished })
          .from(courses)
          .where(eq(courses.id, courseId))
          .for('update')
        if (!current) throw new NotFoundException('Curso não encontrado.')
        if (current.status === 'archived') {
          throw new ConflictException('Cursos arquivados não podem ser editados.')
        }
        const ownerId = await this.resolveOwner(tx, admin, body.settings)
        const publishCurriculum = current.status === 'approved' && current.isPublished === true

        const settings = this.toAdminSettings(body.settings)
        await tx
          .update(courses)
          .set({
            producerId: ownerId,
            title: data.title,
            slug: data.slug,
            shortDescription: data.shortDescription,
            description: data.description,
            categoryId: data.categoryId!,
            level: data.level,
            thumbnailUrl: data.thumbnailUrl,
            coverImageUrl: data.coverImageUrl,
            trailerUrl: data.trailerUrl,
            price: data.price,
            discountPrice: data.discountPrice,
            hasLifetimeAccess: data.hasLifetimeAccess,
            hasCertificate: data.hasCertificate,
            whatYouWillLearn: data.whatYouWillLearn,
            requirements: data.requirements,
            targetAudience: data.targetAudience,
            isFeatured: settings.isFeatured,
            couponsEnabled: settings.couponsEnabled,
            priceLockedByAdmin: settings.priceLockedByAdmin,
            adminNotes: settings.adminNotes,
            updatedAt: new Date(),
          })
          .where(eq(courses.id, courseId))

        if (!body.options?.skipCurriculumUpdate) {
          await syncCurriculum(tx, courseId, data.modules, { publish: publishCurriculum })
          await recalculateCourseTotals(tx, courseId)
        }
        await this.audit.log(
          {
            userId: admin.id,
            action: 'update',
            resourceType: 'course',
            resourceId: courseId,
            metadata: { producerId: ownerId, wizard: true },
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
          },
          tx,
        )
      })
    } catch (error) {
      return rethrowCourseWriteError(error)
    }
    return { success: true, slug: data.slug }
  }

  /** Modal "Editar curso" (dados básicos, preço, destaque, publicação). */
  async editCourse(
    admin: SessionUser,
    ctx: RequestContext,
    courseId: number,
    body: EditCourseBody,
  ) {
    try {
      await this.db.transaction(async (tx) => {
        const [current] = await tx
          .select({
            status: courses.status,
            isPublished: courses.isPublished,
            publishedAt: courses.publishedAt,
          })
          .from(courses)
          .where(eq(courses.id, courseId))
          .for('update')
        if (!current) throw new NotFoundException('Curso não encontrado')
        await this.assertProducer(tx, body.producerId, true)

        const publish = body.isPublished
        const alreadyLive = current.status === 'approved' && current.isPublished
        await tx
          .update(courses)
          .set({
            producerId: body.producerId,
            title: body.title,
            slug: body.slug,
            level: body.level,
            shortDescription: body.shortDescription?.trim() || null,
            description: body.description,
            thumbnailUrl: body.thumbnailUrl?.trim() || null,
            coverImageUrl: body.coverImageUrl?.trim() || null,
            trailerUrl: body.trailerUrl?.trim() || null,
            categoryId: body.categoryId,
            isFeatured: body.isFeatured,
            isPublished: publish,
            // Publicado = aprovado; não publicado = rascunho.
            status: publish ? 'approved' : 'draft',
            publishedAt: publish ? (alreadyLive ? current.publishedAt : new Date()) : null,
            price: body.price,
            discountPrice: body.discountPrice || null,
            priceLockedByAdmin: body.priceLocked,
            couponsEnabled: body.couponsEnabled,
            adminNotes: body.adminNotes ?? null,
            updatedAt: new Date(),
          })
          .where(eq(courses.id, courseId))
        if (publish && !alreadyLive) await setCurriculumPublished(tx, courseId, true)

        await this.audit.log(
          {
            userId: admin.id,
            action: 'update',
            resourceType: 'course',
            resourceId: courseId,
            changes: { status: { from: current.status, to: publish ? 'approved' : 'draft' } },
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
          },
          tx,
        )
      })
    } catch (error) {
      return rethrowCourseWriteError(error)
    }
    return { success: true }
  }
}
