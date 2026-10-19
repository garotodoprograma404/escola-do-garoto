import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Request } from 'express'
import { UPLOAD_RULES, UPLOAD_TYPES, type UploadType } from './file-types.js'

/**
 * Antes de o multer ler o corpo (que fica inteiro na memória), confere o tipo de upload e o papel
 * de quem envia e limita o tamanho AO TIPO. Sem isso, qualquer conta logada gastaria 100 MB de RAM
 * por requisição só para receber um 400/403.
 */
export class UploadInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<Request>()
    const type = request.query.type
    if (typeof type !== 'string' || !(UPLOAD_TYPES as readonly string[]).includes(type)) {
      throw new BadRequestException('Tipo de upload inválido')
    }
    const user = request.auth?.user
    if (!user) throw new UnauthorizedException('Faça login para continuar')

    const rule = UPLOAD_RULES[type as UploadType]
    if (rule.roles && !rule.roles.some((role) => user.roles.includes(role))) {
      throw new ForbiddenException('Você não tem permissão para enviar este tipo de arquivo')
    }

    const Delegate = FileInterceptor('file', { limits: { fileSize: rule.maxBytes, files: 1 } })
    return new Delegate().intercept(context, next)
  }
}
