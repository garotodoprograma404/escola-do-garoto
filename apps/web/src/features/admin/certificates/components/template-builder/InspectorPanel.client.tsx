'use client'

import { LayoutTemplate } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Separator } from '@/shared/components/ui/separator'
import type { BuilderAssetTarget, BuilderElement } from '../../lib/templateBuilderElements'
import type { CertificateBuilderSchema } from '../../lib/templateBuilderSchema'
import { AssetUploadField } from './AssetUploadField.client'
import { ElementEditor } from './ElementEditor.client'

interface InspectorPanelProps {
  background: CertificateBuilderSchema['background']
  previewUrls: {
    imageUrl: string | null
    primarySignatureUrl: string | null
    secondarySignatureUrl: string | null
  }
  uploadingTarget: BuilderAssetTarget | null
  selectedElement: BuilderElement | null
  onUploadAsset: (target: BuilderAssetTarget, file: File) => void
  onRemoveAsset: (target: BuilderAssetTarget) => void
  onChangeElement: (updater: (element: BuilderElement) => BuilderElement) => void
  onNudgeElement: (deltaX: number, deltaY: number) => void
  onRemoveElement: () => void
}

/** Coluna da direita: imagens do modelo e edição do elemento selecionado. */
export function InspectorPanel({
  background,
  previewUrls,
  uploadingTarget,
  selectedElement,
  onUploadAsset,
  onRemoveAsset,
  onChangeElement,
  onNudgeElement,
  onRemoveElement,
}: InspectorPanelProps) {
  const busy = uploadingTarget !== null

  return (
    <Card className="border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900/85">
      <CardHeader>
        <CardTitle>Inspector</CardTitle>
        <CardDescription>
          Edite o elemento selecionado e metadados visuais do template.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AssetUploadField
          label="Imagem de fundo"
          previewAlt="Prévia da imagem de fundo"
          emptyText="Nenhuma imagem de fundo enviada"
          previewUrl={previewUrls.imageUrl}
          path={background.imagePath}
          uploading={uploadingTarget === 'imagePath'}
          busy={busy}
          uploadLabel="Enviar imagem"
          replaceLabel="Alterar imagem"
          fit="cover"
          heightClass="h-36"
          onPick={(file) => onUploadAsset('imagePath', file)}
          onRemove={() => onRemoveAsset('imagePath')}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <AssetUploadField
            label="Assinatura 1"
            previewAlt="Prévia da assinatura 1"
            emptyText="Sem assinatura"
            previewUrl={previewUrls.primarySignatureUrl}
            path={background.primarySignaturePath}
            uploading={uploadingTarget === 'primarySignaturePath'}
            busy={busy}
            fit="contain"
            heightClass="h-24"
            onPick={(file) => onUploadAsset('primarySignaturePath', file)}
            onRemove={() => onRemoveAsset('primarySignaturePath')}
          />
          <AssetUploadField
            label="Assinatura 2"
            previewAlt="Prévia da assinatura 2"
            emptyText="Sem assinatura"
            previewUrl={previewUrls.secondarySignatureUrl}
            path={background.secondarySignaturePath}
            uploading={uploadingTarget === 'secondarySignaturePath'}
            busy={busy}
            fit="contain"
            heightClass="h-24"
            onPick={(file) => onUploadAsset('secondarySignaturePath', file)}
            onRemove={() => onRemoveAsset('secondarySignaturePath')}
          />
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          Formatos aceitos: PNG, JPG, WEBP e SVG (máximo 5MB por arquivo).
        </p>

        <Separator />

        {!selectedElement ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
            Selecione um elemento no canvas para editar.
          </p>
        ) : (
          <ElementEditor
            element={selectedElement}
            onChange={onChangeElement}
            onNudge={onNudgeElement}
            onRemove={onRemoveElement}
          />
        )}

        <Separator />

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          <p className="inline-flex items-center gap-1">
            <LayoutTemplate className="h-3.5 w-3.5" />
            Cada clique em “Salvar nova versão” cria uma versão imutável no banco.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
