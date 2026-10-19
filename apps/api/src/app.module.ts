import {
  Module,
  type ExecutionContext,
  type MiddlewareConsumer,
  type NestModule,
} from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { OriginCheckMiddleware } from './common/middleware/origin-check.middleware.js'
import { ConfigModule, ENV } from './config/config.module.js'
import type { Env } from './config/env.js'
import { DatabaseModule } from './database/database.module.js'
import { HealthController } from './health/health.controller.js'
import { AuthModule } from './modules/auth/auth.module.js'
import {
  accountThrottler,
  AppThrottlerGuard,
  sessionThrottler,
  shouldSkipThrottle,
  visitorThrottler,
} from './modules/auth/throttling.js'
import { RolesGuard } from './modules/auth/guards/roles.guard.js'
import { SessionGuard } from './modules/auth/guards/session.guard.js'
import { AuditModule } from './modules/audit/audit.module.js'
import { FilesModule } from './modules/files/files.module.js'
import { AdminAffiliatesModule } from './modules/admin-affiliates/admin-affiliates.module.js'
import { AdminCoursesModule } from './modules/admin-courses/admin-courses.module.js'
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module.js'
import { AdminUsersModule } from './modules/admin-users/admin-users.module.js'
import { AffiliateModule } from './modules/affiliate/affiliate.module.js'
import { BlogModule } from './modules/blog/blog.module.js'
import { CatalogModule } from './modules/catalog/catalog.module.js'
import { CategoriesModule } from './modules/categories/categories.module.js'
import { CertificatesModule } from './modules/certificates/certificates.module.js'
import { GamificationModule } from './modules/gamification/gamification.module.js'
import { ChatModule } from './modules/chat/chat.module.js'
import { CheckoutModule } from './modules/checkout/checkout.module.js'
import { ContentModule } from './modules/content/content.module.js'
import { FinanceModule } from './modules/finance/finance.module.js'
import { LearningModule } from './modules/learning/learning.module.js'
import { ProducerCoursesModule } from './modules/producer-courses/producer-courses.module.js'
import { ProducerModule } from './modules/producer/producer.module.js'
import { SettingsModule } from './modules/settings/settings.module.js'
import { StudentModule } from './modules/student/student.module.js'
import { SupportModule } from './modules/support/support.module.js'
import { MailModule } from './modules/mail/mail.module.js'
import { NotificationsModule } from './modules/notifications/notifications.module.js'

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    MailModule,
    ThrottlerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => {
        const skip = (context: ExecutionContext) =>
          shouldSkipThrottle(context, {
            enabled: env.RATE_LIMIT_ENABLED,
            internalKey: env.INTERNAL_API_KEY,
          })
        return {
          throttlers: [
            // Por IP: o Next (chave interna) fica de fora, para um visitante não gastar o limite de
            // todos; nas chamadas dele vale o `visitor`, pelo IP que ele repassa. Por conta e por
            // SESSÃO: ninguém fica de fora, nem as chamadas do Next.
            { name: 'default', ttl: 60_000, limit: 120, skipIf: skip },
            visitorThrottler(env.RATE_LIMIT_ENABLED, env.INTERNAL_API_KEY),
            accountThrottler(() => !env.RATE_LIMIT_ENABLED),
            sessionThrottler(env.RATE_LIMIT_ENABLED),
          ],
          skipIf: () => !env.RATE_LIMIT_ENABLED,
        }
      },
    }),
    AuthModule,
    AuditModule,
    FilesModule,
    NotificationsModule,
    CatalogModule,
    SettingsModule,
    ContentModule,
    BlogModule,
    CategoriesModule,
    CheckoutModule,
    FinanceModule,
    LearningModule,
    StudentModule,
    ProducerCoursesModule,
    AdminCoursesModule,
    ProducerModule,
    AdminUsersModule,
    SupportModule,
    ChatModule,
    AdminDashboardModule,
    CertificatesModule,
    GamificationModule,
    AffiliateModule,
    AdminAffiliatesModule,
  ],
  controllers: [HealthController],
  providers: [
    // Guards globais, nesta ordem: limite de tentativas → sessão → papel.
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(OriginCheckMiddleware).forRoutes('{*path}')
  }
}
