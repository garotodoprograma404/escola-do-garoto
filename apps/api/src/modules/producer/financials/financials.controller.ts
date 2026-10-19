import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Query } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { SessionUser } from '@vox/contracts'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js'
import { CurrentUser, Roles } from '../../auth/decorators.js'
import {
  financialsQuerySchema,
  withdrawalRequestSchema,
  type FinancialsQuery,
  type WithdrawalRequestInput,
} from './financials.schemas.js'
import { FinancialsService } from './financials.service.js'
import { WithdrawalsService } from './withdrawals.service.js'

/** Financeiro do produtor (conta `producer`). Sempre do usuário da sessão. */
@Controller('producer')
@Roles(['producer'])
export class FinancialsController {
  constructor(
    @Inject(FinancialsService) private readonly financials: FinancialsService,
    @Inject(WithdrawalsService) private readonly withdrawals: WithdrawalsService,
  ) {}

  @Get('financials')
  get(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(financialsQuerySchema)) query: FinancialsQuery,
  ) {
    return this.financials.getFinancials(user.id, query.range, query.type)
  }

  @Post('withdrawals')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  request(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(withdrawalRequestSchema)) body: WithdrawalRequestInput,
  ) {
    return this.withdrawals.requestWithdrawal(user.id, body)
  }
}
