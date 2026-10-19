import {
  BadRequestException,
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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { SessionUser } from '@vox/contracts'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentUser, Roles } from '../auth/decorators.js'
import { CertificateTemplatesService } from './certificate-templates.service.js'
import {
  assetTargetSchema,
  bindCourseTemplateSchema,
  courseIdParamSchema,
  createTemplateSchema,
  idParamSchema,
  previewQuerySchema,
  saveVersionSchema,
  updateTemplateSchema,
  type AssetTarget,
  type BindCourseTemplateInput,
  type CreateTemplateInput,
  type PreviewQuery,
  type SaveVersionInput,
  type UpdateTemplateInput,
} from './certificates.schemas.js'

const ASSET_MAX_BYTES = 5 * 1024 * 1024

type UploadedFileData = { buffer: Buffer; mimetype: string; size: number }
type IdParam = { id: number }

/** Modelos de certificado (construtor, versões, publicação). Tudo restrito a admin. */
@Roles(['admin'])
@Controller('certificates')
export class CertificateTemplatesController {
  constructor(
    @Inject(CertificateTemplatesService) private readonly templates: CertificateTemplatesService,
  ) {}

  @Get('templates')
  list() {
    return this.templates.listTemplates()
  }

  @Post('templates')
  create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createTemplateSchema)) body: CreateTemplateInput,
  ) {
    return this.templates.createTemplate(user.id, body)
  }

  @Patch('templates/:id')
  async update(
    @CurrentUser() user: SessionUser,
    @Param(new ZodValidationPipe(idParamSchema)) params: IdParam,
    @Body(new ZodValidationPipe(updateTemplateSchema)) body: UpdateTemplateInput,
  ) {
    await this.templates.updateTemplate(user.id, params.id, body)
    return { success: true }
  }

  @Post('templates/:id/publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @CurrentUser() user: SessionUser,
    @Param(new ZodValidationPipe(idParamSchema)) params: IdParam,
  ) {
    await this.templates.publishTemplate(user.id, params.id)
    return { success: true }
  }

  @Post('templates/:id/unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublish(
    @CurrentUser() user: SessionUser,
    @Param(new ZodValidationPipe(idParamSchema)) params: IdParam,
  ) {
    await this.templates.unpublishTemplate(user.id, params.id)
    return { success: true }
  }

  /** Dados da tela do construtor (versão mais recente + links assinados das imagens). */
  @Get('templates/:id/builder')
  builder(@Param(new ZodValidationPipe(idParamSchema)) params: IdParam) {
    return this.templates.getBuilderData(params.id)
  }

  /** Salva uma NOVA versão do modelo. */
  @Post('templates/:id/versions')
  saveVersion(
    @CurrentUser() user: SessionUser,
    @Param(new ZodValidationPipe(idParamSchema)) params: IdParam,
    @Body(new ZodValidationPipe(saveVersionSchema)) body: SaveVersionInput,
  ) {
    return this.templates.saveVersion(user.id, params.id, body)
  }

  /** Envia fundo/assinatura do modelo (multipart: campo `file`; query `target`). */
  @Post('templates/:id/assets')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: ASSET_MAX_BYTES, files: 1 } }))
  uploadAsset(
    @Param(new ZodValidationPipe(idParamSchema)) params: IdParam,
    @Query(new ZodValidationPipe(assetTargetSchema)) query: { target: AssetTarget },
    @UploadedFile() file: UploadedFileData | undefined,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado')
    return this.templates.uploadAsset(params.id, query.target, file)
  }

  /** HTML da prévia do modelo (a rota do Next devolve isto como página). */
  @Get('templates/:id/preview')
  async preview(
    @Param(new ZodValidationPipe(idParamSchema)) params: IdParam,
    @Query(new ZodValidationPipe(previewQuerySchema)) query: PreviewQuery,
  ) {
    return { html: await this.templates.renderPreview(params.id, query) }
  }

  /** Define o modelo ativo de um curso (o anterior fica desativado). */
  @Put('courses/:courseId/template')
  bindCourse(
    @CurrentUser() user: SessionUser,
    @Param(new ZodValidationPipe(courseIdParamSchema)) params: { courseId: number },
    @Body(new ZodValidationPipe(bindCourseTemplateSchema)) body: BindCourseTemplateInput,
  ) {
    return this.templates.bindCourseTemplate(user.id, params.courseId, body)
  }
}
