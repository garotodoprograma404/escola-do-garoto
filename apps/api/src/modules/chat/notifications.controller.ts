import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Sse,
} from '@nestjs/common'
import type { MessageEvent } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { SessionUser } from '@vox/contracts'
import type { Observable } from 'rxjs'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentSessionId, CurrentUser } from '../auth/decorators.js'
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
  type ListNotificationsQuery,
} from './chat.schemas.js'
import { NotificationsFeedService, type NotificationDto } from './notifications-feed.service.js'

/**
 * Sino de notificações. Tudo é filtrado pelo usuário da sessão: não existe rota que receba o id
 * de OUTRA pessoa. As rotas fixas vêm antes das que têm `:id`.
 */
@Controller('notifications')
export class NotificationsController {
  constructor(@Inject(NotificationsFeedService) private readonly feed: NotificationsFeedService) {}

  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(listNotificationsQuerySchema)) query: ListNotificationsQuery,
  ): Promise<NotificationDto[]> {
    return this.feed.list(user, { limit: query.limit, unreadOnly: query.unread })
  }

  @Get('stats')
  stats(@CurrentUser() user: SessionUser) {
    return this.feed.stats(user)
  }

  /** `text/event-stream`: evento `notifications` (lista de novas) e `ping`. */
  @Sse('stream')
  @Throttle({ session: { limit: 30, ttl: 60_000 } })
  stream(
    @CurrentUser() user: SessionUser,
    @CurrentSessionId() sessionId: string,
  ): Observable<MessageEvent> {
    return this.feed.openStream(user, sessionId)
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllRead(@CurrentUser() user: SessionUser): Promise<void> {
    await this.feed.markAllRead(user)
  }

  @Delete('read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRead(@CurrentUser() user: SessionUser): Promise<void> {
    await this.feed.removeRead(user)
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(
    @CurrentUser() user: SessionUser,
    @Param('id', new ZodValidationPipe(notificationIdParamSchema)) id: string,
  ): Promise<void> {
    await this.feed.markRead(user, id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: SessionUser,
    @Param('id', new ZodValidationPipe(notificationIdParamSchema)) id: string,
  ): Promise<void> {
    await this.feed.remove(user, id)
  }
}
