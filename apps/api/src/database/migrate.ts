/**
 * Aplica as migrations (`apps/api/drizzle`) no banco apontado por DATABASE_URL.
 * Roda no container antes da API subir (ver `Dockerfile`), sem precisar do drizzle-kit.
 *
 *   node dist/database/migrate.js
 */
import { existsSync } from 'node:fs'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

if (existsSync('.env')) process.loadEnvFile('.env')
const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL não definido')

const pool = new Pool({ connectionString: url, max: 1 })
try {
  await migrate(drizzle(pool), { migrationsFolder: process.env.MIGRATIONS_DIR ?? './drizzle' })
  console.log('Migrations aplicadas.')
} finally {
  await pool.end()
}
