import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { SessionUser } from '@vox/contracts'
import type { Response } from 'express'
import { z } from 'zod'
import { Public, CurrentUser } from '../auth/decorators.js'
import { UPLOAD_TYPES, type Bucket } from './file-types.js'
import { FilesService } from './files.service.js'
import { UploadInterceptor } from './upload.interceptor.js'

const uploadTypeSchema = z.enum(UPLOAD_TYPES)
const signedQuerySchema = z.object({ expires: z.coerce.number(), sig: z.string().min(10).max(200) })

type UploadedFileData = { buffer: Buffer; mimetype: string; size: number }

/** Nomes de arquivo servidos sempre como download seguro: nunca interpretados como página. */
const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  pdf: 'application/pdf',
}

function sendFile(res: Response, stream: NodeJS.ReadableStream, size: number, path: string) {
  const name = path.split('/').pop() ?? 'arquivo'
  const extension = name.split('.').pop()?.toLowerCase() ?? ''
  res.setHeader('Content-Type', CONTENT_TYPE_BY_EXTENSION[extension] ?? 'application/octet-stream')
  res.setHeader('Content-Length', String(size))
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
  res.setHeader('Content-Disposition', `inline; filename="${name}"`)
  stream.pipe(res)
}

@Controller('files')
export class FilesController {
  constructor(@Inject(FilesService) private readonly files: FilesService) {}

  /** Envia um arquivo (multipart: campos `file` e `type`). Devolve a URL e o caminho gravado. */
  @Post('upload')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(UploadInterceptor)
  async upload(
    @CurrentUser() user: SessionUser,
    @UploadedFile() file: UploadedFileData | undefined,
    @Query('type') rawType: string | undefined,
  ) {
    const type = uploadTypeSchema.safeParse(rawType)
    if (!type.success) throw new BadRequestException('Tipo de upload inválido')
    if (!file) throw new BadRequestException('Nenhum arquivo enviado')
    const stored = await this.files.upload(user, type.data, file)
    return { url: stored.url, path: stored.path, bucket: stored.bucket }
  }

  /** Só apaga o que a própria pessoa enviou (o caminho tem o id dela) ou, sendo admin, qualquer um. */
  @Delete(':bucket/*path')
  async remove(
    @CurrentUser() user: SessionUser,
    @Param('bucket') bucket: string,
    @Param('path') segments: string[],
  ) {
    const path = segments.join('/')
    const ownsIt = path.split('/')[1] === user.id
    if (!ownsIt && !user.roles.includes('admin')) {
      throw new NotFoundException('Arquivo não encontrado')
    }
    await this.files.removeObject(bucket as Bucket, path)
    return { success: true }
  }

  @Public()
  @Get('public/:bucket/*path')
  async servePublic(
    @Param('bucket') bucket: string,
    @Param('path') segments: string[],
    @Res() res: Response,
  ) {
    if (!this.files.isPublicBucket(bucket)) throw new NotFoundException('Arquivo não encontrado')
    const path = segments.join('/')
    const opened = await this.files.openObject(bucket, path)
    if (!opened) throw new NotFoundException('Arquivo não encontrado')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    sendFile(res, opened.stream, opened.size, path)
  }

  /** Download de arquivo privado: só com o link assinado que a API entregou à pessoa certa. */
  @Public()
  @Get('signed/:bucket/*path')
  async serveSigned(
    @Param('bucket') bucket: string,
    @Param('path') segments: string[],
    @Query() rawQuery: Record<string, unknown>,
    @Res() res: Response,
  ) {
    const path = segments.join('/')
    const query = signedQuerySchema.safeParse(rawQuery)
    if (
      !query.success ||
      !this.files.verifySignature(bucket, path, query.data.expires, query.data.sig)
    ) {
      throw new NotFoundException('Link inválido ou expirado')
    }
    const opened = await this.files.openObject(bucket as Bucket, path)
    if (!opened) throw new NotFoundException('Arquivo não encontrado')
    res.setHeader('Cache-Control', 'private, no-store')
    sendFile(res, opened.stream, opened.size, path)
  }
}
