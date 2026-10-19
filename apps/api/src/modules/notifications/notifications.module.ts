import { Global, Module } from '@nestjs/common'
import { NotificationsService } from './notifications.service.js'

/** As rotas do sino (listar, marcar como lida, tempo real) ficam no módulo `chat`. */
@Global()
@Module({ providers: [NotificationsService], exports: [NotificationsService] })
export class NotificationsModule {}
