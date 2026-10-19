import type { CertificateBuilderSchema, CertificateTokenKey } from './builder-schema.js'
import { defaultPreviewPayload, type CertificatePayload } from './certificate-payload.js'

export interface CertificateAssetUrls {
  imageUrl: string | null
  primarySignatureUrl: string | null
  secondarySignatureUrl: string | null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function resolveTokenValue(token: CertificateTokenKey | null, payload: CertificatePayload): string {
  if (!token) return ''
  const value = payload[token]
  return typeof value === 'string' ? value : ''
}

function buildPreviewContent(
  schema: CertificateBuilderSchema,
  payload: CertificatePayload,
): string {
  return schema.elements
    .map((element) => {
      const content =
        element.type === 'token'
          ? resolveTokenValue(element.token, payload)
          : element.text || element.label

      return `<div class="certificate-element" style="left:${element.x}%;top:${element.y}%;width:${element.width}%;font-size:${element.fontSize}px;font-weight:${element.fontWeight};color:${element.color};text-align:${element.align};">${escapeHtml(content)}</div>`
    })
    .join('')
}

/**
 * HTML da prévia do modelo (a mesma disposição dos campos do PDF). Todo texto vem escapado; as URLs
 * das imagens são as assinadas geradas pelo servidor.
 */
export function renderCertificatePreviewDocument(params: {
  templateName: string
  schema: CertificateBuilderSchema
  assetUrls: CertificateAssetUrls
  payload?: Partial<CertificatePayload>
}): string {
  const payload: CertificatePayload = { ...defaultPreviewPayload(), ...params.payload }

  const orientation = params.schema.meta.orientation
  const pageRatio = orientation === 'portrait' ? '1 / 1.414' : '1.414 / 1'
  const content = buildPreviewContent(params.schema, payload)

  const backgroundStyle = params.assetUrls.imageUrl
    ? `background-image:url('${params.assetUrls.imageUrl.replace(/'/g, '%27')}');background-size:cover;background-position:center;`
    : 'background:linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%);'

  const primarySignature = params.assetUrls.primarySignatureUrl
    ? `<img class="signature signature-primary" src="${params.assetUrls.primarySignatureUrl.replace(/"/g, '&quot;')}" alt="Assinatura primaria" />`
    : ''

  const secondarySignature = params.assetUrls.secondarySignatureUrl
    ? `<img class="signature signature-secondary" src="${params.assetUrls.secondarySignatureUrl.replace(/"/g, '&quot;')}" alt="Assinatura secundaria" />`
    : ''

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Preview - ${escapeHtml(params.templateName)}</title>
    <style>
      :root {
        color-scheme: light;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #0f172a;
        padding: 24px;
        font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif;
      }
      .preview-shell {
        width: min(1200px, calc(100vw - 48px));
        display: grid;
        gap: 14px;
      }
      .meta {
        color: #cbd5e1;
        font-size: 12px;
        line-height: 1.4;
      }
      .meta strong { color: #f8fafc; }
      .certificate-page {
        position: relative;
        width: 100%;
        aspect-ratio: ${pageRatio};
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.35);
        border: 1px solid rgba(148, 163, 184, 0.35);
        ${backgroundStyle}
      }
      .certificate-page::after {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba(255, 255, 255, 0.28);
      }
      .certificate-element {
        position: absolute;
        z-index: 2;
        font-family: Georgia, 'Times New Roman', serif;
        line-height: 1.22;
        white-space: pre-wrap;
      }
      .signature {
        position: absolute;
        z-index: 2;
        width: 22%;
        height: 13%;
        object-fit: contain;
        bottom: 7%;
      }
      .signature-primary { left: 12%; }
      .signature-secondary { right: 12%; }
      @media (max-width: 900px) {
        body { padding: 14px; }
        .preview-shell { width: calc(100vw - 28px); }
      }
    </style>
  </head>
  <body>
    <div class="preview-shell">
      <div class="meta">
        <strong>Preview fiel do template:</strong> ${escapeHtml(params.templateName)}
        <br />Orientação: ${escapeHtml(params.schema.meta.orientation)} | Formato: ${escapeHtml(params.schema.meta.pageSize)}
      </div>
      <section class="certificate-page">${content}${primarySignature}${secondarySignature}</section>
    </div>
  </body>
</html>`
}
