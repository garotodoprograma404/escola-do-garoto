/**
 * Cores da marca. O admin escolhe uma cor (hoje um lima claro) e ela vira a cor primária do site nos
 * dois temas. Uma cor clara precisa ficar mais escura no tema claro e o texto sobre ela precisa ser
 * preto ou branco conforme o contraste: sem isso o botão "Cadastrar" vira texto branco sobre lima.
 */

export type Rgb = { r: number; g: number; b: number }
export type Hsl = { h: number; s: number; l: number }

/** Contraste mínimo para texto normal (WCAG 2.1 AA). */
export const MIN_TEXT_CONTRAST = 4.5

/** Fundo da página no tema escuro (`--background` em globals.css: 222.2 84% 4.9%). */
const DARK_PAGE: Rgb = hslToRgb({ h: 222.2, s: 84, l: 4.9 })
/** Textos sobre a cor primária, os mesmos tokens do shadcn nos dois temas. */
const FOREGROUND_DARK: Hsl = { h: 222.2, s: 47.4, l: 11.2 }
const FOREGROUND_LIGHT: Hsl = { h: 210, s: 40, l: 98 }
/**
 * Referência do tema claro: o texto claro do tema (um pouco menos que branco puro) é o pior caso de
 * texto sobre a cor primária, e a página é branca; vale a que tem MENOS contraste com a cor.
 */
const LIGHT_SURFACE: Rgb = hslToRgb(FOREGROUND_LIGHT)

/** `#rgb` ou `#rrggbb` (com ou sem `#`); `null` se não for uma cor. */
export function parseHex(value: string): Rgb | null {
  const hex = value.trim().replace(/^#/, '')
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((char) => char + char)
          .join('')
      : hex
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const lightness = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: lightness * 100 }

  const delta = max - min
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  let hue: number
  if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0)
  else if (max === green) hue = (blue - red) / delta + 2
  else hue = (red - green) / delta + 4

  return { h: (hue / 6) * 360, s: saturation * 100, l: lightness * 100 }
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const saturation = s / 100
  const lightness = l / 100
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1))
  const offset = lightness - chroma / 2
  const [r, g, b] =
    h < 60
      ? [chroma, x, 0]
      : h < 120
        ? [x, chroma, 0]
        : h < 180
          ? [0, chroma, x]
          : h < 240
            ? [0, x, chroma]
            : h < 300
              ? [x, 0, chroma]
              : [chroma, 0, x]

  return {
    r: Math.round((r + offset) * 255),
    g: Math.round((g + offset) * 255),
    b: Math.round((b + offset) * 255),
  }
}

function luminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const scaled = value / 255
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Razão de contraste WCAG entre duas cores (de 1 a 21). */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Formato dos tokens do Tailwind/shadcn: `h s% l%`. */
export function formatHsl({ h, s, l }: Hsl): string {
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`
}

/**
 * Ajusta só a luminosidade da cor até ela ler bem sobre TODAS as cores dadas (a página e o texto que
 * fica sobre ela): escurece sobre fundo claro e clareia sobre fundo escuro, olhando a primeira.
 * A cor que já tem contraste suficiente não muda.
 */
export function ensureContrast(color: Hsl, backgrounds: Rgb[], minimum = MIN_TEXT_CONTRAST): Hsl {
  const towardDark = luminance(backgrounds[0]!) > 0.5
  // Mede a cor JÁ arredondada, que é a que vai para a tela (o token guarda números inteiros).
  let adjusted = { h: Math.round(color.h), s: Math.round(color.s), l: Math.round(color.l) }
  for (let step = 0; step < 100; step += 1) {
    const rgb = hslToRgb(adjusted)
    if (backgrounds.every((background) => contrastRatio(rgb, background) >= minimum)) break
    adjusted = { ...adjusted, l: Math.min(100, Math.max(0, adjusted.l + (towardDark ? -1 : 1))) }
  }
  return adjusted
}

/** Texto (escuro ou claro) com mais contraste sobre a cor dada. */
function readableForeground(background: Hsl): Hsl {
  const rgb = hslToRgb(background)
  return contrastRatio(hslToRgb(FOREGROUND_DARK), rgb) >=
    contrastRatio(hslToRgb(FOREGROUND_LIGHT), rgb)
    ? FOREGROUND_DARK
    : FOREGROUND_LIGHT
}

export type PrimaryTokens = { primary: string; foreground: string }

/**
 * Cor primária e cor do texto sobre ela, para cada tema, a partir da cor da marca.
 * `null` quando a cor não é válida (o site fica com as cores padrão do tema).
 */
export function buildPrimaryTokens(
  hex: string,
): { light: PrimaryTokens; dark: PrimaryTokens } | null {
  const rgb = parseHex(hex)
  if (!rgb) return null
  const brand = rgbToHsl(rgb)

  // Tema claro: a cor escurece e o texto sobre ela é claro. Tema escuro: a cor clareia e o texto é
  // escuro. Em ambos a cor precisa ler bem sobre a página E combinar com o texto que fica sobre ela.
  const forTheme = (backgrounds: Rgb[]): PrimaryTokens => {
    const primary = ensureContrast(brand, backgrounds)
    return { primary: formatHsl(primary), foreground: formatHsl(readableForeground(primary)) }
  }

  return {
    light: forTheme([LIGHT_SURFACE]),
    dark: forTheme([DARK_PAGE, hslToRgb(FOREGROUND_DARK)]),
  }
}
