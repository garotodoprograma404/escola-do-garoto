import { CERTIFICATE_CODE_EXAMPLE, CERTIFICATE_CODE_FORMAT } from '@/shared/lib/brand'
import { Search, ShieldCheck, ShieldX } from 'lucide-react'
import { PublicLayout } from '@/shared/components/PublicLayout'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import {
  normalizeCertificateCode,
  verifyCertificateByCode,
  type CertificateVerificationStatus,
} from '@/features/public/certificate-verification'

export const metadata = {
  title: 'Verificar Certificado',
  description: 'Valide a autenticidade de certificados emitidos na plataforma',
}

interface VerifyCertificatePageProps {
  searchParams: Promise<{
    code?: string | string[]
  }>
}

function getFirstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]
  }
  return value
}

function formatDateLabel(value: string | null): string | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function getStatusMeta(status: CertificateVerificationStatus): {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  title: string
  description: string
} {
  if (status === 'valid') {
    return {
      label: 'Válido',
      variant: 'default',
      title: 'Certificado válido',
      description: 'O código informado corresponde a um certificado ativo na plataforma.',
    }
  }

  if (status === 'revoked') {
    return {
      label: 'Revogado',
      variant: 'destructive',
      title: 'Certificado revogado',
      description: 'Este certificado foi revogado e não deve ser considerado válido.',
    }
  }

  if (status === 'replaced') {
    return {
      label: 'Substituído',
      variant: 'secondary',
      title: 'Certificado substituído',
      description: 'Este certificado foi substituído por uma nova emissão.',
    }
  }

  if (status === 'invalid') {
    return {
      label: 'Inválido',
      variant: 'outline',
      title: 'Código inválido',
      description: 'Não foi possível validar o código informado.',
    }
  }

  return {
    label: 'Não encontrado',
    variant: 'outline',
    title: 'Certificado não encontrado',
    description: 'Não existe certificado emitido com este código na plataforma.',
  }
}

export default async function VerifyCertificatePage({ searchParams }: VerifyCertificatePageProps) {
  const params = await searchParams
  const rawCode = getFirstValue(params.code)
  const normalizedCode = normalizeCertificateCode(rawCode)
  const verification = await verifyCertificateByCode(normalizedCode)
  const statusMeta = verification ? getStatusMeta(verification.status) : null

  return (
    <PublicLayout>
      <main className="min-h-screen bg-slate-50 py-10 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              Verificação de certificado
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 sm:text-base">
              Informe o código do certificado para validar autenticidade, status e dados principais.
            </p>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <form
                action="/certificates/verify"
                method="get"
                className="flex flex-col gap-3 sm:flex-row"
              >
                <Input
                  name="code"
                  placeholder={`Ex.: ${CERTIFICATE_CODE_EXAMPLE}`}
                  defaultValue={normalizedCode || ''}
                  className="font-mono"
                />
                <Button type="submit" className="sm:w-auto">
                  <Search className="mr-2 h-4 w-4" />
                  Verificar
                </Button>
              </form>
            </CardContent>
          </Card>

          {!normalizedCode ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <ShieldCheck className="h-10 w-10 text-slate-600 dark:text-slate-400" />
                <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
                  Digite o código para consultar. O código costuma estar no formato{' '}
                  <span className="font-mono">{CERTIFICATE_CODE_FORMAT}</span>.
                </p>
              </CardContent>
            </Card>
          ) : !verification ? (
            <Card>
              <CardContent className="flex items-center gap-3 py-8">
                <ShieldX className="h-5 w-5 text-red-500" />
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Não foi possível validar o certificado neste momento. Tente novamente em
                  instantes.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{statusMeta?.title}</CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {statusMeta?.description}
                  </p>
                </div>
                <Badge variant={statusMeta?.variant}>{statusMeta?.label}</Badge>
              </CardHeader>

              <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Código
                  </p>
                  <p className="font-mono text-slate-900 dark:text-slate-100">
                    {verification.certificateCode || normalizedCode}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Curso
                  </p>
                  <p className="text-slate-900 dark:text-slate-100">
                    {verification.courseTitle || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Aluno
                  </p>
                  <p className="text-slate-900 dark:text-slate-100">
                    {verification.studentFullName || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Emitido em
                  </p>
                  <p className="text-slate-900 dark:text-slate-100">
                    {formatDateLabel(verification.issuedAt) || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Revogado em
                  </p>
                  <p className="text-slate-900 dark:text-slate-100">
                    {formatDateLabel(verification.revokedAt) || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Motivo da revogação
                  </p>
                  <p className="text-slate-900 dark:text-slate-100">
                    {verification.revokedReason || '-'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </PublicLayout>
  )
}
