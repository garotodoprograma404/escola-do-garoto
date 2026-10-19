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
  Req,
  Res,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { SessionUser } from '@vox/contracts'
import type { Request, Response } from 'express'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { requestInfo } from '../../common/request-info.js'
import { CurrentUser, Roles } from '../auth/decorators.js'
import {
  AdminFinanceService,
  type FinanceTransaction,
  type FinancialMetrics,
  type FiscalCompliance,
  type LiquidityData,
  type WithdrawalRequest,
} from './admin-finance.service.js'
import {
  AdminRefundsService,
  type AdminRefundRequest,
  type ApproveRefundResult,
} from './admin-refunds.service.js'
import { AdminReportService } from './admin-report.service.js'
import { AdminWithdrawalsService } from './admin-withdrawals.service.js'
import {
  idParamSchema,
  payWithdrawalSchema,
  refundFiltersSchema,
  rejectRefundSchema,
  rejectWithdrawalSchema,
  reportQuerySchema,
  withdrawalFiltersSchema,
  type PayWithdrawalInput,
  type RefundFilters,
  type RejectRefundInput,
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
    @Inject(AdminRefundsService) private readonly refunds: AdminRefundsService,
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

  @Get('refunds')
  listRefunds(
    @Query(new ZodValidationPipe(refundFiltersSchema)) filters: RefundFilters,
  ): Promise<AdminRefundRequest[]> {
    return this.refunds.list(filters)
  }

  /** Aprova e pede o estorno ao meio de pagamento (cada clique fala com o Mercado Pago). */
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refunds/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveRefund(
    @CurrentUser() admin: SessionUser,
    @Param('id', idPipe) id: number,
    @Req() req: Request,
  ): Promise<ApproveRefundResult> {
    return this.refunds.approve(admin.id, id, requestInfo(req))
  }

  @Post('refunds/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectRefund(
    @CurrentUser() admin: SessionUser,
    @Param('id', idPipe) id: number,
    @Body(new ZodValidationPipe(rejectRefundSchema)) body: RejectRefundInput,
    @Req() req: Request,
  ): Promise<AdminRefundRequest> {
    return this.refunds.reject(admin.id, id, body.reason, requestInfo(req))
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
