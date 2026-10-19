import { Module } from '@nestjs/common'
import { CheckoutModule } from '../checkout/checkout.module.js'
import { AdminFinanceController } from './admin-finance.controller.js'
import { AdminFinanceService } from './admin-finance.service.js'
import { AdminRefundsService } from './admin-refunds.service.js'
import { AdminReportService } from './admin-report.service.js'
import { AdminWithdrawalsService } from './admin-withdrawals.service.js'
import { StudentFinanceController } from './student-finance.controller.js'
import { StudentFinanceService } from './student-finance.service.js'

/**
 * Financeiro: histórico e comprovantes do aluno, e a gestão financeira do admin (métricas,
 * liquidez, fiscal, saques, reembolsos e relatório). O dinheiro entra (e volta, no estorno) pelo
 * módulo `checkout`; aqui se lê e se administra o que ele gravou (`transactions`, `invoices`,
 * `withdrawals`).
 */
@Module({
  imports: [CheckoutModule],
  controllers: [StudentFinanceController, AdminFinanceController],
  providers: [
    StudentFinanceService,
    AdminFinanceService,
    AdminWithdrawalsService,
    AdminReportService,
    AdminRefundsService,
  ],
  exports: [AdminFinanceService],
})
export class FinanceModule {}
