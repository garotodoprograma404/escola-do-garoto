import type { ReactNode } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'

interface SummaryCardProps {
  title: string
  value: number
  icon: ReactNode
  caption: string
}

/** Cartão de total com legenda, usado no topo das telas de gestão (modelos, certificados, leads). */
export function SummaryCard({ title, value, icon, caption }: SummaryCardProps) {
  return (
    <Card className="border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-900/80">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        {icon}
        {caption}
      </CardContent>
    </Card>
  )
}
