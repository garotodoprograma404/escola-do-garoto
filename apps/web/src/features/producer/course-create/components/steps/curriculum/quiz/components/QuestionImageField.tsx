import { FileUpload } from '@/shared/components/FileUpload.client'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import type { QuestionFormData, QuestionFormErrors } from '../types'

export type ImageInputMode = 'upload' | 'url'

interface QuestionImageFieldProps {
  imageUrl: string
  imageAlt: string
  mode: ImageInputMode
  errors: QuestionFormErrors
  onModeChange: (mode: ImageInputMode) => void
  onChange: (
    patch: Partial<Pick<QuestionFormData, 'question_image_url' | 'question_image_alt'>>,
  ) => void
  onUploadError: (message: string) => void
}

/** Imagem opcional da pergunta: envio de arquivo ou URL externa, prévia e texto alternativo. */
export function QuestionImageField({
  imageUrl,
  imageAlt,
  mode,
  errors,
  onModeChange,
  onChange,
  onUploadError,
}: QuestionImageFieldProps) {
  return (
    <div className="space-y-2">
      <Label>Imagem da Pergunta (opcional)</Label>
      <Tabs
        value={mode}
        onValueChange={(value) => onModeChange(value as ImageInputMode)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload de Imagem</TabsTrigger>
          <TabsTrigger value="url">URL Externa</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-2">
          <FileUpload
            type="thumbnail"
            onUploadComplete={(url) => {
              onModeChange('upload')
              onChange({ question_image_url: url })
            }}
            onUploadError={onUploadError}
            uploadedUrl={mode === 'upload' ? imageUrl : undefined}
            onClearUploaded={() => onChange({ question_image_url: '', question_image_alt: '' })}
            accept=".jpg,.jpeg,.png,.webp,.gif"
            buttonText="Selecionar Imagem"
            showPreview={true}
          />
          <p className="text-xs text-muted-foreground">
            Formatos aceitos: JPG, PNG, WEBP ou GIF (máx. 2MB).
          </p>
        </TabsContent>

        <TabsContent value="url" className="space-y-2">
          <Input
            type="url"
            value={imageUrl}
            onChange={(event) => onChange({ question_image_url: event.target.value })}
            placeholder="https://exemplo.com/imagem-da-questao.png"
            className={errors.question_image_url ? 'border-destructive' : ''}
          />
          <p className="text-xs text-muted-foreground">
            Use apenas URL segura (https://) de fonte confiável.
          </p>
        </TabsContent>
      </Tabs>

      {imageUrl && (
        <div className="overflow-hidden rounded-md border border-border bg-muted/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={imageAlt || 'Pré-visualização da imagem da questão'}
            className="max-h-64 w-full object-contain"
            loading="lazy"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="question_image_alt">Descrição da imagem (opcional)</Label>
        <Input
          id="question_image_alt"
          value={imageAlt}
          onChange={(event) => onChange({ question_image_alt: event.target.value })}
          maxLength={180}
          placeholder="Ex: Print de código com saída do terminal"
          className={errors.question_image_alt ? 'border-destructive' : ''}
        />
        <p className="text-xs text-muted-foreground">
          Ajuda na acessibilidade e na compreensão do enunciado ({imageAlt.trim().length}/180).
        </p>
      </div>

      {errors.question_image_url && (
        <p className="text-sm text-destructive">{errors.question_image_url}</p>
      )}
      {errors.question_image_alt && (
        <p className="text-sm text-destructive">{errors.question_image_alt}</p>
      )}
    </div>
  )
}
