'use client'

import { Move, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { clampNumber, type BuilderElement } from '../../lib/templateBuilderElements'
import {
  CERTIFICATE_TOKEN_OPTIONS,
  getTokenLabel,
  type CertificateTokenKey,
} from '../../lib/templateBuilderSchema'

interface NumberFieldProps {
  id: string
  label: string
  value: number | string
  step?: number
  min?: number
  max?: number
  onChange: (value: number) => void
}

function NumberField({ id, label, value, step, min, max, onChange }: NumberFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}

interface ElementEditorProps {
  element: BuilderElement
  onChange: (updater: (element: BuilderElement) => BuilderElement) => void
  onNudge: (deltaX: number, deltaY: number) => void
  onRemove: () => void
}

/** Edição do elemento selecionado: textos, posição, tamanho, fonte, cor e alinhamento. */
export function ElementEditor({ element, onChange, onNudge, onRemove }: ElementEditorProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{element.label}</p>
        <Button type="button" size="sm" variant="outline" onClick={onRemove}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Remover
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="element-label">Título interno</Label>
        <Input
          id="element-label"
          value={element.label}
          maxLength={80}
          onChange={(event) =>
            onChange((current) => ({ ...current, label: event.target.value.slice(0, 80) }))
          }
        />
      </div>

      {element.type === 'text' ? (
        <div className="space-y-2">
          <Label htmlFor="element-text">Texto</Label>
          <Textarea
            id="element-text"
            value={element.text || ''}
            rows={3}
            maxLength={300}
            onChange={(event) => onChange((current) => ({ ...current, text: event.target.value }))}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="element-token">Campo dinâmico</Label>
          <Select
            value={element.token || 'student_name'}
            onValueChange={(value) =>
              onChange((current) => ({
                ...current,
                token: value as CertificateTokenKey,
                label: getTokenLabel(value as CertificateTokenKey),
              }))
            }
          >
            <SelectTrigger id="element-token">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CERTIFICATE_TOKEN_OPTIONS.map((token) => (
                <SelectItem key={token.key} value={token.key}>
                  {token.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          id="element-pos-x"
          label="Posição X (%)"
          value={element.x.toFixed(1)}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              x: clampNumber(value, 0, Math.max(0, 100 - current.width)),
            }))
          }
        />
        <NumberField
          id="element-pos-y"
          label="Posição Y (%)"
          value={element.y.toFixed(1)}
          onChange={(value) =>
            onChange((current) => ({ ...current, y: clampNumber(value, 0, 100) }))
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          id="element-width"
          label="Largura (%)"
          value={element.width.toFixed(1)}
          onChange={(value) =>
            onChange((current) => {
              const width = clampNumber(value, 10, 100)
              return { ...current, width, x: clampNumber(current.x, 0, Math.max(0, 100 - width)) }
            })
          }
        />
        <NumberField
          id="element-size"
          label="Fonte (px)"
          value={element.fontSize}
          onChange={(value) =>
            onChange((current) => ({ ...current, fontSize: clampNumber(value, 10, 120) }))
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          id="element-weight"
          label="Peso da fonte"
          value={element.fontWeight}
          step={100}
          min={300}
          max={900}
          onChange={(value) =>
            onChange((current) => ({ ...current, fontWeight: clampNumber(value, 300, 900) }))
          }
        />
        <div className="space-y-2">
          <Label htmlFor="element-color">Cor (hex)</Label>
          <Input
            id="element-color"
            value={element.color}
            onChange={(event) => onChange((current) => ({ ...current, color: event.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Alinhamento</Label>
        <Select
          value={element.align}
          onValueChange={(value) =>
            onChange((current) => ({ ...current, align: value as BuilderElement['align'] }))
          }
        >
          <SelectTrigger aria-label="Alinhamento do texto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Esquerda</SelectItem>
            <SelectItem value="center">Centro</SelectItem>
            <SelectItem value="right">Direita</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Microajuste de posição</Label>
        <div className="grid grid-cols-3 gap-2">
          <Button type="button" variant="outline" onClick={() => onNudge(0, -0.5)}>
            ↑
          </Button>
          <Button type="button" variant="outline" onClick={() => onNudge(-0.5, 0)}>
            ←
          </Button>
          <Button type="button" variant="outline" onClick={() => onNudge(0.5, 0)}>
            →
          </Button>
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={() => onNudge(0, 0.5)}>
          ↓
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        <p className="inline-flex items-center gap-1">
          <Move className="h-3.5 w-3.5" />
          Dica: arraste no canvas para posicionar rapidamente os elementos.
        </p>
      </div>
    </>
  )
}
