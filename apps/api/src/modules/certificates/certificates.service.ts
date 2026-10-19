import { createHash } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import {
  certificateEvents,
  certificateTemplates,
  certificateTemplateVersions,
  certificates,
  courseCertificateTemplates,
  courses,
  enrollments,
  profiles,
} from '../../database/schema/index.js'
import { FilesService } from '../files/files.service.js'
import { parseCertificateBuilderSchema, type CertificateBuilderSchema } from './builder-schema.js'
import { ENV } from '../../config/config.module.js'
import type { Env } from '../../config/env.js'
import { generateCertificateCode } from './certificate-code.js'
import { formatIssueDate, toWorkloadText, type CertificatePayload } from './certificate-payload.js'
import { renderCertificatePdfBuffer } from './certificate-pdf.renderer.js'
import { renderCertificatePreviewDocument } from './certificate-preview.renderer.js'

type IssueMode = (typeof certificates.$inferSelect)['issueMode']
type CertificateStatus = (typeof certificates.$inferSelect)['status']
type EventType = (typeof certificateEvents.$inferSelect)['eventType']

export interface IssueCertificateInput {
  enrollmentId: number
  issueMode: IssueMode
  /** Admin que emitiu (nulo na emissão automática). Sempre o usuário da sessão, nunca do cliente. */
  issuedByUserId?: string | null
  source?: string
  /** Reemissão com código novo: o certificado que está sendo substituído. */
  replacing?: { id: number; status: CertificateStatus; reason: string | null }
}

export interface IssueCertificateResult {
  status: 'issued' | 'already_exists' | 'skipped' | 'failed'
  reason?: string
  certificateId?: number
  certificateCode?: string
}

const MAX_CODE_ATTEMPTS = 5

function toEventType(issueMode: IssueMode): EventType {
  if (issueMode === 'manual') return 'issued_manual'
  if (issueMode === 'reissue') return 'reissued_new_code'
  return 'issued_automatic'
}

function buildIssuedFilePath(code: string, date: Date, revision?: number): string {
  const year = String(date.getUTCFullYear())
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `issued/${year}/${month}/${code}${revision ? `-r${revision}` : ''}.pdf`
}

/** Erro do Postgres "violação de unique" (`23505`) com o nome da constraint, mesmo embrulhado. */
function uniqueViolation(error: unknown): string | null {
  let current: unknown = error
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
    const candidate = current as { code?: unknown; constraint?: unknown; cause?: unknown }
    if (candidate.code === '23505') {
      return typeof candidate.constraint === 'string' ? candidate.constraint : ''
    }
    current = candidate.cause
  }
  return null
}

function isPayload(value: unknown): value is CertificatePayload {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    ['student_name', 'course_title', 'issue_date', 'certificate_code', 'workload_hours'] as const
  ).every((key) => typeof record[key] === 'string')
}

/** A matrícula deixou de ser elegível (cancelada/reembolsada) durante a emissão. */
class IneligibleEnrollmentError extends Error {}

/** Tudo que o PDF e o registro precisam, já resolvido (modelo, versão, aluno, curso). */
interface IssueContext {
  enrollment: {
    id: number
    studentId: string
    courseId: number
    status: (typeof enrollments.$inferSelect)['status']
    completedAt: Date | null
    progressPercentage: number
  }
  course: { title: string; totalDurationMinutes: number; status: string }
  template: { id: number; name: string }
  version: { id: number; versionNumber: number }
  schema: CertificateBuilderSchema
  studentName: string
}

/**
 * Emissão, reemissão e revogação de certificados. É o ÚNICO ponto que escreve em `certificates` e
 * `certificate_events`. O módulo do aluno chama `issueForCompletedEnrollment` ao concluir o curso.
 */
@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name)

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(FilesService) private readonly files: FilesService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /**
   * PONTO DE INTEGRAÇÃO com o módulo do aluno: emite o certificado automático de uma matrícula que
   * acabou de ser concluída. Idempotente (um certificado ativo por matrícula: chamar de novo devolve
   * `already_exists`, mesmo com chamadas simultâneas) e NUNCA lança: qualquer problema vira
   * `{ status: 'failed' | 'skipped', reason }`, para não derrubar a conclusão do curso.
   * Chame DEPOIS de confirmar (commit) a conclusão da matrícula, não dentro da transação dela.
   */
  async issueForCompletedEnrollment(enrollmentId: number): Promise<IssueCertificateResult> {
    try {
      return await this.issue({
        enrollmentId,
        issueMode: 'automatic',
        source: 'student_progress_completion',
      })
    } catch (error) {
      this.logger.error(
        `Falha inesperada na emissão automática (matrícula ${enrollmentId}): ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      )
      return { status: 'failed', reason: 'Não foi possível emitir o certificado agora' }
    }
  }

  /** Emissão manual feita por um admin (a rota já exige o papel). Falha de regra vira 422. */
  async issueManually(adminId: string, enrollmentId: number, source?: string) {
    const result = await this.issue({
      enrollmentId,
      issueMode: 'manual',
      issuedByUserId: adminId,
      source: source || 'admin_manual_action',
    })
    if (result.status === 'issued' || result.status === 'already_exists') return result
    throw new UnprocessableEntityException(result.reason ?? 'Não foi possível emitir o certificado')
  }

  /** Revoga um certificado ATIVO (irreversível no mesmo registro) e registra o evento. */
  async revoke(adminId: string, certificateId: number, reason: string) {
    return this.db.transaction(async (tx) => {
      const [target] = await tx
        .select({
          id: certificates.id,
          enrollmentId: certificates.enrollmentId,
          status: certificates.status,
        })
        .from(certificates)
        .where(eq(certificates.id, certificateId))
        .for('update')
      if (!target) throw new NotFoundException('Certificado não encontrado')
      if (target.status !== 'active') {
        throw new BadRequestException('Somente certificados ativos podem ser revogados')
      }

      const now = new Date()
      await tx
        .update(certificates)
        .set({ status: 'revoked', revokedAt: now, revokedReason: reason, updatedAt: now })
        .where(and(eq(certificates.id, target.id), eq(certificates.status, 'active')))

      await tx.insert(certificateEvents).values({
        certificateId: target.id,
        enrollmentId: target.enrollmentId,
        eventType: 'revoked',
        actorUserId: adminId,
        previousStatus: 'active',
        newStatus: 'revoked',
        reason,
        payload: { source: 'admin_certificate_revoke_action' },
        eventAt: now,
      })

      // Só existe um ativo por matrícula; revogado ele, a matrícula fica sem certificado válido.
      await tx
        .update(enrollments)
        .set({ certificateUrl: null, updatedAt: now })
        .where(eq(enrollments.id, target.enrollmentId))

      return { certificateId: target.id }
    })
  }

  /**
   * Reemissão pelo admin. Padrão: NOVO código (o antigo, se ativo, vira `replaced` e o novo aponta
   * para ele em `replaced_from_id`). Com `sameCode`: só gera o arquivo de novo, mantendo o código.
   */
  async reissue(
    adminId: string,
    certificateId: number,
    options: { reason: string | null; sameCode: boolean },
  ) {
    const [source] = await this.db
      .select({
        id: certificates.id,
        enrollmentId: certificates.enrollmentId,
        status: certificates.status,
        code: certificates.code,
        filePath: certificates.filePath,
        templateId: certificates.templateId,
        templateVersionId: certificates.templateVersionId,
        payloadSnapshot: certificates.payloadSnapshot,
      })
      .from(certificates)
      .where(eq(certificates.id, certificateId))
    if (!source) throw new NotFoundException('Certificado de origem não encontrado')

    if (options.sameCode) return this.regenerateFile(adminId, source, options.reason)

    const result = await this.issue({
      enrollmentId: source.enrollmentId,
      issueMode: 'reissue',
      issuedByUserId: adminId,
      source: 'admin_reissue_action',
      replacing: { id: source.id, status: source.status, reason: options.reason },
    })
    if (result.status !== 'issued' || !result.certificateId) {
      throw new UnprocessableEntityException(
        result.reason ?? 'Não foi possível reemitir o certificado',
      )
    }
    return { certificateId: result.certificateId, certificateCode: result.certificateCode ?? null }
  }

  // ---------------------------------------------------------------------------------------------
  // Emissão (núcleo)
  // ---------------------------------------------------------------------------------------------

  private async issue(input: IssueCertificateInput): Promise<IssueCertificateResult> {
    const issueDate = new Date()

    const [enrollment] = await this.db
      .select({
        id: enrollments.id,
        studentId: enrollments.studentId,
        courseId: enrollments.courseId,
        status: enrollments.status,
        completedAt: enrollments.completedAt,
        progressPercentage: enrollments.progressPercentage,
      })
      .from(enrollments)
      .where(eq(enrollments.id, input.enrollmentId))
    if (!enrollment) return { status: 'failed', reason: 'Matrícula não encontrada' }

    // Matrícula cancelada/reembolsada nunca recebe certificado.
    if (enrollment.status === 'cancelled' || enrollment.status === 'refunded') {
      return {
        status: 'skipped',
        reason: 'Matrícula cancelada ou reembolsada não gera certificado',
      }
    }

    const eligible =
      enrollment.status === 'completed' ||
      enrollment.progressPercentage >= 100 ||
      enrollment.completedAt !== null
    if (!eligible) {
      return { status: 'skipped', reason: 'Matrícula ainda não concluiu os critérios de emissão' }
    }

    const [existing] = await this.db
      .select({ id: certificates.id, code: certificates.code })
      .from(certificates)
      .where(and(eq(certificates.enrollmentId, enrollment.id), eq(certificates.status, 'active')))
    // Na reemissão o ativo da matrícula é o próprio certificado que está sendo substituído.
    if (existing && existing.id !== input.replacing?.id) {
      return {
        status: 'already_exists',
        certificateId: existing.id,
        certificateCode: existing.code,
        reason: 'Já existe certificado ativo para esta matrícula',
      }
    }

    const loaded = await this.loadContext(enrollment)
    if ('status' in loaded) return loaded
    const context = loaded

    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      const code = generateCertificateCode(this.env.CERTIFICATE_CODE_PREFIX, issueDate)
      const [taken] = await this.db
        .select({ id: certificates.id })
        .from(certificates)
        .where(eq(certificates.code, code))
      if (taken) continue

      const payload: CertificatePayload = {
        student_name: context.studentName,
        course_title: context.course.title,
        issue_date: formatIssueDate(issueDate),
        certificate_code: code,
        workload_hours: toWorkloadText(context.course.totalDurationMinutes),
      }
      const pdf = renderCertificatePdfBuffer({ schema: context.schema, payload })
      const filePath = buildIssuedFilePath(code, issueDate)
      await this.files.putObject('certificates', filePath, pdf)

      try {
        const certificateId = await this.persistIssued({
          input,
          context,
          code,
          payload,
          pdf,
          filePath,
          issueDate,
        })
        return { status: 'issued', certificateId, certificateCode: code }
      } catch (error) {
        await this.files.removeObject('certificates', filePath).catch(() => undefined)

        if (error instanceof IneligibleEnrollmentError) {
          return {
            status: 'skipped',
            reason: 'Matrícula cancelada ou reembolsada não gera certificado',
          }
        }

        const constraint = uniqueViolation(error)
        if (constraint === 'uq_certificates_enrollment_active') {
          // Outra chamada emitiu primeiro: o resultado é o certificado dela (idempotência).
          const [winner] = await this.db
            .select({ id: certificates.id, code: certificates.code })
            .from(certificates)
            .where(
              and(eq(certificates.enrollmentId, enrollment.id), eq(certificates.status, 'active')),
            )
          return {
            status: 'already_exists',
            certificateId: winner?.id,
            certificateCode: winner?.code,
            reason: 'Certificado ativo já foi emitido para esta matrícula',
          }
        }
        if (constraint === 'certificates_code_key') continue
        throw error
      }
    }

    return { status: 'failed', reason: 'Não foi possível gerar um código único de certificado' }
  }

  /** Carrega curso, modelo ativo do curso, versão e nome do aluno. Devolve o motivo se não der. */
  private async loadContext(
    enrollment: IssueContext['enrollment'],
  ): Promise<IssueContext | IssueCertificateResult> {
    const [course] = await this.db
      .select({
        title: courses.title,
        totalDurationMinutes: courses.totalDurationMinutes,
        hasCertificate: courses.hasCertificate,
        status: courses.status,
      })
      .from(courses)
      .where(eq(courses.id, enrollment.courseId))
    if (!course) return { status: 'failed', reason: 'Curso da matrícula não encontrado' }
    if (!course.hasCertificate) {
      return { status: 'skipped', reason: 'Curso desabilitado para emissão de certificado' }
    }

    const [binding] = await this.db
      .select({
        templateId: courseCertificateTemplates.templateId,
        templateVersionId: courseCertificateTemplates.templateVersionId,
      })
      .from(courseCertificateTemplates)
      .where(
        and(
          eq(courseCertificateTemplates.courseId, enrollment.courseId),
          eq(courseCertificateTemplates.isActive, true),
        ),
      )
    if (!binding) return { status: 'failed', reason: 'Curso sem modelo ativo de certificado' }

    const [template] = await this.db
      .select({
        id: certificateTemplates.id,
        name: certificateTemplates.name,
        status: certificateTemplates.status,
        orientation: certificateTemplates.orientation,
        pageSize: certificateTemplates.pageSize,
      })
      .from(certificateTemplates)
      .where(eq(certificateTemplates.id, binding.templateId))
    if (!template) return { status: 'failed', reason: 'Modelo de certificado não encontrado' }
    if (template.status !== 'published') {
      return { status: 'failed', reason: 'Modelo de certificado ainda não está publicado' }
    }

    const [version] = await this.db
      .select({
        id: certificateTemplateVersions.id,
        versionNumber: certificateTemplateVersions.versionNumber,
        schemaJson: certificateTemplateVersions.schemaJson,
      })
      .from(certificateTemplateVersions)
      .where(
        and(
          eq(certificateTemplateVersions.id, binding.templateVersionId),
          eq(certificateTemplateVersions.templateId, binding.templateId),
        ),
      )
    if (!version) return { status: 'failed', reason: 'Versão ativa do modelo não encontrada' }

    const [profile] = await this.db
      .select({ fullName: profiles.fullName })
      .from(profiles)
      .where(eq(profiles.id, enrollment.studentId))

    return {
      enrollment,
      course: {
        title: course.title,
        totalDurationMinutes: course.totalDurationMinutes,
        status: course.status,
      },
      template: { id: template.id, name: template.name },
      version: { id: version.id, versionNumber: version.versionNumber },
      schema: parseCertificateBuilderSchema(version.schemaJson, {
        orientation: template.orientation === 'portrait' ? 'portrait' : 'landscape',
        pageSize: template.pageSize,
      }),
      studentName: profile?.fullName.trim() || 'Aluno',
    }
  }

  /** Grava certificado + evento(s) + `enrollments.certificate_url` de uma vez só. */
  private async persistIssued(params: {
    input: IssueCertificateInput
    context: IssueContext
    code: string
    payload: CertificatePayload
    pdf: Buffer
    filePath: string
    issueDate: Date
  }): Promise<number> {
    const { input, context, code, payload, pdf, filePath, issueDate } = params
    const { enrollment, template, version, schema } = context
    const issueDateIso = issueDate.toISOString()
    const source = input.source || 'certificate_engine_v1'

    const integrityHash = createHash('sha256')
      .update(
        JSON.stringify({
          code,
          payload,
          schema,
          issueDateIso,
          templateVersionId: version.id,
        }),
      )
      .digest('hex')

    // O retrato HTML guarda os CAMINHOS das imagens (em `schema.background`), não links assinados:
    // link assinado expira e não deve ficar gravado no banco.
    const htmlSnapshot = renderCertificatePreviewDocument({
      templateName: template.name,
      schema,
      assetUrls: { imageUrl: null, primarySignatureUrl: null, secondarySignatureUrl: null },
      payload,
    })

    const payloadSnapshot = {
      version: 1,
      template: {
        id: template.id,
        name: template.name,
        versionId: version.id,
        versionNumber: version.versionNumber,
      },
      enrollment: {
        id: enrollment.id,
        courseId: enrollment.courseId,
        studentId: enrollment.studentId,
        status: enrollment.status,
        completedAt: enrollment.completedAt?.toISOString() ?? null,
        progressPercentage: enrollment.progressPercentage,
      },
      payload,
      schema,
      htmlSnapshot,
      issuedAt: issueDateIso,
    }

    return this.db.transaction(async (tx) => {
      // Serializa emissões/reemissões da mesma matrícula e RELÊ o status já com o lock: um reembolso
      // confirmado entre a checagem de elegibilidade e este ponto não pode gerar certificado.
      const [locked] = await tx
        .select({ status: enrollments.status })
        .from(enrollments)
        .where(eq(enrollments.id, enrollment.id))
        .for('update')
      if (!locked || locked.status === 'cancelled' || locked.status === 'refunded') {
        throw new IneligibleEnrollmentError()
      }

      // Idem para o certificado que está sendo substituído: vale o status de agora, não o lido antes.
      let replacing: { id: number; status: CertificateStatus; reason: string | null } | undefined
      if (input.replacing) {
        const [current] = await tx
          .select({ status: certificates.status })
          .from(certificates)
          .where(eq(certificates.id, input.replacing.id))
          .for('update')
        if (!current) throw new NotFoundException('Certificado de origem não encontrado')
        replacing = { ...input.replacing, status: current.status }
      }
      if (replacing?.status === 'active') {
        await tx
          .update(certificates)
          .set({ status: 'replaced', updatedAt: issueDate })
          .where(and(eq(certificates.id, replacing.id), eq(certificates.status, 'active')))
      }

      const [created] = await tx
        .insert(certificates)
        .values({
          code,
          enrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          courseId: enrollment.courseId,
          templateId: template.id,
          templateVersionId: version.id,
          status: 'active',
          issueMode: input.issueMode,
          issuedBy: input.issuedByUserId ?? null,
          issuedAt: issueDate,
          replacedFromId: replacing?.id ?? null,
          filePath,
          fileMimeType: 'application/pdf',
          fileSizeBytes: pdf.byteLength,
          integrityHash,
          payloadSnapshot,
          metadata: { source, courseStatus: context.course.status },
        })
        .returning({ id: certificates.id })
      const certificateId = created!.id

      await tx.insert(certificateEvents).values({
        certificateId,
        enrollmentId: enrollment.id,
        eventType: toEventType(input.issueMode),
        actorUserId: input.issuedByUserId ?? null,
        previousStatus: null,
        newStatus: 'active',
        reason: null,
        payload: { code, issueMode: input.issueMode, source },
        eventAt: issueDate,
      })

      if (replacing) {
        await tx.insert(certificateEvents).values({
          certificateId: replacing.id,
          enrollmentId: enrollment.id,
          eventType: 'reissued_new_code',
          actorUserId: input.issuedByUserId ?? null,
          previousStatus: replacing.status,
          newStatus: replacing.status === 'active' ? 'replaced' : replacing.status,
          reason: replacing.reason,
          payload: {
            source,
            newCertificateId: certificateId,
            newCertificateCode: code,
          },
          eventAt: issueDate,
        })
      }

      await tx
        .update(enrollments)
        .set({ certificateUrl: filePath, updatedAt: issueDate })
        .where(eq(enrollments.id, enrollment.id))

      return certificateId
    })
  }

  /** Reemissão "mesmo código": novo PDF do mesmo certificado, com os mesmos dados da emissão. */
  private async regenerateFile(
    adminId: string,
    source: {
      id: number
      enrollmentId: number
      status: CertificateStatus
      code: string
      filePath: string | null
      templateId: number
      templateVersionId: number
      payloadSnapshot: unknown
    },
    reason: string | null,
  ) {
    if (source.status !== 'active') {
      throw new BadRequestException('Só é possível regerar o arquivo de um certificado ativo')
    }

    const snapshot = source.payloadSnapshot as { payload?: unknown } | null
    if (!isPayload(snapshot?.payload)) {
      throw new UnprocessableEntityException(
        'Certificado sem dados de emissão para regerar o arquivo',
      )
    }
    const payload = snapshot.payload

    const [row] = await this.db
      .select({
        schemaJson: certificateTemplateVersions.schemaJson,
        orientation: certificateTemplates.orientation,
        pageSize: certificateTemplates.pageSize,
      })
      .from(certificateTemplateVersions)
      .innerJoin(
        certificateTemplates,
        eq(certificateTemplates.id, certificateTemplateVersions.templateId),
      )
      .where(
        and(
          eq(certificateTemplateVersions.id, source.templateVersionId),
          eq(certificateTemplateVersions.templateId, source.templateId),
        ),
      )
    if (!row)
      throw new UnprocessableEntityException('Versão do modelo do certificado não encontrada')

    const schema = parseCertificateBuilderSchema(row.schemaJson, {
      orientation: row.orientation === 'portrait' ? 'portrait' : 'landscape',
      pageSize: row.pageSize,
    })
    const pdf = renderCertificatePdfBuffer({ schema, payload })
    const now = new Date()
    const newPath = buildIssuedFilePath(source.code, now, now.getTime())
    await this.files.putObject('certificates', newPath, pdf)

    try {
      await this.db.transaction(async (tx) => {
        const [current] = await tx
          .select({ status: certificates.status })
          .from(certificates)
          .where(eq(certificates.id, source.id))
          .for('update')
        if (current?.status !== 'active') {
          throw new ConflictException('O certificado deixou de estar ativo')
        }

        await tx
          .update(certificates)
          .set({ filePath: newPath, fileSizeBytes: pdf.byteLength, updatedAt: now })
          .where(eq(certificates.id, source.id))

        await tx.insert(certificateEvents).values({
          certificateId: source.id,
          enrollmentId: source.enrollmentId,
          eventType: 'reissued_same_code',
          actorUserId: adminId,
          previousStatus: 'active',
          newStatus: 'active',
          reason,
          payload: { source: 'admin_reissue_action', code: source.code },
          eventAt: now,
        })

        await tx
          .update(enrollments)
          .set({ certificateUrl: newPath, updatedAt: now })
          .where(eq(enrollments.id, source.enrollmentId))
      })
    } catch (error) {
      await this.files.removeObject('certificates', newPath).catch(() => undefined)
      throw error
    }

    if (source.filePath && source.filePath !== newPath) {
      await this.files.removeObject('certificates', source.filePath).catch(() => undefined)
    }
    return { certificateId: source.id, certificateCode: source.code }
  }
}
