import { Module } from '@nestjs/common'
import { ProducerCoursesController } from './producer-courses.controller.js'
import { ProducerCoursesService } from './producer-courses.service.js'

/**
 * Criação e edição de cursos pelo produtor (assistente de criação). As funções de gravação do
 * "grafo" do curso (`course-graph.ts`, `course-data.ts`) também são usadas pelo módulo
 * `admin-courses`, que importa este módulo para reaproveitar o serviço.
 */
@Module({
  controllers: [ProducerCoursesController],
  providers: [ProducerCoursesService],
  exports: [ProducerCoursesService],
})
export class ProducerCoursesModule {}
