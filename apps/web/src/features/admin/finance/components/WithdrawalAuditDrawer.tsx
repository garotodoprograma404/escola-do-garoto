'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Calendar, DollarSign, User, Building2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { Badge } from '@/shared/components/ui/badge'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/shared/components/ui/drawer'
import type { WithdrawalRequest } from '../types'

interface WithdrawalAuditDrawerProps {
  open: boolean
  onClose: () => void
  withdrawal: WithdrawalRequest | null
  onApprove: (id: string) => Promise<void>
  onReject: (id: string, reason: string) => Promise<void>
  /** Marca como PAGO um saque já aprovado (o dinheiro foi enviado fora do sistema). */
  onPay?: (id: string) => Promise<void>
}

export function WithdrawalAuditDrawer({
  open,
  onClose,
  withdrawal,
  onApprove,
  onReject,
  onPay,
}: WithdrawalAuditDrawerProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  if (!withdrawal) return null

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleApprove = async () => {
    setIsProcessing(true)
    try {
      await onApprove(withdrawal.id)
      onClose()
    } catch (error) {
      console.error('Erro ao aprovar saque:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePay = async () => {
    if (!onPay) return
    setIsProcessing(true)
    try {
      await onPay(withdrawal.id)
      onClose()
    } catch (error) {
      console.error('Erro ao pagar saque:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Por favor, informe o motivo da rejeição')
      return
    }

    setIsProcessing(true)
    try {
      await onReject(withdrawal.id, rejectReason)
      onClose()
      setRejectReason('')
      setShowRejectForm(false)
    } catch (error) {
      console.error('Erro ao rejeitar saque:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const isPending = withdrawal.status === 'pending'
  const canPay =
    Boolean(onPay) && (withdrawal.status === 'approved' || withdrawal.status === 'processing')
  const statusConfig =
    withdrawal.status === 'completed'
      ? { label: 'Concluído', className: 'bg-green-100 text-green-700 dark:bg-green-900/30' }
      : withdrawal.status === 'approved'
        ? { label: 'Aprovado', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' }
        : withdrawal.status === 'processing'
          ? { label: 'Processando', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' }
          : withdrawal.status === 'rejected'
            ? { label: 'Rejeitado', className: 'bg-red-100 text-red-700 dark:bg-red-900/30' }
            : withdrawal.status === 'cancelled'
              ? {
                  label: 'Cancelado',
                  className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                }
              : {
                  label: 'Pendente',
                  className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30',
                }

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Auditoria de Saque #{withdrawal.id}</DrawerTitle>
          <DrawerDescription>
            Revise os detalhes e aprove ou rejeite a solicitação
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-6">
          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</span>
              <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
            </div>

            {/* Producer Info */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <User size={18} />
                Informações do Solicitante
              </h3>
              <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Nome</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {withdrawal.producerName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Email</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {withdrawal.producerEmail || 'Não disponível no banco'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Escopo</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {withdrawal.accountScope === 'affiliate' ? 'Afiliado' : 'Produtor'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Vendas no Período</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {withdrawal.metadata.courseSales} cursos
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Período</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {withdrawal.metadata.period}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Info */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <DollarSign size={18} />
                Valores
              </h3>
              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Valor Bruto</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {formatCurrency(withdrawal.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Taxa registrada</span>
                  <span className="font-medium text-red-700 dark:text-red-400">
                    - {formatCurrency(withdrawal.fee)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Valor Líquido
                  </span>
                  <span className="text-lg font-bold text-green-700 dark:text-green-400">
                    {formatCurrency(withdrawal.netAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bank Account */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <Building2 size={18} />
                Dados Bancários
              </h3>
              <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {withdrawal.method === 'bank_transfer' ? 'Banco' : 'Chave PIX / Documento'}
                  </p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {withdrawal.method === 'bank_transfer'
                      ? withdrawal.bankAccount.bank || 'Não informado'
                      : withdrawal.bankAccount.holderDocument || 'Não informado'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Método</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {withdrawal.method === 'bank_transfer' ? 'Transferência bancária' : 'PIX'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Agência</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {withdrawal.bankAccount.agency || 'Não informado'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Conta</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {withdrawal.bankAccount.account || 'Não informado'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Titular</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {withdrawal.bankAccount.holderName || 'Não informado'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-600 dark:text-slate-400">CPF/CNPJ</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {withdrawal.bankAccount.holderDocument || 'Não informado'}
                  </p>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <Calendar size={18} />
                Datas
              </h3>
              <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Solicitado em</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {formatDate(withdrawal.requestedAt)}
                  </p>
                </div>
                {withdrawal.processedAt && (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Processado em</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {formatDate(withdrawal.processedAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Rejection Reason */}
            {withdrawal.rejectedReason && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
                <p className="mb-2 text-sm font-medium text-red-900 dark:text-red-300">
                  Motivo da Rejeição
                </p>
                <p className="text-sm text-red-700 dark:text-red-400">
                  {withdrawal.rejectedReason}
                </p>
              </div>
            )}

            {/* Reject Form */}
            {showRejectForm && isPending && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-900 dark:text-white">
                  Motivo da Rejeição *
                </label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Descreva o motivo da rejeição..."
                  rows={4}
                />
              </div>
            )}
          </div>
        </div>

        <DrawerFooter className="border-t">
          {isPending && !showRejectForm && (
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(true)}
                disabled={isProcessing}
                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
              >
                <XCircle size={18} className="mr-2" />
                Rejeitar
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isProcessing}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                <CheckCircle size={18} className="mr-2" />
                {isProcessing ? 'Aprovando...' : 'Aprovar Saque'}
              </Button>
            </div>
          )}

          {showRejectForm && (
            <div className="flex w-full justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectForm(false)
                  setRejectReason('')
                }}
                disabled={isProcessing}
              >
                Voltar
              </Button>
              <Button
                onClick={handleReject}
                disabled={isProcessing}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {isProcessing ? 'Rejeitando...' : 'Confirmar Rejeição'}
              </Button>
            </div>
          )}

          {!isPending && (
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Fechar
              </Button>
              {canPay && (
                <Button
                  onClick={handlePay}
                  disabled={isProcessing}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  <CheckCircle size={18} className="mr-2" />
                  {isProcessing ? 'Registrando...' : 'Marcar como pago'}
                </Button>
              )}
            </div>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
