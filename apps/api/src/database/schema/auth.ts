import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { users } from './users.js'

/** Sessões de login. O token puro só existe no cookie; aqui fica o SHA-256 dele. */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    userAgent: text(),
    ipAddress: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.tokenHash), index().on(t.userId), index().on(t.expiresAt)],
)

/** Tokens de redefinição de senha: uso único, curta duração, guardados como hash. */
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    usedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.tokenHash), index().on(t.userId)],
)

/**
 * Links de confirmação de e-mail: uso único, 24 h, guardados como hash (igual à redefinição de senha).
 *
 * Cada link carrega os dados do CADASTRO que o gerou (nome e hash da senha). Quem confirma o
 * e-mail ativa a conta com as credenciais DAQUELE cadastro, e não com as de quem cadastrou por
 * último: assim, um segundo cadastro com o mesmo e-mail não troca o que o dono do link vai ativar.
 */
export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text().notNull(),
    pendingName: text().notNull(),
    pendingPasswordHash: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    usedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.tokenHash), index().on(t.userId)],
)
