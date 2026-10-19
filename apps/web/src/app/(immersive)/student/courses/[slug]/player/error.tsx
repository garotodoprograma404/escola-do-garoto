'use client'

import { AlertCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

interface PlayerErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function PlayerError({ error, reset }: PlayerErrorProps) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-6">
      <div className="max-w-md space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <div className="space-y-2">
          <h1 className="text-lg font-semibold">Falha ao carregar esta aula</h1>
          <p className="text-sm text-muted-foreground">
            O player encontrou um erro ao montar os dados desta pagina.
          </p>
          {error.message ? (
            <p className="text-xs text-muted-foreground">Detalhe tecnico: {error.message}</p>
          ) : null}
        </div>
        <Button onClick={reset} className="w-full">
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}
