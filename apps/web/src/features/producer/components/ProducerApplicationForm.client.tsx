'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { useToast } from '@/shared/hooks/use-toast'
import { submitProducerApplicationAction } from '../actions/submit-producer-application'

interface ProducerApplicationFormProps {
  defaultName: string
}

export function ProducerApplicationForm({ defaultName }: ProducerApplicationFormProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError(null)

    startTransition(async () => {
      const result = await submitProducerApplicationAction({
        name: String(form.get('name') ?? ''),
        phone: String(form.get('phone') ?? ''),
        cpf: String(form.get('cpf') ?? ''),
        expertiseArea: String(form.get('expertiseArea') ?? ''),
        experienceYears: Number(form.get('experienceYears') ?? 0),
        bio: String(form.get('bio') ?? ''),
        whyProduce: String(form.get('whyProduce') ?? ''),
      })

      if (result.error) {
        setError(result.error)
        return
      }

      toast({
        title: 'Candidatura enviada',
        description: 'A equipe vai analisar e você acompanha o resultado nesta página.',
      })
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <Input id="name" name="name" defaultValue={defaultName} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone com DDD</Label>
          <Input id="phone" name="phone" placeholder="(11) 98765-4321" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cpf">CPF</Label>
          <Input id="cpf" name="cpf" placeholder="000.000.000-00" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="experienceYears">Anos de experiência</Label>
          <Input id="experienceYears" name="experienceYears" type="number" min={0} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expertiseArea">Área de especialização</Label>
        <Input
          id="expertiseArea"
          name="expertiseArea"
          placeholder="Ex.: programação, design, marketing digital"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Sobre você (mínimo de 50 caracteres)</Label>
        <Textarea
          id="bio"
          name="bio"
          rows={4}
          placeholder="Conte sua trajetória e o que você ensina."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whyProduce">
          Por que quer produzir cursos aqui? (mínimo de 50 caracteres)
        </Label>
        <Textarea
          id="whyProduce"
          name="whyProduce"
          rows={4}
          placeholder="Descreva o curso que você pretende criar."
          required
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Enviar candidatura
        </Button>
      </div>
    </form>
  )
}
