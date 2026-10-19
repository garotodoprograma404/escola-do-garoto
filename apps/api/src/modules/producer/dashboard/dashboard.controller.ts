import { Controller, Get, Inject } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { CurrentUser, Roles } from '../../auth/decorators.js'
import { DashboardService } from './dashboard.service.js'

/** Dashboard do produtor: sempre os dados de quem está logado (id da sessão). */
@Controller('producer/dashboard')
@Roles(['producer'])
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboard: DashboardService) {}

  @Get('stats')
  stats(@CurrentUser() user: SessionUser) {
    return this.dashboard.getStats(user.id)
  }

  @Get('revenue')
  revenue(@CurrentUser() user: SessionUser) {
    return this.dashboard.getRevenueChart(user.id)
  }

  @Get('recent-sales')
  recentSales(@CurrentUser() user: SessionUser) {
    return this.dashboard.getRecentSales(user.id)
  }

  @Get('course-performance')
  coursePerformance(@CurrentUser() user: SessionUser) {
    return this.dashboard.getCoursePerformance(user.id)
  }
}
