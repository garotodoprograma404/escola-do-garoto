import { Inject, Module, type OnModuleInit } from '@nestjs/common'
import { CourseCompletionService } from '../learning/course-completion.service.js'
import { LearningModule } from '../learning/learning.module.js'
import { CertificateQueriesService } from './certificate-queries.service.js'
import { CertificateTemplatesController } from './certificate-templates.controller.js'
import { CertificateTemplatesService } from './certificate-templates.service.js'
import { CertificatesController } from './certificates.controller.js'
import { CertificatesService } from './certificates.service.js'

/**
 * Certificados: modelos (construtor + versões), emissão (automática ao concluir o curso e manual),
 * reemissão, revogação, download e verificação pública.
 *
 * Ponto de integração para outros módulos: `CertificatesService.issueForCompletedEnrollment(id)`.
 * Veja `docs/areas/certificados.md`.
 */
@Module({
  imports: [LearningModule],
  controllers: [CertificatesController, CertificateTemplatesController],
  providers: [CertificatesService, CertificateQueriesService, CertificateTemplatesService],
  exports: [CertificatesService],
})
export class CertificatesModule implements OnModuleInit {
  constructor(
    @Inject(CourseCompletionService) private readonly completion: CourseCompletionService,
    @Inject(CertificatesService) private readonly certificates: CertificatesService,
  ) {}

  /** Aluno chegou a 100%: emite o certificado (idempotente; falha aqui nunca desfaz o progresso). */
  onModuleInit() {
    this.completion.onCourseCompleted(async (event) => {
      await this.certificates.issueForCompletedEnrollment(event.enrollmentId)
    })
  }
}
