import { Module } from '@nestjs/common'
import { AdminFinanceController } from './admin-finance.controller.js'
import { AdminFinanceService } from './admin-finance.service.js'
import { AdminReportService } from './admin-report.service.js'
import { AdminWithdrawalsService } from './admin-withdrawals.service.js'
import { StudentFinanceController } from './student-finance.controller.js'
import { StudentFinanceService } from './student-finance.service.js'

/**
 * Financeiro: histórico e comprovantes do aluno, e a gestão financeira do admin (métricas,
 * liquidez, fiscal, saques e relatório). O dinheiro entra pelo módulo `checkout`; aqui só se lê
 * e se administra o que ele gravou (`transactions`, `invoices`, `withdrawals`).
 */
@Module({
  controllers: [StudentFinanceController, AdminFinanceController],
  providers: [
    StudentFinanceService,
    AdminFinanceService,
    AdminWithdrawalsService,
    AdminReportService,
  ],
  exports: [AdminFinanceService],
})
export class FinanceModule {}
