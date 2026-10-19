'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Lock, BookOpen, ArrowRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { loginAction } from '../actions/login'

interface LoginFormProps {
  platformName: string
  logoUrl?: string
  privacyPolicyUrl: string
  termsOfServiceUrl: string
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

export function LoginForm({
  platformName,
  logoUrl,
  privacyPolicyUrl,
  termsOfServiceUrl,
  redirectPath,
}: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const normalizedLogoUrl = logoUrl?.trim() || ''
  const hasLogo = normalizedLogoUrl.length > 0
  const safeRedirectPath = getSafeRedirectPath(redirectPath)
  const registerHref = safeRedirectPath
    ? `/register?redirect=${encodeURIComponent(safeRedirectPath)}`
    : '/register'

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError('')

    const result = await loginAction(formData)

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-8 text-center">
        <Link href="/" className="mx-auto mb-4 inline-block" aria-label={`Ir para ${platformName}`}>
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={normalizedLogoUrl}
              alt={`Logo ${platformName}`}
              className="h-12 w-auto max-w-[12rem] object-contain"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-500 text-black">
              <BookOpen size={24} />
            </div>
          )}
        </Link>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Bem-vindo de volta!</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Insira seus dados para acessar sua conta.
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

        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              className="pl-10"
              required
            />
            <Lock className="absolute left-3 top-3 text-slate-600 dark:text-slate-400" size={18} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="remember"
            className="h-4 w-4 rounded border-slate-300 bg-white text-brand-500 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800"
          />
          <label htmlFor="remember" className="text-sm text-slate-600 dark:text-slate-400">
            Lembrar de mim
          </label>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-brand-500 font-bold text-black hover:bg-brand-400"
        >
          {isLoading ? 'Entrando...' : 'Entrar na Plataforma'}
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        Acessando sua conta, você concorda com nossos{' '}
        <Link href={termsOfServiceUrl} className="font-semibold underline underline-offset-4">
          Termos de Uso
        </Link>{' '}
        e com a{' '}
        <Link href={privacyPolicyUrl} className="font-semibold underline underline-offset-4">
          Política de Privacidade
        </Link>
        .
      </div>

      <div className="mt-6 space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Quer vender ou indicar cursos?
        </p>
        <div className="grid gap-3">
          <Link
            href="/become-producer"
            className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-950"
          >
            <span>Conhecer jornada de produtor</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/afiliados"
            className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-950"
          >
            <span>Conhecer programa de afiliados</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
        Não tem uma conta?{' '}
        <Link
          href={registerHref}
          className="font-bold text-brand-600 hover:underline dark:text-brand-400"
        >
          Cadastre-se
        </Link>
      </p>
    </div>
  )
}
