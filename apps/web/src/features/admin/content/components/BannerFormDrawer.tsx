'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, Palette } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/shared/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { BannerImageUpload } from './BannerImageUpload.client'
import type { Banner, BannerPosition, ContentStatus } from '../types'

const bannerSchema = z
  .object({
    title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
    subtitle: z.string().min(3, 'Subtítulo deve ter no mínimo 3 caracteres'),
    desktopImageUrl: z.string().min(1, 'Imagem desktop é obrigatória'),
    mobileImageUrl: z.string().optional(),
    ctaText: z.string().min(2, 'Texto do botão deve ter no mínimo 2 caracteres'),
    ctaLink: z
      .string()
      .min(1, 'Link é obrigatório')
      .refine(
        (value) => /^\/(?!\/)\S*$/.test(value) || /^https?:\/\/\S+$/.test(value),
        'Use um caminho do site (/catalog) ou um endereço http(s)',
      ),
    backgroundColor: z.string().optional(),
    textColor: z.enum(['white', 'black']).default('white'),
    startDate: z.string(),
    endDate: z.string().optional().or(z.literal('')),
    status: z.enum(['active', 'scheduled', 'expired', 'inactive']),
    position: z.enum(['hero', 'mid-page', 'popup']),
  })
  .refine(
    (data) => {
      // Validar que endDate > startDate
      if (data.endDate && data.endDate !== '') {
        const start = new Date(data.startDate)
        const end = new Date(data.endDate)
        return end > start
      }
      return true
    },
    {
      message: 'A data de fim deve ser posterior à data de início',
      path: ['endDate'],
    },
  )

type BannerFormData = z.infer<typeof bannerSchema>

interface BannerFormDrawerProps {
  open: boolean
  onClose: () => void
  banner?: Banner | null
  onSubmit: (data: BannerFormData) => Promise<void>
}

export function BannerFormDrawer({ open, onClose, banner, onSubmit }: BannerFormDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const isEditing = !!banner

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<BannerFormData>({
    resolver: zodResolver(bannerSchema),
    defaultValues: banner
      ? {
          title: banner.title,
          subtitle: banner.subtitle,
          desktopImageUrl: banner.desktopImageUrl,
          mobileImageUrl: banner.mobileImageUrl || '',
          ctaText: banner.ctaText,
          ctaLink: banner.ctaLink,
          backgroundColor: banner.backgroundColor || '',
          textColor: banner.textColor || 'white',
          startDate: banner.startDate.split('T')[0],
          endDate: banner.endDate ? banner.endDate.split('T')[0] : '',
          status: banner.status,
          position: banner.position,
        }
      : {
          title: '',
          subtitle: '',
          desktopImageUrl: '',
          mobileImageUrl: '',
          ctaText: 'Saiba Mais',
          ctaLink: '/',
          backgroundColor: '#6366f1',
          textColor: 'white',
          startDate: new Date().toLocaleDateString('en-CA'),
          endDate: '',
          status: 'inactive',
          position: 'hero',
        },
  })

  // Reset form when banner changes
  useEffect(() => {
    if (banner) {
      reset({
        title: banner.title,
        subtitle: banner.subtitle,
        desktopImageUrl: banner.desktopImageUrl,
        mobileImageUrl: banner.mobileImageUrl || '',
        ctaText: banner.ctaText,
        ctaLink: banner.ctaLink,
        backgroundColor: banner.backgroundColor || '',
        textColor: banner.textColor || 'white',
        startDate: banner.startDate.split('T')[0],
        endDate: banner.endDate ? banner.endDate.split('T')[0] : '',
        status: banner.status,
        position: banner.position,
      })
    } else {
      reset({
        title: '',
        subtitle: '',
        desktopImageUrl: '',
        mobileImageUrl: '',
        ctaText: 'Saiba Mais',
        ctaLink: '/',
        backgroundColor: '#6366f1',
        textColor: 'white',
        startDate: new Date().toLocaleDateString('en-CA'),
        endDate: '',
        status: 'inactive',
        position: 'hero',
      })
    }
  }, [banner, reset])

  const backgroundColor = watch('backgroundColor')
  const textColor = watch('textColor')

  const handleFormSubmit = async (data: BannerFormData) => {
    if (!data.desktopImageUrl) {
      setUploadError('Por favor, faça upload da imagem desktop')
      return
    }

    setIsSubmitting(true)
    setUploadError(null)

    try {
      await onSubmit(data)
      onClose()
    } catch (error) {
      console.error('Error submitting banner:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{isEditing ? 'Editar Banner' : 'Criar Novo Banner'}</DrawerTitle>
          <DrawerDescription>
            Configure o banner que será exibido na página inicial
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="overflow-y-auto px-4">
          <div className="space-y-6 pb-6">
            {/* Preview */}
            <div
              className="rounded-lg p-6 text-center"
              style={{
                backgroundColor: backgroundColor || '#6366f1',
                color: textColor || 'white',
              }}
            >
              <h3 className="mb-2 text-2xl font-bold">{watch('title') || 'Título do Banner'}</h3>
              <p className="mb-4">{watch('subtitle') || 'Subtítulo do banner'}</p>
              <Button
                type="button"
                variant="secondary"
                className="pointer-events-none"
                style={{
                  backgroundColor: textColor === 'white' ? 'black' : 'white',
                  color: textColor === 'white' ? 'white' : 'black',
                }}
              >
                {watch('ctaText') || 'Saiba Mais'}
              </Button>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="title">Título *</Label>
                <Input id="title" {...register('title')} placeholder="Ex: Black Friday 2026" />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="subtitle">Subtítulo *</Label>
                <Textarea
                  id="subtitle"
                  {...register('subtitle')}
                  placeholder="Ex: Até 70% OFF em todos os cursos"
                  rows={2}
                />
                {errors.subtitle && (
                  <p className="mt-1 text-sm text-red-600">{errors.subtitle.message}</p>
                )}
              </div>
            </div>

            {/* Images Upload */}
            <BannerImageUpload
              desktopImage={watch('desktopImageUrl')}
              mobileImage={watch('mobileImageUrl')}
              onDesktopUpload={(url) => setValue('desktopImageUrl', url)}
              onMobileUpload={(url) => setValue('mobileImageUrl', url)}
              onError={setUploadError}
            />
            {errors.desktopImageUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.desktopImageUrl.message}</p>
            )}
            {uploadError && <p className="mt-1 text-sm text-red-600">{uploadError}</p>}

            {/* CTA */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="ctaText">Texto do Botão *</Label>
                <Input id="ctaText" {...register('ctaText')} placeholder="Ex: Aproveitar Agora" />
                {errors.ctaText && (
                  <p className="mt-1 text-sm text-red-600">{errors.ctaText.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="ctaLink">Link do Botão *</Label>
                <Input id="ctaLink" {...register('ctaLink')} placeholder="/catalog" />
                {errors.ctaLink && (
                  <p className="mt-1 text-sm text-red-600">{errors.ctaLink.message}</p>
                )}
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Palette size={16} />
                <span>Cores</span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="backgroundColor">Cor de Fundo</Label>
                  <div className="flex gap-2">
                    <Input
                      id="backgroundColor"
                      type="color"
                      {...register('backgroundColor')}
                      className="h-10 w-20"
                    />
                    <Input
                      {...register('backgroundColor')}
                      placeholder="#6366f1"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="textColor">Cor do Texto</Label>
                  <Select
                    value={textColor}
                    onValueChange={(value) => setValue('textColor', value as 'white' | 'black')}
                  >
                    <SelectTrigger id="textColor">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="white">Branco</SelectItem>
                      <SelectItem value="black">Preto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar size={16} />
                <span>Agendamento</span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="startDate">Data de Início *</Label>
                  <Input id="startDate" type="date" {...register('startDate')} />
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="endDate">Data de Fim (Opcional)</Label>
                  <Input id="endDate" type="date" {...register('endDate')} />
                  {errors.endDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Deixe vazio para sem fim
                  </p>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(value) => setValue('status', value as ContentStatus)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="position">Posição</Label>
                <Select
                  value={watch('position')}
                  onValueChange={(value) => setValue('position', value as BannerPosition)}
                >
                  <SelectTrigger id="position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hero">Hero (Topo)</SelectItem>
                    <SelectItem value="mid-page">Meio da Página</SelectItem>
                    <SelectItem value="popup">Popup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DrawerFooter className="border-t">
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-brand-500 text-black hover:bg-brand-400"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Banner'}
              </Button>
            </div>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
