'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Info } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Switch } from '@/shared/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { categoryFormSchema, generateSlug, type CategoryFormInput } from '../lib/validations'
import { createCategoryAction } from '../actions/create-category'
import type { Category } from '../types'

interface CategoryCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  onSuccess?: () => void
}

export function CategoryCreateModal({
  open,
  onOpenChange,
  categories,
  onSuccess,
}: CategoryCreateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<CategoryFormInput>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      icon: '',
      color: '',
      parentId: null,
      isActive: true,
      isFeatured: false,
      displayOrder: 0,
    },
  })

  // Auto-gerar slug ao digitar nome
  const watchName = form.watch('name')
  useEffect(() => {
    if (watchName && !form.formState.dirtyFields.slug) {
      form.setValue('slug', generateSlug(watchName), { shouldValidate: false })
    }
  }, [watchName, form])

  // Resetar form ao abrir/fechar
  useEffect(() => {
    if (!open) {
      form.reset()
      setError(null)
    }
  }, [open, form])

  const onSubmit = async (data: CategoryFormInput) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await createCategoryAction(data)

      if (!result.success) {
        setError(result.error || 'Erro ao criar categoria')
        return
      }

      // Sucesso!
      form.reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError('Erro inesperado ao criar categoria')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtrar apenas categorias raiz e de primeiro nível para seleção de pai
  const availableParents = categories.filter((c) => !c.parentId || c.parentId === null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Categoria</DialogTitle>
          <DialogDescription>
            Crie uma nova categoria para organizar os cursos da plataforma.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Nome */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nome <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Desenvolvimento Web" {...field} />
                  </FormControl>
                  <FormDescription>Nome da categoria (2-50 caracteres)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Slug */}
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Slug <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="desenvolvimento-web" {...field} />
                  </FormControl>
                  <FormDescription>
                    URL amigável (gerado automaticamente, mas pode ser editado)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva brevemente esta categoria..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Descrição opcional (máx. 500 caracteres)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Ícone */}
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ícone</FormLabel>
                    <FormControl>
                      <Input placeholder="💻 ou Code" {...field} />
                    </FormControl>
                    <FormDescription>Emoji ou nome do ícone Lucide</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cor */}
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <FormControl>
                      <Input type="color" {...field} />
                    </FormControl>
                    <FormDescription>Cor da categoria</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Categoria Pai */}
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria Pai</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhuma (categoria raiz)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="null">Nenhuma (categoria raiz)</SelectItem>
                      {availableParents.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Selecione uma categoria pai para criar uma subcategoria (máx. 3 níveis)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ordem de Exibição */}
            <FormField
              control={form.control}
              name="displayOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordem de Exibição</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Ordem de exibição (menor número aparece primeiro)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              {/* Status Ativo */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Categoria Ativa</FormLabel>
                      <FormDescription>
                        Categorias ativas são visíveis para todos os usuários
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Destacar */}
              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Destacar Categoria</FormLabel>
                      <FormDescription>
                        Categorias em destaque aparecem na página inicial
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                O slug deve ser único e será usado na URL da categoria. Evite alterá-lo após a
                criação para não quebrar links existentes.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Criando...' : 'Criar Categoria'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
