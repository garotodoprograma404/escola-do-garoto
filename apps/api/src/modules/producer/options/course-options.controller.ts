import { Controller, Get, Inject, Injectable } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { asc, eq } from 'drizzle-orm'
import { DB, type Database } from '../../../database/database.module.js'
import { courses } from '../../../database/schema/index.js'
import { CurrentUser, Roles } from '../../auth/decorators.js'

@Injectable()
export class CourseOptionsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Cursos do produtor para os filtros das telas (id como texto, como as telas esperam). */
  async listCourseOptions(producerId: string): Promise<{ id: string; title: string }[]> {
    const rows = await this.db
      .select({ id: courses.id, title: courses.title })
      .from(courses)
      .where(eq(courses.producerId, producerId))
      .orderBy(asc(courses.title), asc(courses.id))
    return rows.map((row) => ({ id: String(row.id), title: row.title }))
  }
}

@Controller('producer/course-options')
@Roles(['producer'])
export class CourseOptionsController {
  constructor(@Inject(CourseOptionsService) private readonly options: CourseOptionsService) {}

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.options.listCourseOptions(user.id)
  }
}
