import { Module } from '@nestjs/common'
import { AcademyController } from './academy/academy.controller.js'
import { AcademyService } from './academy/academy.service.js'
import { AnalyticsController } from './analytics/analytics.controller.js'
import { AnalyticsService } from './analytics/analytics.service.js'
import {
  AdminProducerApplicationsController,
  AdminProducerLeadsController,
  ApplicationsController,
  PublicLeadsController,
} from './applications/applications.controller.js'
import { ApplicationsService } from './applications/applications.service.js'
import { LeadsService } from './applications/leads.service.js'
import { DashboardController } from './dashboard/dashboard.controller.js'
import { DashboardService } from './dashboard/dashboard.service.js'
import { FinancialsController } from './financials/financials.controller.js'
import { FinancialsService } from './financials/financials.service.js'
import { WithdrawalsService } from './financials/withdrawals.service.js'
import {
  CourseOptionsController,
  CourseOptionsService,
} from './options/course-options.controller.js'
import { ProfileController } from './profile/profile.controller.js'
import { ProfileService } from './profile/profile.service.js'
import { QuestionsController } from './questions/questions.controller.js'
import { QuestionsService } from './questions/questions.service.js'
import { ReviewsController } from './reviews/reviews.controller.js'
import { ReviewsService } from './reviews/reviews.service.js'

/**
 * Painel do produtor (menos cursos, que ficam em `producer-courses`) e candidatura a produtor:
 * dashboard, analytics, financeiro/saques, avaliações, perguntas, academia, perfil, e os leads e
 * candidaturas que o admin analisa. Toda rota do painel exige papel `producer` e usa o id da sessão.
 */
@Module({
  controllers: [
    DashboardController,
    AnalyticsController,
    FinancialsController,
    ReviewsController,
    QuestionsController,
    AcademyController,
    ProfileController,
    CourseOptionsController,
    PublicLeadsController,
    ApplicationsController,
    AdminProducerLeadsController,
    AdminProducerApplicationsController,
  ],
  providers: [
    DashboardService,
    AnalyticsService,
    FinancialsService,
    WithdrawalsService,
    ReviewsService,
    QuestionsService,
    AcademyService,
    ProfileService,
    CourseOptionsService,
    LeadsService,
    ApplicationsService,
  ],
})
export class ProducerModule {}
