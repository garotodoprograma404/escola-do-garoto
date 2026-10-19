import { randomBytes } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, count, desc, eq, max } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import {
  certificateTemplates,
  certificateTemplateVersions,
  courseCertificateTemplates,
  courses,
} from '../../database/schema/index.js'
import { FilesService } from '../files/files.service.js'
import {
  createDefaultCertificateBuilderSchema,
  parseCertificateBuilderSchema,
  type CertificateBuilderSchema,
  type TemplateOrientation,
} from './builder-schema.js'
import {
  type CertificateAssetUrls,
  renderCertificatePreviewDocument,
} from './certificate-preview.renderer.js'
import type {
  AssetTarget,
  BindCourseTemplateInput,
  CreateTemplateInput,
  PreviewQuery,
  SaveVersionInput,
  UpdateTemplateInput,
} from './certificates.schemas.js'

type TemplateStatus = (typeof certificateTemplates.$inferSelect)['status']

/** Mesmo formato (camelCase) que a tela de modelos já esperava. */
export interface AdminCertificateTemplate {
  id: number
  name: string
  description: string | null
  status: TemplateStatus
  orientation: TemplateOrientation
  pageSize: string
  versionCount: number
  latestVersionNumber: number | null
  activeCourseLinks: number
  publishedAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CertificateTemplateBuilderData {
  templateId: number
  name: string
  description: string | null
  status: TemplateStatus
  orientation: TemplateOrientation
  pageSize: string
  latestVersionId: number | null
  latestVersionNumber: number
  latestVersionUpdatedAt: string | null
  schema: CertificateBuilderSchema
  backgroundPreviewUrls: CertificateAssetUrls
}

/** Quanto tempo vale o link das imagens no construtor (a tela fica aberta enquanto o admin edita). */
const BUILDER_ASSET_URL_TTL_SECONDS = 6 * 60 * 60
const ASSET_MAX_BYTES = 5 * 1024 * 1024
const ASSET_FOLDERS: Record<AssetTarget, string> = {
  imagePath: 'backgrounds',
  primarySignaturePath: 'signatures-primary',
  secondarySignaturePath: 'signatures-secondary',
}

const startsWith = (buffer: Buffer, bytes: number[], offset = 0) =>
  bytes.every((byte, index) => buffer[offset + index] === byte)

/** Tipos aceitos nas imagens do modelo; o conteúdo é conferido (o `Content-Type` do cliente não vale). */
const ASSET_TYPES: Record<string, { extension: string; matches: (file: Buffer) => boolean }> = {
  'image/png': {
    extension: 'png',
    matches: (file) => startsWith(file, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  'image/jpeg': { extension: 'jpg', matches: (file) => startsWith(file, [0xff, 0xd8, 0xff]) },
  'image/webp': {
    extension: 'webp',
    matches: (file) =>
      startsWith(file, [0x52, 0x49, 0x46, 0x46]) && startsWith(file, [0x57, 0x45, 0x42, 0x50], 8),
  },
  'image/svg+xml': {
    extension: 'svg',
    matches: (file) => /^\s*(<\?xml|<svg)/i.test(file.subarray(0, 512).toString('utf8')),
  },
}

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

function toOrientation(value: string): TemplateOrientation {
  return value === 'portrait' ? 'portrait' : 'landscape'
}

@Injectable()
export class CertificateTemplatesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(FilesService) private readonly files: FilesService,
  ) {}

  async listTemplates(): Promise<AdminCertificateTemplate[]> {
    const [templates, versionStats, linkStats] = await Promise.all([
      this.db
        .select({
          id: certificateTemplates.id,
          name: certificateTemplates.name,
          description: certificateTemplates.description,
          status: certificateTemplates.status,
          orientation: certificateTemplates.orientation,
          pageSize: certificateTemplates.pageSize,
          publishedAt: certificateTemplates.publishedAt,
          archivedAt: certificateTemplates.archivedAt,
          createdAt: certificateTemplates.createdAt,
          updatedAt: certificateTemplates.updatedAt,
        })
        .from(certificateTemplates)
        .orderBy(desc(certificateTemplates.updatedAt))
        .limit(300),
      this.db
        .select({
          templateId: certificateTemplateVersions.templateId,
          total: count(),
          latest: max(certificateTemplateVersions.versionNumber),
        })
        .from(certificateTemplateVersions)
        .groupBy(certificateTemplateVersions.templateId),
      this.db
        .select({ templateId: courseCertificateTemplates.templateId, total: count() })
        .from(courseCertificateTemplates)
        .where(eq(courseCertificateTemplates.isActive, true))
        .groupBy(courseCertificateTemplates.templateId),
    ])

    const versionsByTemplate = new Map(versionStats.map((row) => [row.templateId, row]))
    const linksByTemplate = new Map(linkStats.map((row) => [row.templateId, row.total]))

    return templates.map((row) => {
      const stats = versionsByTemplate.get(row.id)
      return {
        id: row.id,
        name: row.name.trim() || 'Template sem nome',
        description: row.description?.trim() || null,
        status: row.status,
        orientation: toOrientation(row.orientation),
        pageSize: row.pageSize.trim() || 'A4',
        versionCount: stats?.total ?? 0,
        latestVersionNumber: stats?.latest ?? null,
        activeCourseLinks: linksByTemplate.get(row.id) ?? 0,
        publishedAt: toIso(row.publishedAt),
        archivedAt: toIso(row.archivedAt),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }
    })
  }

  /** Cria o modelo (rascunho) já com a versão 1 vazia, tudo ou nada. */
  async createTemplate(userId: string, input: CreateTemplateInput): Promise<{ id: number }> {
    return this.db.transaction(async (tx) => {
      const [template] = await tx
        .insert(certificateTemplates)
        .values({
          name: input.name,
          description: input.description,
          orientation: input.orientation,
          pageSize: input.pageSize,
          status: 'draft',
          createdBy: userId,
          updatedBy: userId,
        })
        .returning({ id: certificateTemplates.id })

      await tx.insert(certificateTemplateVersions).values({
        templateId: template!.id,
        versionNumber: 1,
        schemaJson: {
          version: 1,
          meta: { orientation: input.orientation, pageSize: input.pageSize },
          elements: [],
        },
        createdBy: userId,
      })

      return { id: template!.id }
    })
  }

  async updateTemplate(userId: string, templateId: number, input: UpdateTemplateInput) {
    const updated = await this.db
      .update(certificateTemplates)
      .set({
        name: input.name,
        description: input.description,
        orientation: input.orientation,
        pageSize: input.pageSize,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(certificateTemplates.id, templateId))
      .returning({ id: certificateTemplates.id })
    if (updated.length === 0) throw new NotFoundException('Modelo não encontrado')
  }

  async publishTemplate(userId: string, templateId: number) {
    const [template] = await this.db
      .select({ id: certificateTemplates.id })
      .from(certificateTemplates)
      .where(eq(certificateTemplates.id, templateId))
    if (!template) throw new NotFoundException('Modelo não encontrado')

    const [version] = await this.db
      .select({ id: certificateTemplateVersions.id })
      .from(certificateTemplateVersions)
      .where(eq(certificateTemplateVersions.templateId, templateId))
      .limit(1)
    if (!version) {
      throw new BadRequestException('Modelo sem versão inicial. Crie uma versão antes de publicar.')
    }

    await this.db
      .update(certificateTemplates)
      .set({
        status: 'published',
        publishedAt: new Date(),
        archivedAt: null,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(certificateTemplates.id, templateId))
  }

  async unpublishTemplate(userId: string, templateId: number) {
    const [template] = await this.db
      .select({ id: certificateTemplates.id, status: certificateTemplates.status })
      .from(certificateTemplates)
      .where(eq(certificateTemplates.id, templateId))
    if (!template) throw new NotFoundException('Modelo não encontrado')
    if (template.status === 'archived') {
      throw new BadRequestException('Modelo arquivado não pode ser despublicado')
    }

    await this.db
      .update(certificateTemplates)
      .set({ status: 'draft', publishedAt: null, updatedBy: userId, updatedAt: new Date() })
      .where(eq(certificateTemplates.id, templateId))
  }

  /** Dados da tela do construtor: modelo + versão mais recente + links assinados das imagens. */
  async getBuilderData(templateId: number): Promise<CertificateTemplateBuilderData> {
    const [template] = await this.db
      .select({
        id: certificateTemplates.id,
        name: certificateTemplates.name,
        description: certificateTemplates.description,
        status: certificateTemplates.status,
        orientation: certificateTemplates.orientation,
        pageSize: certificateTemplates.pageSize,
      })
      .from(certificateTemplates)
      .where(eq(certificateTemplates.id, templateId))
    if (!template) throw new NotFoundException('Modelo não encontrado')

    const orientation = toOrientation(template.orientation)
    const pageSize = template.pageSize.trim() || 'A4'

    const [latest] = await this.db
      .select({
        id: certificateTemplateVersions.id,
        versionNumber: certificateTemplateVersions.versionNumber,
        schemaJson: certificateTemplateVersions.schemaJson,
        updatedAt: certificateTemplateVersions.updatedAt,
      })
      .from(certificateTemplateVersions)
      .where(eq(certificateTemplateVersions.templateId, templateId))
      .orderBy(desc(certificateTemplateVersions.versionNumber))
      .limit(1)

    const schema = latest
      ? parseCertificateBuilderSchema(latest.schemaJson, { orientation, pageSize })
      : createDefaultCertificateBuilderSchema(orientation, pageSize)

    return {
      templateId,
      name: template.name.trim() || 'Template sem nome',
      description: template.description?.trim() || null,
      status: template.status,
      orientation,
      pageSize,
      latestVersionId: latest?.id ?? null,
      latestVersionNumber: latest?.versionNumber ?? 0,
      latestVersionUpdatedAt: latest ? latest.updatedAt.toISOString() : null,
      schema,
      backgroundPreviewUrls: this.signAssetUrls(schema, BUILDER_ASSET_URL_TTL_SECONDS),
    }
  }

  /** Links assinados (privados, com validade) das imagens do modelo. */
  signAssetUrls(schema: CertificateBuilderSchema, ttlSeconds: number): CertificateAssetUrls {
    const sign = (path: string | null) =>
      path ? this.files.signedUrl('certificates', path, ttlSeconds) : null
    return {
      imageUrl: sign(schema.background.imagePath),
      primarySignatureUrl: sign(schema.background.primarySignaturePath),
      secondarySignatureUrl: sign(schema.background.secondarySignaturePath),
    }
  }

  /** Salva uma NOVA versão (as antigas nunca mudam). O número sai do lock no modelo: sem duplicar. */
  async saveVersion(userId: string, templateId: number, input: SaveVersionInput) {
    return this.db.transaction(async (tx) => {
      const locked = await tx
        .select({ id: certificateTemplates.id })
        .from(certificateTemplates)
        .where(eq(certificateTemplates.id, templateId))
        .for('update')
      if (locked.length === 0) throw new NotFoundException('Modelo não encontrado')

      const [latest] = await tx
        .select({ versionNumber: max(certificateTemplateVersions.versionNumber) })
        .from(certificateTemplateVersions)
        .where(eq(certificateTemplateVersions.templateId, templateId))
      const versionNumber = (latest?.versionNumber ?? 0) + 1

      await tx.insert(certificateTemplateVersions).values({
        templateId,
        versionNumber,
        schemaJson: input.schemaJson,
        htmlSnapshot: input.htmlSnapshot || null,
        createdBy: userId,
      })

      await tx
        .update(certificateTemplates)
        .set({
          orientation: input.schemaJson.meta.orientation,
          pageSize: input.schemaJson.meta.pageSize,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(certificateTemplates.id, templateId))

      return { versionNumber }
    })
  }

  /** Envia uma imagem do modelo (fundo/assinatura) para o bucket privado `certificates`. */
  async uploadAsset(
    templateId: number,
    target: AssetTarget,
    file: { buffer: Buffer; mimetype: string; size: number },
  ): Promise<{ path: string; signedUrl: string }> {
    const rule = ASSET_TYPES[file.mimetype]
    if (!rule) throw new BadRequestException('Formato inválido. Use PNG, JPG, WEBP ou SVG.')
    if (file.size > ASSET_MAX_BYTES) {
      throw new BadRequestException('Arquivo muito grande. O tamanho máximo permitido é 5MB.')
    }
    if (!rule.matches(file.buffer)) {
      throw new BadRequestException('O conteúdo do arquivo não corresponde ao formato informado.')
    }

    const [template] = await this.db
      .select({ id: certificateTemplates.id })
      .from(certificateTemplates)
      .where(eq(certificateTemplates.id, templateId))
    if (!template) throw new NotFoundException('Modelo não encontrado')

    const path = `templates/${templateId}/assets/${ASSET_FOLDERS[target]}/${Date.now()}-${randomBytes(6).toString('hex')}.${rule.extension}`
    await this.files.putObject('certificates', path, file.buffer)
    return {
      path,
      signedUrl: this.files.signedUrl('certificates', path, BUILDER_ASSET_URL_TTL_SECONDS),
    }
  }

  /** HTML da prévia (a rota do front só repassa). */
  async renderPreview(templateId: number, query: PreviewQuery): Promise<string> {
    const data = await this.getBuilderData(templateId)
    const overrides = Object.fromEntries(
      Object.entries(query).filter(([, value]) => typeof value === 'string' && value.length > 0),
    )
    return renderCertificatePreviewDocument({
      templateName: data.name,
      schema: data.schema,
      assetUrls: data.backgroundPreviewUrls,
      payload: overrides,
    })
  }

  /**
   * Define o modelo ATIVO do curso (um só por curso: índice único parcial). O anterior fica
   * desativado, com histórico. Só modelo publicado pode ser ativado.
   */
  async bindCourseTemplate(userId: string, courseId: number, input: BindCourseTemplateInput) {
    return this.db.transaction(async (tx) => {
      const [course] = await tx
        .select({ id: courses.id })
        .from(courses)
        .where(eq(courses.id, courseId))
        .for('update')
      if (!course) throw new NotFoundException('Curso não encontrado')

      const [template] = await tx
        .select({ id: certificateTemplates.id, status: certificateTemplates.status })
        .from(certificateTemplates)
        .where(eq(certificateTemplates.id, input.templateId))
      if (!template) throw new NotFoundException('Modelo não encontrado')
      if (template.status !== 'published') {
        throw new ConflictException('Só um modelo publicado pode ser ativado em um curso')
      }

      const [version] = await tx
        .select({ id: certificateTemplateVersions.id })
        .from(certificateTemplateVersions)
        .where(
          and(
            eq(certificateTemplateVersions.templateId, template.id),
            input.versionId ? eq(certificateTemplateVersions.id, input.versionId) : undefined,
          ),
        )
        .orderBy(desc(certificateTemplateVersions.versionNumber))
        .limit(1)
      if (!version) throw new NotFoundException('Versão do modelo não encontrada')

      const now = new Date()
      await tx
        .update(courseCertificateTemplates)
        .set({ isActive: false, deactivatedAt: now, updatedAt: now })
        .where(
          and(
            eq(courseCertificateTemplates.courseId, courseId),
            eq(courseCertificateTemplates.isActive, true),
          ),
        )

      const [binding] = await tx
        .insert(courseCertificateTemplates)
        .values({
          courseId,
          templateId: template.id,
          templateVersionId: version.id,
          isActive: true,
          createdBy: userId,
        })
        .returning({
          id: courseCertificateTemplates.id,
          courseId: courseCertificateTemplates.courseId,
          templateId: courseCertificateTemplates.templateId,
          templateVersionId: courseCertificateTemplates.templateVersionId,
        })
      return binding!
    })
  }
}
