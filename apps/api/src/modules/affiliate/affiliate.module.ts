import { Module } from '@nestjs/common'
import { AffiliateApplicationService } from './affiliate-application.service.js'
import { AffiliateAttributionService } from './affiliate-attribution.service.js'
import { AffiliateCommissionService } from './affiliate-commission.service.js'
import { AffiliateDashboardService } from './affiliate-dashboard.service.js'
import { AffiliateFinanceService } from './affiliate-finance.service.js'
import { AffiliateLinksService } from './affiliate-links.service.js'
import {
  AffiliateApplicationController,
  AffiliatePanelController,
  AffiliateTrackingController,
} from './affiliate.controller.js'

/**
 * Programa de afiliados: candidatura, links, atribuição por último clique, comissões, painel e
 * saques do afiliado. Os services exportados são os pontos de integração do checkout
 * (ver `docs/areas/afiliados.md`).
 */
@Module({
  controllers: [
    AffiliateTrackingController,
    AffiliateApplicationController,
    AffiliatePanelController,
  ],
  providers: [
    AffiliateApplicationService,
    AffiliateAttributionService,
    AffiliateCommissionService,
    AffiliateDashboardService,
    AffiliateFinanceService,
    AffiliateLinksService,
  ],
  exports: [AffiliateAttributionService, AffiliateCommissionService, AffiliateFinanceService],
})
export class AffiliateModule {}
