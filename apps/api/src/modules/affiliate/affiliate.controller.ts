import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { SessionUser } from '@vox/contracts'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentUser, Public, Roles } from '../auth/decorators.js'
import { AffiliateApplicationService } from './affiliate-application.service.js'
import { AffiliateAttributionService } from './affiliate-attribution.service.js'
import { AffiliateDashboardService } from './affiliate-dashboard.service.js'
import { AffiliateFinanceService } from './affiliate-finance.service.js'
import { AffiliateLinksService } from './affiliate-links.service.js'
import {
  financialsQuerySchema,
  idParamSchema,
  registerClickSchema,
  requestWithdrawalSchema,
  submitApplicationSchema,
  toggleLinkSchema,
  upsertLinkSchema,
  type FinancialsQuery,
  type RegisterClickInput,
  type RequestWithdrawalInput,
  type SubmitApplicationInput,
  type ToggleLinkInput,
  type UpsertLinkInput,
} from './affiliate.schemas.js'

const MINUTE = 60_000

/**
 * Clique em link de afiliado. PÚBLICA de propósito: quem chama é o proxy do Next, a cada visita
 * com `?aff=`. Resposta sempre 204, exista o código ou não (não vira consulta de códigos). O
 * limite por IP vale porque o proxy NÃO manda a chave interna aqui (só repassa o IP do visitante).
 */
@Controller('affiliate/clicks')
export class AffiliateTrackingController {
  constructor(
    @Inject(AffiliateAttributionService) private readonly attribution: AffiliateAttributionService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 30, ttl: MINUTE } })
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async registerClick(
    @Body(new ZodValidationPipe(registerClickSchema)) body: RegisterClickInput,
  ): Promise<void> {
    await this.attribution.registerClick(body)
  }
}

/** Candidatura ao programa: qualquer pessoa logada, sempre a própria. */
@Controller('affiliate/application')
export class AffiliateApplicationController {
  constructor(
    @Inject(AffiliateApplicationService) private readonly applications: AffiliateApplicationService,
  ) {}

  @Get()
  getOwn(@CurrentUser() user: SessionUser) {
    return this.applications.getLandingData(user.id)
  }

  @Throttle({ default: { limit: 5, ttl: MINUTE } })
  @Post()
  submit(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(submitApplicationSchema)) body: SubmitApplicationInput,
  ) {
    return this.applications.submit(user.id, body)
  }
}

/** Painel do afiliado. O id de quem pede vem SEMPRE da sessão. */
@Controller('affiliate')
@Roles(['affiliate'])
export class AffiliatePanelController {
  constructor(
    @Inject(AffiliateDashboardService) private readonly dashboard: AffiliateDashboardService,
    @Inject(AffiliateLinksService) private readonly links: AffiliateLinksService,
    @Inject(AffiliateFinanceService) private readonly finance: AffiliateFinanceService,
  ) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: SessionUser) {
    return this.dashboard.getDashboard(user.id)
  }

  @Post('links')
  createLink(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(upsertLinkSchema)) body: UpsertLinkInput,
  ) {
    return this.links.createLink(user.id, body)
  }

  @Put('links/:id')
  updateLink(
    @CurrentUser() user: SessionUser,
    @Param('id', new ZodValidationPipe(idParamSchema)) id: number,
    @Body(new ZodValidationPipe(upsertLinkSchema)) body: UpsertLinkInput,
  ) {
    return this.links.updateLink(user.id, id, body)
  }

  @Patch('links/:id/status')
  setLinkStatus(
    @CurrentUser() user: SessionUser,
    @Param('id', new ZodValidationPipe(idParamSchema)) id: number,
    @Body(new ZodValidationPipe(toggleLinkSchema)) body: ToggleLinkInput,
  ) {
    return this.links.setLinkActive(user.id, id, body.isActive)
  }

  @Get('financials')
  getFinancials(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(financialsQuerySchema)) query: FinancialsQuery,
  ) {
    return this.finance.getFinancials(user.id, query)
  }

  @Throttle({ default: { limit: 5, ttl: MINUTE } })
  @Post('withdrawals')
  requestWithdrawal(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(requestWithdrawalSchema)) body: RequestWithdrawalInput,
  ) {
    return this.finance.requestWithdrawal(user.id, body)
  }
}
