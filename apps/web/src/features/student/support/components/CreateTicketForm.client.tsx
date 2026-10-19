'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { createTicket } from '../actions/ticket-actions'

interface Course {
  id: string
  title: string
}

interface CreateTicketFormProps {
  courses: Course[]
}

export function CreateTicketForm({ courses }: CreateTicketFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('')
  const [courseId, setCourseId] = useState('none')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const result = await createTicket(formData)

    if (!result?.success && result?.error) {
      setMessage({ type: 'error', text: result.error })
      setIsLoading(false)
    }
    // If success, will redirect
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          name="title"
          placeholder="Descreva brevemente o problema"
          required
          minLength={5}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição *</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Descreva o problema em detalhes..."
          required
          minLength={20}
          rows={6}
        />
        <p className="text-sm text-muted-foreground">Mínimo de 20 caracteres</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Categoria *</Label>
          <Select name="category" value={category} onValueChange={setCategory} required>
            <SelectTrigger id="category">
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="technical">Técnico</SelectItem>
              <SelectItem value="billing">Financeiro</SelectItem>
              <SelectItem value="course_content">Curso</SelectItem>
              <SelectItem value="account">Conta</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Prioridade *</Label>
          <Select name="priority" value={priority} onValueChange={setPriority} required>
            <SelectTrigger id="priority">
              <SelectValue placeholder="Selecione a prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="course_id">Curso Relacionado (Opcional)</Label>
        <input type="hidden" name="course_id" value={courseId === 'none' ? '' : courseId} />
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger id="course_id">
            <SelectValue placeholder="Selecione um curso (opcional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhum</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Criando...' : 'Criar Ticket'}
      </Button>
    </form>
  )
}
