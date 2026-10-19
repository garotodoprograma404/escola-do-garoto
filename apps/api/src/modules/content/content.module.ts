import { Module } from '@nestjs/common'
import { BannersService } from './banners.service.js'
import {
  AdminBannersController,
  AdminShowcasesController,
  BannerTrackingController,
  PublicContentController,
} from './content.controller.js'
import { ShowcasesService } from './showcases.service.js'

/** Conteúdo da home: banners (agenda, status, cliques) e vitrines de cursos (manuais e dinâmicas). */
@Module({
  controllers: [
    PublicContentController,
    BannerTrackingController,
    AdminBannersController,
    AdminShowcasesController,
  ],
  providers: [BannersService, ShowcasesService],
  exports: [BannersService, ShowcasesService],
})
export class ContentModule {}
