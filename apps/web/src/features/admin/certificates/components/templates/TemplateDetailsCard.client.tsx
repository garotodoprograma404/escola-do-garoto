'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, CheckCircle2, FileText, Link2 } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Separator } from '@/shared/components/ui/separator'
import { useToast } from '@/shared/hooks/use-toast'
import {
  publishCertificateTemplateAction,
  unpublishCertificateTemplateAction,
  updateCertificateTemplateAction,
} from '../../actions/certificate-template-actions'
import { formatDateTime } from '@/shared/lib/format'
import { normalizeNullableText } from '@/shared/lib/format'
import { statusBadgeClass, statusLabel } from '../../lib/templateDisplay'
import type { AdminCertificateTemplate } from '../../services/certificateTemplateService'
import { TemplateFormFields, type TemplateDraft } from './TemplateFormFields'

function draftOf(template: AdminCertificateTemplate): TemplateDraft {
  return {
    name: template.name,
    description: template.description || '',
    orientation: template.orientation,
    pageSize: template.pageSize,
  }
}

function hasChanges(draft: TemplateDraft, template: AdminCertificateTemplate): boolean {
  return (
    normalizeNullableText(draft.name) !== normalizeNullableText(template.name) ||
    normalizeNullableText(draft.description) !== normalizeNullableText(template.description) ||
    draft.orientation !== template.orientation ||
    draft.pageSize.trim().toUpperCase() !== template.pageSize.trim().toUpperCase()
  )
}

/** Detalhes do modelo selecionado: edita os metadados, publica/despublica e abre o construtor. */
export function TemplateDetailsCard({ template }: { template: AdminCertificateTemplate | null }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [draft, setDraft] = useState<TemplateDraft | null>(template ? draftOf(template) : null)

  // Trocou de modelo ou os dados foram recarregados: o rascunho volta ao que está salvo.
  useEffect(() => {
    setDraft(template ? draftOf(template) : null)
  }, [template])

  const run = (
    action: () => Promise<{ success: boolean; error?: string }>,
    messages: { errorTitle: string; successTitle: string; successDescription: string },
  ) => {
    startTransition(async () => {
      const result = await action()

      if (!result.success) {
        toast({ title: messages.errorTitle, description: result.error, variant: 'destructive' })
        return
      }

      toast({ title: messages.successTitle, description: messages.successDescription })
      router.refresh()
    })
  }

  const unsaved = template && draft ? hasChanges(draft, template) : false
  const canSave =
    draft !== null &&
    normalizeNullableText(draft.name).length >= 3 &&
    draft.pageSize.trim().length > 0

  return (
    <Card className="border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900/85">
      <CardHeader>
        <CardTitle>Detalhes do template</CardTitle>
        <CardDescription>Edite metadados e controle o status de publicação.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {!template || !draft ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
            Selecione um template na lista para visualizar os detalhes.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {template.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Criado em {formatDateTime(template.createdAt)}
                  </p>
                </div>

                <Badge variant="outline" className={statusBadgeClass(template.status)}>
                  {statusLabel(template.status)}
                </Badge>
              </div>

              <div className="mt-4 grid gap-2 text-xs text-slate-600 dark:text-slate-400">
                <p className="inline-flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  Versão mais recente: v{template.latestVersionNumber || 0}
                </p>
                <p className="inline-flex items-center gap-1">
                  <Link2 className="h-3.5 w-3.5" />
                  Vínculos ativos com cursos: {template.activeCourseLinks}
                </p>
                <p className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Publicado em: {formatDateTime(template.publishedAt)}
                </p>
              </div>
            </div>

            <TemplateFormFields
              idPrefix="template"
              draft={draft}
              onChange={(patch) => setDraft({ ...draft, ...patch })}
              nameLabel="Nome do template"
              namePlaceholder="Ex: Certificado padrão"
              descriptionLabel="Descrição (interna)"
              descriptionPlaceholder="Informações internas sobre objetivo e contexto deste template."
              showDescriptionCounter
            />

            <Separator />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <p className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Atualizado em {formatDateTime(template.updatedAt)}
                </p>
                {template.status === 'published' ? (
                  <p className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Template atualmente publicado
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline">
                  <Link href={`/admin/certificates/${template.id}/builder`}>Abrir builder</Link>
                </Button>

                {template.status === 'published' ? (
                  <Button
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      run(() => unpublishCertificateTemplateAction({ templateId: template.id }), {
                        errorTitle: 'Erro ao despublicar template',
                        successTitle: 'Template despublicado',
                        successDescription: 'Template voltou para status de rascunho.',
                      })
                    }
                  >
                    Despublicar
                  </Button>
                ) : (
                  <Button
                    disabled={isPending}
                    onClick={() =>
                      run(() => publishCertificateTemplateAction({ templateId: template.id }), {
                        errorTitle: 'Erro ao publicar template',
                        successTitle: 'Template publicado',
                        successDescription: 'Template disponível para vínculos de curso.',
                      })
                    }
                  >
                    Publicar template
                  </Button>
                )}

                <Button
                  disabled={isPending || !unsaved || !canSave}
                  className="min-w-[190px]"
                  onClick={() =>
                    run(
                      () => updateCertificateTemplateAction({ templateId: template.id, ...draft }),
                      {
                        errorTitle: 'Erro ao atualizar template',
                        successTitle: 'Template atualizado',
                        successDescription: 'Os metadados do template foram salvos com sucesso.',
                      },
                    )
                  }
                >
                  {isPending ? 'Salvando...' : 'Salvar metadados'}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
