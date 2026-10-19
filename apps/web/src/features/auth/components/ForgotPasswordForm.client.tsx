'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle, Lock } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { forgotPasswordAction } from '../actions/forgot-password'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError('')

    const result = await forgotPasswordAction(formData)

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    } else if (result?.success) {
      setIsSubmitted(true)
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle size={32} />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
            Verifique seu e-mail
          </h2>
          <p className="mb-8 leading-relaxed text-slate-600 dark:text-slate-400">
            Enviamos um link de recuperação para <strong>{email}</strong>. Clique no link para
            definir uma nova senha.
          </p>
          <Link href="/login">
            <Button className="w-full bg-brand-500 font-bold text-black hover:bg-brand-400">
              Voltar para o Login
            </Button>
          </Link>
          <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
            Não recebeu?{' '}
            <button
              onClick={() => setIsSubmitted(false)}
              className="font-bold text-brand-600 hover:underline"
            >
              Tentar novamente
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <Link
        href="/login"
        className="mb-6 flex items-center gap-2 font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft size={18} /> Voltar
      </Link>

      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          <Lock size={24} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Recuperar Senha</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Insira o e-mail associado à sua conta e enviaremos as instruções para redefinir sua senha.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          // Sem `action=`: o React 19 limparia os campos depois de um erro e a pessoa perderia o que digitou.
          event.preventDefault()
          void handleSubmit(new FormData(event.currentTarget))
        }}
        className="space-y-6"
      >
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <Label htmlFor="email">E-mail Cadastrado</Label>
          <div className="relative mt-1">
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="pl-10"
              required
            />
            <Mail className="absolute left-3 top-3 text-slate-600 dark:text-slate-400" size={18} />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-slate-900 font-bold text-white dark:bg-white dark:text-black"
        >
          {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
        </Button>
      </form>
    </div>
  )
}
