'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { useToast } from '@/shared/hooks/use-toast'
import { AffiliateApplicationsTable } from './AffiliateApplicationsTable'
import { AffiliateApplicationReviewDialog } from './AffiliateApplicationReviewDialog.client'
import { AffiliateOverviewTable } from './AffiliateOverviewTable'
import { AffiliatePartnershipTable } from './AffiliatePartnershipTable'
import { AffiliateSalesAuditTable } from './AffiliateSalesAuditTable'
import {
  AffiliatePartnershipFormDialog,
  type AffiliatePartnershipFormValues,
} from './AffiliatePartnershipFormDialog.client'
import { AffiliateStats } from './AffiliateStats'
import {
  reviewAffiliatePartnershipAction,
  upsertAffiliatePartnershipAction,
} from '../actions/affiliate-partnership-actions'
import { reviewAffiliateApplicationAction } from '../actions/affiliate-application-actions'
import type {
  AffiliateAdminDashboardData,
  AffiliateApplicationListItem,
  AffiliatePartnershipListItem,
} from '../types'

interface AffiliatesManagementProps {
  initialData: AffiliateAdminDashboardData
}

export function AffiliatesManagement({ initialData }: AffiliatesManagementProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [editingPartnership, setEditingPartnership] = useState<AffiliatePartnershipListItem | null>(
    null,
  )
  const [partnershipPrefill, setPartnershipPrefill] =
    useState<Partial<AffiliatePartnershipFormValues> | null>(null)
  const [reviewingApplication, setReviewingApplication] =
    useState<AffiliateApplicationListItem | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const searchTerm = search.trim().toLowerCase()

  const filteredAffiliates = useMemo(() => {
    if (!searchTerm) {
      return initialData.affiliates
    }

    return initialData.affiliates.filter((affiliate) => {
      return (
        affiliate.name.toLowerCase().includes(searchTerm) ||
        affiliate.email.toLowerCase().includes(searchTerm)
      )
    })
  }, [initialData.affiliates, searchTerm])

  const filteredApplications = useMemo(() => {
    if (!searchTerm) {
      return initialData.applications
    }

    return initialData.applications.filter((application) => {
      return (
        application.fullName.toLowerCase().includes(searchTerm) ||
        application.email.toLowerCase().includes(searchTerm) ||
        application.phone.toLowerCase().includes(searchTerm) ||
        application.status.toLowerCase().includes(searchTerm)
      )
    })
  }, [initialData.applications, searchTerm])

  const filteredPartnerships = useMemo(() => {
    if (!searchTerm) {
      return initialData.partnerships
    }

    return initialData.partnerships.filter((partnership) => {
      return (
        partnership.affiliateName.toLowerCase().includes(searchTerm) ||
        partnership.affiliateEmail.toLowerCase().includes(searchTerm) ||
        partnership.courseTitle.toLowerCase().includes(searchTerm) ||
        partnership.producerName.toLowerCase().includes(searchTerm)
      )
    })
  }, [initialData.partnerships, searchTerm])

  const filteredSalesAudit = useMemo(() => {
    if (!searchTerm) {
      return initialData.salesAudit
    }

    return initialData.salesAudit.filter((row) => {
      return (
        row.affiliateName.toLowerCase().includes(searchTerm) ||
        row.courseTitle.toLowerCase().includes(searchTerm) ||
        row.orderPublicId.toLowerCase().includes(searchTerm) ||
        (row.affiliateLinkCode || '').toLowerCase().includes(searchTerm)
      )
    })
  }, [initialData.salesAudit, searchTerm])

  const handleSubmitPartnership = async (values: AffiliatePartnershipFormValues) => {
    setFormError(null)
    startTransition(() => {
      void (async () => {
        const result = await upsertAffiliatePartnershipAction({
          partnershipId: editingPartnership?.id,
          affiliateId: values.affiliateId,
          courseId: values.courseId,
          commissionRate: values.commissionRate,
          cookieWindowDays: values.cookieWindowDays,
          notes: values.notes,
          status: values.status,
          rejectionReason: values.rejectionReason,
        })

        if (!result.success) {
          setFormError(result.error || 'Não foi possível salvar a parceria')
          return
        }

        setIsCreateOpen(false)
        setEditingPartnership(null)
        setPartnershipPrefill(null)
        toast({
          title: 'Parceria salva',
          description: 'Os dados da parceria foram atualizados com sucesso.',
        })
        router.refresh()
      })()
    })
  }

  const handleReviewPartnership = (
    partnership: AffiliatePartnershipListItem,
    status: 'approved' | 'rejected' | 'revoked',
  ) => {
    startTransition(() => {
      void (async () => {
        const result = await reviewAffiliatePartnershipAction({
          partnershipId: partnership.id,
          status,
          rejectionReason:
            status === 'rejected'
              ? partnership.rejectionReason || 'Revisão administrativa'
              : undefined,
        })

        if (!result.success) {
          toast({
            title: 'Erro ao revisar parceria',
            description: result.error || 'Não foi possível atualizar o status.',
            variant: 'destructive',
          })
          return
        }

        toast({
          title: 'Status atualizado',
          description: `Parceria marcada como ${status}.`,
        })
        router.refresh()
      })()
    })
  }

  const handleSubmitApplicationReview = (input: {
    applicationId: string
    status: AffiliateApplicationListItem['status']
    rejectionReason?: string
    notes?: string
    partnershipCourseId?: string
    partnershipCommissionRate?: number
    partnershipCookieWindowDays?: number
    partnershipNotes?: string
  }) => {
    const reviewedApplication = reviewingApplication

    startTransition(() => {
      void (async () => {
        const result = await reviewAffiliateApplicationAction(input)

        if (!result.success) {
          toast({
            title: 'Erro ao revisar candidatura',
            description: result.error || 'Não foi possível revisar a candidatura.',
            variant: 'destructive',
          })
          return
        }

        setReviewingApplication(null)

        const shouldOpenInitialPartnership =
          input.status === 'approved' &&
          !input.partnershipCourseId &&
          reviewedApplication &&
          reviewedApplication.approvedPartnershipCount === 0

        if (shouldOpenInitialPartnership) {
          setFormError(null)
          setEditingPartnership(null)
          setPartnershipPrefill({
            affiliateId: reviewedApplication.userId,
            commissionRate: 20,
            cookieWindowDays: 30,
            status: 'approved',
            notes: `Primeira parceria criada apos aprovacao da candidatura de ${reviewedApplication.fullName}.`,
          })
          setIsCreateOpen(true)
        }

        toast({
          title: 'Candidatura atualizada',
          description: shouldOpenInitialPartnership
            ? 'A candidatura foi aprovada. Agora configure a primeira parceria para liberar a operação comercial.'
            : input.status === 'approved' && input.partnershipCourseId
              ? 'A candidatura foi aprovada e a parceria inicial foi configurada.'
              : 'O status da candidatura foi salvo com sucesso.',
        })
        router.refresh()
      })()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Operação de Afiliados
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Administra afiliados, parcerias por curso e a trilha de vendas comissionadas.
          </p>
        </div>
        <Button
          onClick={() => {
            setFormError(null)
            setEditingPartnership(null)
            setIsCreateOpen(true)
          }}
          disabled={isPending}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova parceria
        </Button>
      </div>

      <AffiliateStats stats={initialData.stats} />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Buscar afiliado, curso, produtor ou pedido"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Candidaturas do programa</h2>
          <p className="text-sm text-muted-foreground">
            Controla a entrada operacional do afiliado antes da concessao da role e das parcerias
            por curso.
          </p>
        </div>
        <AffiliateApplicationsTable
          applications={filteredApplications}
          onReview={(application) => setReviewingApplication(application)}
          onCreatePartnership={(application) => {
            setFormError(null)
            setEditingPartnership(null)
            setPartnershipPrefill({
              affiliateId: application.userId,
              commissionRate: 20,
              cookieWindowDays: 30,
              status: 'approved',
              notes: `Parceria inicial criada a partir da candidatura de ${application.fullName}.`,
            })
            setIsCreateOpen(true)
          }}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Base de afiliados</h2>
          <p className="text-sm text-muted-foreground">
            Consolida performance, comissões pendentes e saldo disponível por afiliado.
          </p>
        </div>
        <AffiliateOverviewTable affiliates={filteredAffiliates} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Parcerias por curso</h2>
          <p className="text-sm text-muted-foreground">
            Admin revisa, aprova, rejeita ou revoga a elegibilidade comercial do afiliado por curso.
          </p>
        </div>
        <AffiliatePartnershipTable
          partnerships={filteredPartnerships}
          onEdit={(partnership) => {
            setFormError(null)
            setEditingPartnership(partnership)
            setPartnershipPrefill(null)
            setIsCreateOpen(true)
          }}
          onReview={handleReviewPartnership}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Auditoria de vendas</h2>
          <p className="text-sm text-muted-foreground">
            Mostra pedido, curso, afiliado e link de atribuição usando as `affiliate_commission`
            geradas no checkout.
          </p>
        </div>
        <AffiliateSalesAuditTable rows={filteredSalesAudit} />
      </section>

      <AffiliatePartnershipFormDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) {
            setEditingPartnership(null)
            setPartnershipPrefill(null)
            setFormError(null)
          }
        }}
        initialPartnership={editingPartnership}
        prefillValues={partnershipPrefill}
        affiliateOptions={initialData.affiliateOptions}
        courseOptions={initialData.courseOptions}
        isSubmitting={isPending}
        error={formError}
        onSubmit={handleSubmitPartnership}
      />

      <AffiliateApplicationReviewDialog
        application={reviewingApplication}
        open={Boolean(reviewingApplication)}
        onOpenChange={(open) => {
          if (!open) {
            setReviewingApplication(null)
          }
        }}
        isSubmitting={isPending}
        courseOptions={initialData.courseOptions}
        onSubmit={handleSubmitApplicationReview}
      />
    </div>
  )
}
