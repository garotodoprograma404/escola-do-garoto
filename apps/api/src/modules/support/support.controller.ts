import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { SessionUser } from '@vox/contracts'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentUser } from '../auth/decorators.js'
import { ticketIdParamSchema } from '../chat/chat.schemas.js'
import {
  createTicketSchema,
  sendTicketMessageSchema,
  type CreateTicketInput,
  type SendTicketMessageInput,
} from './support.schemas.js'
import {
  SupportService,
  type StudentMessageDto,
  type StudentStatsDto,
  type StudentTicketDto,
} from './support.service.js'

/**
 * Suporte do ponto de vista de quem abriu o ticket. Toda consulta é filtrada pelo usuário da
 * sessão: ticket de outra pessoa responde 404. A equipe usa `/admin/support`.
 */
@Controller('support')
export class SupportController {
  constructor(@Inject(SupportService) private readonly support: SupportService) {}

  @Post('tickets')
  @Throttle({ session: { limit: 10, ttl: 60_000 } })
  create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createTicketSchema)) body: CreateTicketInput,
  ): Promise<{ id: string }> {
    return this.support.createTicket(user, body)
  }

  @Get('tickets')
  list(@CurrentUser() user: SessionUser): Promise<StudentTicketDto[]> {
    return this.support.listMine(user)
  }

  @Get('tickets/stats')
  stats(@CurrentUser() user: SessionUser): Promise<StudentStatsDto> {
    return this.support.stats(user)
  }

  /** Cursos em que a pessoa está matriculada (opções do formulário de novo ticket). */
  @Get('my-courses')
  myCourses(@CurrentUser() user: SessionUser) {
    return this.support.myCourses(user)
  }

  @Get('tickets/:id')
  get(
    @CurrentUser() user: SessionUser,
    @Param('id', new ZodValidationPipe(ticketIdParamSchema)) id: number,
  ): Promise<StudentTicketDto> {
    return this.support.getMine(user, id)
  }

  @Get('tickets/:id/messages')
  messages(
    @CurrentUser() user: SessionUser,
    @Param('id', new ZodValidationPipe(ticketIdParamSchema)) id: number,
  ): Promise<StudentMessageDto[]> {
    return this.support.listMyMessages(user, id)
  }

  @Post('tickets/:id/messages')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ session: { limit: 40, ttl: 60_000 } })
  async sendMessage(
    @CurrentUser() user: SessionUser,
    @Param('id', new ZodValidationPipe(ticketIdParamSchema)) id: number,
    @Body(new ZodValidationPipe(sendTicketMessageSchema)) body: SendTicketMessageInput,
  ): Promise<void> {
    await this.support.sendMessage(user, id, body.message)
  }

  @Post('tickets/:id/close')
  @HttpCode(HttpStatus.NO_CONTENT)
  async close(
    @CurrentUser() user: SessionUser,
    @Param('id', new ZodValidationPipe(ticketIdParamSchema)) id: number,
  ): Promise<void> {
    await this.support.close(user, id)
  }
}
