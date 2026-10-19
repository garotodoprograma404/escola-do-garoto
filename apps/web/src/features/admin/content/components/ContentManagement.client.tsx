'use client'

import { useState } from 'react'
import { Plus, Layout, Star } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useToast } from '@/shared/hooks/use-toast'
import { BannerList } from './BannerList'
import { BannerFilters } from './BannerFilters.client'
import { ShowcaseList } from './ShowcaseList'
import { BannerFormDrawer } from './BannerFormDrawer'
import { ShowcaseFormDrawer } from './ShowcaseFormDrawer'
import {
  createBannerAction,
  updateBannerAction,
  deleteBannerAction,
  moveBannerAction,
} from '../actions/banner-actions'
import {
  createShowcaseAction,
  updateShowcaseAction,
  deleteShowcaseAction,
  moveShowcaseAction,
} from '../actions/showcase-actions'
import type { Banner, Showcase, ContentFilters } from '../types'

interface ContentManagementClientProps {
  initialBanners: Banner[]
  initialShowcases: Showcase[]
}

export function ContentManagementClient({
  initialBanners,
  initialShowcases,
}: ContentManagementClientProps) {
  const { toast } = useToast()

  // Banner state
  const [bannerDrawerOpen, setBannerDrawerOpen] = useState(false)
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null)
  const [filters, setFilters] = useState<ContentFilters>({
    searchTerm: '',
    status: 'ALL',
    position: 'ALL',
    dateFilter: 'ALL',
  })

  // Showcase state
  const [showcaseDrawerOpen, setShowcaseDrawerOpen] = useState(false)
  const [selectedShowcase, setSelectedShowcase] = useState<Showcase | null>(null)

  // Banner handlers
  const handleCreateBanner = () => {
    setSelectedBanner(null)
    setBannerDrawerOpen(true)
  }

  const handleEditBanner = (banner: Banner) => {
    setSelectedBanner(banner)
    setBannerDrawerOpen(true)
  }

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este banner?')) return

    const result = await deleteBannerAction(id)
    if (!result.success) {
      toast({
        title: 'Erro ao excluir banner',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Banner excluído',
        description: 'O banner foi excluído com sucesso.',
      })
    }
  }

  const handleMoveBanner = async (id: string, direction: 'up' | 'down') => {
    const result = await moveBannerAction(id, direction)
    if (!result.success) {
      toast({
        title: 'Erro ao reordenar',
        description: result.error,
        variant: 'destructive',
      })
    }
  }

  const handleBannerSubmit = async (data: Partial<Banner>) => {
    const result = selectedBanner
      ? await updateBannerAction(selectedBanner.id, data)
      : await createBannerAction(data)

    if (!result.success) {
      toast({
        title: selectedBanner ? 'Erro ao atualizar banner' : 'Erro ao criar banner',
        description: result.error,
        variant: 'destructive',
      })
      throw new Error(result.error)
    } else {
      toast({
        title: selectedBanner ? 'Banner atualizado' : 'Banner criado',
        description: selectedBanner
          ? 'O banner foi atualizado com sucesso.'
          : 'O banner foi criado com sucesso.',
      })
    }
  }

  // Showcase handlers
  const handleCreateShowcase = () => {
    setSelectedShowcase(null)
    setShowcaseDrawerOpen(true)
  }

  const handleEditShowcase = (showcase: Showcase) => {
    setSelectedShowcase(showcase)
    setShowcaseDrawerOpen(true)
  }

  const handleDeleteShowcase = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta vitrine?')) return

    const result = await deleteShowcaseAction(id)
    if (!result.success) {
      toast({
        title: 'Erro ao excluir vitrine',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Vitrine excluída',
        description: 'A vitrine foi excluída com sucesso.',
      })
    }
  }

  const handleMoveShowcase = async (id: string, direction: 'up' | 'down') => {
    const result = await moveShowcaseAction(id, direction)
    if (!result.success) {
      toast({
        title: 'Erro ao reordenar',
        description: result.error,
        variant: 'destructive',
      })
    }
  }

  const handleShowcaseSubmit = async (data: Partial<Showcase>) => {
    const result = selectedShowcase
      ? await updateShowcaseAction(selectedShowcase.id, data)
      : await createShowcaseAction(data)

    if (!result.success) {
      toast({
        title: selectedShowcase ? 'Erro ao atualizar vitrine' : 'Erro ao criar vitrine',
        description: result.error,
        variant: 'destructive',
      })
      throw new Error(result.error)
    } else {
      toast({
        title: selectedShowcase ? 'Vitrine atualizada' : 'Vitrine criada',
        description: selectedShowcase
          ? 'A vitrine foi atualizada com sucesso.'
          : 'A vitrine foi criada com sucesso.',
      })
    }
  }

  // Apply filters to banners
  const filteredBanners = initialBanners.filter((banner) => {
    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      const matchesSearch =
        banner.title.toLowerCase().includes(searchLower) ||
        banner.subtitle.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    // Status filter
    if (filters.status !== 'ALL' && banner.status !== filters.status) {
      return false
    }

    // Position filter
    if (filters.position && filters.position !== 'ALL' && banner.position !== filters.position) {
      return false
    }

    // Date filter
    if (filters.dateFilter && filters.dateFilter !== 'ALL') {
      switch (filters.dateFilter) {
        case 'active-today':
          if (banner.status !== 'active') return false
          break
        case 'scheduled':
          if (banner.status !== 'scheduled') return false
          break
        case 'expired':
          if (banner.status !== 'expired') return false
          break
      }
    }

    return true
  })

  return (
    <div className="space-y-8">
      {/* Banners Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layout size={20} className="text-brand-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Campanhas (Banners)
            </h2>
          </div>
          <Button
            onClick={handleCreateBanner}
            className="bg-brand-500 text-black hover:bg-brand-400"
          >
            <Plus size={18} className="mr-2" />
            Criar Campanha
          </Button>
        </div>

        <BannerFilters
          filters={filters}
          onFiltersChange={setFilters}
          totalResults={filteredBanners.length}
        />

        <BannerList
          banners={filteredBanners}
          onEdit={handleEditBanner}
          onDelete={handleDeleteBanner}
          onMove={handleMoveBanner}
        />
      </div>

      {/* Showcases Section */}
      <div className="space-y-6 border-t border-slate-200 pt-8 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star size={20} className="text-brand-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Vitrines (Seções)</h2>
          </div>
          <Button
            onClick={handleCreateShowcase}
            className="bg-brand-500 text-black hover:bg-brand-400"
          >
            <Plus size={18} className="mr-2" />
            Nova Vitrine
          </Button>
        </div>

        <ShowcaseList
          showcases={initialShowcases}
          onEdit={handleEditShowcase}
          onDelete={handleDeleteShowcase}
          onMove={handleMoveShowcase}
        />
      </div>

      {/* Drawers */}
      <BannerFormDrawer
        open={bannerDrawerOpen}
        onClose={() => setBannerDrawerOpen(false)}
        banner={selectedBanner}
        onSubmit={handleBannerSubmit}
      />

      <ShowcaseFormDrawer
        open={showcaseDrawerOpen}
        onClose={() => setShowcaseDrawerOpen(false)}
        showcase={selectedShowcase}
        onSubmit={handleShowcaseSubmit}
      />
    </div>
  )
}
