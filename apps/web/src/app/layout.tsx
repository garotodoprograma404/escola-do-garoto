import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/shared/components/theme-provider'
import { CartProvider } from '@/shared/context/CartContext'
import { Toaster } from '@/shared/components/ui/toaster'
import { DemoBanner } from '@/shared/components/DemoBanner'
import { getBrandingSettings } from '@/features/admin/settings/actions/branding-actions'
import { getPublicGeneralSettings } from '@/features/admin/settings/actions/general-actions'
import { buildPrimaryTokens, formatHsl, parseHex, rgbToHsl } from '@/shared/lib/color'

const inter = Inter({ subsets: ['latin'] })

export async function generateMetadata(): Promise<Metadata> {
  const [generalSettings, brandingSettings] = await Promise.all([
    getPublicGeneralSettings(),
    getBrandingSettings(),
  ])

  return {
    title: {
      default: `${generalSettings.platformName} - Plataforma de Educação Online`,
      template: `%s - ${generalSettings.platformName}`,
    },
    description: generalSettings.platformDescription,
    applicationName: generalSettings.platformName,
    icons: brandingSettings.faviconUrl
      ? {
          icon: [{ url: brandingSettings.faviconUrl }],
          shortcut: [{ url: brandingSettings.faviconUrl }],
          apple: [{ url: brandingSettings.faviconUrl }],
        }
      : undefined,
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [branding, generalSettings] = await Promise.all([
    getBrandingSettings(),
    getPublicGeneralSettings(),
  ])

  // A cor da marca vira o primário do site. No tema claro ela é escurecida até ler bem sobre branco
  // e o texto sobre o botão é preto ou branco conforme o contraste (shared/lib/color.ts).
  const tokens = buildPrimaryTokens(branding.primaryColor)
  const primaryRgb = parseHex(branding.primaryColor)
  const secondaryRgb = parseHex(branding.secondaryColor)
  const primaryHSL = primaryRgb ? formatHsl(rgbToHsl(primaryRgb)) : null
  const secondaryHSL = secondaryRgb ? formatHsl(rgbToHsl(secondaryRgb)) : null

  // `--brand-*` fica com a cor exata da marca (usada em fundos, com texto escolhido no próprio lugar).
  const brandVars =
    primaryHSL && secondaryHSL
      ? [50, 100, 200, 300, 400, 500, 700, 800, 900, 950]
          .map((step) => `--brand-${step}: ${primaryHSL} !important;`)
          .join(' ') + ` --brand-600: ${secondaryHSL} !important;`
      : ''
  const themeVars = (theme: 'light' | 'dark') =>
    tokens
      ? `--primary: ${tokens[theme].primary} !important; --primary-foreground: ${tokens[theme].foreground} !important;`
      : ''

  return (
    <html lang={generalSettings.language} suppressHydrationWarning>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `:root { ${themeVars('light')} ${brandVars} } .dark { ${themeVars('dark')} ${brandVars} }`,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <CartProvider>
            <DemoBanner />
            {children}
            <Toaster />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
