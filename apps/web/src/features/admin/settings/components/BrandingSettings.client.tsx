'use client'

import { useState, useRef } from 'react'
import { Upload, Trash2, RefreshCw, Palette, Eye } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { useToast } from '@/shared/hooks/use-toast'
import { saveBrandingSettings } from '../actions/branding-actions'
import type { BrandingSettings as BrandingSettingsType } from '../actions/branding-actions'

interface BrandingSettingsProps {
  settings: BrandingSettingsType
}

export function BrandingSettings({ settings: initialSettings }: BrandingSettingsProps) {
  const [formData, setFormData] = useState(initialSettings)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const result = await saveBrandingSettings(formData)

      if (result.success) {
        toast({
          title: 'Sucesso!',
          description:
            'Configurações de marca salvas com sucesso! Recarregue a página para ver as mudanças.',
        })

        // Recarregar a página após 1 segundo para aplicar as novas cores
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Erro ao salvar configurações',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="mb-2 text-2xl font-bold">Identidade Visual</h2>
        <p className="text-muted-foreground">
          Personalize as cores e logotipos para alinhar com sua marca.
        </p>
      </div>

      {/* Logos Section */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ImageUploader
          label="Logo da Plataforma"
          value={formData.logoUrl}
          onChange={(url) => handleChange('logoUrl', url)}
          description="PNG/SVG Transparente. Recomendado: 180x50px."
        />
        <ImageUploader
          label="Favicon"
          value={formData.faviconUrl}
          onChange={(url) => handleChange('faviconUrl', url)}
          description="Ícone do navegador. 32x32px ou 64x64px."
        />
      </div>

      <div className="h-px bg-border" />

      {/* Colors Section */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <h3 className="flex items-center gap-2 font-bold">
            <Palette className="h-5 w-5" />
            Paleta de Cores
          </h3>

          <div className="space-y-4">
            {/* Primary Color */}
            <ColorPicker
              label="Cor Primária (Marca)"
              value={formData.primaryColor}
              onChange={(color) => handleChange('primaryColor', color)}
              description="Usada em botões, destaques e links."
            />

            {/* Secondary Color */}
            <ColorPicker
              label="Cor Secundária"
              value={formData.secondaryColor}
              onChange={(color) => handleChange('secondaryColor', color)}
              description="Usada em fundos e contrastes."
            />

            {/* Accent Color */}
            <ColorPicker
              label="Cor de Destaque"
              value={formData.accentColor}
              onChange={(color) => handleChange('accentColor', color)}
              description="Usada em notificações e alertas."
            />
          </div>
        </div>

        {/* Live Preview */}
        <LivePreview settings={formData} />
      </div>

      {/* Save Button */}
      <div className="flex justify-end border-t pt-6">
        <Button type="submit" disabled={isSaving} size="lg">
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </form>
  )
}

// Image Uploader Component
interface ImageUploaderProps {
  label: string
  value?: string
  onChange: (url: string) => void
  description: string
}

function ImageUploader({ label, value, onChange, description }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.currentTarget.value = ''

    if (!file) {
      return
    }

    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/svg+xml',
      'image/x-icon',
      'image/vnd.microsoft.icon',
    ]
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Formato inválido',
        description: 'Use PNG, JPG, WEBP, SVG ou ICO.',
        variant: 'destructive',
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo permitido é 5MB.',
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)
    try {
      // O arquivo vai para a API (que confere papel de admin, tipo e tamanho e escolhe o nome).
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/files/upload?type=branding', {
        method: 'POST',
        body,
        credentials: 'same-origin',
      })
      const payload = (await response.json().catch(() => undefined)) as
        { url?: string; message?: string } | undefined

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.message ?? 'Falha no upload')
      }
      const publicUrl = payload.url

      onChange(publicUrl)
      toast({
        title: 'Upload concluído',
        description: 'Imagem enviada com sucesso.',
      })
    } catch (error) {
      console.error('Branding image upload error:', error)
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível enviar a imagem. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="font-semibold">{label}</Label>
      <div
        onClick={() => inputRef.current?.click()}
        className={`group relative flex h-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-all ${
          value
            ? 'border-primary bg-muted'
            : 'border-muted-foreground/25 hover:border-primary hover:bg-muted'
        } `}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Preview" className="h-full w-full object-contain p-2" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                size="icon"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange('')
                }}
                title="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                disabled={isUploading}
                onClick={(e) => {
                  e.stopPropagation()
                  inputRef.current?.click()
                }}
                title="Alterar"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              {isUploading ? 'Enviando...' : 'Clique ou arraste'}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground/60">{description}</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png, image/jpeg, image/svg+xml"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>
    </div>
  )
}

// Color Picker Component
interface ColorPickerProps {
  label: string
  value: string
  onChange: (color: string) => void
  description: string
}

function ColorPicker({ label, value, onChange, description }: ColorPickerProps) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <div className="flex gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border shadow-sm">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -left-2 -top-2 h-16 w-16 cursor-pointer"
          />
        </div>
        <div className="flex-1">
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="font-mono uppercase"
            placeholder="#000000"
          />
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  )
}

// Live Preview Component
interface LivePreviewProps {
  settings: BrandingSettingsType
}

function LivePreview({ settings }: LivePreviewProps) {
  return (
    <div className="rounded-2xl border bg-muted p-6">
      <h3 className="mb-4 flex items-center gap-2 font-bold">
        <Eye className="h-5 w-5" />
        Pré-visualização
      </h3>

      <div className="space-y-4">
        {/* Button Preview */}
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-background p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Botão Principal</p>
          <button
            style={{ backgroundColor: settings.primaryColor }}
            className="rounded-lg px-6 py-2.5 font-bold text-black shadow-lg transition-transform hover:scale-105"
          >
            Começar Agora
          </button>
        </div>

        {/* Header Preview */}
        <div className="overflow-hidden rounded-xl border bg-background">
          <div className="flex items-center justify-between border-b bg-card p-3">
            <div className="flex items-center gap-2 font-bold">
              {settings.logoUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={settings.logoUrl} alt="Logo" className="h-6 object-contain" />
                </>
              ) : (
                <div className="flex items-center gap-1">
                  <div
                    className="h-6 w-6 rounded"
                    style={{ backgroundColor: settings.primaryColor }}
                  />
                  <span>Logo</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <div className="h-2 w-16 rounded-full bg-muted" />
              <div className="h-2 w-8 rounded-full bg-muted" />
            </div>
          </div>
          <div className="bg-muted/50 p-8 text-center">
            <h4 className="mb-2 text-lg font-bold">Sua Plataforma</h4>
            <span style={{ color: settings.primaryColor }} className="text-sm font-bold">
              Destaque na cor da marca
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
