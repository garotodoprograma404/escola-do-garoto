import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, Req } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import type { Request } from 'express'
import { IdParamPipe } from '../../common/pipes/id-param.pipe.js'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { requestInfo } from '../../common/request-info.js'
import { CurrentUser, Public, Roles } from '../auth/decorators.js'
import {
  categoryBodySchema,
  listCategoriesQuerySchema,
  moveCategorySchema,
  type CategoryBody,
  type ListCategoriesQuery,
  type MoveCategoryBody,
} from './categories.schemas.js'
import { CategoriesService } from './categories.service.js'

/** Categorias ativas, para qualquer visitante (menus, filtros, página inicial). */
@Controller('public/categories')
export class PublicCategoriesController {
  constructor(@Inject(CategoriesService) private readonly categories: CategoriesService) {}

  @Public()
  @Get()
  list() {
    return this.categories.listPublic()
  }
}

@Controller('admin/categories')
@Roles(['admin'])
export class AdminCategoriesController {
  constructor(@Inject(CategoriesService) private readonly categories: CategoriesService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listCategoriesQuerySchema)) query: ListCategoriesQuery) {
    return this.categories.list(query)
  }

  @Get(':id')
  get(@Param('id', IdParamPipe) id: number) {
    return this.categories.get(id)
  }

  @Get(':id/dependencies')
  dependencies(@Param('id', IdParamPipe) id: number) {
    return this.categories.getDependencies(id)
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(categoryBodySchema)) body: CategoryBody,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.categories.create(body, user.id, requestInfo(req))
  }

  @Put(':id')
  update(
    @Param('id', IdParamPipe) id: number,
    @Body(new ZodValidationPipe(categoryBodySchema)) body: CategoryBody,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.categories.update(id, body, user.id, requestInfo(req))
  }

  @Post(':id/toggle-status')
  toggleStatus(
    @Param('id', IdParamPipe) id: number,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.categories.toggleStatus(id, user.id, requestInfo(req))
  }

  @Post(':id/toggle-featured')
  toggleFeatured(
    @Param('id', IdParamPipe) id: number,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.categories.toggleFeatured(id, user.id, requestInfo(req))
  }

  @Post(':id/move')
  move(
    @Param('id', IdParamPipe) id: number,
    @Body(new ZodValidationPipe(moveCategorySchema)) body: MoveCategoryBody,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.categories.move(id, body.direction, user.id, requestInfo(req))
  }

  @Delete(':id')
  remove(
    @Param('id', IdParamPipe) id: number,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.categories.remove(id, user.id, requestInfo(req))
  }
}
