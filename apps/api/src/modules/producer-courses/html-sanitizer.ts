import sanitizeHtml from 'sanitize-html'

/**
 * Sanitiza o HTML do editor rico (TipTap) das aulas de texto antes de gravar. O player do aluno
 * renderiza esse HTML direto (`dangerouslySetInnerHTML`), então qualquer `<script>`, `onerror=`,
 * `javascript:` etc. que o produtor colar viraria XSS contra os alunos e contra o admin.
 * Só passam as marcações que o editor gera.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'hr',
    'blockquote',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'strong',
    'b',
    'em',
    'i',
    's',
    'u',
    'code',
    'pre',
    'span',
    'ul',
    'ol',
    'li',
    'a',
    'img',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    // Realce de sintaxe do bloco de código (lowlight): só classes `hljs*` / `language-*`.
    code: ['class'],
    pre: ['class'],
    span: ['class'],
  },
  allowedClasses: {
    code: [/^language-[\w-]+$/, /^hljs[\w-]*$/],
    pre: [/^language-[\w-]+$/, /^hljs[\w-]*$/],
    span: [/^hljs[\w-]*$/],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: 'noopener noreferrer nofollow', target: '_blank' },
    }),
  },
}

export function sanitizeLessonHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS).trim()
}

/** Texto puro do HTML (para validar "tem conteúdo de verdade"). */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').trim()
}
