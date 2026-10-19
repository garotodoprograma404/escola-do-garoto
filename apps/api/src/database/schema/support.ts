import {
  bigint,
  boolean,
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { courses } from './courses.js'
import { ticketCategory, ticketPriority, ticketStatus } from './enums.js'
import { profiles } from './profiles.js'
import { users } from './users.js'

export const supportTickets = pgTable(
  'support_tickets',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'support_tickets_id_seq' }),
    userId: uuid('user_id').notNull(),
    subject: text().notNull(),
    description: text().notNull(),
    category: ticketCategory().notNull(),
    priority: ticketPriority().default('medium').notNull(),
    status: ticketStatus().default('open').notNull(),
    assignedTo: uuid('assigned_to'),
    courseId: bigint('course_id', { mode: 'number' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_support_tickets_assigned_to').using('btree', table.assignedTo.asc().nullsLast()),
    index('idx_support_tickets_course_id').using('btree', table.courseId.asc().nullsLast()),
    index('idx_support_tickets_updated_at').using('btree', table.updatedAt.desc()),
    index('idx_support_tickets_created_at').using('btree', table.createdAt.desc().nullsFirst()),
    index('idx_support_tickets_status').using('btree', table.status.asc().nullsLast()),
    index('idx_support_tickets_user_id').using('btree', table.userId.asc().nullsLast()),
    index('support_tickets_category_idx').using('btree', table.category.asc().nullsLast()),
    index('support_tickets_priority_idx').using('btree', table.priority.asc().nullsLast()),
    foreignKey({
      columns: [table.assignedTo],
      foreignColumns: [users.id],
      name: 'support_tickets_assigned_to_fkey',
    }),
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [courses.id],
      name: 'support_tickets_course_id_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'support_tickets_user_id_fkey',
    }).onDelete('cascade'),
  ],
)

export const ticketMessages = pgTable(
  'ticket_messages',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'ticket_messages_id_seq' }),
    ticketId: bigint('ticket_id', { mode: 'number' }).notNull(),
    userId: uuid('user_id').notNull(),
    message: text().notNull(),
    isInternal: boolean('is_internal').default(false).notNull(),
    attachments: jsonb(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_ticket_messages_created_at').using('btree', table.createdAt.asc().nullsLast()),
    index('idx_ticket_messages_ticket_id').using('btree', table.ticketId.asc().nullsLast()),
    index('idx_ticket_messages_user_id').using('btree', table.userId.asc().nullsLast()),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [supportTickets.id],
      name: 'ticket_messages_ticket_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'ticket_messages_user_id_fkey',
    }),
  ],
)

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity({ name: 'chat_messages_id_seq' }),
    ticketId: bigint('ticket_id', { mode: 'number' }).notNull(),
    senderId: uuid('sender_id').notNull(),
    message: text().notNull(),
    isStaff: boolean('is_staff').default(false).notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_chat_messages_created_at').using('btree', table.createdAt.desc().nullsFirst()),
    index('idx_chat_messages_ticket_id').using('btree', table.ticketId.asc().nullsLast()),
    foreignKey({
      columns: [table.senderId],
      foreignColumns: [profiles.id],
      name: 'chat_messages_sender_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [supportTickets.id],
      name: 'chat_messages_ticket_id_fkey',
    }).onDelete('cascade'),
  ],
)

export const typingIndicators = pgTable(
  'typing_indicators',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity({ name: 'typing_indicators_id_seq' }),
    ticketId: bigint('ticket_id', { mode: 'number' }).notNull(),
    userId: uuid('user_id').notNull(),
    isTyping: boolean('is_typing').default(false).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_typing_indicators_ticket_id').using('btree', table.ticketId.asc().nullsLast()),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [supportTickets.id],
      name: 'typing_indicators_ticket_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [profiles.id],
      name: 'typing_indicators_user_id_fkey',
    }).onDelete('cascade'),
    unique('typing_indicators_ticket_id_user_id_key').on(table.ticketId, table.userId),
  ],
)
