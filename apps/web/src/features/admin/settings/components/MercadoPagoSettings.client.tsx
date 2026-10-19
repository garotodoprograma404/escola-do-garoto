'use client'

import { useState, useTransition } from 'react'
import { Check, Copy, ExternalLink, PlugZap, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog'
import { useToast } from '@/shared/hooks/use-toast'
import {
  checkPaymentGateway,
  removePaymentGateway,
  savePaymentGateway,
} from '../actions/payment-gateway-actions'
import type { PaymentGatewayView } from '../types'

const MERCADOPAGO_PANEL = 'https://www.mercadopago.com.br/developers/panel/app'

function formatDate(value: string | null): string | null {
  return value ? new Date(value).toLocaleString('pt-BR') : null
}

/**
 * Credenciais do Mercado Pago coladas pelo admin (nada no `.env`). A API confere o token no próprio
 * Mercado Pago ao salvar e guarda tudo cifrado; aqui só aparecem a dica do token, a conta e o modo.
 */
export function MercadoPagoSettings({ initial }: { initial: PaymentGatewayView }) {
  const [view, setView] = useState(initial)
  const [accessToken, setAccessToken] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()

  function run(action: () => ReturnType<typeof checkPaymentGateway>, success: string) {
    startTransition(async () => {
      const result = await action()
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }
      setView(result.data)
      setAccessToken('')
      setWebhookSecret('')
      toast({ title: success })
    })
  }

  async function copyWebhookUrl() {
    try {
      await navigator.clipboard.writeText(view.webhookUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: 'Copie o endereço manualmente', variant: 'destructive' })
    }
  }

  const status = !view.configured
    ? {
        label: 'Não configurado',
        className: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
      }
    : view.live
      ? {
          label: 'Conectado em produção: cobra de verdade',
          className: 'bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200',
        }
      : {
          label: 'Conectado em modo de teste',
          className: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200',
        }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Mercado Pago</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Conecte a sua conta para receber por Pix e cartão. As chaves ficam cifradas no banco e
            nunca voltam para a tela.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${status.className}`}>
          {status.label}
        </span>
      </div>

      {view.demoMode ? (
        <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Ambiente de demonstração: as compras usam o simulador e nada é cobrado, mesmo com as
          credenciais salvas.
        </p>
      ) : !view.configured ? (
        <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Sem as credenciais, a compra de cursos pagos fica desligada (os cursos grátis continuam
          funcionando).
        </p>
      ) : null}

      {view.configured ? (
        <dl className="mb-6 grid gap-3 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800 sm:grid-cols-2">
          <div>
            <dt className="text-slate-600 dark:text-slate-400">Conta</dt>
            <dd className="font-medium">{view.accountLabel ?? 'Conta do Mercado Pago'}</dd>
          </div>
          <div>
            <dt className="text-slate-600 dark:text-slate-400">Access Token</dt>
            <dd className="font-mono">{view.tokenHint}</dd>
          </div>
          <div>
            <dt className="text-slate-600 dark:text-slate-400">Assinatura do webhook</dt>
            <dd className="font-medium">
              {view.webhookSecretConfigured ? 'Cadastrada' : 'Falta cadastrar'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-600 dark:text-slate-400">Última conferência</dt>
            <dd className="font-medium">{formatDate(view.verifiedAt) ?? 'Nunca'}</dd>
          </div>
        </dl>
      ) : null}

      <ol className="mb-6 list-decimal space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
        <li>
          No{' '}
          <a
            href={MERCADOPAGO_PANEL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
          >
            painel de desenvolvedor do Mercado Pago
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
          , crie uma aplicação do tipo <strong>Checkout Pro</strong>.
        </li>
        <li>
          Em <strong>Credenciais de produção</strong>, copie o <strong>Access Token</strong> (começa
          com <code>APP_USR-</code>). Para testar sem cobrar, use as credenciais de teste (
          <code>TEST-</code>).
        </li>
        <li>
          Em <strong>Webhooks</strong>, cadastre o endereço abaixo, marque o evento{' '}
          <strong>Pagamentos</strong> e copie a <strong>assinatura secreta</strong>.
        </li>
      </ol>

      <div className="mb-6 space-y-1.5">
        <Label htmlFor="mp-webhook-url">Endereço do webhook</Label>
        <div className="flex gap-2">
          <Input id="mp-webhook-url" readOnly value={view.webhookUrl} className="font-mono" />
          <Button type="button" variant="outline" onClick={copyWebhookUrl}>
            {copied ? (
              <Check aria-hidden="true" className="mr-2 h-4 w-4" />
            ) : (
              <Copy aria-hidden="true" className="mr-2 h-4 w-4" />
            )}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          run(
            () => savePaymentGateway({ accessToken, webhookSecret }),
            'Credenciais salvas e conferidas no Mercado Pago',
          )
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="mp-access-token">Access Token</Label>
          <Input
            id="mp-access-token"
            type="password"
            autoComplete="off"
            value={accessToken}
            onChange={(event) => setAccessToken(event.target.value)}
            placeholder={view.configured ? 'Deixe em branco para manter o atual' : 'APP_USR-...'}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mp-webhook-secret">Assinatura secreta do webhook</Label>
          <Input
            id="mp-webhook-secret"
            type="password"
            autoComplete="off"
            value={webhookSecret}
            onChange={(event) => setWebhookSecret(event.target.value)}
            placeholder={
              view.webhookSecretConfigured ? 'Deixe em branco para manter a atual' : 'Chave secreta'
            }
          />
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Sem ela, o Mercado Pago não consegue avisar a plataforma quando um pagamento é aprovado.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? 'Conferindo...' : 'Salvar e conferir'}
          </Button>
          {view.configured ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => run(checkPaymentGateway, 'Conexão com o Mercado Pago confirmada')}
              >
                <PlugZap aria-hidden="true" className="mr-2 h-4 w-4" />
                Testar conexão
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" disabled={pending}>
                    <Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />
                    Remover
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover as credenciais do Mercado Pago?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A compra de cursos pagos fica desligada até você cadastrar de novo. Pedidos já
                      pagos não são afetados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => run(removePaymentGateway, 'Credenciais removidas')}
                    >
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : null}
        </div>
      </form>
    </div>
  )
}
