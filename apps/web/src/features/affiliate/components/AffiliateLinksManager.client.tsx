'use client'

import { useMemo, useState, useTransition } from 'react'
import { Copy, Link2, Pencil, Plus, Power, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { useToast } from '@/shared/hooks/use-toast'
import { formatCurrency, formatDate, formatPercentage } from '@/shared/lib/utils'
import {
  toggleAffiliateLinkStatusAction,
  upsertAffiliateLinkAction,
} from '../actions/affiliate-link-actions'
import type {
  AffiliateApprovedPartnershipOption,
  AffiliateDashboardSummary,
  AffiliateLinkListItem,
} from '../types'
import {
  AffiliateLinkFormDialog,
  type AffiliateLinkFormValues,
} from './AffiliateLinkFormDialog.client'

interface AffiliateLinksManagerProps {
  summary: AffiliateDashboardSummary
  partnerships: AffiliateApprovedPartnershipOption[]
  links: AffiliateLinkListItem[]
}

export function AffiliateLinksManager({
  summary,
  partnerships,
  links,
}: AffiliateLinksManagerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<AffiliateLinkListItem | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const searchTerm = search.trim().toLowerCase()

  const filteredLinks = useMemo(() => {
    if (!searchTerm) {
      return links
    }

    return links.filter((link) => {
      return [
        link.campaignName,
        link.trafficSource,
        link.courseTitle,
        link.code,
        link.destinationPath,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchTerm))
    })
  }, [links, searchTerm])

  const handleSaveLink = async (values: AffiliateLinkFormValues) => {
    setFormError(null)

    startTransition(() => {
      void (async () => {
        const result = await upsertAffiliateLinkAction({
          linkId: editingLink?.id,
          partnershipId: values.partnershipId,
          campaignName: values.campaignName,
          trafficSource: values.trafficSource,
          destinationPath: values.destinationPath,
          notes: values.notes,
          isActive: values.isActive,
        })

        if (!result.success) {
          setFormError(result.error || 'Não foi possível salvar o link')
          return
        }

        setDialogOpen(false)
        setEditingLink(null)
        toast({
          title: 'Link salvo',
          description: 'A campanha foi atualizada com sucesso.',
        })
        router.refresh()
      })()
    })
  }

  const handleToggleStatus = (link: AffiliateLinkListItem) => {
    startTransition(() => {
      void (async () => {
        const result = await toggleAffiliateLinkStatusAction({
          linkId: link.id,
          isActive: !link.isActive,
        })

        if (!result.success) {
          toast({
            title: 'Erro ao atualizar link',
            description: result.error || 'Não foi possível mudar o status do link.',
            variant: 'destructive',
          })
          return
        }

        toast({
          title: link.isActive ? 'Link pausado' : 'Link reativado',
          description: 'O status operacional foi atualizado.',
        })
        router.refresh()
      })()
    })
  }

  const handleCopyLink = async (link: AffiliateLinkListItem) => {
    try {
      await navigator.clipboard.writeText(link.shareUrl)
      toast({
        title: 'Link copiado',
        description: 'URL da campanha enviada para a área de transferência.',
      })
    } catch {
      toast({
        title: 'Não foi possível copiar',
        description: 'Copie manualmente a URL exibida na tabela.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-background p-2 shadow-sm">
              <Link2 className="h-5 w-5 text-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Operação de links e campanhas</p>
              <p className="text-sm text-muted-foreground">
                Cada link usa `aff=&lt;código&gt;`, respeita o modelo de último clique e separa
                conversão bruta da conversão líquida após estornos.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4 text-sm">
          <p className="font-medium">Resumo rápido</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-muted-foreground">
            <div>
              <p className="text-xs uppercase tracking-wide">Conversões brutas</p>
              <p className="text-base font-semibold text-foreground">{summary.totalConversions}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide">Conversões líquidas</p>
              <p className="text-base font-semibold text-foreground">
                {summary.totalNetConversions}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide">Comissão pendente</p>
              <p className="text-base font-semibold text-foreground">
                {formatCurrency(summary.pendingCommission)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide">Conversão líquida</p>
              <p className="text-base font-semibold text-foreground">
                {formatPercentage(summary.netConversionRate)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar campanha, origem, curso ou código"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <Button
          onClick={() => {
            setFormError(null)
            setEditingLink(null)
            setDialogOpen(true)
          }}
          disabled={isPending || partnerships.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo link
        </Button>
      </div>

      {partnerships.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Você ainda não tem parcerias aprovadas para gerar links. Quando o admin liberar um curso,
          ele aparece aqui automaticamente.
        </div>
      ) : filteredLinks.length > 0 ? (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campanha</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Cliques</TableHead>
                <TableHead>Conversões</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última atividade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLinks.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {link.campaignName || `Campanha ${link.code}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Código: <span className="font-mono">{link.code}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{link.shareUrl}</div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <div className="font-medium">{link.courseTitle}</div>
                      <div className="text-xs text-muted-foreground">
                        Comissão {link.commissionRate}% · Janela {link.cookieWindowDays} dias
                      </div>
                      {link.trafficSource ? (
                        <div className="text-xs text-muted-foreground">
                          Origem: {link.trafficSource}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{link.clicks}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{link.conversions}</div>
                      <div className="text-xs text-muted-foreground">
                        Bruta {formatPercentage(link.conversionRate)} · Líquida{' '}
                        {formatPercentage(link.netConversionRate)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {formatCurrency(link.pendingCommission + link.releasedCommission)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Receita: {formatCurrency(link.attributedRevenue)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={link.isActive ? 'default' : 'secondary'}>
                      {link.isActive ? 'Ativo' : 'Pausado'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div>
                        {link.lastClickAt
                          ? `Clique: ${formatDate(link.lastClickAt)}`
                          : 'Sem cliques'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {link.lastConversionAt
                          ? `Conversão: ${formatDate(link.lastConversionAt)}`
                          : 'Sem conversões'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => void handleCopyLink(link)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormError(null)
                          setEditingLink(link)
                          setDialogOpen(true)
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleToggleStatus(link)}>
                        <Power className="mr-2 h-4 w-4" />
                        {link.isActive ? 'Pausar' : 'Ativar'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum link encontrado para o filtro atual.
        </div>
      )}

      <AffiliateLinkFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingLink(null)
            setFormError(null)
          }
        }}
        partnerships={partnerships}
        initialLink={editingLink}
        isSubmitting={isPending}
        error={formError}
        onSubmit={handleSaveLink}
      />
    </div>
  )
}
