// =====================================================
// PUBLIC FOOTER - SERVER COMPONENT
// =====================================================

import Link from 'next/link'
import { BookOpen, Mail, Phone, MapPin } from 'lucide-react'
import type {
  GeneralSettings as GeneralSettingsType,
  LegalSettings as LegalSettingsType,
} from '@/features/admin/settings/types'

interface PublicFooterProps {
  settings: GeneralSettingsType
  legalSettings: LegalSettingsType
  logoUrl?: string
}

export function PublicFooter({ settings, legalSettings, logoUrl }: PublicFooterProps) {
  const currentYear = new Date().getFullYear()
  const normalizedLogoUrl = logoUrl?.trim() || ''
  const hasLogo = normalizedLogoUrl.length > 0
  const companyName = legalSettings.companyName.trim() || settings.platformName
  const companyDocument = legalSettings.companyDocument.trim()

  return (
    <footer className="relative overflow-hidden border-t border-slate-200 bg-white py-16 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
      {/* Decorative line */}
      <div className="absolute left-1/2 top-0 h-px w-full max-w-4xl -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 md:grid-cols-4 md:px-8">
        {/* Brand Column */}
        <div className="col-span-1 md:col-span-1">
          <div className="mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={normalizedLogoUrl}
                alt={`Logo ${settings.platformName}`}
                className="h-10 w-auto max-w-[11rem] object-contain"
              />
            ) : (
              <>
                <div className="rounded-lg bg-primary p-1.5 text-primary-foreground">
                  <BookOpen className="h-5 w-5" />
                </div>
                <span className="text-xl font-bold">{settings.platformName}</span>
              </>
            )}
          </div>
          <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {settings.platformDescription}
          </p>
        </div>

        {/* Institucional Column */}
        <div>
          <h4 className="mb-6 text-lg font-bold text-slate-900 dark:text-white">Institucional</h4>
          <ul className="space-y-4 text-sm">
            <li>
              <Link
                href="/trabalhe-conosco"
                className="flex items-center gap-2 text-slate-600 transition-colors hover:text-primary dark:text-slate-300"
              >
                <div className="h-1 w-1 rounded-full bg-primary"></div>
                Trabalhe Conosco
              </Link>
            </li>
            <li>
              <Link
                href="/afiliados"
                className="flex items-center gap-2 text-slate-600 transition-colors hover:text-primary dark:text-slate-300"
              >
                <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                Programa de Afiliados
              </Link>
            </li>
            <li>
              <Link
                href="/become-producer"
                className="flex items-center gap-2 text-slate-600 transition-colors hover:text-primary dark:text-slate-300"
              >
                <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                Seja um Produtor
              </Link>
            </li>
            <li>
              <Link
                href="/central-de-suporte"
                className="flex items-center gap-2 text-slate-600 transition-colors hover:text-primary dark:text-slate-300"
              >
                <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                Central de Suporte
              </Link>
            </li>
            <li>
              <Link
                href={legalSettings.refundPolicyUrl}
                className="flex items-center gap-2 text-slate-600 transition-colors hover:text-primary dark:text-slate-300"
              >
                <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                Política de Reembolso
              </Link>
            </li>
          </ul>
        </div>

        {/* Ajuda Column */}
        <div>
          <h4 className="mb-6 text-lg font-bold text-slate-900 dark:text-white">Ajuda</h4>
          <ul className="space-y-4 text-sm">
            <li>
              <Link
                href="/central-de-suporte"
                className="flex items-center gap-2 text-slate-600 transition-colors hover:text-primary dark:text-slate-300"
              >
                <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                Central de Suporte
              </Link>
            </li>
            <li>
              <Link
                href={legalSettings.termsOfServiceUrl}
                className="flex items-center gap-2 text-slate-600 transition-colors hover:text-primary dark:text-slate-300"
              >
                <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                Termos de Uso
              </Link>
            </li>
            <li>
              <Link
                href={legalSettings.privacyPolicyUrl}
                className="flex items-center gap-2 text-slate-600 transition-colors hover:text-primary dark:text-slate-300"
              >
                <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                Política de Privacidade
              </Link>
            </li>
            <li>
              <Link
                href={legalSettings.refundPolicyUrl}
                className="flex items-center gap-2 text-slate-600 transition-colors hover:text-primary dark:text-slate-300"
              >
                <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                Reembolsos
              </Link>
            </li>
          </ul>
        </div>

        {/* Contato Column */}
        <div>
          <h4 className="mb-6 text-lg font-bold text-slate-900 dark:text-white">Contato</h4>
          <ul className="space-y-4 text-sm">
            <li className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2 dark:bg-white/5">
                <Mail size={16} className="text-primary" />
              </div>
              {settings.supportEmail}
            </li>
            <li className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2 dark:bg-white/5">
                <Phone size={16} className="text-primary" />
              </div>
              {settings.supportPhone.trim() || '-'}
            </li>
            <li className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2 dark:bg-white/5">
                <MapPin size={16} className="text-primary" />
              </div>
              {legalSettings.companyAddress}
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="mx-auto mt-16 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-slate-200 px-4 pt-8 text-center text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400 md:flex-row md:px-8">
        <div className="space-y-1">
          <p>
            &copy; {currentYear} {companyName}. Todos os direitos reservados.
          </p>
          {companyDocument ? <p>CNPJ: {companyDocument}</p> : null}
        </div>
        <div className="flex gap-4">
          <span>
            {settings.language} • {settings.timezone} • {settings.currency}
          </span>
        </div>
      </div>
    </footer>
  )
}
