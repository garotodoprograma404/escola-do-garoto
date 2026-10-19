/**
 * Primeiro admin (ou recuperar o acesso de admin) sem depender de e-mail:
 *
 *   docker compose -f infra/producao/compose.yaml --env-file infra/producao/.env \
 *     exec api node dist/database/create-admin.js
 *   (local: pnpm admin:create)
 *
 * Pergunta e-mail, nome e senha no terminal (a senha não aparece). Se a conta não existe, cria já
 * confirmada e com o papel admin. Se existe, a senha passa a ser a digitada AQUI: um cadastro feito
 * antes pelo site com este e-mail (por exemplo, por alguém que se adiantou ao dono) perde a senha
 * dele, os links pendentes e as sessões abertas.
 */
import { existsSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import { emailSchema, nameSchema, passwordSchema } from '@vox/contracts'
import { and, eq, isNull } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { hashPassword } from '../modules/auth/crypto/password-hasher.js'
import * as schema from './schema/index.js'

if (existsSync('.env')) process.loadEnvFile('.env')
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não definido')

const { emailVerificationTokens, passwordResetTokens, profiles, sessions, userRoles, users } =
  schema

/** Saída que some enquanto a senha é digitada. */
let muted = false
const output = new Writable({
  write(chunk: Buffer, _encoding, callback) {
    if (!muted) process.stdout.write(chunk)
    callback()
  },
})
const terminal = createInterface({
  input: process.stdin,
  output,
  terminal: Boolean(process.stdin.isTTY),
})
const lines = terminal[Symbol.asyncIterator]()

async function ask<T>(question: string, parse: (value: string) => T, hidden = false): Promise<T> {
  for (;;) {
    process.stdout.write(question)
    muted = hidden
    const next = await lines.next()
    muted = false
    if (hidden) process.stdout.write('\n')
    if (next.done) throw new Error('Entrada encerrada antes do fim. Nada foi alterado.')
    try {
      return parse(String(next.value).trim())
    } catch (error) {
      const issues = (error as { issues?: { message: string }[] }).issues
      console.log(`  ${issues?.[0]?.message ?? 'Valor inválido'}`)
    }
  }
}

async function main() {
  console.log('Criar (ou promover) o admin da plataforma\n')
  const email = await ask('E-mail: ', (value) => emailSchema.parse(value))
  const name = await ask('Nome: ', (value) => nameSchema.parse(value))
  const password = await ask(
    'Senha (mín. 8, não aparece): ',
    (value) => passwordSchema.parse(value),
    true,
  )
  const repeat = await ask('Repita a senha: ', (value) => value, true)
  terminal.close()
  if (password !== repeat) throw new Error('As senhas não conferem. Nada foi alterado.')

  const passwordHash = await hashPassword(password)
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = drizzle(pool, { schema, casing: 'snake_case' })
  try {
    const created = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .for('update')
      const now = new Date()
      let userId = existing?.id
      if (!userId) {
        const [row] = await tx
          .insert(users)
          .values({ email, passwordHash, emailVerifiedAt: now })
          .returning({ id: users.id })
        userId = row!.id
        await tx.insert(profiles).values({ id: userId, fullName: name })
      } else {
        // A senha válida passa a ser a digitada aqui; links pendentes e sessões de antes caem.
        await tx.update(users).set({ passwordHash, status: 'active' }).where(eq(users.id, userId))
        await tx
          .update(users)
          .set({ emailVerifiedAt: now })
          .where(and(eq(users.id, userId), isNull(users.emailVerifiedAt)))
        await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId))
        await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId))
        await tx.delete(sessions).where(eq(sessions.userId, userId))
        await tx.insert(profiles).values({ id: userId, fullName: name }).onConflictDoNothing()
      }
      for (const role of ['admin', 'student'] as const) {
        // Papel revogado antes volta a valer.
        await tx
          .insert(userRoles)
          .values({ userId, role })
          .onConflictDoUpdate({
            target: [userRoles.userId, userRoles.role],
            set: { isActive: true, revokedAt: null, revokedBy: null },
          })
      }
      return !existing
    })
    console.log(
      created
        ? `\nPronto: ${email} criado como admin, já confirmado. Entre pelo site.`
        : `\nPronto: ${email} agora é admin, com a senha digitada aqui. Entre pelo site.`,
    )
  } finally {
    await pool.end()
  }
}

main().catch((error: unknown) => {
  terminal.close()
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
