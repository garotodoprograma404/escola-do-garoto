import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Award, Download, ShieldCheck } from 'lucide-react'
import { getStudentCertificates } from '@/features/student/certificates'
import type { StudentCertificate } from '@/features/student/certificates'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'

export const metadata = {
  title: 'Meus Certificados',
  description: 'Visualize e baixe seus certificados emitidos',
}

function getStatusLabel(status: StudentCertificate['status']): string {
  if (status === 'active') return 'Ativo'
  if (status === 'revoked') return 'Revogado'
  if (status === 'replaced') return 'Substituído'
  return 'Falha de emissão'
}

function getStatusVariant(
  status: StudentCertificate['status'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'active') return 'default'
  if (status === 'revoked') return 'destructive'
  if (status === 'replaced') return 'secondary'
  return 'outline'
}

function getIssueModeLabel(mode: StudentCertificate['issueMode']): string {
  if (mode === 'automatic') return 'Automática'
  if (mode === 'manual') return 'Manual'
  return 'Reemissão'
}

export default async function StudentCertificatesPage() {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }

  const certificates = await getStudentCertificates(authContext.userId)

  return (
    <div className="mx-auto max-w-7xl space-y-6 py-2 sm:space-y-8 sm:py-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
          <Award className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Meus Certificados
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 sm:text-base">
            Consulte seus certificados emitidos e baixe o PDF oficial.
          </p>
        </div>
      </div>

      {certificates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <ShieldCheck className="h-10 w-10 text-slate-600 dark:text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Nenhum certificado emitido ainda
            </h2>
            <p className="max-w-xl text-sm text-slate-600 dark:text-slate-400">
              Assim que você concluir cursos com certificado habilitado, seus documentos aparecerão
              aqui.
            </p>
            <Button asChild variant="outline">
              <Link href="/student/courses">Ir para meus cursos</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {certificates.map((certificate) => (
            <Card key={certificate.id}>
              <CardHeader className="gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base sm:text-lg">{certificate.courseTitle}</CardTitle>
                  <p className="font-mono text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                    {certificate.code}
                  </p>
                </div>
                <Badge variant={getStatusVariant(certificate.status)}>
                  {getStatusLabel(certificate.status)}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      Emissão
                    </p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {certificate.issuedAtLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      Modo
                    </p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {getIssueModeLabel(certificate.issueMode)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      Carga horária
                    </p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {certificate.workloadLabel || 'Não informada'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {certificate.downloadUrl ? (
                    <Button asChild size="sm">
                      {/* <a> e não <Link>: é uma rota da API (confere o dono e redireciona para o PDF), sem prefetch. */}
                      <a href={certificate.downloadUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        Baixar PDF
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" disabled>
                      <Download className="mr-2 h-4 w-4" />
                      Arquivo indisponível
                    </Button>
                  )}

                  {certificate.courseSlug ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/student/courses/${certificate.courseSlug}`}>Abrir curso</Link>
                    </Button>
                  ) : null}

                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/certificates/verify?code=${encodeURIComponent(certificate.code)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Validar
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
