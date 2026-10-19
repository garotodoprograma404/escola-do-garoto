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
import { Throttle } from '@nestjs/throttler'
import type { SessionUser } from '@vox/contracts'
import type { Response } from 'express'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentUser } from '../auth/decorators.js'
import {
  idParamSchema,
  refundRequestSchema,
  studentTransactionsQuerySchema,
  type RefundRequestInput,
  type StudentTransactionsQuery,
} from './finance.schemas.js'
import {
  StudentFinanceService,
  type StudentFinancialStats,
  type StudentTransaction,
} from './student-finance.service.js'

const idPipe = new ZodValidationPipe(idParamSchema)

/**
 * Financeiro do ALUNO: histórico de compras, resumo, comprovante e pedido de reembolso. Tudo é
 * filtrado pelo usuário da SESSÃO (nunca por id vindo do cliente), para um aluno
 * não ler transações nem comprovantes de outro.
 */
@Controller('finance/student')
export class StudentFinanceController {
  constructor(@Inject(StudentFinanceService) private readonly finance: StudentFinanceService) {}

  @Get('transactions')
  list(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(studentTransactionsQuerySchema)) query: StudentTransactionsQuery,
  ): Promise<StudentTransaction[]> {
    return this.finance.list(user.id, query)
  }

  @Get('stats')
  stats(@CurrentUser() user: SessionUser): Promise<StudentFinancialStats> {
    return this.finance.stats(user.id)
  }

  /** Gera (se ainda não existe) o comprovante e devolve o endereço para baixar. */
  @Post('transactions/:id/invoice')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async generateInvoice(
    @CurrentUser() user: SessionUser,
    @Param('id', idPipe) id: number,
  ): Promise<{ success: true; url: string; filename: string }> {
    const invoice = await this.finance.getInvoice(user.id, id)
    return {
      success: true,
      url: `/api/finance/student/transactions/${id}/invoice`,
      filename: invoice.filename,
    }
  }

  @Get('transactions/:id/invoice')
  async downloadInvoice(
    @CurrentUser() user: SessionUser,
    @Param('id', idPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const invoice = await this.finance.getInvoice(user.id, id)
    res
      .status(HttpStatus.OK)
      .set({
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${invoice.filename}"`,
        // Defesa em profundidade: mesmo que algum texto escapasse do escape, nada executa aqui.
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      })
      .send(invoice.html)
  }

  @Post('refunds')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  requestRefund(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(refundRequestSchema)) body: RefundRequestInput,
  ): Promise<{ id: string }> {
    return this.finance.requestRefund(user.id, body)
  }
}
