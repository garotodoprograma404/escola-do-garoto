import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Res,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { SessionUser } from '@vox/contracts'
import type { Response } from 'express'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentUser, Public, Roles } from '../auth/decorators.js'
import { CertificateQueriesService } from './certificate-queries.service.js'
import { CertificatesService } from './certificates.service.js'
import {
  courseIdParamSchema,
  idParamSchema,
  issueCertificateSchema,
  reissueCertificateSchema,
  revokeCertificateSchema,
  verifyCodeParamSchema,
  type IssueCertificateInput,
  type ReissueCertificateInput,
  type RevokeCertificateInput,
} from './certificates.schemas.js'

/** Verificação pública: consulta barata, mas aberta; o teto por IP segura quem tenta adivinhar códigos. */
const VERIFY_RATE_LIMIT = { default: { limit: 30, ttl: 60_000 } }

@Controller('certificates')
export class CertificatesController {
  constructor(
    @Inject(CertificatesService) private readonly certificates: CertificatesService,
    @Inject(CertificateQueriesService) private readonly queries: CertificateQueriesService,
  ) {}

  /** Verificação pública por código. Devolve só nome, curso, datas e situação. */
  @Public()
  @Throttle(VERIFY_RATE_LIMIT)
  @Get('verify/:code')
  verify(@Param(new ZodValidationPipe(verifyCodeParamSchema)) params: { code: string }) {
    return this.queries.verifyByCode(params.code)
  }

  /** Meus certificados (qualquer pessoa logada vê só os próprios). */
  @Get('me')
  listMine(@CurrentUser() user: SessionUser) {
    return this.queries.getStudentCertificates(user.id)
  }

  /** PDF: confere o dono e redireciona para um link assinado de poucos segundos. */
  @Get(':id/download')
  async download(
    @CurrentUser() user: SessionUser,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @Res() res: Response,
  ) {
    const url = await this.queries.getDownloadUrl(user, params.id)
    res.setHeader('Cache-Control', 'private, no-store')
    res.redirect(HttpStatus.FOUND, url)
  }

  // --- Admin ----------------------------------------------------------------------------------

  /** Painel de operação: certificados emitidos + trilha de eventos. */
  @Roles(['admin'])
  @Get('issued')
  listIssued() {
    return this.queries.getAdminOperations()
  }

  /** Cursos aprovados e o modelo ativo de cada um. */
  @Roles(['admin'])
  @Get('courses')
  listCourses() {
    return this.queries.getAdminCourses()
  }

  /** Matrículas de um curso, para a emissão manual. */
  @Roles(['admin'])
  @Get('courses/:courseId/enrollments')
  listCourseEnrollments(
    @Param(new ZodValidationPipe(courseIdParamSchema)) params: { courseId: number },
  ) {
    return this.queries.getCourseEnrollments(params.courseId)
  }

  @Roles(['admin'])
  @Post('issue')
  @HttpCode(HttpStatus.OK)
  issue(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(issueCertificateSchema)) body: IssueCertificateInput,
  ) {
    return this.certificates.issueManually(user.id, body.enrollmentId, body.source)
  }

  @Roles(['admin'])
  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  revoke(
    @CurrentUser() user: SessionUser,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @Body(new ZodValidationPipe(revokeCertificateSchema)) body: RevokeCertificateInput,
  ) {
    return this.certificates.revoke(user.id, params.id, body.reason)
  }

  @Roles(['admin'])
  @Post(':id/reissue')
  @HttpCode(HttpStatus.OK)
  reissue(
    @CurrentUser() user: SessionUser,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: number },
    @Body(new ZodValidationPipe(reissueCertificateSchema)) body: ReissueCertificateInput,
  ) {
    return this.certificates.reissue(user.id, params.id, body)
  }
}
