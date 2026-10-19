import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { ENV } from '../config/config.module.js'
import type { Env } from '../config/env.js'
import * as schema from './schema/index.js'

export const DB = Symbol('DB')
const PG_POOL = Symbol('PG_POOL')

export type Database = NodePgDatabase<typeof schema>
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
/** Aceita o banco ou uma transação aberta: services recebem isso quando participam de uma. */
export type DbExecutor = Database | Transaction

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ENV],
      useFactory: (env: Env) => new Pool({ connectionString: env.DATABASE_URL }),
    },
    {
      provide: DB,
      inject: [PG_POOL],
      useFactory: (pool: Pool): Database => drizzle(pool, { schema, casing: 'snake_case' }),
    },
  ],
  exports: [DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown() {
    await this.pool.end()
  }
}
