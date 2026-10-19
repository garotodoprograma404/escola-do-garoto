import { Injectable, Logger } from '@nestjs/common'

/**
 * Aviso de "o aluno chegou a 100% do curso". É o PONTO DE EXTENSÃO da emissão de certificado:
 * o módulo `certificates` (outro dono) escuta isto e emite o certificado, sem o módulo
 * `learning` conhecer certificados (e sem import circular).
 *
 * Como usar no módulo de certificados:
 *
 * ```ts
 * @Module({ imports: [LearningModule], ... })
 * export class CertificatesModule implements OnModuleInit {
 *   constructor(@Inject(CourseCompletionService) private readonly completion: CourseCompletionService,
 *               @Inject(CertificateIssuanceService) private readonly issuance: CertificateIssuanceService) {}
 *   onModuleInit() {
 *     this.completion.onCourseCompleted((event) =>
 *       this.issuance.issueForEnrollment({ enrollmentId: event.enrollmentId, mode: 'automatic',
 *                                         source: 'student_progress_completion' }))
 *   }
 * }
 * ```
 */
export type CourseCompletedEvent = {
  enrollmentId: number
  studentId: string
  courseId: number
  /**
   * `first_completion`: acabou de chegar a 100% (a matrícula virou `completed` agora).
   * `already_completed_without_certificate`: já estava concluída e segue sem `certificate_url`
   * (quem emite decide se tenta de novo).
   */
  reason: 'first_completion' | 'already_completed_without_certificate'
}

export type CourseCompletedListener = (event: CourseCompletedEvent) => Promise<void> | void

@Injectable()
export class CourseCompletionService {
  private readonly logger = new Logger(CourseCompletionService.name)
  private readonly listeners: CourseCompletedListener[] = []

  onCourseCompleted(listener: CourseCompletedListener): void {
    this.listeners.push(listener)
  }

  /**
   * Chamado pelo `learning` DEPOIS que a transação do progresso foi confirmada. Falha de quem
   * escuta nunca desfaz nem quebra o progresso do aluno (só registra o erro).
   */
  async emit(event: CourseCompletedEvent): Promise<void> {
    if (this.listeners.length === 0 && event.reason === 'first_completion') {
      this.logger.warn(
        `Curso ${event.courseId} concluído (matrícula ${event.enrollmentId}) e nenhum emissor de certificado registrado`,
      )
    }
    for (const listener of this.listeners) {
      try {
        await listener(event)
      } catch (error) {
        this.logger.error(
          `Falha ao tratar conclusão da matrícula ${event.enrollmentId}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
  }
}
