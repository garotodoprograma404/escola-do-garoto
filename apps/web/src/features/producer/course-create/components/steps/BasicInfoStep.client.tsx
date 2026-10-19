'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
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
import { basicInfoSchema, type BasicInfoFormData, type CompleteCourseFormData } from '../../types'
import { getActiveCategoriesAction } from '../../actions/create-course'
import { getCourseUrlPrefix, normalizeSlug } from '../../lib/helpers'
import { CourseImageField } from '../CourseImageField.client'
import { useStableCallback } from '@/shared/hooks/useStableCallback'

interface BasicInfoStepProps {
  data: Partial<CompleteCourseFormData>
  onUpdate: (data: Partial<CompleteCourseFormData>) => void
}

export function BasicInfoStep({ data, onUpdate }: BasicInfoStepProps) {
  const updateParent = useStableCallback(onUpdate)
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [isSlugEditedManually, setIsSlugEditedManually] = useState<boolean>(Boolean(data.slug))
  const courseUrlPrefix = getCourseUrlPrefix()

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BasicInfoFormData>({
    resolver: zodResolver(basicInfoSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      title: data.title || '',
      slug: data.slug || '',
      short_description: data.short_description || '',
      description: data.description || '',
      category_id: data.category_id || '',
      level: data.level || 'beginner',
      thumbnail_url: data.thumbnail_url || '',
      cover_image_url: data.cover_image_url || '',
      trailer_url: data.trailer_url || '',
    },
  })
  const titleField = register('title')
  const slugField = register('slug')
  const watchedTitle = watch('title')
  const watchedSlug = watch('slug')
  const watchedShortDescription = watch('short_description')
  const watchedDescription = watch('description')
  const selectedCategoryId = watch('category_id')
  const selectedLevel = watch('level')
  const watchedThumbnailUrl = watch('thumbnail_url')
  const watchedCoverImageUrl = watch('cover_image_url')
  const watchedTrailerUrl = watch('trailer_url')

  // Load categories
  useEffect(() => {
    async function loadData() {
      const cats = await getActiveCategoriesAction()
      setCategories(cats)
    }
    loadData()
  }, [])

  // Auto-generate slug from title
  const handleTitleChange = (value: string): void => {
    if (isSlugEditedManually) return

    setValue('slug', normalizeSlug(value), {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  useEffect(() => {
    updateParent({
      title: watchedTitle || '',
      slug: watchedSlug || '',
      short_description: watchedShortDescription || '',
      description: watchedDescription || '',
      category_id: selectedCategoryId || '',
      level: selectedLevel || 'beginner',
      thumbnail_url: watchedThumbnailUrl || '',
      cover_image_url: watchedCoverImageUrl || '',
      trailer_url: watchedTrailerUrl || '',
    })
  }, [
    updateParent,
    watchedTitle,
    watchedSlug,
    watchedShortDescription,
    watchedDescription,
    selectedCategoryId,
    selectedLevel,
    watchedThumbnailUrl,
    watchedCoverImageUrl,
    watchedTrailerUrl,
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
          Informações Básicas
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Comece definindo o título e descrição do seu curso
        </p>
      </div>

      {/* Title */}
      <div>
        <Label htmlFor="title">
          Título do Curso <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          {...titleField}
          onChange={(e) => {
            titleField.onChange(e)
            handleTitleChange(e.target.value)
          }}
          placeholder="Ex: Desenvolvimento Web Completo com React"
          className="mt-1"
        />
        {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>}
      </div>

      {/* Slug */}
      <div>
        <Label htmlFor="slug">
          URL do Curso (Slug) <span className="text-red-500">*</span>
        </Label>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">{courseUrlPrefix}</span>
          <Input
            id="slug"
            {...slugField}
            onChange={(e) => {
              setIsSlugEditedManually(true)
              slugField.onChange(e)
            }}
            placeholder="desenvolvimento-web-react"
          />
        </div>
        {errors.slug && <p className="mt-1 text-sm text-red-500">{errors.slug.message}</p>}
      </div>

      {/* Short Description */}
      <div>
        <Label htmlFor="short_description">
          Descrição Curta <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="short_description"
          {...register('short_description')}
          placeholder="Uma breve descrição que aparecerá nos cards de busca (máx. 5000 caracteres)"
          rows={4}
          maxLength={5000}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          {watch('short_description')?.length || 0}/5000 caracteres
        </p>
        {errors.short_description && (
          <p className="mt-1 text-sm text-red-500">{errors.short_description.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">
          Descrição Completa <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Descreva detalhadamente o que o aluno vai aprender neste curso..."
          rows={6}
          className="mt-1"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <Label htmlFor="category_id">
          Categoria <span className="text-red-500">*</span>
        </Label>
        <Select
          value={selectedCategoryId}
          onValueChange={(value) =>
            setValue('category_id', value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category_id && (
          <p className="mt-1 text-sm text-red-500">{errors.category_id.message}</p>
        )}
      </div>

      {/* Level */}
      <div>
        <Label htmlFor="level">
          Nível <span className="text-red-500">*</span>
        </Label>
        <Select
          value={selectedLevel}
          onValueChange={(value) =>
            setValue('level', value as BasicInfoFormData['level'], {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger className="mt-1" aria-label="Nível do curso">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">Iniciante</SelectItem>
            <SelectItem value="intermediate">Intermediário</SelectItem>
            <SelectItem value="advanced">Avançado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CourseImageField
          label="Thumbnail do Curso"
          hint="1280x720px (16:9) - JPG, PNG, WebP - Máx: 2MB"
          dropHint="PNG, JPG, WebP até 2MB"
          alt="Thumbnail"
          value={watchedThumbnailUrl || ''}
          onChange={(url) =>
            setValue('thumbnail_url', url, { shouldDirty: true, shouldValidate: true })
          }
          error={errors.thumbnail_url?.message}
        />

        <CourseImageField
          label="Imagem de Capa"
          hint="1920x600px - JPG, PNG, WebP - Máx: 2MB"
          dropHint="Background da página do curso"
          alt="Capa"
          value={watchedCoverImageUrl || ''}
          onChange={(url) =>
            setValue('cover_image_url', url, { shouldDirty: true, shouldValidate: true })
          }
          error={errors.cover_image_url?.message}
        />
      </div>

      {/* Trailer URL */}
      <div>
        <Label htmlFor="trailer_url">
          URL do Vídeo de Preview{' '}
          <span className="text-slate-600 dark:text-slate-400">(opcional)</span>
        </Label>
        <p className="mb-2 mt-1 text-xs text-slate-600 dark:text-slate-400">
          Cole a URL do vídeo (YouTube, Vimeo, etc.) - Recomendado: 30-60 segundos
        </p>
        <Input
          id="trailer_url"
          {...register('trailer_url')}
          placeholder="https://www.youtube.com/watch?v=..."
        />
        {errors.trailer_url && (
          <p className="mt-1 text-sm text-red-500">{errors.trailer_url.message}</p>
        )}
      </div>
    </div>
  )
}
