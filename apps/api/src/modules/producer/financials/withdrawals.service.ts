import {
  BadRequestException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common'
import { sql } from 'drizzle-orm'
import { DB, type Database } from '../../../database/database.module.js'
import { users, withdrawals } from '../../../database/schema/index.js'
import { fromCents, parseReaisToCents } from '../money.js'
import { MIN_WITHDRAWAL_CENTS } from './balance.js'
import type { WithdrawalRequestInput } from './financials.schemas.js'
import { loadProducerBalance } from './financials.service.js'

export type CreatedWithdrawal = {
  id: number
  amount: number
  method: 'pix' | 'bank_transfer'
  status: 'pending'
  requested_at: Date
}

@Injectable()
export class WithdrawalsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Pede um saque do produtor.
   *
   * Sem trava, dois pedidos simultâneos leriam o mesmo saldo e sacariam duas vezes. Por isso a
   * linha do usuário é travada (`FOR UPDATE`) dentro da transação: o segundo pedido espera o
   * primeiro gravar e já enxerga o saldo reservado por ele.
   */
  async requestWithdrawal(
    producerId: string,
    input: WithdrawalRequestInput,
  ): Promise<CreatedWithdrawal> {
    const amountCents = parseReaisToCents(input.amount)
    if (amountCents === null) {
      throw new BadRequestException('Valor inválido. Use no máximo 2 casas decimais')
    }
    if (amountCents < MIN_WITHDRAWAL_CENTS) {
      throw new BadRequestException('Valor mínimo de saque é R$ 50,00')
    }

    const bankData =
      input.method === 'pix'
        ? { pix_key: input.pix_key }
        : {
            bank_code: input.bank_code,
            agency: input.bank_agency,
            account: input.bank_account,
            account_type: input.account_type,
          }

    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select ${users.id} from ${users} where ${users.id} = ${producerId} for update`,
      )

      const { balance } = await loadProducerBalance(tx, producerId)
      if (amountCents > balance.available) {
        throw new UnprocessableEntityException(
          'Saldo insuficiente. As vendas dos últimos 7 dias ficam a liberar até passar o prazo de reembolso do aluno.',
        )
      }

      const [created] = await tx
        .insert(withdrawals)
        .values({
          userId: producerId,
          amount: fromCents(amountCents),
          accountScope: 'producer',
          method: input.method,
          status: 'pending',
          bankData,
          notes: `Solicitação de saque (producer) via ${input.method === 'pix' ? 'PIX' : 'Transferência Bancária'}`,
        })
        .returning({
          id: withdrawals.id,
          amount: withdrawals.amount,
          method: withdrawals.method,
          requested_at: withdrawals.requestedAt,
        })

      return { ...created, status: 'pending' as const }
    })
  }
}
