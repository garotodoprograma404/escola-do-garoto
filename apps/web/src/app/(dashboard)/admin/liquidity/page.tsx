import { Suspense } from 'react'
import { getLiquidityData } from '@/features/admin/finance/services/financeService'
import { LiquidityMetrics } from '@/features/admin/finance/components/LiquidityMetrics'
import { CashFlowChart } from '@/features/admin/finance/components/CashFlowChart.client'
import { ProjectionPanel } from '@/features/admin/finance/components/ProjectionPanel'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'

export const metadata = {
  title: 'Dashboard de Liquidez | Admin',
  description: 'Visualize fluxo de caixa e projeções financeiras',
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

async function LiquidityContent() {
  const liquidityData = await getLiquidityData()

  return (
    <div className="space-y-6">
      {/* Métricas de Liquidez */}
      <LiquidityMetrics data={liquidityData} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Gráficos de Fluxo de Caixa (2/3 da largura) */}
        <div className="lg:col-span-2">
          <CashFlowChart data={liquidityData} />
        </div>

        {/* Painel de Projeções (1/3 da largura) */}
        <div className="lg:col-span-1">
          <ProjectionPanel data={liquidityData} />
        </div>
      </div>
    </div>
  )
}

export default function LiquidityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Liquidez</h1>
        <p className="text-muted-foreground">
          Visualize fluxo de caixa, projeções e índices de liquidez
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <LiquidityContent />
      </Suspense>
    </div>
  )
}
