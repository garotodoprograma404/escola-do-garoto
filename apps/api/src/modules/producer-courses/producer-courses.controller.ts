import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentUser, Roles } from '../auth/decorators.js'
import {
  completeCourseSchema,
  courseIdParamSchema,
  draftCourseSchema,
  producerCoursesQuerySchema,
  updateCourseBodySchema,
  type CompleteCourseInput,
  type ProducerCoursesQuery,
  type UpdateCourseBody,
} from './course-input.schemas.js'
import { ProducerCoursesService } from './producer-courses.service.js'

type IdParam = { id: number }

/** Criação/edição de cursos pelo produtor. Todo acesso é filtrado pelo produtor da sessão. */
@Controller('producer/courses')
@Roles(['producer'])
export class ProducerCoursesController {
  constructor(@Inject(ProducerCoursesService) private readonly courses: ProducerCoursesService) {}

  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(producerCoursesQuerySchema)) query: ProducerCoursesQuery,
  ) {
    return this.courses.listCourses(user, query)
  }

  /** Categorias ativas do seletor do assistente (o assistente também roda para admin). */
  @Get('categories')
  @Roles(['producer', 'admin'])
  categories() {
    return this.courses.listActiveCategories()
  }

  @Get('commission-rate')
  commissionRate(@CurrentUser() user: SessionUser) {
    return this.courses.getCommissionRate(user)
  }

  @Post()
  create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(completeCourseSchema)) body: CompleteCourseInput,
  ) {
    return this.courses.createCourse(user, body)
  }

  @Post('drafts')
  saveDraft(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(draftCourseSchema)) body: Record<string, unknown>,
  ) {
    return this.courses.saveDraft(user, body)
  }

  @Get(':id')
  get(
    @CurrentUser() user: SessionUser,
    @Param(new ZodValidationPipe(courseIdParamSchema)) params: IdParam,
  ) {
    return this.courses.getCourse(user, params.id)
  }

  @Get(':id/edit')
  getForEdit(
    @CurrentUser() user: SessionUser,
    @Param(new ZodValidationPipe(courseIdParamSchema)) params: IdParam,
  ) {
    return this.courses.getCourseForEdit(user, params.id)
  }

  @Put(':id')
  async update(
    @CurrentUser() user: SessionUser,
    @Param(new ZodValidationPipe(courseIdParamSchema)) params: IdParam,
    @Body(new ZodValidationPipe(updateCourseBodySchema)) body: UpdateCourseBody,
  ) {
    await this.courses.updateCourse(user, params.id, body.data, body.options ?? {})
    return { success: true }
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  submit(
    @CurrentUser() user: SessionUser,
    @Param(new ZodValidationPipe(courseIdParamSchema)) params: IdParam,
  ) {
    return this.courses.submitForReview(user, params.id)
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: SessionUser,
    @Param(new ZodValidationPipe(courseIdParamSchema)) params: IdParam,
  ) {
    await this.courses.deleteCourse(user, params.id)
    return { success: true }
  }
}
