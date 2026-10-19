import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import type { Response } from 'express'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentUser, Roles } from '../auth/decorators.js'
import {
  AdminFinanceService,
  type FinanceTransaction,
  type FinancialMetrics,
  type FiscalCompliance,
  type LiquidityData,
  type WithdrawalRequest,
} from './admin-finance.service.js'
import { AdminReportService } from './admin-report.service.js'
import { AdminWithdrawalsService } from './admin-withdrawals.service.js'
import {
  idParamSchema,
  payWithdrawalSchema,
  rejectWithdrawalSchema,
  reportQuerySchema,
  withdrawalFiltersSchema,
  type PayWithdrawalInput,
  type RejectWithdrawalInput,
  type ReportQuery,
  type WithdrawalFilters,
} from './finance.schemas.js'

const idPipe = new ZodValidationPipe(idParamSchema)

/**
 * Gestão financeira da plataforma: SÓ ADMIN (`@Roles`): aprovar, rejeitar e consultar
 * movimentações financeiras exige o papel de admin conferido no servidor.
 */
@Roles(['admin'])
@Controller('admin/finance')
export class AdminFinanceController {
  constructor(
    @Inject(AdminFinanceService) private readonly finance: AdminFinanceService,
    @Inject(AdminWithdrawalsService) private readonly withdrawals: AdminWithdrawalsService,
    @Inject(AdminReportService) private readonly reports: AdminReportService,
  ) {}

  @Get('metrics')
  metrics(): Promise<FinancialMetrics> {
    return this.finance.getFinancialMetrics()
  }

  @Get('transactions')
  transactions(): Promise<FinanceTransaction[]> {
    return this.finance.getTransactions()
  }

  @Get('liquidity')
  liquidity(): Promise<LiquidityData> {
    return this.finance.getLiquidityData()
  }

  @Get('fiscal-compliance')
  fiscalCompliance(): Promise<FiscalCompliance> {
    return this.finance.getFiscalCompliance()
  }

  @Get('withdrawals')
  listWithdrawals(
    @Query(new ZodValidationPipe(withdrawalFiltersSchema)) filters: WithdrawalFilters,
  ): Promise<WithdrawalRequest[]> {
    return this.finance.getWithdrawalRequests(filters)
  }

  @Post('withdrawals/:id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @CurrentUser() admin: SessionUser,
    @Param('id', idPipe) id: number,
  ): Promise<WithdrawalRequest> {
    return this.withdrawals.approve(admin.id, id)
  }

  @Post('withdrawals/:id/processing')
  @HttpCode(HttpStatus.OK)
  startProcessing(
    @CurrentUser() admin: SessionUser,
    @Param('id', idPipe) id: number,
  ): Promise<WithdrawalRequest> {
    return this.withdrawals.startProcessing(admin.id, id)
  }

  @Post('withdrawals/:id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @CurrentUser() admin: SessionUser,
    @Param('id', idPipe) id: number,
    @Body(new ZodValidationPipe(rejectWithdrawalSchema)) body: RejectWithdrawalInput,
  ): Promise<WithdrawalRequest> {
    return this.withdrawals.reject(admin.id, id, body.reason)
  }

  /** Marca o saque como PAGO (o dinheiro foi enviado fora do sistema). */
  @Post('withdrawals/:id/pay')
  @HttpCode(HttpStatus.OK)
  pay(
    @CurrentUser() admin: SessionUser,
    @Param('id', idPipe) id: number,
    @Body(new ZodValidationPipe(payWithdrawalSchema)) body: PayWithdrawalInput,
  ): Promise<WithdrawalRequest> {
    return this.withdrawals.pay(admin.id, id, body)
  }

  @Get('report')
  async report(
    @Query(new ZodValidationPipe(reportQuerySchema)) query: ReportQuery,
    @Res() res: Response,
  ): Promise<void> {
    const { filename, content } = await this.reports.buildCsv(query)
    res
      .status(HttpStatus.OK)
      .set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      })
      .send(content)
  }
}
