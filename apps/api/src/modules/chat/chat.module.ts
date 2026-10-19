import { Global, Module } from '@nestjs/common'
import { ChatController } from './chat.controller.js'
import { ChatService } from './chat.service.js'
import { ChatStreamService } from './chat-stream.service.js'
import { NotificationsController } from './notifications.controller.js'
import { NotificationsFeedService } from './notifications-feed.service.js'
import { PresenceService } from './presence.service.js'
import { RealtimeBus } from './realtime.bus.js'
import { TicketAccessService } from './ticket-access.service.js'
import { TicketNotifier } from './ticket-notifier.service.js'

/**
 * Tempo real (SSE) do chat de suporte e do sino de notificações. É global porque o barramento e a
 * presença são usados por outros módulos (suporte, usuários do admin) sem importar este um a um.
 */
@Global()
@Module({
  controllers: [ChatController, NotificationsController],
  providers: [
    RealtimeBus,
    PresenceService,
    TicketAccessService,
    TicketNotifier,
    ChatService,
    ChatStreamService,
    NotificationsFeedService,
  ],
  exports: [
    RealtimeBus,
    PresenceService,
    TicketAccessService,
    TicketNotifier,
    ChatService,
    NotificationsFeedService,
  ],
})
export class ChatModule {}
