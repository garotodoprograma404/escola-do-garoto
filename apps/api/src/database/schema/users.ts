import { sql } from 'drizzle-orm'
import { check, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const userStatus = pgEnum('user_status', ['active', 'suspended'])

/**
 * Credencial de acesso (e-mail, senha, estado da conta). Nome, telefone, CPF, avatar etc. ficam
 * em `profiles` (mesmo id), e os papéis em `user_roles`.
 */
export const users = pgTable(
  'users',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Sempre normalizado (trim + minúsculo) pela validação antes de gravar. */
    email: text().notNull().unique(),
    passwordHash: text().notNull(),
    /**
     * Quando a pessoa provou ter acesso ao e-mail. Sem isso a conta não entra (sem sessão) nem compra.
     * Cadastro novo fica `null` até ela clicar no link enviado.
     */
    emailVerifiedAt: timestamp({ withTimezone: true }),
    /** Último aviso "você já tem conta" enviado (limita e-mail em massa contra a mesma pessoa). */
    accountExistsNoticeAt: timestamp({ withTimezone: true }),
    /** Fonte única de "conta bloqueada": suspenso não loga e perde as sessões abertas. */
    status: userStatus().notNull().default('active'),
    lastLoginAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // O app já normaliza, mas o banco garante: dois e-mails que só diferem em maiúsculas não coexistem.
    check('users_email_lowercase', sql`${t.email} = lower(${t.email})`),
  ],
)
