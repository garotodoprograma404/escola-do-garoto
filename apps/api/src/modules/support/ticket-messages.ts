import { and, asc, eq, sql } from 'drizzle-orm'
import type { Database } from '../../database/database.module.js'
import { chatMessages, profiles, ticketMessages } from '../../database/schema/index.js'

/**
 * A conversa de um ticket fica em DUAS tabelas: `ticket_messages` (mensagens do ticket) e
 * `chat_messages` (chat em tempo real). As telas mostram as duas juntas, em ordem cronológica.
 */
export type UnifiedMessage = {
  source: 'ticket' | 'chat'
  id: number
  ticketId: number
  userId: string
  userName: string | null
  userAvatar: string | null
  isStaff: boolean
  message: string
  attachments: string[] | undefined
  createdAt: Date
}

/** O usuário tem papel de admin ativo. */
function isAdminUser(userIdColumn: unknown) {
  return sql<boolean>`exists (
    select 1 from user_roles ur
    where ur.user_id = ${userIdColumn} and ur.role = 'admin' and ur.is_active = true
  )`
}

function attachmentList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const urls = value.filter((item): item is string => typeof item === 'string')
  return urls.length > 0 ? urls : undefined
}

/**
 * `includeInternal = false` esconde as notas internas da equipe (`ticket_messages.is_internal`), que o
 * aluno nunca pode ler.
 */
export async function loadUnifiedMessages(
  db: Database,
  ticketId: number,
  options: { includeInternal: boolean },
): Promise<UnifiedMessage[]> {
  const [ticketRows, chatRows] = await Promise.all([
    db
      .select({
        id: ticketMessages.id,
        ticketId: ticketMessages.ticketId,
        userId: ticketMessages.userId,
        message: ticketMessages.message,
        attachments: ticketMessages.attachments,
        createdAt: ticketMessages.createdAt,
        userName: profiles.fullName,
        userAvatar: profiles.avatarUrl,
        isStaff: isAdminUser(ticketMessages.userId),
      })
      .from(ticketMessages)
      .leftJoin(profiles, eq(profiles.id, ticketMessages.userId))
      .where(
        and(
          eq(ticketMessages.ticketId, ticketId),
          options.includeInternal ? undefined : eq(ticketMessages.isInternal, false),
        ),
      )
      .orderBy(asc(ticketMessages.createdAt), asc(ticketMessages.id)),
    db
      .select({
        id: chatMessages.id,
        ticketId: chatMessages.ticketId,
        userId: chatMessages.senderId,
        message: chatMessages.message,
        createdAt: chatMessages.createdAt,
        userName: profiles.fullName,
        userAvatar: profiles.avatarUrl,
        isStaff: chatMessages.isStaff,
      })
      .from(chatMessages)
      .leftJoin(profiles, eq(profiles.id, chatMessages.senderId))
      .where(eq(chatMessages.ticketId, ticketId))
      .orderBy(asc(chatMessages.createdAt), asc(chatMessages.id)),
  ])

  const unified: UnifiedMessage[] = [
    ...ticketRows.map((row) => ({
      source: 'ticket' as const,
      id: row.id,
      ticketId: row.ticketId,
      userId: row.userId,
      userName: row.userName,
      userAvatar: row.userAvatar,
      isStaff: row.isStaff,
      message: row.message,
      attachments: attachmentList(row.attachments),
      createdAt: row.createdAt,
    })),
    ...chatRows.map((row) => ({
      source: 'chat' as const,
      id: row.id,
      ticketId: row.ticketId,
      userId: row.userId,
      userName: row.userName,
      userAvatar: row.userAvatar,
      isStaff: row.isStaff,
      message: row.message,
      attachments: undefined,
      createdAt: row.createdAt,
    })),
  ]
  return unified.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
}
