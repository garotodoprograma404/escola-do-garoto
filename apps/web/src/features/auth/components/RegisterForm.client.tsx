'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, ArrowRight, Check, Star, Megaphone } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { registerAction } from '../actions/register'
import { getDefaultDashboardPath } from '@/shared/lib/navigation'

interface RegisterFormProps {
  privacyPolicyUrl: string
  termsOfServiceUrl: string
  refundPolicyUrl: string
  redirectPath?: string
}

function getSafeRedirectPath(value?: string): string | null {
  const rawPath = String(value || '').trim()

  if (!rawPath || !rawPath.startsWith('/') || rawPath.startsWith('//')) {
    return null
  }

  if (
    rawPath.startsWith('/login') ||
    rawPath.startsWith('/register') ||
    rawPath.startsWith('/forgot-password')
  ) {
    return null
  }

  return rawPath
}

export function RegisterForm({
  privacyPolicyUrl,
  termsOfServiceUrl,
  refundPolicyUrl,
  redirectPath,
}: RegisterFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const safeRedirectPath = getSafeRedirectPath(redirectPath)
  const loginHref = safeRedirectPath
    ? `/login?redirect=${encodeURIComponent(safeRedirectPath)}`
    : '/login'

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError('')
    setSuccess('')

    const result = await registerAction(formData)

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    } else if (result?.success) {
      setSuccess(result.message || 'Conta criada com sucesso!')
      const resultRedirectPath = getSafeRedirectPath(result.redirect_path || undefined)
      const nextPath = resultRedirectPath || safeRedirectPath
      const redirectAfterRegister = result.autoLogin
        ? nextPath || getDefaultDashboardPath()
        : nextPath
          ? `/login?redirect=${encodeURIComponent(nextPath)}`
          : '/login'
      setTimeout(() => {
        router.push(redirectAfterRegister)
      }, 2000)
    }
  }

  return (
    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Crie sua conta</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Comece como aluno e acesse a plataforma. Se quiser ensinar ou indicar cursos, você segue
          para a jornada certa depois.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          // Sem `action=`: o React 19 limparia os campos depois de um erro e a pessoa perderia o que digitou.
          event.preventDefault()
          void handleSubmit(new FormData(event.currentTarget))
        }}
        className="space-y-4"
      >
        {safeRedirectPath && <input type="hidden" name="redirect_path" value={safeRedirectPath} />}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            {success}
          </div>
        )}

        <div>
          <Label htmlFor="name">Nome Completo</Label>
          <div className="relative mt-1">
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Seu nome"
              className="pl-10"
              required
            />
            <User className="absolute left-3 top-3 text-slate-600 dark:text-slate-400" size={18} />
          </div>
        </div>

        <div>
          <Label htmlFor="email">E-mail</Label>
          <div className="relative mt-1">
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              className="pl-10"
              required
            />
            <Mail className="absolute left-3 top-3 text-slate-600 dark:text-slate-400" size={18} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="password">Senha</Label>
            <div className="relative mt-1">
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className="pl-10"
                required
              />
              <Lock
                className="absolute left-3 top-3 text-slate-600 dark:text-slate-400"
                size={18}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirmar</Label>
            <div className="relative mt-1">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                className="pl-10"
                required
              />
              <Lock
                className="absolute left-3 top-3 text-slate-600 dark:text-slate-400"
                size={18}
              />
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="mt-0.5 rounded-full bg-brand-100 p-1 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
            <Check size={14} />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Ao criar sua conta, você concorda com os{' '}
            <Link href={termsOfServiceUrl} className="font-bold underline">
              Termos de Uso
            </Link>
            , com a{' '}
            <Link href={privacyPolicyUrl} className="font-bold underline">
              Política de Privacidade
            </Link>{' '}
            e com a nossa{' '}
            <Link href={refundPolicyUrl} className="font-bold underline">
              Política de Reembolso
            </Link>
            .
          </p>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-brand-500 font-bold text-black hover:bg-brand-400"
        >
          {isLoading ? 'Criando conta...' : 'Criar minha conta'}
        </Button>
      </form>

      <div className="mt-6 space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Quer vender ou indicar cursos?
        </p>
        <div className="grid gap-3">
          <Link
            href="/become-producer"
            className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-950"
          >
            <span className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Quero Ensinar
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/afiliados"
            className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-950"
          >
            <span className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Quero Indicar
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Produtores e afiliados seguem por uma jornada separada com análise e aprovação.
        </p>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6 text-center dark:border-slate-800">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Já tem uma conta?{' '}
          <Link
            href={loginHref}
            className="font-bold text-brand-600 hover:underline dark:text-brand-400"
          >
            Fazer Login
          </Link>
        </p>
      </div>
    </div>
  )
}
