import type { CertificateBuilderSchema } from './builder-schema.js'
import type { CertificatePayload } from './certificate-payload.js'

/**
 * Gera o PDF do certificado no servidor. PDF 1.4 escrito à mão
 * (sem biblioteca), uma página, texto em Helvetica/Helvetica-Bold nos campos posicionados em % da
 * página, mais cores. O texto sai em WinAnsiEncoding (Windows-1252): cobre os acentos do português
 * com a fonte padrão do PDF. Caractere fora dela perde o acento ou vira espaço. As imagens do
 * modelo (fundo/assinaturas) aparecem só no preview.
 */

type HorizontalAlignment = 'left' | 'center' | 'right'
type PageSize = 'A4' | 'A3' | 'LETTER'

interface PageDimensions {
  width: number
  height: number
}

interface PdfRenderParams {
  schema: CertificateBuilderSchema
  payload: CertificatePayload
}

/** Caracteres do Windows-1252 fora do Latin-1 (0x80-0x9F): aspas tipográficas, travessão etc. */
const WIN_ANSI_EXTRAS: Record<string, number> = {
  '€': 0x80,
  '‚': 0x82,
  ƒ: 0x83,
  '„': 0x84,
  '…': 0x85,
  '†': 0x86,
  '‡': 0x87,
  ˆ: 0x88,
  '‰': 0x89,
  Š: 0x8a,
  '‹': 0x8b,
  Œ: 0x8c,
  Ž: 0x8e,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
  '˜': 0x98,
  '™': 0x99,
  š: 0x9a,
  '›': 0x9b,
  œ: 0x9c,
  ž: 0x9e,
  Ÿ: 0x9f,
}

/** Código WinAnsi do caractere, ou `null` se a fonte padrão não tem. */
function winAnsiCode(char: string): number | null {
  const code = char.codePointAt(0) ?? 0
  if (code >= 0x20 && code <= 0x7e) return code
  if (code >= 0xa0 && code <= 0xff) return code
  return WIN_ANSI_EXTRAS[char] ?? null
}

/** Texto em caracteres que a fonte tem: o resto perde o acento ou vira espaço. */
function toWinAnsiText(value: string): string {
  return Array.from(value.normalize('NFC'))
    .map((char) => {
      if (char === '\n') return char
      if (winAnsiCode(char) !== null) return char
      const plain = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      return plain.length === 1 && winAnsiCode(plain) !== null ? plain : ' '
    })
    .join('')
}

/** String literal do PDF: escapa `\ ( )` e escreve o que não é ASCII como octal (`\343` = ã). */
function escapePdfText(value: string): string {
  return Array.from(toWinAnsiText(value))
    .map((char) => {
      if (char === '\\' || char === '(' || char === ')') return `\\${char}`
      const code = winAnsiCode(char) ?? 0x20
      return code > 0x7e ? `\\${code.toString(8).padStart(3, '0')}` : char
    })
    .join('')
}

function hexToRgbUnit(color: string): { r: number; g: number; b: number } {
  const normalized = color.trim()
  const hex = /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.slice(1) : '0F172A'

  return {
    r: Number.parseInt(hex.slice(0, 2), 16) / 255,
    g: Number.parseInt(hex.slice(2, 4), 16) / 255,
    b: Number.parseInt(hex.slice(4, 6), 16) / 255,
  }
}

function getTokenValue(
  payload: CertificatePayload,
  token: keyof CertificatePayload | null,
  fallback: string,
): string {
  if (!token) return fallback
  const value = payload[token]
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

function getBasePageDimensions(pageSize: PageSize): PageDimensions {
  if (pageSize === 'A3') return { width: 842, height: 1191 }
  if (pageSize === 'LETTER') return { width: 612, height: 792 }
  return { width: 595, height: 842 }
}

function getPageDimensions(schema: CertificateBuilderSchema): PageDimensions {
  const pageSize = (schema.meta.pageSize || 'A4').toUpperCase() as PageSize
  const base = getBasePageDimensions(pageSize)
  if (schema.meta.orientation === 'portrait') return base
  return { width: base.height, height: base.width }
}

function estimateTextWidth(text: string, fontSize: number): number {
  return Array.from(toWinAnsiText(text)).length * fontSize * 0.52
}

function resolveAlignedX(params: {
  x: number
  width: number
  text: string
  align: HorizontalAlignment
  pageWidth: number
  fontSize: number
}): number {
  const regionX = (params.x / 100) * params.pageWidth
  const regionWidth = (params.width / 100) * params.pageWidth
  const textWidth = estimateTextWidth(params.text, params.fontSize)

  if (params.align === 'center') return regionX + Math.max(0, (regionWidth - textWidth) / 2)
  if (params.align === 'right') return regionX + Math.max(0, regionWidth - textWidth)
  return regionX
}

function buildContentStream(params: PdfRenderParams & PageDimensions): string {
  const operations: string[] = []

  for (const element of params.schema.elements) {
    const textValue =
      element.type === 'token'
        ? getTokenValue(params.payload, element.token, element.label)
        : element.text || element.label

    const lines = toWinAnsiText(textValue)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    if (lines.length === 0) continue

    const fontRef = element.fontWeight >= 600 ? 'F2' : 'F1'
    const fontSize = Math.max(10, Math.min(120, element.fontSize))
    const { r, g, b } = hexToRgbUnit(element.color)
    const regionTop = (element.y / 100) * params.height
    const baseY = params.height - regionTop - fontSize

    lines.forEach((line, lineIndex) => {
      const safeText = escapePdfText(line)
      const x = resolveAlignedX({
        x: element.x,
        width: element.width,
        text: line,
        align: element.align,
        pageWidth: params.width,
        fontSize,
      })
      const y = baseY - lineIndex * (fontSize * 1.25)

      if (y < 16) return

      operations.push('BT')
      operations.push(`/${fontRef} ${fontSize.toFixed(2)} Tf`)
      operations.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`)
      operations.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`)
      operations.push(`(${safeText}) Tj`)
      operations.push('ET')
    })
  }

  return operations.join('\n')
}

function buildPdfBuffer(page: PageDimensions, contentStream: string): Buffer {
  const objects: string[] = []

  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  objects.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >>`,
  )
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  objects.push(
    `<< /Length ${Buffer.byteLength(contentStream, 'utf8')} >>\nstream\n${contentStream}\nendstream`,
  )
  objects.push(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  )

  let document = '%PDF-1.4\n'
  const offsets: number[] = [0]

  objects.forEach((objectContent, index) => {
    offsets.push(Buffer.byteLength(document, 'utf8'))
    document += `${index + 1} 0 obj\n${objectContent}\nendobj\n`
  })

  const xrefOffset = Buffer.byteLength(document, 'utf8')

  let xref = `xref\n0 ${objects.length + 1}\n`
  xref += '0000000000 65535 f \n'
  for (let index = 1; index < offsets.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return Buffer.from(document + xref + trailer, 'utf8')
}

export function renderCertificatePdfBuffer(params: PdfRenderParams): Buffer {
  const page = getPageDimensions(params.schema)
  const contentStream = buildContentStream({ ...params, ...page })
  return buildPdfBuffer(page, contentStream)
}
