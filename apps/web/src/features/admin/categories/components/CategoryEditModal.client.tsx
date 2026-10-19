'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Info, AlertTriangle } from 'lucide-react'
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
import { categoryFormSchema, type CategoryFormInput } from '../lib/validations'
import { getCategoryDetailsAction } from '../actions/get-category-details'
import { editCategoryAction } from '../actions/edit-category'
import type { Category } from '../types'

interface CategoryEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryId: string | null
  categories: Category[]
  onSuccess?: () => void
}

interface CategoryDetailsState {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  parentId: string | null
  displayOrder: number
  isActive: boolean
  isFeatured: boolean
  coverImageUrl: string | null
  metaTitle: string | null
  metaDescription: string | null
  hasChildren: boolean
  childrenCount: number
}

export function CategoryEditModal({
  open,
  onOpenChange,
  categoryId,
  categories,
  onSuccess,
}: CategoryEditModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categoryDetails, setCategoryDetails] = useState<CategoryDetailsState | null>(null)

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

  const loadCategoryDetails = useCallback(async () => {
    if (!categoryId) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await getCategoryDetailsAction(categoryId)

      if (!result.success || !result.data) {
        setError(result.error || 'Erro ao carregar categoria')
        return
      }

      setCategoryDetails(result.data)

      // Preencher formulário
      form.reset({
        name: result.data.name,
        slug: result.data.slug,
        description: result.data.description || '',
        icon: result.data.icon || '',
        color: result.data.color || '',
        parentId: result.data.parentId,
        isActive: result.data.isActive,
        isFeatured: result.data.isFeatured,
        displayOrder: result.data.displayOrder,
      })
    } catch (err) {
      setError('Erro ao carregar categoria')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [categoryId, form])

  // Carregar dados da categoria ao abrir
  useEffect(() => {
    if (open && categoryId) {
      loadCategoryDetails()
    }
  }, [open, categoryId, loadCategoryDetails])

  // Resetar ao fechar
  useEffect(() => {
    if (!open) {
      form.reset()
      setError(null)
      setCategoryDetails(null)
    }
  }, [open, form])

  const onSubmit = async (data: CategoryFormInput) => {
    if (!categoryId) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await editCategoryAction(categoryId, data)

      if (!result.success) {
        setError(result.error || 'Erro ao atualizar categoria')
        return
      }

      // Sucesso!
      form.reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError('Erro inesperado ao atualizar categoria')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtrar categorias disponíveis para pai (excluir a própria e seus filhos)
  const availableParents = categories.filter((c) => {
    // Não pode ser pai de si mesmo
    if (c.id === categoryId) return false
    // Não pode ser filho de si mesmo (apenas categorias raiz ou de primeiro nível)
    if (!c.parentId || c.parentId === null) return true
    return false
  })

  const originalSlug = categoryDetails?.slug

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Categoria</DialogTitle>
          <DialogDescription>
            Atualize as informações da categoria. Tenha cuidado ao alterar o slug.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {categoryDetails?.hasChildren && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Esta categoria possui {categoryDetails.childrenCount} subcategoria(s). Não é
                    possível alterar a categoria pai enquanto houver subcategorias.
                  </AlertDescription>
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
                      {field.value !== originalSlug && (
                        <span className="font-medium text-orange-700 dark:text-orange-400">
                          ⚠️ Alterar o slug pode quebrar links existentes!
                        </span>
                      )}
                      {field.value === originalSlug && 'URL amigável da categoria'}
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                      disabled={categoryDetails?.hasChildren}
                    >
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
                      {categoryDetails?.hasChildren
                        ? 'Não é possível alterar enquanto houver subcategorias'
                        : 'Selecione uma categoria pai (máx. 3 níveis)'}
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
                  Alterações no slug podem afetar SEO e links existentes. Considere criar um
                  redirecionamento se necessário.
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
                <Button type="submit" disabled={isSubmitting || isLoading}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
