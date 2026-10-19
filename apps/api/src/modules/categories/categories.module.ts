import { Module } from '@nestjs/common'
import { AdminCategoriesController, PublicCategoriesController } from './categories.controller.js'
import { CategoriesService } from './categories.service.js'

/** Categorias de cursos: árvore (até 3 níveis), destaque, ordem e checagem antes de apagar. */
@Module({
  controllers: [PublicCategoriesController, AdminCategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
