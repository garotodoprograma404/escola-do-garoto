import { redirect } from 'next/navigation'
import { AlertCircle, CheckCircle2, Clock3, MousePointerClick } from 'lucide-react'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import { getAffiliateDashboardData } from '@/features/affiliate/services/affiliate-dashboard-service'
import { getAffiliateFinancials } from '@/features/affiliate/services/affiliate-financial-service'
import { AffiliateLinksManager } from '@/features/affiliate/components/AffiliateLinksManager.client'
import { AffiliateOverviewStats } from '@/features/affiliate/components/AffiliateOverviewStats'
import {
  BalanceCards,
  TransactionFilters,
  TransactionTable,
  WithdrawalButton,
} from '@/features/producer/financials'
import type { DateRangeFilter, TransactionFilter } from '@/features/producer/financials'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { formatCurrency, formatPercentage } from '@/shared/lib/utils'

export const metadata = {
  title: 'Dashboard do Afiliado',
  description: 'Links, campanhas, comissões e conversão do afiliado',
}

const TRANSACTION_FILTER_VALUES: TransactionFilter[] = [
  'all',
  'sale',
  'withdrawal',
  'refund',
  'commission',
]
const DATE_RANGE_FILTER_VALUES: DateRangeFilter[] = ['7d', '30d', '90d', 'all']

interface PageProps {
  searchParams: Promise<{
    type?: string
    range?: string
  }>
}

export default async function AffiliateDashboardPage({ searchParams }: PageProps) {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }

  if (!authContext.roles.includes('affiliate')) {
    redirect('/')
  }

  const params = await searchParams
  const transactionType = TRANSACTION_FILTER_VALUES.includes(params.type as TransactionFilter)
    ? (params.type as TransactionFilter)
    : 'all'
  const dateRange = DATE_RANGE_FILTER_VALUES.includes(params.range as DateRangeFilter)
    ? (params.range as DateRangeFilter)
    : '30d'

  const [financials, dashboardData] = await Promise.all([
    getAffiliateFinancials(dateRange, transactionType),
    getAffiliateDashboardData(),
  ])
  const shouldShowFilters =
    financials.transactions.length > 0 || transactionType !== 'all' || dateRange !== '30d'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operação do Afiliado</h1>
          <p className="text-muted-foreground">
            Gere links, acompanhe campanhas e monitore o financeiro do programa de afiliados.
          </p>
        </div>
        <WithdrawalButton
          availableBalance={financials.balance.available}
          accountScope="affiliate"
          revalidatePath="/affiliate"
        />
      </div>

      <BalanceCards balance={financials.balance} />
      <AffiliateOverviewStats summary={dashboardData.summary} />

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Saldo pendente segue bloqueado</AlertTitle>
        <AlertDescription>
          As comissões entram como pendentes até a etapa de liberação após a janela de reembolso.
          Enquanto isso, somente valores já concluídos ficam elegíveis para saque.
        </AlertDescription>
      </Alert>

      {financials.pending_withdrawals > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Saques pendentes</AlertTitle>
          <AlertDescription>
            Você tem {financials.pending_withdrawals} solicitação(ões) de saque em processamento.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4" />
              Parcerias aprovadas
            </CardTitle>
            <CardDescription>
              Cursos que já podem receber campanhas e links próprios.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardData.approvedPartnerships.length > 0 ? (
              dashboardData.approvedPartnerships.slice(0, 4).map((partnership) => (
                <div key={partnership.id} className="rounded-lg border p-3">
                  <p className="font-medium">{partnership.courseTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    Comissão {partnership.commissionRate}% · Janela {partnership.cookieWindowDays}{' '}
                    dias
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Nenhuma parceria aprovada ainda.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MousePointerClick className="h-4 w-4" />
              Conversão consolidada
            </CardTitle>
            <CardDescription>
              Indicadores reais baseados em cliques rastreados e comissões geradas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Cliques rastreados</span>
              <span className="font-semibold">{dashboardData.summary.totalClicks}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Conversões brutas</span>
              <span className="font-semibold">{dashboardData.summary.totalConversions}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Conversões líquidas</span>
              <span className="font-semibold">{dashboardData.summary.totalNetConversions}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Taxa bruta</span>
              <span className="font-semibold">
                {formatPercentage(dashboardData.summary.conversionRate)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Taxa líquida</span>
              <span className="font-semibold">
                {formatPercentage(dashboardData.summary.netConversionRate)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Receita atribuída</span>
              <span className="font-semibold">
                {formatCurrency(dashboardData.summary.attributedRevenue)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="h-4 w-4" />
              Situação das comissões
            </CardTitle>
            <CardDescription>
              Visão rápida do que ainda está bloqueado e do que já virou saldo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Pendente</span>
              <span className="font-semibold">
                {formatCurrency(dashboardData.summary.pendingCommission)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Disponível</span>
              <span className="font-semibold">
                {formatCurrency(dashboardData.summary.availableCommission)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Total histórico</span>
              <span className="font-semibold">
                {formatCurrency(dashboardData.summary.totalCommission)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="operacao" className="space-y-4">
        <TabsList>
          <TabsTrigger value="operacao">Operação</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="operacao">
          <Card>
            <CardHeader>
              <CardTitle>Links e campanhas</CardTitle>
              <CardDescription>
                Crie links por curso, organize campanhas e acompanhe performance por código de
                atribuição.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AffiliateLinksManager
                summary={dashboardData.summary}
                partnerships={dashboardData.approvedPartnerships}
                links={dashboardData.links}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro">
          <Card>
            <CardHeader>
              <CardTitle>Extrato de comissões e saques</CardTitle>
              <CardDescription>
                Veja comissões geradas, estornadas e saques solicitados no programa de afiliados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {shouldShowFilters && <TransactionFilters basePath="/affiliate" />}
              {financials.transactions.length > 0 ? (
                <TransactionTable transactions={financials.transactions} />
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma movimentação financeira de afiliado registrada até o momento.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
