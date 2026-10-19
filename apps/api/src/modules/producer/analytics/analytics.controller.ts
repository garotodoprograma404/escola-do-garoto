import { Controller, Get, Inject, Query } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { z } from 'zod'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js'
import { CurrentUser, Roles } from '../../auth/decorators.js'
import { DATE_RANGES } from '../period.js'
import { AnalyticsService } from './analytics.service.js'

const analyticsQuerySchema = z.object({
  dateRange: z.enum(DATE_RANGES).default('30d'),
  courseId: z.coerce.number().int().positive().optional(),
})

@Controller('producer/analytics')
@Roles(['producer'])
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analytics: AnalyticsService) {}

  @Get()
  get(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(analyticsQuerySchema)) query: z.infer<typeof analyticsQuerySchema>,
  ) {
    return this.analytics.getAnalytics(user.id, query)
  }
}
