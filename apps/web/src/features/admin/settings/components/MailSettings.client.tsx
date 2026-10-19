'use client'

import { useState, useTransition } from 'react'
import { MailCheck, PlugZap, Send, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Switch } from '@/shared/components/ui/switch'
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
  checkMailSettings,
  removeMailSettings,
  saveMailSettings,
  sendTestMail,
  type MailSettingsForm,
} from '../actions/mail-settings-actions'
import type { MailSettingsView } from '../types'

/** Atalhos dos provedores mais usados: preenchem servidor, porta e tipo de conexão. */
const PRESETS = [
  { label: 'Resend', host: 'smtp.resend.com', port: '465', secure: true, user: 'resend' },
  { label: 'Brevo', host: 'smtp-relay.brevo.com', port: '587', secure: false, user: '' },
  { label: 'Gmail', host: 'smtp.gmail.com', port: '465', secure: true, user: '' },
  {
    label: 'Amazon SES',
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: '587',
    secure: false,
    user: '',
  },
] as const

function formOf(view: MailSettingsView): MailSettingsForm {
  return {
    host: view.host ?? '',
    port: String(view.port ?? 587),
    secure: view.secure ?? false,
    user: view.user ?? '',
    password: '',
    fromName: view.fromName ?? '',
    fromEmail: view.fromEmail ?? '',
  }
}

function formatDate(value: string | null): string | null {
  return value ? new Date(value).toLocaleString('pt-BR') : null
}

/**
 * Servidor de e-mail (SMTP) colado pelo admin, nada no `.env`. A API conecta no servidor ao salvar
 * e guarda a senha cifrada; aqui ela nunca aparece, só se está salva.
 */
export function MailSettings({ initial }: { initial: MailSettingsView }) {
  const [view, setView] = useState(initial)
  const [form, setForm] = useState<MailSettingsForm>(() => formOf(initial))
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const locked = view.demoMode

  const set = <K extends keyof MailSettingsForm>(key: K, value: MailSettingsForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  function run(action: () => ReturnType<typeof checkMailSettings>, success: string) {
    startTransition(async () => {
      const result = await action()
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }
      setView(result.data)
      setForm(formOf(result.data))
      toast({ title: success })
    })
  }

  function sendTest() {
    startTransition(async () => {
      const result = await sendTestMail()
      if (!result.success) {
        toast({ title: 'E-mail não enviado', description: result.error, variant: 'destructive' })
        return
      }
      toast({
        title: 'E-mail de teste enviado',
        description: `Confira a caixa de entrada (e o spam) de ${result.data.sentTo}.`,
      })
    })
  }

  const status =
    view.mode === 'smtp'
      ? {
          label: 'Enviando pelo seu servidor',
          className: 'bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200',
        }
      : view.mode === 'disabled'
        ? {
            label: 'Não configurado: nenhum e-mail sai',
            className: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
          }
        : {
            label: 'Só no registro do servidor',
            className: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200',
          }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">E-mail</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Servidor que envia confirmação de cadastro, troca de senha e avisos. A senha fica
            cifrada no banco e nunca volta para a tela.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${status.className}`}>
          {status.label}
        </span>
      </div>

      {locked ? (
        <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Ambiente de demonstração: os e-mails ficam só no registro do servidor e as contas novas já
          nascem confirmadas. A configuração fica desligada.
        </p>
      ) : view.passwordUnreadable ? (
        <p className="mb-6 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-950 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
          A senha salva não pode mais ser lida (a chave secreta do servidor mudou). Nenhum e-mail
          sai até você digitar a senha de novo e salvar.
        </p>
      ) : view.mode === 'disabled' ? (
        <p className="mb-6 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-950 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
          Sem o servidor de e-mail, ninguém consegue confirmar o cadastro nem trocar a senha.
          Configure antes de abrir a plataforma.
        </p>
      ) : null}

      {view.configured ? (
        <dl className="mb-6 grid gap-3 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800 sm:grid-cols-2">
          <div>
            <dt className="text-slate-600 dark:text-slate-400">Servidor</dt>
            <dd className="break-all font-mono">
              {view.host}:{view.port}
            </dd>
          </div>
          <div>
            <dt className="text-slate-600 dark:text-slate-400">Remetente</dt>
            <dd className="break-all font-medium">
              {view.fromName} &lt;{view.fromEmail}&gt;
            </dd>
          </div>
          <div>
            <dt className="text-slate-600 dark:text-slate-400">Senha</dt>
            <dd className="font-medium">
              {view.passwordConfigured ? 'Salva' : 'Sem autenticação'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-600 dark:text-slate-400">Última conferência</dt>
            <dd className="font-medium">{formatDate(view.verifiedAt) ?? 'Nunca'}</dd>
          </div>
        </dl>
      ) : null}

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          run(() => saveMailSettings(form), 'Servidor de e-mail salvo e conferido')
        }}
      >
        <fieldset disabled={locked || pending} className="space-y-4">
          <div>
            <p className="mb-2 text-sm text-slate-700 dark:text-slate-300">
              Atalhos (preenchem servidor e porta):
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      host: preset.host,
                      port: preset.port,
                      secure: preset.secure,
                      user: preset.user || current.user,
                    }))
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <div className="space-y-1.5">
              <Label htmlFor="mail-host">Servidor SMTP</Label>
              <Input
                id="mail-host"
                value={form.host}
                onChange={(event) => set('host', event.target.value)}
                placeholder="smtp.seuprovedor.com"
                autoComplete="off"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mail-port">Porta</Label>
              <Input
                id="mail-port"
                inputMode="numeric"
                value={form.port}
                onChange={(event) => set('port', event.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="mail-secure"
              checked={form.secure}
              onCheckedChange={(checked) => set('secure', checked)}
            />
            <Label htmlFor="mail-secure" className="font-normal">
              TLS direto (porta 465). Desligado = STARTTLS (porta 587).
            </Label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mail-user">Usuário</Label>
              <Input
                id="mail-user"
                value={form.user}
                onChange={(event) => set('user', event.target.value)}
                autoComplete="off"
                placeholder="Em branco = sem autenticação"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mail-password">Senha ou chave de API</Label>
              <Input
                id="mail-password"
                type="password"
                value={form.password}
                onChange={(event) => set('password', event.target.value)}
                autoComplete="new-password"
                placeholder={
                  view.passwordConfigured ? 'Deixe em branco para manter a atual' : 'Senha'
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mail-from-name">Nome do remetente</Label>
              <Input
                id="mail-from-name"
                value={form.fromName}
                onChange={(event) => set('fromName', event.target.value)}
                placeholder="Minha Escola"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mail-from-email">E-mail do remetente</Label>
              <Input
                id="mail-from-email"
                type="email"
                value={form.fromEmail}
                onChange={(event) => set('fromEmail', event.target.value)}
                placeholder="contato@seudominio.com.br"
                required
              />
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Use um e-mail do domínio liberado no seu provedor, senão os e-mails caem no spam.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit">
              <MailCheck aria-hidden="true" className="mr-2 h-4 w-4" />
              {pending ? 'Conferindo...' : 'Salvar e conferir'}
            </Button>
            {view.configured ? (
              <>
                <Button type="button" variant="outline" onClick={sendTest}>
                  <Send aria-hidden="true" className="mr-2 h-4 w-4" />
                  Enviar e-mail de teste
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => run(checkMailSettings, 'Conexão com o servidor confirmada')}
                >
                  <PlugZap aria-hidden="true" className="mr-2 h-4 w-4" />
                  Testar conexão
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline">
                      <Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />
                      Remover
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover o servidor de e-mail?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Em produção, nenhum e-mail sai até você cadastrar de novo: ninguém consegue
                        confirmar o cadastro nem trocar a senha.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => run(removeMailSettings, 'Servidor de e-mail removido')}
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : null}
          </div>
        </fieldset>
      </form>
    </div>
  )
}
