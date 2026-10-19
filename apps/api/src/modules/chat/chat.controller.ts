import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Sse,
} from '@nestjs/common'
import type { MessageEvent } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { SessionUser } from '@vox/contracts'
import type { Observable } from 'rxjs'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentSessionId, CurrentUser } from '../auth/decorators.js'
import { ChatStreamService } from './chat-stream.service.js'
import {
  sendChatMessageSchema,
  ticketIdParamSchema,
  typingSchema,
  userIdParamSchema,
  type SendChatMessageInput,
  type TypingInput,
} from './chat.schemas.js'
import { ChatService } from './chat.service.js'
import type { ChatMessageDto } from './realtime.bus.js'

/**
 * Chat dos tickets de suporte: o navegador abre um `EventSource`
 * em `/stream` para RECEBER e usa os POST/PUT abaixo para ENVIAR. Todas as rotas exigem ser
 * participante do ticket (dono, designado ou admin); quem não é recebe 404.
 */
@Controller('chat')
export class ChatController {
  constructor(
    @Inject(ChatService) private readonly chat: ChatService,
    @Inject(ChatStreamService) private readonly streams: ChatStreamService,
  ) {}

  @Get('tickets/:ticketId/messages')
  listMessages(
    @CurrentUser() user: SessionUser,
    @Param('ticketId', new ZodValidationPipe(ticketIdParamSchema)) ticketId: number,
  ): Promise<ChatMessageDto[]> {
    return this.chat.listMessages(user, ticketId)
  }

  @Post('tickets/:ticketId/messages')
  @Throttle({ session: { limit: 40, ttl: 60_000 } })
  sendMessage(
    @CurrentUser() user: SessionUser,
    @Param('ticketId', new ZodValidationPipe(ticketIdParamSchema)) ticketId: number,
    @Body(new ZodValidationPipe(sendChatMessageSchema)) body: SendChatMessageInput,
  ): Promise<ChatMessageDto> {
    return this.chat.sendMessage(user, ticketId, body.message)
  }

  @Put('tickets/:ticketId/typing')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ session: { limit: 120, ttl: 60_000 } })
  async setTyping(
    @CurrentUser() user: SessionUser,
    @Param('ticketId', new ZodValidationPipe(ticketIdParamSchema)) ticketId: number,
    @Body(new ZodValidationPipe(typingSchema)) body: TypingInput,
  ): Promise<void> {
    await this.chat.setTyping(user, ticketId, body.isTyping)
  }

  /** `text/event-stream`: eventos `message`, `typing`, `ticket` e `ping`. */
  @Sse('tickets/:ticketId/stream')
  @Throttle({ session: { limit: 30, ttl: 60_000 } })
  stream(
    @CurrentUser() user: SessionUser,
    @CurrentSessionId() sessionId: string,
    @Param('ticketId', new ZodValidationPipe(ticketIdParamSchema)) ticketId: number,
  ): Promise<Observable<MessageEvent>> {
    return this.streams.openTicketStream(user, sessionId, ticketId)
  }

  @Get('presence/:userId')
  @Throttle({ session: { limit: 60, ttl: 60_000 } })
  async presence(
    @CurrentUser() user: SessionUser,
    @Param('userId', new ZodValidationPipe(userIdParamSchema)) userId: string,
  ): Promise<{ online: boolean }> {
    return { online: await this.chat.isOnline(user, userId) }
  }
}
