import sanitizeHtml from 'sanitize-html'

/**
 * Limpa o HTML que vem do editor rico (TipTap) antes de gravar e antes de entregar ao público.
 *
 * As páginas desenham esse HTML com `dangerouslySetInnerHTML`: sem a limpeza, quem publicasse um
 * post (ou uma aula) poderia plantar `<script>`, `onerror=` ou `href="javascript:"` e rodar código
 * no navegador de todo leitor (XSS armazenado).
 *
 * Aqui só passa o que o editor produz: texto, títulos, listas, citação, código, link e imagem.
 * Nada de script, estilo, iframe, formulário, atributo de evento, `javascript:` ou `data:`.
 */
const SAFE_CLASSES = [/^language-[\w-]+$/, /^hljs(-[\w-]+)?$/]

export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p',
      'br',
      'hr',
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
      'u',
      's',
      'strike',
      'del',
      'mark',
      'sub',
      'sup',
      'code',
      'pre',
      'blockquote',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'span',
      'div',
      'figure',
      'figcaption',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
      code: ['class'],
      pre: ['class'],
      span: ['class'],
    },
    allowedClasses: { code: SAFE_CLASSES, pre: SAFE_CLASSES, span: SAFE_CLASSES },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    // Imagem só por http(s) ou caminho do próprio site (nada de `data:`).
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowProtocolRelative: false,
    transformTags: {
      // Link que abre em outra aba nunca leva o `window.opener` junto.
      a: (tagName, attribs) => ({
        tagName,
        attribs: attribs.target
          ? { ...attribs, target: '_blank', rel: 'noopener noreferrer' }
          : attribs,
      }),
    },
  })
}

/** Texto puro (sem nenhuma tag): para contar palavras, gerar resumo ou título de busca. */
export function stripAllHtml(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
}
