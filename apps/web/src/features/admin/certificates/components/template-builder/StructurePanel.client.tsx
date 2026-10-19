'use client'

import { SquarePen, Type } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Separator } from '@/shared/components/ui/separator'
import { cn } from '@/shared/lib/utils'
import {
  CERTIFICATE_TOKEN_OPTIONS,
  getTokenLabel,
  type CertificateBuilderSchema,
  type CertificateTokenKey,
} from '../../lib/templateBuilderSchema'
import { PAGE_SIZE_OPTIONS } from '../../lib/templateDisplay'

interface StructurePanelProps {
  meta: CertificateBuilderSchema['meta']
  elements: CertificateBuilderSchema['elements']
  selectedElementId: string | null
  onMetaChange: (meta: CertificateBuilderSchema['meta']) => void
  onAddText: () => void
  onAddToken: (token: CertificateTokenKey) => void
  onSelect: (elementId: string) => void
}

/** Coluna da esquerda: orientação, formato da página, o que dá para adicionar e a lista de elementos. */
export function StructurePanel({
  meta,
  elements,
  selectedElementId,
  onMetaChange,
  onAddText,
  onAddToken,
  onSelect,
}: StructurePanelProps) {
  return (
    <Card className="border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900/85">
      <CardHeader>
        <CardTitle>Estrutura</CardTitle>
        <CardDescription>
          Adicione campos dinâmicos e textos livres para montar o template.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Orientação</Label>
          <Select
            value={meta.orientation}
            onValueChange={(value) =>
              onMetaChange({
                ...meta,
                orientation: value === 'portrait' ? 'portrait' : 'landscape',
              })
            }
          >
            <SelectTrigger aria-label="Orientação da página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="landscape">Paisagem</SelectItem>
              <SelectItem value="portrait">Retrato</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Formato da página</Label>
          <Select
            value={meta.pageSize}
            onValueChange={(value) => onMetaChange({ ...meta, pageSize: value })}
          >
            <SelectTrigger aria-label="Formato da página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <Button type="button" variant="outline" className="w-full" onClick={onAddText}>
          <SquarePen className="mr-2 h-4 w-4" />
          Adicionar bloco de texto
        </Button>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-slate-600 dark:text-slate-400">
            Campos dinâmicos
          </p>
          {CERTIFICATE_TOKEN_OPTIONS.map((token) => (
            <Button
              key={token.key}
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => onAddToken(token.key)}
            >
              <Type className="mr-2 h-4 w-4" />
              {token.label}
            </Button>
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-slate-600 dark:text-slate-400">
            Elementos no canvas
          </p>
          <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
            {elements.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">
                Nenhum elemento adicionado.
              </p>
            ) : (
              elements.map((element) => (
                <button
                  key={element.id}
                  type="button"
                  onClick={() => onSelect(element.id)}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    selectedElementId === element.id
                      ? 'border-brand-400/70 bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700',
                  )}
                >
                  <p className="font-medium text-slate-900 dark:text-white">{element.label}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {element.type === 'token' && element.token
                      ? `Campo: ${getTokenLabel(element.token)}`
                      : 'Texto livre'}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
