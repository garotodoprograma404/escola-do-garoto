import { Module } from '@nestjs/common'
import { CatalogService } from './catalog.service.js'
import { CourseDetailService } from './course-detail.service.js'
import { HomeService } from './home.service.js'
import { InstructorsService } from './instructors.service.js'
import { PublicCatalogController } from './public-catalog.controller.js'
import { SearchHistoryController } from './search-history.controller.js'
import { SearchService } from './search.service.js'

/**
 * Catálogo público: listagem/filtros, detalhe do curso, avaliações, instrutor, home, carrinho
 * (preços atuais) e busca com histórico. Já registrado no AppModule.
 */
@Module({
  controllers: [PublicCatalogController, SearchHistoryController],
  providers: [CatalogService, CourseDetailService, InstructorsService, HomeService, SearchService],
})
export class CatalogModule {}
