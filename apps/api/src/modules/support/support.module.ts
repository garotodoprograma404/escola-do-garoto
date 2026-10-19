import { Module } from '@nestjs/common'
import { AdminSupportController } from './admin-support.controller.js'
import { AdminSupportService } from './admin-support.service.js'
import { SupportController } from './support.controller.js'
import { SupportService } from './support.service.js'

/**
 * Suporte: chamados do aluno (`/support`) e central da equipe (`/admin/support`). A conversa em
 * tempo real fica no módulo `chat` (global: barramento, notificações e regra de participação).
 */
@Module({
  controllers: [SupportController, AdminSupportController],
  providers: [SupportService, AdminSupportService],
})
export class SupportModule {}
