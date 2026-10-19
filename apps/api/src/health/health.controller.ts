import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common'
import { sql } from 'drizzle-orm'
import { DB, type Database } from '../database/database.module.js'
import { Public } from '../modules/auth/decorators.js'

@Public()
@Controller('health')
export class HealthController {
  constructor(@Inject(DB) private readonly db: Database) {}

  @Get()
  async check() {
    try {
      await this.db.execute(sql`select 1`)
      return { status: 'ok', database: 'ok' }
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'unreachable' })
    }
  }
}
