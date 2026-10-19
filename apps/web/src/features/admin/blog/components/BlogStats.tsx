'use client'

import { FileText, Eye, Heart, Edit } from 'lucide-react'
import { StatCard } from '@/features/admin/components/StatCard'
import type { BlogStats as BlogStatsType } from '../types'

interface BlogStatsProps {
  stats: BlogStatsType
}

export function BlogStats({ stats }: BlogStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total de Posts"
        value={stats.totalPosts.toString()}
        icon={FileText}
        change={`${stats.publishedPosts} publicados`}
        positive={true}
      />
      <StatCard title="Rascunhos" value={stats.draftPosts.toString()} icon={Edit} />
      <StatCard title="Visualizações" value={stats.totalViews.toLocaleString('pt-BR')} icon={Eye} />
      <StatCard title="Curtidas" value={stats.totalLikes.toLocaleString('pt-BR')} icon={Heart} />
    </div>
  )
}
