import { Controller, Get, Inject } from '@nestjs/common'
import { Roles } from '../auth/decorators.js'
import {
  AdminDashboardService,
  type ActivityPointDto,
  type CategorySliceDto,
  type DashboardMetricsDto,
  type RecentActivityDto,
} from './admin-dashboard.service.js'

/** Painel do admin: só números agregados, só para admin. */
@Controller('admin/dashboard')
@Roles(['admin'])
export class AdminDashboardController {
  constructor(@Inject(AdminDashboardService) private readonly dashboard: AdminDashboardService) {}

  @Get('metrics')
  metrics(): Promise<DashboardMetricsDto> {
    return this.dashboard.metrics()
  }

  @Get('activity')
  activity(): Promise<ActivityPointDto[]> {
    return this.dashboard.activity()
  }

  @Get('categories')
  categories(): Promise<CategorySliceDto[]> {
    return this.dashboard.categories()
  }

  @Get('recent')
  recent(): Promise<RecentActivityDto[]> {
    return this.dashboard.recent()
  }
}
