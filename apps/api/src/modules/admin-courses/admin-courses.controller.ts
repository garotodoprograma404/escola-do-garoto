import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import type { Request } from 'express'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentUser, Roles } from '../auth/decorators.js'
import { clientIp } from '../auth/throttling.js'
import { AdminCoursesQueriesService } from './admin-courses-queries.service.js'
import {
  adminCourseIdParamSchema,
  adminCoursesQuerySchema,
  approveBodySchema,
  archiveBodySchema,
  createCompleteCourseBodySchema,
  createCourseByAdminBodySchema,
  editCourseBodySchema,
  enrollStudentBodySchema,
  moveToDraftBodySchema,
  rejectBodySchema,
  requestChangesBodySchema,
  roleUsersQuerySchema,
  saveDraftCourseBodySchema,
  updateCompleteCourseBodySchema,
  type AdminCourseIdParam,
  type AdminCoursesQuery,
  type ApproveBody,
  type ArchiveBody,
  type CreateCompleteCourseBody,
  type CreateCourseByAdminBody,
  type EditCourseBody,
  type EnrollStudentBody,
  type MoveToDraftBody,
  type RejectBody,
  type RequestChangesBody,
  type RoleUsersQuery,
  type SaveDraftCourseBody,
  type UpdateCompleteCourseBody,
} from './admin-courses.schemas.js'
import { AdminCoursesService, type RequestContext } from './admin-courses.service.js'

const idPipe = new ZodValidationPipe(adminCourseIdParamSchema)

function contextOf(req: Request): RequestContext {
  return { ipAddress: clientIp(req), userAgent: req.get('user-agent') ?? null }
}

/**
 * Administração de cursos. TODA rota exige papel `admin` (sem isso, qualquer pessoa logada
 * aprovaria, editaria e listaria cursos).
 */
@Controller('admin/courses')
@Roles(['admin'])
export class AdminCoursesController {
  constructor(
    @Inject(AdminCoursesQueriesService) private readonly queries: AdminCoursesQueriesService,
    @Inject(AdminCoursesService) private readonly courses: AdminCoursesService,
  ) {}

  // ---- Leituras (rotas fixas antes das com :id) ------------------------------------------------

  @Get()
  list(@Query(new ZodValidationPipe(adminCoursesQuerySchema)) query: AdminCoursesQuery) {
    return this.queries.listCourses(query)
  }

  @Get('status-counts')
  statusCounts() {
    return this.queries.statusCounts()
  }

  @Get('metrics')
  metrics() {
    return this.queries.getMetrics()
  }

  @Get('categories')
  categories() {
    return this.queries.categories()
  }

  @Get('role-users')
  roleUsers(@Query(new ZodValidationPipe(roleUsersQuerySchema)) query: RoleUsersQuery) {
    return this.queries.roleUsers(query)
  }

  // ---- Criação ---------------------------------------------------------------------------------

  @Post()
  create(
    @CurrentUser() admin: SessionUser,
    @Req() req: Request,
    @Body(new ZodValidationPipe(createCourseByAdminBodySchema)) body: CreateCourseByAdminBody,
  ) {
    return this.courses.createCourse(admin, contextOf(req), body)
  }

  @Post('complete')
  createComplete(
    @CurrentUser() admin: SessionUser,
    @Req() req: Request,
    @Body(new ZodValidationPipe(createCompleteCourseBodySchema)) body: CreateCompleteCourseBody,
  ) {
    return this.courses.createCompleteCourse(admin, contextOf(req), body)
  }

  @Post('drafts')
  saveDraft(
    @CurrentUser() admin: SessionUser,
    @Req() req: Request,
    @Body(new ZodValidationPipe(saveDraftCourseBodySchema)) body: SaveDraftCourseBody,
  ) {
    return this.courses.saveDraft(admin, contextOf(req), body)
  }

  // ---- Um curso --------------------------------------------------------------------------------

  @Get(':id')
  get(@Param(idPipe) params: AdminCourseIdParam) {
    return this.queries.getCourse(params.id)
  }

  @Get(':id/details')
  details(@Param(idPipe) params: AdminCourseIdParam) {
    return this.queries.getDetails(params.id)
  }

  @Get(':id/content')
  content(@Param(idPipe) params: AdminCourseIdParam) {
    return this.queries.getContent(params.id)
  }

  @Get(':id/audits')
  audits(@Param(idPipe) params: AdminCourseIdParam) {
    return this.queries.getAudits(params.id)
  }

  @Get(':id/editor')
  editor(@Param(idPipe) params: AdminCourseIdParam) {
    return this.queries.getEditor(params.id)
  }

  /** Pré-visualização: o admin vê qualquer curso; o produtor, só o dele (conferido no service). */
  @Get(':id/preview')
  @Roles(['admin', 'producer'])
  preview(@CurrentUser() user: SessionUser, @Param(idPipe) params: AdminCourseIdParam) {
    return this.queries.getPreview(user, params.id)
  }

  @Put(':id/complete')
  updateComplete(
    @CurrentUser() admin: SessionUser,
    @Req() req: Request,
    @Param(idPipe) params: AdminCourseIdParam,
    @Body(new ZodValidationPipe(updateCompleteCourseBodySchema)) body: UpdateCompleteCourseBody,
  ) {
    return this.courses.updateCompleteCourse(admin, contextOf(req), params.id, body)
  }

  @Patch(':id')
  edit(
    @CurrentUser() admin: SessionUser,
    @Req() req: Request,
    @Param(idPipe) params: AdminCourseIdParam,
    @Body(new ZodValidationPipe(editCourseBodySchema)) body: EditCourseBody,
  ) {
    return this.courses.editCourse(admin, contextOf(req), params.id, body)
  }

  // ---- Moderação -------------------------------------------------------------------------------

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @CurrentUser() admin: SessionUser,
    @Req() req: Request,
    @Param(idPipe) params: AdminCourseIdParam,
    @Body(new ZodValidationPipe(approveBodySchema)) body: ApproveBody,
  ) {
    return this.courses.approve(admin, contextOf(req), params.id, body)
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @CurrentUser() admin: SessionUser,
    @Req() req: Request,
    @Param(idPipe) params: AdminCourseIdParam,
    @Body(new ZodValidationPipe(rejectBodySchema)) body: RejectBody,
  ) {
    return this.courses.reject(admin, contextOf(req), params.id, body)
  }

  @Post(':id/request-changes')
  @HttpCode(HttpStatus.OK)
  requestChanges(
    @CurrentUser() admin: SessionUser,
    @Req() req: Request,
    @Param(idPipe) params: AdminCourseIdParam,
    @Body(new ZodValidationPipe(requestChangesBodySchema)) body: RequestChangesBody,
  ) {
    return this.courses.requestChanges(admin, contextOf(req), params.id, body)
  }

  @Post(':id/move-to-draft')
  @HttpCode(HttpStatus.OK)
  moveToDraft(
    @CurrentUser() admin: SessionUser,
    @Req() req: Request,
    @Param(idPipe) params: AdminCourseIdParam,
    @Body(new ZodValidationPipe(moveToDraftBodySchema)) body: MoveToDraftBody,
  ) {
    return this.courses.moveToDraft(admin, contextOf(req), params.id, body)
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(
    @CurrentUser() admin: SessionUser,
    @Req() req: Request,
    @Param(idPipe) params: AdminCourseIdParam,
    @Body(new ZodValidationPipe(archiveBodySchema)) body: ArchiveBody,
  ) {
    return this.courses.archive(admin, contextOf(req), params.id, body)
  }

  @Post(':id/enroll')
  @HttpCode(HttpStatus.OK)
  enroll(
    @CurrentUser() admin: SessionUser,
    @Req() req: Request,
    @Param(idPipe) params: AdminCourseIdParam,
    @Body(new ZodValidationPipe(enrollStudentBodySchema)) body: EnrollStudentBody,
  ) {
    return this.courses.enrollStudent(admin, contextOf(req), params.id, body)
  }
}
