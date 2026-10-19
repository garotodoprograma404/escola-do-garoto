import {
  getTokenLabel,
  type CertificateBuilderSchema,
  type CertificateTokenKey,
} from './templateBuilderSchema'

export type BuilderElement = CertificateBuilderSchema['elements'][number]

export type BuilderAssetTarget = 'imagePath' | 'primarySignaturePath' | 'secondarySignaturePath'

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function createElementId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function createTextElement(): BuilderElement {
  return {
    id: createElementId('text'),
    type: 'text',
    label: 'Novo texto',
    text: 'Digite seu texto',
    token: null,
    x: 16,
    y: 20,
    width: 40,
    fontSize: 22,
    fontWeight: 500,
    color: '#0F172A',
    align: 'left',
  }
}

export function createTokenElement(token: CertificateTokenKey): BuilderElement {
  return {
    id: createElementId('token'),
    type: 'token',
    label: getTokenLabel(token),
    text: null,
    token,
    x: 16,
    y: 34,
    width: 48,
    fontSize: 22,
    fontWeight: 600,
    color: '#111827',
    align: 'left',
  }
}

/** Texto que aparece no canvas e no HTML: `{{campo}}` para campos dinâmicos. */
export function elementDisplayText(element: BuilderElement): string {
  return element.type === 'token' && element.token
    ? `{{${element.token}}}`
    : element.text || element.label
}

/** Desloca o elemento mantendo-o dentro da página (em % da largura/altura). */
export function moveElement(
  element: BuilderElement,
  deltaX: number,
  deltaY: number,
): BuilderElement {
  return {
    ...element,
    x: clampNumber(element.x + deltaX, 0, Math.max(0, 100 - element.width)),
    y: clampNumber(element.y + deltaY, 0, 100),
  }
}

/** Posição (em %) de um elemento arrastado até o ponteiro, respeitando onde ele foi agarrado. */
export function positionFromPointer(
  element: BuilderElement,
  pointer: { x: number; y: number },
  canvas: { left: number; top: number; width: number; height: number },
  grab: { offsetX: number; offsetY: number },
): BuilderElement {
  const rawX = ((pointer.x - canvas.left - grab.offsetX) / canvas.width) * 100
  const rawY = ((pointer.y - canvas.top - grab.offsetY) / canvas.height) * 100
  return {
    ...element,
    x: clampNumber(rawX, 0, Math.max(0, 100 - element.width)),
    y: clampNumber(rawY, 0, 100),
  }
}

export function getAssetLabel(target: BuilderAssetTarget): string {
  if (target === 'imagePath') return 'imagem de fundo'
  if (target === 'primarySignaturePath') return 'assinatura 1'
  return 'assinatura 2'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Cópia em HTML do modelo, guardada junto de cada versão salva. */
export function buildHtmlSnapshot(schema: CertificateBuilderSchema): string {
  const body = schema.elements
    .map(
      (element) =>
        `<div style="position:absolute;left:${element.x}%;top:${element.y}%;width:${element.width}%;font-size:${element.fontSize}px;font-weight:${element.fontWeight};color:${element.color};text-align:${element.align};font-family:'Georgia',serif;">${escapeHtml(elementDisplayText(element))}</div>`,
    )
    .join('')

  const imagePath = escapeHtml(schema.background.imagePath || '')
  const primarySignaturePath = escapeHtml(schema.background.primarySignaturePath || '')
  const secondarySignaturePath = escapeHtml(schema.background.secondarySignaturePath || '')

  return `<section data-template-version="1" data-bg-path="${imagePath}" data-signature-1-path="${primarySignaturePath}" data-signature-2-path="${secondarySignaturePath}" style="position:relative;width:100%;height:100%;">${body}</section>`
}
