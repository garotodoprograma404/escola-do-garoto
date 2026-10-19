'use client'

import Image from 'next/image'
import type { PointerEvent, RefObject } from 'react'
import { Grip } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import type { CertificateBuilderSchema } from '../../lib/templateBuilderSchema'
import { elementDisplayText } from '../../lib/templateBuilderElements'

interface CanvasPanelProps {
  canvasRef: RefObject<HTMLDivElement | null>
  orientation: CertificateBuilderSchema['meta']['orientation']
  elements: CertificateBuilderSchema['elements']
  selectedElementId: string | null
  imageUrl: string | null
  primarySignatureUrl: string | null
  secondarySignatureUrl: string | null
  onSelect: (elementId: string | null) => void
  onDragStart: (event: PointerEvent<HTMLDivElement>, elementId: string) => void
}

/** Coluna do meio: a página com os elementos que dá para arrastar. */
export function CanvasPanel({
  canvasRef,
  orientation,
  elements,
  selectedElementId,
  imageUrl,
  primarySignatureUrl,
  secondarySignatureUrl,
  onSelect,
  onDragStart,
}: CanvasPanelProps) {
  return (
    <Card className="border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900/85">
      <CardHeader>
        <CardTitle>Canvas</CardTitle>
        <CardDescription>
          Arraste os elementos para posicionar. O preview usa os mesmos dados salvos na versão.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          ref={canvasRef}
          onClick={() => onSelect(null)}
          style={{
            aspectRatio: orientation === 'portrait' ? '1 / 1.414' : '1.414 / 1',
            backgroundImage: imageUrl
              ? `url(${imageUrl})`
              : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          className="relative w-full overflow-hidden rounded-xl border border-slate-300 bg-white shadow-inner dark:border-slate-700"
        >
          <div className="pointer-events-none absolute inset-0 bg-white/30" />

          {elements.map((element) => (
            <div
              key={element.id}
              role="button"
              tabIndex={0}
              onPointerDown={(event) => onDragStart(event, element.id)}
              onClick={(event) => {
                event.stopPropagation()
                onSelect(element.id)
              }}
              className={cn(
                'absolute cursor-grab rounded-md border border-transparent px-2 py-1 transition-colors active:cursor-grabbing',
                selectedElementId === element.id
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'hover:border-slate-400/40 hover:bg-slate-100/40',
              )}
              style={{
                left: `${element.x}%`,
                top: `${element.y}%`,
                width: `${element.width}%`,
                color: element.color,
                fontSize: `${element.fontSize}px`,
                fontWeight: element.fontWeight,
                textAlign: element.align,
                fontFamily: 'Georgia, serif',
              }}
            >
              <div className="pointer-events-none flex items-center justify-between gap-2">
                <span>{elementDisplayText(element)}</span>
                {selectedElementId === element.id ? (
                  <Grip className="h-3.5 w-3.5 opacity-70" />
                ) : null}
              </div>
            </div>
          ))}

          {primarySignatureUrl ? (
            <div className="pointer-events-none absolute bottom-[7%] left-[12%] h-[13%] w-[22%]">
              <Image
                src={primarySignatureUrl}
                alt="Assinatura primária"
                fill
                unoptimized
                className="object-contain"
              />
            </div>
          ) : null}

          {secondarySignatureUrl ? (
            <div className="pointer-events-none absolute bottom-[7%] right-[12%] h-[13%] w-[22%]">
              <Image
                src={secondarySignatureUrl}
                alt="Assinatura secundária"
                fill
                unoptimized
                className="object-contain"
              />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
