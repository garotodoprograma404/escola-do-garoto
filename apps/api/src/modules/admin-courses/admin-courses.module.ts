import { Module } from '@nestjs/common'
import { ProducerCoursesModule } from '../producer-courses/producer-courses.module.js'
import { AdminCoursesQueriesService } from './admin-courses-queries.service.js'
import { AdminCoursesController } from './admin-courses.controller.js'
import { AdminCoursesService } from './admin-courses.service.js'

/**
 * Administração de cursos (moderação, edição, criação pelo admin, matrícula manual, métricas).
 * Usa os serviços globais `NotificationsService` e `AuditService`, e reaproveita a gravação do
 * currículo do módulo `producer-courses`.
 */
@Module({
  imports: [ProducerCoursesModule],
  controllers: [AdminCoursesController],
  providers: [AdminCoursesService, AdminCoursesQueriesService],
})
export class AdminCoursesModule {}
