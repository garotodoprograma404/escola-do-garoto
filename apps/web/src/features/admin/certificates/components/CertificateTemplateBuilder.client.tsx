'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useTransition, type PointerEvent } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { useToast } from '@/shared/hooks/use-toast'
import type { CertificateTemplateBuilderData } from '../services/certificateBuilderService'
import {
  buildHtmlSnapshot,
  createTextElement,
  createTokenElement,
  moveElement,
  positionFromPointer,
  type BuilderAssetTarget,
  type BuilderElement,
} from '../lib/templateBuilderElements'
import type { CertificateBuilderSchema, CertificateTokenKey } from '../lib/templateBuilderSchema'
import { formatDateTime } from '@/shared/lib/format'
import { statusBadgeClass, statusLabel } from '../lib/templateDisplay'
import { saveCertificateTemplateVersionAction } from '../actions/certificate-template-version-actions'
import { CanvasPanel } from './template-builder/CanvasPanel.client'
import { InspectorPanel } from './template-builder/InspectorPanel.client'
import { StructurePanel } from './template-builder/StructurePanel.client'
import { useAssetUpload } from './template-builder/useAssetUpload'

interface CertificateTemplateBuilderProps {
  data: CertificateTemplateBuilderData
}

const PREVIEW_URL_KEYS = {
  imagePath: 'imageUrl',
  primarySignaturePath: 'primarySignatureUrl',
  secondarySignaturePath: 'secondarySignatureUrl',
} as const

export function CertificateTemplateBuilder({ data }: CertificateTemplateBuilderProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const [schema, setSchema] = useState<CertificateBuilderSchema>(data.schema)
  const [previewUrls, setPreviewUrls] = useState(data.backgroundPreviewUrls)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    data.schema.elements[0]?.id || null,
  )
  const [dragState, setDragState] = useState<{
    elementId: string
    offsetX: number
    offsetY: number
  } | null>(null)

  const canvasRef = useRef<HTMLDivElement | null>(null)

  const setAsset = (target: BuilderAssetTarget, path: string | null, url: string | null) => {
    setSchema((previous) => ({
      ...previous,
      background: { ...previous.background, [target]: path },
    }))
    setPreviewUrls((previous) => ({ ...previous, [PREVIEW_URL_KEYS[target]]: url }))
  }

  const { uploadingTarget, upload } = useAssetUpload(data.templateId, (target, asset) =>
    setAsset(target, asset.path, asset.signedUrl),
  )

  useEffect(() => {
    setSchema(data.schema)
    setPreviewUrls(data.backgroundPreviewUrls)
    setSelectedElementId(data.schema.elements[0]?.id || null)
  }, [data.backgroundPreviewUrls, data.schema])

  // Arrastar: enquanto o ponteiro está apertado, o elemento acompanha o mouse/dedo.
  useEffect(() => {
    if (!dragState) return

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      setSchema((previous) => ({
        ...previous,
        elements: previous.elements.map((element) =>
          element.id === dragState.elementId
            ? positionFromPointer(element, { x: event.clientX, y: event.clientY }, rect, dragState)
            : element,
        ),
      }))
    }

    const handlePointerUp = () => setDragState(null)

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [dragState])

  const selectedElement = useMemo(
    () => schema.elements.find((element) => element.id === selectedElementId) || null,
    [schema.elements, selectedElementId],
  )

  const addElement = (element: BuilderElement) => {
    setSchema((previous) => ({ ...previous, elements: [...previous.elements, element] }))
    setSelectedElementId(element.id)
  }

  const removeSelectedElement = () => {
    if (!selectedElement) return

    const remaining = schema.elements.filter((element) => element.id !== selectedElement.id)
    setSchema((previous) => ({ ...previous, elements: remaining }))
    setSelectedElementId((current) =>
      current === selectedElement.id ? remaining[0]?.id || null : current,
    )
  }

  const updateSelectedElement = (updater: (element: BuilderElement) => BuilderElement) => {
    if (!selectedElement) return

    setSchema((previous) => ({
      ...previous,
      elements: previous.elements.map((element) =>
        element.id === selectedElement.id ? updater(element) : element,
      ),
    }))
  }

  const startElementDrag = (event: PointerEvent<HTMLDivElement>, elementId: string) => {
    const canvas = canvasRef.current
    const element = schema.elements.find((item) => item.id === elementId)
    if (!canvas || !element) return

    const rect = canvas.getBoundingClientRect()
    setSelectedElementId(elementId)
    setDragState({
      elementId,
      offsetX: event.clientX - (rect.left + (element.x / 100) * rect.width),
      offsetY: event.clientY - (rect.top + (element.y / 100) * rect.height),
    })
  }

  const handleSaveVersion = () => {
    startTransition(async () => {
      const result = await saveCertificateTemplateVersionAction({
        templateId: data.templateId,
        schemaJson: schema,
        htmlSnapshot: buildHtmlSnapshot(schema),
      })

      if (!result.success) {
        toast({
          title: 'Erro ao salvar versão',
          description: result.error,
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Nova versão salva',
        description: `Template salvo como v${result.versionNumber}.`,
      })
    })
  }

  return (
    <div className="mx-auto max-w-[1800px] space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">
            Builder de certificado
          </p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{data.name}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Última versão: v{data.latestVersionNumber} • Atualizado em{' '}
            {formatDateTime(data.latestVersionUpdatedAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={statusBadgeClass(data.status)}>
            {statusLabel(data.status)}
          </Badge>

          <Button asChild variant="outline">
            <Link href="/admin/certificates">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>

          <Button asChild variant="outline">
            <Link href={`/admin/certificates/${data.templateId}/builder/preview`} target="_blank">
              Preview fiel
            </Link>
          </Button>

          <Button onClick={handleSaveVersion} disabled={isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isPending ? 'Salvando...' : 'Salvar nova versão'}
          </Button>
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <StructurePanel
          meta={schema.meta}
          elements={schema.elements}
          selectedElementId={selectedElementId}
          onMetaChange={(meta) => setSchema((previous) => ({ ...previous, meta }))}
          onAddText={() => addElement(createTextElement())}
          onAddToken={(token: CertificateTokenKey) => addElement(createTokenElement(token))}
          onSelect={setSelectedElementId}
        />

        <CanvasPanel
          canvasRef={canvasRef}
          orientation={schema.meta.orientation}
          elements={schema.elements}
          selectedElementId={selectedElementId}
          imageUrl={previewUrls.imageUrl}
          primarySignatureUrl={previewUrls.primarySignatureUrl}
          secondarySignatureUrl={previewUrls.secondarySignatureUrl}
          onSelect={setSelectedElementId}
          onDragStart={startElementDrag}
        />

        <InspectorPanel
          background={schema.background}
          previewUrls={previewUrls}
          uploadingTarget={uploadingTarget}
          selectedElement={selectedElement}
          onUploadAsset={(target, file) => void upload(target, file)}
          onRemoveAsset={(target) => setAsset(target, null, null)}
          onChangeElement={updateSelectedElement}
          onNudgeElement={(deltaX, deltaY) =>
            updateSelectedElement((current) => moveElement(current, deltaX, deltaY))
          }
          onRemoveElement={removeSelectedElement}
        />
      </section>
    </div>
  )
}
