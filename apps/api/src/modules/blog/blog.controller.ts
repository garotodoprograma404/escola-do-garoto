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
import { SESSION_COOKIE_NAME, type SessionUser } from '@vox/contracts'
import type { Request } from 'express'
import { IdParamPipe } from '../../common/pipes/id-param.pipe.js'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { requestInfo } from '../../common/request-info.js'
import { CurrentUser, Public, Roles } from '../auth/decorators.js'
import { SessionsService } from '../auth/sessions.service.js'
import { clientIp } from '../auth/throttling.js'
import {
  adminListPostsQuerySchema,
  blogPostBodySchema,
  limitQuerySchema,
  publicListPostsQuerySchema,
  slugParamSchema,
  trackViewSchema,
  type AdminListPostsQuery,
  type BlogPostBody,
  type LimitQuery,
  type PublicListPostsQuery,
  type TrackViewBody,
} from './blog.schemas.js'
import { BlogService } from './blog.service.js'

const slugPipe = new ZodValidationPipe(slugParamSchema)

/** Leitura pública do blog (só posts publicados) e contagem de visualizações. */
@Controller('public/blog')
export class PublicBlogController {
  constructor(
    @Inject(BlogService) private readonly blog: BlogService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
  ) {}

  @Public()
  @Get('posts')
  list(@Query(new ZodValidationPipe(publicListPostsQuerySchema)) query: PublicListPostsQuery) {
    return this.blog.listPublic(query)
  }

  @Public()
  @Get('featured')
  featured(@Query(new ZodValidationPipe(limitQuerySchema)) query: LimitQuery) {
    return this.blog.listFeatured(query.limit)
  }

  @Public()
  @Get('posts/:id/related')
  related(
    @Param('id', IdParamPipe) id: number,
    @Query(new ZodValidationPipe(limitQuerySchema)) query: LimitQuery,
  ) {
    return this.blog.listRelated(id, query.limit)
  }

  @Public()
  @Get('posts/:slug')
  bySlug(@Param('slug', slugPipe) slug: string) {
    return this.blog.getPublicBySlug(slug)
  }

  /**
   * Conta uma visualização. Aberta (leitor sem login), então tem limite de tentativas por IP,
   * ignora robôs e não soma duas vezes a mesma sessão nem o mesmo IP em 24 h.
   */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(200)
  @Post('posts/:id/views')
  async trackView(
    @Param('id', IdParamPipe) id: number,
    @Body(new ZodValidationPipe(trackViewSchema)) body: TrackViewBody,
    @Req() req: Request,
  ) {
    const result = await this.blog.trackView(id, {
      sessionId: body.sessionId,
      userId: await this.optionalUserId(req),
      ip: clientIp(req) ?? null,
      userAgent: req.get('user-agent') ?? '',
    })
    return { success: true, ...result }
  }

  /** Se o leitor estiver logado, a visualização guarda quem foi (rota pública: sem guard). */
  private async optionalUserId(req: Request): Promise<string | null> {
    const token: unknown = req.cookies?.[SESSION_COOKIE_NAME]
    if (typeof token !== 'string' || token.length === 0) return null
    try {
      const session = await this.sessions.validateSession(token)
      return session?.user.id ?? null
    } catch {
      return null
    }
  }
}

/** Curtidas: exigem login, e sempre valem para o usuário da sessão. */
@Controller('blog/posts')
export class BlogLikesController {
  constructor(@Inject(BlogService) private readonly blog: BlogService) {}

  @Get(':id/like-status')
  likeStatus(@Param('id', IdParamPipe) id: number, @CurrentUser() user: SessionUser) {
    return this.blog.isLikedBy(id, user.id)
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(200)
  @Post(':id/like')
  toggleLike(@Param('id', IdParamPipe) id: number, @CurrentUser() user: SessionUser) {
    return this.blog.toggleLike(id, user.id)
  }
}

@Controller('admin/blog')
@Roles(['admin'])
export class AdminBlogController {
  constructor(@Inject(BlogService) private readonly blog: BlogService) {}

  @Get('posts')
  list(@Query(new ZodValidationPipe(adminListPostsQuerySchema)) query: AdminListPostsQuery) {
    return this.blog.adminList(query)
  }

  @Get('stats')
  stats() {
    return this.blog.adminStats()
  }

  @Get('categories')
  categories() {
    return this.blog.adminCategories()
  }

  /** Pré-visualização: qualquer status, pelo slug. Precisa vir antes de `posts/:id`. */
  @Get('posts/by-slug/:slug')
  bySlug(@Param('slug', slugPipe) slug: string) {
    return this.blog.adminGet({ slug })
  }

  @Get('posts/:id')
  get(@Param('id', IdParamPipe) id: number) {
    return this.blog.adminGet({ id })
  }

  @Post('posts')
  create(
    @Body(new ZodValidationPipe(blogPostBodySchema)) body: BlogPostBody,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.blog.create(body, user.id, requestInfo(req))
  }

  @Put('posts/:id')
  update(
    @Param('id', IdParamPipe) id: number,
    @Body(new ZodValidationPipe(blogPostBodySchema)) body: BlogPostBody,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.blog.update(id, body, user.id, requestInfo(req))
  }

  @Delete('posts/:id')
  remove(
    @Param('id', IdParamPipe) id: number,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.blog.remove(id, user.id, requestInfo(req))
  }

  @HttpCode(200)
  @Post('posts/:id/publish')
  publish(
    @Param('id', IdParamPipe) id: number,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.blog.publish(id, user.id, requestInfo(req))
  }

  @HttpCode(200)
  @Post('posts/:id/unpublish')
  unpublish(
    @Param('id', IdParamPipe) id: number,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.blog.unpublish(id, user.id, requestInfo(req))
  }

  @HttpCode(200)
  @Post('posts/:id/archive')
  archive(
    @Param('id', IdParamPipe) id: number,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.blog.archive(id, user.id, requestInfo(req))
  }
}
