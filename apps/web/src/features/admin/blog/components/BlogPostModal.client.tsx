'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Loader2, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { ImageUpload } from '@/shared/components/ImageUpload.client'
import { RichTextEditor } from '@/shared/components/RichTextEditor.client'
import { blogPostSchema, generateSlug, type BlogPostFormData } from '../lib/validations'
import { createPostAction } from '@/features/admin/blog/actions/create-post'
import { updatePostAction } from '@/features/admin/blog/actions/update-post'
import { getPostDetailsAction } from '@/features/admin/blog/actions/get-post-details'
import { useToast } from '@/shared/hooks/use-toast'

interface BlogPostModalProps {
  mode?: 'create' | 'edit'
  postId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function BlogPostModal({
  mode = 'create',
  postId,
  open,
  onOpenChange,
  onSuccess,
}: BlogPostModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [originalSlug, setOriginalSlug] = useState('')
  const [slugChanged, setSlugChanged] = useState(false)
  const { toast } = useToast()

  const form = useForm<BlogPostFormData>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      category: '',
      tags: [],
      featuredImageUrl: '',
      isFeatured: false,
      seoTitle: '',
      seoDescription: '',
      seoKeywords: [],
    },
  })

  // Carregar dados do post ao abrir em modo edição
  useEffect(() => {
    if (open && mode === 'edit' && postId) {
      setIsLoading(true)
      getPostDetailsAction(postId)
        .then((data) => {
          if (data) {
            form.reset(data)
            setTags(data.tags || [])
            setKeywords(data.seoKeywords || [])
            setOriginalSlug(data.slug)
          } else {
            toast({
              title: 'Erro ao carregar post',
              description: 'Não foi possível carregar os dados do post.',
              variant: 'destructive',
            })
            onOpenChange(false)
          }
        })
        .catch(() => {
          toast({
            title: 'Erro ao carregar post',
            description: 'Ocorreu um erro ao carregar os dados.',
            variant: 'destructive',
          })
          onOpenChange(false)
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else if (open && mode === 'create') {
      // Reset form ao abrir em modo criação
      form.reset({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        category: '',
        tags: [],
        featuredImageUrl: '',
        isFeatured: false,
        seoTitle: '',
        seoDescription: '',
        seoKeywords: [],
      })
      setTags([])
      setKeywords([])
      setOriginalSlug('')
      setSlugChanged(false)
    }
  }, [open, mode, postId, form, toast, onOpenChange])

  // Auto-gerar slug ao digitar título (apenas em modo criação)
  const title = form.watch('title')
  useEffect(() => {
    if (mode === 'create' && title && !form.formState.dirtyFields.slug) {
      form.setValue('slug', generateSlug(title))
    }
  }, [title, form, mode])

  // Detectar mudança no slug (modo edição)
  const currentSlug = form.watch('slug')
  useEffect(() => {
    if (mode === 'edit' && originalSlug && currentSlug !== originalSlug) {
      setSlugChanged(true)
    } else {
      setSlugChanged(false)
    }
  }, [currentSlug, originalSlug, mode])

  // Adicionar tag
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()]
      setTags(newTags)
      form.setValue('tags', newTags)
      setTagInput('')
    }
  }

  // Remover tag
  const handleRemoveTag = (tag: string) => {
    const newTags = tags.filter((t) => t !== tag)
    setTags(newTags)
    form.setValue('tags', newTags)
  }

  // Adicionar keyword
  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      const newKeywords = [...keywords, keywordInput.trim()]
      setKeywords(newKeywords)
      form.setValue('seoKeywords', newKeywords)
      setKeywordInput('')
    }
  }

  // Remover keyword
  const handleRemoveKeyword = (keyword: string) => {
    const newKeywords = keywords.filter((k) => k !== keyword)
    setKeywords(newKeywords)
    form.setValue('seoKeywords', newKeywords)
  }

  const onSubmit = async (data: BlogPostFormData) => {
    setIsSubmitting(true)

    try {
      const result =
        mode === 'create' ? await createPostAction(data) : await updatePostAction(postId!, data)

      if (result.success) {
        toast({
          title: mode === 'create' ? 'Post criado!' : 'Post atualizado!',
          description:
            mode === 'create'
              ? 'O post foi criado com sucesso.'
              : 'O post foi atualizado com sucesso.',
        })
        form.reset()
        setTags([])
        setKeywords([])
        onOpenChange(false)
        onSuccess()
      } else {
        toast({
          title: mode === 'create' ? 'Erro ao criar post' : 'Erro ao atualizar post',
          description: result.error || 'Ocorreu um erro.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: mode === 'create' ? 'Erro ao criar post' : 'Erro ao atualizar post',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Criar Novo Post' : 'Editar Post'}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Alerta de mudança de slug */}
            {slugChanged && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Atenção:</strong> Alterar o slug pode afetar o SEO e quebrar links
                  existentes. Considere criar um redirecionamento 301 do slug antigo para o novo.
                </AlertDescription>
              </Alert>
            )}
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input id="title" {...form.register('title')} placeholder="Digite o título do post" />
              {form.formState.errors.title && (
                <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
              )}
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">
                Slug <span className="text-red-500">*</span>
              </Label>
              <Input id="slug" {...form.register('slug')} placeholder="slug-do-post" />
              {form.formState.errors.slug && (
                <p className="text-sm text-red-500">{form.formState.errors.slug.message}</p>
              )}
              <p className="text-xs text-slate-600 dark:text-slate-400">
                URL: /blog/{form.watch('slug') || 'slug-do-post'}
              </p>
            </div>

            {/* Resumo */}
            <div className="space-y-2">
              <Label htmlFor="excerpt">Resumo</Label>
              <Textarea
                id="excerpt"
                {...form.register('excerpt')}
                placeholder="Breve descrição do post (opcional)"
                rows={3}
              />
              {form.formState.errors.excerpt && (
                <p className="text-sm text-red-500">{form.formState.errors.excerpt.message}</p>
              )}
            </div>

            {/* Conteúdo */}
            <div className="space-y-2">
              <Label htmlFor="content">
                Conteúdo <span className="text-red-500">*</span>
              </Label>
              <RichTextEditor
                content={form.watch('content') || ''}
                onChange={(html) => form.setValue('content', html, { shouldValidate: true })}
                placeholder="Escreva o conteúdo do post..."
                className="min-h-[300px]"
              />
              {form.formState.errors.content && (
                <p className="text-sm text-red-500">{form.formState.errors.content.message}</p>
              )}
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Use a barra de ferramentas para formatar o texto. Suporta negrito, itálico, títulos,
                listas, links e imagens.
              </p>
            </div>

            {/* Categoria e Imagem */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  {...form.register('category')}
                  placeholder="Ex: Tecnologia, Marketing"
                />
              </div>

              <div className="space-y-2">
                <Label>Imagem Destacada</Label>
                <p className="mb-2 text-xs text-slate-600 dark:text-slate-400">
                  Recomendado: 1200x630px (padrão Open Graph)
                </p>
                <ImageUpload
                  type="blog_featured"
                  currentImage={form.watch('featuredImageUrl')}
                  onUploadComplete={(url) => {
                    form.setValue('featuredImageUrl', url)
                  }}
                  onUploadError={(error) => {
                    toast({
                      title: 'Erro no upload',
                      description: error,
                      variant: 'destructive',
                    })
                  }}
                  size="lg"
                  shape="square"
                />
                {form.formState.errors.featuredImageUrl && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.featuredImageUrl.message}
                  </p>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  placeholder="Digite uma tag e pressione Enter"
                />
                <Button type="button" onClick={handleAddTag} variant="outline">
                  Adicionar
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm dark:bg-slate-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* SEO */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="font-semibold">Otimização SEO</h3>

              <div className="space-y-2">
                <Label htmlFor="seoTitle">Meta Título</Label>
                <Input
                  id="seoTitle"
                  {...form.register('seoTitle')}
                  placeholder="Título otimizado para SEO (máx. 60 caracteres)"
                />
                {form.formState.errors.seoTitle && (
                  <p className="text-sm text-red-500">{form.formState.errors.seoTitle.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoDescription">Meta Descrição</Label>
                <Textarea
                  id="seoDescription"
                  {...form.register('seoDescription')}
                  placeholder="Descrição otimizada para SEO (máx. 160 caracteres)"
                  rows={2}
                />
                {form.formState.errors.seoDescription && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.seoDescription.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Palavras-chave</Label>
                <div className="flex gap-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddKeyword()
                      }
                    }}
                    placeholder="Digite uma palavra-chave e pressione Enter"
                  />
                  <Button type="button" onClick={handleAddKeyword} variant="outline">
                    Adicionar
                  </Button>
                </div>
                {keywords.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm dark:bg-blue-900/30"
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(keyword)}
                          className="hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Destacar Post */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isFeatured"
                checked={form.watch('isFeatured')}
                onCheckedChange={(checked) => form.setValue('isFeatured', checked as boolean)}
              />
              <Label htmlFor="isFeatured" className="cursor-pointer">
                Destacar este post na página inicial
              </Label>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 border-t pt-4">
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
                {mode === 'create' ? 'Criar Post' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
