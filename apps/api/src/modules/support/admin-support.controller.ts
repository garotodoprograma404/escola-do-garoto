import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import type { Request } from 'express'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { auditContext } from '../admin-users/audit-context.js'
import { CurrentUser, Roles } from '../auth/decorators.js'
import { ticketIdParamSchema } from '../chat/chat.schemas.js'
import {
  AdminSupportService,
  type AdminSupportStatsDto,
  type AdminTicketContextDto,
  type AdminTicketDto,
  type AdminTicketMessageDto,
} from './admin-support.service.js'
import {
  adminTicketsQuerySchema,
  assignTicketSchema,
  updateTicketStatusSchema,
  type AdminTicketsQuery,
  type AssignTicketInput,
  type UpdateTicketStatusInput,
} from './support.schemas.js'

/** Central de suporte da equipe: vê todos os tickets, atribui e muda status. Só admin. */
@Controller('admin/support')
@Roles(['admin'])
export class AdminSupportController {
  constructor(@Inject(AdminSupportService) private readonly support: AdminSupportService) {}

  @Get('stats')
  stats(): Promise<AdminSupportStatsDto> {
    return this.support.stats()
  }

  @Get('tickets')
  list(
    @Query(new ZodValidationPipe(adminTicketsQuerySchema)) query: AdminTicketsQuery,
  ): Promise<AdminTicketDto[]> {
    return this.support.list(query)
  }

  @Get('tickets/:id')
  get(
    @Param('id', new ZodValidationPipe(ticketIdParamSchema)) id: number,
  ): Promise<AdminTicketDto> {
    return this.support.get(id)
  }

  @Get('tickets/:id/messages')
  messages(
    @Param('id', new ZodValidationPipe(ticketIdParamSchema)) id: number,
  ): Promise<AdminTicketMessageDto[]> {
    return this.support.messages(id)
  }

  @Get('tickets/:id/context')
  context(
    @Param('id', new ZodValidationPipe(ticketIdParamSchema)) id: number,
  ): Promise<AdminTicketContextDto> {
    return this.support.context(id)
  }

  @Post('tickets/:id/assign')
  assign(
    @CurrentUser() user: SessionUser,
    @Param('id', new ZodValidationPipe(ticketIdParamSchema)) id: number,
    @Body(new ZodValidationPipe(assignTicketSchema)) body: AssignTicketInput,
    @Req() req: Request,
  ): Promise<AdminTicketDto> {
    return this.support.assign(user, id, body.adminId, auditContext(req))
  }

  @Patch('tickets/:id/status')
  updateStatus(
    @CurrentUser() user: SessionUser,
    @Param('id', new ZodValidationPipe(ticketIdParamSchema)) id: number,
    @Body(new ZodValidationPipe(updateTicketStatusSchema)) body: UpdateTicketStatusInput,
    @Req() req: Request,
  ): Promise<AdminTicketDto> {
    return this.support.updateStatus(user, id, body.status, auditContext(req))
  }
}
