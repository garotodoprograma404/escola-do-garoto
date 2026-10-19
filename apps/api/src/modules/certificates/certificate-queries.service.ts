import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { DB, type Database } from '../../database/database.module.js'
import {
  certificateEvents,
  certificateTemplates,
  certificates,
  courseCertificateTemplates,
  courses,
  enrollments,
  profiles,
} from '../../database/schema/index.js'
import { FilesService } from '../files/files.service.js'
import { CERTIFICATE_CODE_PATTERN, normalizeCertificateCode } from './certificate-code.js'

type CertificateStatus = (typeof certificates.$inferSelect)['status']
type IssueMode = (typeof certificates.$inferSelect)['issueMode']
type EventType = (typeof certificateEvents.$inferSelect)['eventType']

/** Mesmo formato (camelCase) que as telas já esperavam. */
export interface AdminIssuedCertificate {
  id: number
  code: string
  enrollmentId: number
  studentId: string
  courseId: number
  status: CertificateStatus
  issueMode: IssueMode
  issuedAt: string
  revokedAt: string | null
  revokedReason: string | null
  replacedFromId: number | null
  createdAt: string
  studentName: string
  courseTitle: string
}

export interface AdminCertificateEvent {
  id: number
  certificateId: number | null
  enrollmentId: number
  eventType: EventType
  actorUserId: string | null
  actorName: string | null
  previousStatus: CertificateStatus | null
  newStatus: CertificateStatus | null
  reason: string | null
  payload: unknown
  eventAt: string
}

/** Curso aprovado e o modelo de certificado ativo nele (se houver). */
export interface AdminCertificateCourse {
  id: number
  title: string
  templateId: number | null
  templateName: string | null
}

/** Matrícula de um curso, com a situação do certificado, para a emissão manual. */
export interface AdminCourseEnrollment {
  enrollmentId: number
  studentName: string
  status: (typeof enrollments.$inferSelect)['status']
  progressPercentage: number
  hasActiveCertificate: boolean
}

export interface StudentCertificate {
  id: number
  code: string
  status: CertificateStatus
  issueMode: IssueMode
  issuedAt: string
  issuedAtLabel: string
  issueDateLabel: string | null
  workloadLabel: string | null
  courseTitle: string
  courseSlug: string | null
  /** Rota da API que entrega o PDF (confere o dono a cada clique e redireciona para link assinado). */
  downloadUrl: string | null
}

type CertificateVerificationStatus = 'valid' | 'revoked' | 'replaced' | 'invalid' | 'not_found'

/** O que a verificação PÚBLICA mostra: nome, curso, datas e situação. Nada além disso. */
export interface PublicCertificateVerification {
  status: CertificateVerificationStatus
  certificateCode: string | null
  studentFullName: string | null
  courseTitle: string | null
  issuedAt: string | null
  revokedAt: string | null
}

/** Link assinado do PDF: vale só o tempo de o navegador seguir o redirecionamento. */
const DOWNLOAD_URL_TTL_SECONDS = 60

const ISSUED_AT_LABEL = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

const VERIFICATION_STATUS: Record<CertificateStatus, CertificateVerificationStatus> = {
  active: 'valid',
  revoked: 'revoked',
  replaced: 'replaced',
  issue_failed: 'invalid',
}

@Injectable()
export class CertificateQueriesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(FilesService) private readonly files: FilesService,
  ) {}

  /** Painel do admin: certificados emitidos (400 mais recentes) e a trilha de eventos deles. */
  async getAdminOperations(): Promise<{
    certificates: AdminIssuedCertificate[]
    events: AdminCertificateEvent[]
  }> {
    const rows = await this.db
      .select({
        id: certificates.id,
        code: certificates.code,
        enrollmentId: certificates.enrollmentId,
        studentId: certificates.studentId,
        courseId: certificates.courseId,
        status: certificates.status,
        issueMode: certificates.issueMode,
        issuedAt: certificates.issuedAt,
        revokedAt: certificates.revokedAt,
        revokedReason: certificates.revokedReason,
        replacedFromId: certificates.replacedFromId,
        createdAt: certificates.createdAt,
        studentName: profiles.fullName,
        courseTitle: courses.title,
      })
      .from(certificates)
      .leftJoin(profiles, eq(profiles.id, certificates.studentId))
      .leftJoin(courses, eq(courses.id, certificates.courseId))
      .orderBy(desc(certificates.issuedAt))
      .limit(400)

    if (rows.length === 0) return { certificates: [], events: [] }

    const actor = alias(profiles, 'actor')
    const eventRows = await this.db
      .select({
        id: certificateEvents.id,
        certificateId: certificateEvents.certificateId,
        enrollmentId: certificateEvents.enrollmentId,
        eventType: certificateEvents.eventType,
        actorUserId: certificateEvents.actorUserId,
        actorName: actor.fullName,
        previousStatus: certificateEvents.previousStatus,
        newStatus: certificateEvents.newStatus,
        reason: certificateEvents.reason,
        payload: certificateEvents.payload,
        eventAt: certificateEvents.eventAt,
      })
      .from(certificateEvents)
      .leftJoin(actor, eq(actor.id, certificateEvents.actorUserId))
      .where(
        inArray(certificateEvents.enrollmentId, [...new Set(rows.map((row) => row.enrollmentId))]),
      )
      .orderBy(desc(certificateEvents.eventAt))
      .limit(2000)

    return {
      certificates: rows.map((row) => ({
        id: row.id,
        code: row.code,
        enrollmentId: row.enrollmentId,
        studentId: row.studentId,
        courseId: row.courseId,
        status: row.status,
        issueMode: row.issueMode,
        issuedAt: row.issuedAt.toISOString(),
        revokedAt: row.revokedAt?.toISOString() ?? null,
        revokedReason: row.revokedReason?.trim() || null,
        replacedFromId: row.replacedFromId,
        createdAt: row.createdAt.toISOString(),
        studentName: row.studentName?.trim() || 'Aluno',
        courseTitle: row.courseTitle?.trim() || 'Curso',
      })),
      events: eventRows.map((row) => ({
        id: row.id,
        certificateId: row.certificateId,
        enrollmentId: row.enrollmentId,
        eventType: row.eventType,
        actorUserId: row.actorUserId,
        actorName: row.actorUserId ? row.actorName?.trim() || 'Admin' : null,
        previousStatus: row.previousStatus,
        newStatus: row.newStatus,
        reason: row.reason?.trim() || null,
        payload: row.payload,
        eventAt: row.eventAt.toISOString(),
      })),
    }
  }

  /** Cursos aprovados com o modelo ativo de cada um (a tela "ligar modelo ao curso"). */
  async getAdminCourses(): Promise<AdminCertificateCourse[]> {
    const rows = await this.db
      .select({
        id: courses.id,
        title: courses.title,
        templateId: certificateTemplates.id,
        templateName: certificateTemplates.name,
      })
      .from(courses)
      .leftJoin(
        courseCertificateTemplates,
        and(
          eq(courseCertificateTemplates.courseId, courses.id),
          eq(courseCertificateTemplates.isActive, true),
        ),
      )
      .leftJoin(
        certificateTemplates,
        eq(certificateTemplates.id, courseCertificateTemplates.templateId),
      )
      .where(eq(courses.status, 'approved'))
      .orderBy(asc(courses.title), asc(courses.id))
      .limit(500)
    return rows
  }

  /** Alunos matriculados no curso (até 500) e se já têm certificado ativo. */
  async getCourseEnrollments(courseId: number): Promise<AdminCourseEnrollment[]> {
    const rows = await this.db
      .select({
        enrollmentId: enrollments.id,
        studentName: profiles.fullName,
        status: enrollments.status,
        progressPercentage: enrollments.progressPercentage,
        activeCertificateId: certificates.id,
      })
      .from(enrollments)
      .leftJoin(profiles, eq(profiles.id, enrollments.studentId))
      .leftJoin(
        certificates,
        and(eq(certificates.enrollmentId, enrollments.id), eq(certificates.status, 'active')),
      )
      .where(eq(enrollments.courseId, courseId))
      .orderBy(asc(profiles.fullName), asc(enrollments.id))
      .limit(500)
    return rows.map((row) => ({
      enrollmentId: row.enrollmentId,
      studentName: row.studentName?.trim() || 'Aluno',
      status: row.status,
      progressPercentage: row.progressPercentage,
      hasActiveCertificate: row.activeCertificateId !== null,
    }))
  }

  /** "Meus certificados": só os do usuário da sessão (o filtro é pelo id da sessão, nunca do cliente). */
  async getStudentCertificates(userId: string): Promise<StudentCertificate[]> {
    const rows = await this.db
      .select({
        id: certificates.id,
        code: certificates.code,
        status: certificates.status,
        issueMode: certificates.issueMode,
        issuedAt: certificates.issuedAt,
        hasFile: sql<boolean>`${certificates.filePath} is not null`,
        issueDateLabel: sql<
          string | null
        >`${certificates.payloadSnapshot} #>> '{payload,issue_date}'`,
        workloadLabel: sql<
          string | null
        >`${certificates.payloadSnapshot} #>> '{payload,workload_hours}'`,
        courseTitle: courses.title,
        courseSlug: courses.slug,
      })
      .from(certificates)
      .leftJoin(courses, eq(courses.id, certificates.courseId))
      .where(eq(certificates.studentId, userId))
      .orderBy(desc(certificates.issuedAt))

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      status: row.status,
      issueMode: row.issueMode,
      issuedAt: row.issuedAt.toISOString(),
      issuedAtLabel: ISSUED_AT_LABEL.format(row.issuedAt),
      issueDateLabel: row.issueDateLabel?.trim() || null,
      workloadLabel: row.workloadLabel?.trim() || null,
      courseTitle: row.courseTitle?.trim() || 'Curso',
      courseSlug: row.courseSlug?.trim() || null,
      downloadUrl: row.hasFile ? `/api/certificates/${row.id}/download` : null,
    }))
  }

  /**
   * Link assinado de curta duração do PDF. Só o dono do certificado ou um admin recebe; para
   * qualquer outra pessoa o certificado "não existe" (404, sem confirmar que o id é válido).
   */
  async getDownloadUrl(user: SessionUser, certificateId: number): Promise<string> {
    const [certificate] = await this.db
      .select({ studentId: certificates.studentId, filePath: certificates.filePath })
      .from(certificates)
      .where(eq(certificates.id, certificateId))

    const allowed =
      certificate && (certificate.studentId === user.id || user.roles.includes('admin'))
    if (!certificate || !allowed) throw new NotFoundException('Certificado não encontrado')
    if (!certificate.filePath) throw new NotFoundException('Arquivo do certificado indisponível')

    return this.files.signedUrl('certificates', certificate.filePath, DOWNLOAD_URL_TTL_SECONDS)
  }

  /**
   * Verificação pública por código (substitui a função SQL `verify_certificate_by_code`). Devolve
   * SÓ nome, curso, datas e situação: sem e-mail, CPF, ids, motivo da revogação nem caminho de arquivo.
   */
  async verifyByCode(rawCode: string): Promise<PublicCertificateVerification> {
    const code = normalizeCertificateCode(rawCode)
    const notFound: PublicCertificateVerification = {
      status: 'not_found',
      certificateCode: CERTIFICATE_CODE_PATTERN.test(code) ? code : null,
      studentFullName: null,
      courseTitle: null,
      issuedAt: null,
      revokedAt: null,
    }
    // Fora do formato oficial não existe certificado: nem consulta o banco.
    if (!CERTIFICATE_CODE_PATTERN.test(code)) return notFound

    const [row] = await this.db
      .select({
        status: certificates.status,
        code: certificates.code,
        studentFullName: profiles.fullName,
        courseTitle: courses.title,
        issuedAt: certificates.issuedAt,
        revokedAt: certificates.revokedAt,
      })
      .from(certificates)
      .leftJoin(profiles, eq(profiles.id, certificates.studentId))
      .leftJoin(courses, eq(courses.id, certificates.courseId))
      .where(eq(certificates.code, code))
    if (!row) return notFound

    return {
      status: VERIFICATION_STATUS[row.status],
      certificateCode: row.code,
      studentFullName: row.studentFullName?.trim() || null,
      courseTitle: row.courseTitle?.trim() || null,
      issuedAt: row.issuedAt.toISOString(),
      revokedAt: row.revokedAt?.toISOString() ?? null,
    }
  }
}
