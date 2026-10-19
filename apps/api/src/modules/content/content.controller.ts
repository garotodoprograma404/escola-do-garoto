import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { SessionUser } from '@vox/contracts'
import type { Request } from 'express'
import { IdParamPipe } from '../../common/pipes/id-param.pipe.js'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { requestInfo } from '../../common/request-info.js'
import { CurrentUser, Public, Roles } from '../auth/decorators.js'
import { BannersService } from './banners.service.js'
import {
  bannerBodySchema,
  coursesByIdsQuerySchema,
  listBannersQuerySchema,
  moveSchema,
  publicBannersQuerySchema,
  searchCoursesQuerySchema,
  showcaseBodySchema,
  trackBannerSchema,
  type BannerBody,
  type CoursesByIdsQuery,
  type ListBannersQuery,
  type MoveBody,
  type PublicBannersQuery,
  type SearchCoursesQuery,
  type ShowcaseBody,
  type TrackBannerBody,
} from './content.schemas.js'
import { ShowcasesService } from './showcases.service.js'

/** Vitrine pública da home: banners no ar e vitrines de cursos ativas. */
@Controller('public')
export class PublicContentController {
  constructor(
    @Inject(BannersService) private readonly banners: BannersService,
    @Inject(ShowcasesService) private readonly showcases: ShowcasesService,
  ) {}

  @Public()
  @Get('banners')
  listBanners(@Query(new ZodValidationPipe(publicBannersQuerySchema)) query: PublicBannersQuery) {
    return this.banners.listPublic(query.position)
  }

  @Public()
  @Get('showcases')
  listShowcases() {
    return this.showcases.listPublic()
  }

  /** Cada vitrine ativa com os cursos dela: `[{ showcase_id, courses: [...] }]`. */
  @Public()
  @Get('showcases/courses')
  listShowcasesWithCourses() {
    return this.showcases.listPublicWithCourses()
  }
}

/**
 * Contagem de exibições e cliques dos banners. Aberta (visitante não tem login), por isso tem
 * limite de tentativas por IP e só conta banner que está no ar. O corpo é `{ bannerId }`
 * (`/api/banners/track-view|track-click`).
 */
@Controller('banners')
export class BannerTrackingController {
  constructor(@Inject(BannersService) private readonly banners: BannersService) {}

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @HttpCode(200)
  @Post('track-view')
  async trackView(@Body(new ZodValidationPipe(trackBannerSchema)) body: TrackBannerBody) {
    await this.banners.track(body.bannerId, 'views')
    return { success: true }
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(200)
  @Post('track-click')
  async trackClick(@Body(new ZodValidationPipe(trackBannerSchema)) body: TrackBannerBody) {
    await this.banners.track(body.bannerId, 'clicks')
    return { success: true }
  }
}

@Controller('admin/banners')
@Roles(['admin'])
export class AdminBannersController {
  constructor(@Inject(BannersService) private readonly banners: BannersService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listBannersQuerySchema)) query: ListBannersQuery) {
    return this.banners.list(query)
  }

  @Get('active-count')
  countActive() {
    return this.banners.countActive()
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(bannerBodySchema)) body: BannerBody,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.banners.create(body, user.id, requestInfo(req))
  }

  @Put(':id')
  update(
    @Param('id', IdParamPipe) id: number,
    @Body(new ZodValidationPipe(bannerBodySchema)) body: BannerBody,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.banners.update(id, body, user.id, requestInfo(req))
  }

  @Post(':id/move')
  @HttpCode(200)
  move(
    @Param('id', IdParamPipe) id: number,
    @Body(new ZodValidationPipe(moveSchema)) body: MoveBody,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.banners.move(id, body.direction, user.id, requestInfo(req))
  }

  @Delete(':id')
  remove(
    @Param('id', IdParamPipe) id: number,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.banners.remove(id, user.id, requestInfo(req))
  }
}

@Controller('admin/showcases')
@Roles(['admin'])
export class AdminShowcasesController {
  constructor(@Inject(ShowcasesService) private readonly showcases: ShowcasesService) {}

  @Get()
  list() {
    return this.showcases.list()
  }

  /** Seletor de cursos do formulário de vitrine (precisa vir antes de `:id`). */
  @Get('courses')
  searchCourses(@Query(new ZodValidationPipe(searchCoursesQuerySchema)) query: SearchCoursesQuery) {
    return this.showcases.searchCourses(query.search)
  }

  @Get('courses/by-ids')
  coursesByIds(@Query(new ZodValidationPipe(coursesByIdsQuerySchema)) query: CoursesByIdsQuery) {
    return this.showcases.coursesByIds(query.ids)
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(showcaseBodySchema)) body: ShowcaseBody,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.showcases.create(body, user.id, requestInfo(req))
  }

  @Put(':id')
  update(
    @Param('id', IdParamPipe) id: number,
    @Body(new ZodValidationPipe(showcaseBodySchema)) body: ShowcaseBody,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.showcases.update(id, body, user.id, requestInfo(req))
  }

  @Post(':id/move')
  @HttpCode(200)
  move(
    @Param('id', IdParamPipe) id: number,
    @Body(new ZodValidationPipe(moveSchema)) body: MoveBody,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.showcases.move(id, body.direction, user.id, requestInfo(req))
  }

  @Delete(':id')
  remove(
    @Param('id', IdParamPipe) id: number,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.showcases.remove(id, user.id, requestInfo(req))
  }
}
