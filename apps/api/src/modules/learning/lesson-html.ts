import sanitizeHtml from 'sanitize-html'

/**
 * Saneia o HTML do editor rico das aulas (`course_lessons.content_text`).
 *
 * Esse HTML vai para `dangerouslySetInnerHTML` no player, então cru seria XSS armazenado: um
 * produtor mal-intencionado, ou uma conta invadida, executaria script no navegador de todos os
 * alunos. Por isso o servidor só devolve tags de formatação, sem script, sem manipulador de evento
 * (`onerror=`), sem `javascript:` e sem `<iframe>`/`<style>`.
 *
 * Exportado para os módulos que GRAVAM aula (produtor/admin) saneiem também na entrada.
 */
const SAFE_SCHEMES = ['http', 'https', 'mailto']

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'hr',
    'div',
    'span',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'sub',
    'sup',
    'mark',
    'small',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
    'code',
    'a',
    'img',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'caption',
    'colgroup',
    'col',
    'figure',
    'figcaption',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    code: ['class'],
    pre: ['class'],
    span: ['class'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan'],
    '*': ['style'],
  },
  // Só alinhamento de texto: o resto de `style` poderia sobrepor a tela (clickjacking visual).
  allowedStyles: {
    '*': { 'text-align': [/^(left|right|center|justify)$/] },
  },
  // Classes só de realce de código (`language-js`), nada que estilize a página.
  allowedClasses: {
    code: [/^language-[\w-]+$/],
    pre: [/^language-[\w-]+$/],
    span: [/^hljs[\w-]*$/],
  },
  allowedSchemes: SAFE_SCHEMES,
  // Imagens: http(s), caminho relativo (`/api/files/...`) e data:image (editor com imagem colada).
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    // Links externos nunca ganham acesso à janela de origem (`window.opener`).
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        ...(attribs.href ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
      },
    }),
  },
}

export function sanitizeLessonHtml(html: string | null | undefined): string | null {
  if (html === null || html === undefined) return null
  const clean = sanitizeHtml(html, OPTIONS)
  // `data:` só vale para imagem de verdade (nada de data:text/html).
  return clean.replace(/src="data:(?!image\/(?:png|jpe?g|gif|webp);)[^"]*"/gi, 'src=""')
}
