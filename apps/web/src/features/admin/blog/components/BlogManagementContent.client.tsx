'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { BlogFilters } from './BlogFilters'
import { BlogListTable } from './BlogListTable'
import { BlogStats } from './BlogStats'
import { BlogStatusTabs } from './BlogStatusTabs.client'
import { BlogPagination } from './BlogPagination.client'
import { BlogPostModal } from './BlogPostModal.client'
import { BlogDeleteDialog } from './BlogDeleteDialog.client'
import { getPostsPaginatedAction } from '../actions/get-posts-paginated'
import { deletePostAction } from '../actions/delete-post'
import { publishPostAction } from '../actions/publish-post'
import { unpublishPostAction } from '../actions/unpublish-post'
import { archivePostAction } from '../actions/archive-post'
import { useToast } from '@/shared/hooks/use-toast'
import type {
  BlogPost,
  BlogCategory,
  BlogStats as BlogStatsType,
  BlogFilters as BlogFiltersType,
  PostStatus,
} from '../types'

interface BlogManagementContentProps {
  initialPosts: BlogPost[]
}

export function BlogManagementContent({ initialPosts }: BlogManagementContentProps) {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [deletingPost, setDeletingPost] = useState<{ id: string; title: string } | null>(null)
  const [filters, setFilters] = useState<BlogFiltersType>({
    searchTerm: '',
    status: 'ALL',
    categoryId: 'ALL',
    authorId: 'ALL',
  })
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const categories = useMemo<BlogCategory[]>(() => {
    const categoryMap = new Map<string, number>()
    initialPosts.forEach((post) => {
      const categoryName = post.categoryName?.trim()
      if (!categoryName) return
      categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1)
    })

    return Array.from(categoryMap.entries()).map(([name, postsCount], index) => ({
      id: String(index + 1),
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      postsCount,
    }))
  }, [initialPosts])

  const stats = useMemo<BlogStatsType>(
    () => ({
      totalPosts: initialPosts.length,
      publishedPosts: initialPosts.filter((p) => p.status === 'published').length,
      draftPosts: initialPosts.filter((p) => p.status === 'draft').length,
      scheduledPosts: 0,
      totalViews: initialPosts.reduce((sum, post) => sum + (post.views || 0), 0),
      totalLikes: initialPosts.reduce((sum, post) => sum + (post.likes || 0), 0),
    }),
    [initialPosts],
  )

  // Calculate status counts
  const statusCounts = useMemo(() => {
    return {
      all: initialPosts.length,
      draft: initialPosts.filter((p) => p.status === 'draft').length,
      published: initialPosts.filter((p) => p.status === 'published').length,
      archived: initialPosts.filter((p) => p.status === 'archived').length,
    }
  }, [initialPosts])

  // Listen for custom event to open modal
  useEffect(() => {
    const handleOpenModal = () => setIsCreateModalOpen(true)
    window.addEventListener('openCreatePostModal', handleOpenModal)
    return () => window.removeEventListener('openCreatePostModal', handleOpenModal)
  }, [])

  const handleFiltersChange = (newFilters: BlogFiltersType) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page on filter change

    startTransition(async () => {
      const result = await getPostsPaginatedAction(newFilters, 1)
      setPosts(result.posts)
      setTotalPages(result.totalPages)
      setCurrentPage(result.currentPage)
    })
  }

  const handleStatusTabChange = (status: PostStatus | 'ALL') => {
    const newFilters = { ...filters, status }
    handleFiltersChange(newFilters)
  }

  const handlePageChange = (page: number) => {
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })

    startTransition(async () => {
      const result = await getPostsPaginatedAction(filters, page)
      setPosts(result.posts)
      setTotalPages(result.totalPages)
      setCurrentPage(result.currentPage)
    })
  }

  const handleEdit = (post: BlogPost) => {
    setEditingPostId(post.id)
    setIsEditModalOpen(true)
  }

  const handleDelete = (id: string) => {
    const post = posts.find((p) => p.id === id)
    if (post) {
      setDeletingPost({ id: post.id, title: post.title })
      setIsDeleteDialogOpen(true)
    }
  }

  const handleConfirmDelete = async (postId: string) => {
    const result = await deletePostAction(postId)

    if (result.success) {
      toast({
        title: 'Post excluído!',
        description: 'O post foi excluído com sucesso.',
      })
      refreshPosts()
    } else {
      toast({
        title: 'Erro ao excluir post',
        description: result.error || 'Ocorreu um erro ao excluir o post.',
        variant: 'destructive',
      })
    }
  }

  const handlePublish = async (postId: string) => {
    const result = await publishPostAction(postId)

    if (result.success) {
      toast({
        title: 'Post publicado!',
        description: 'O post foi publicado com sucesso.',
      })
      refreshPosts()
    } else {
      toast({
        title: 'Erro ao publicar post',
        description: result.error || 'Ocorreu um erro ao publicar o post.',
        variant: 'destructive',
      })
    }
  }

  const handleUnpublish = async (postId: string) => {
    const result = await unpublishPostAction(postId)

    if (result.success) {
      toast({
        title: 'Post despublicado!',
        description: 'O post foi movido para rascunhos.',
      })
      refreshPosts()
    } else {
      toast({
        title: 'Erro ao despublicar post',
        description: result.error || 'Ocorreu um erro ao despublicar o post.',
        variant: 'destructive',
      })
    }
  }

  const handleArchive = async (postId: string) => {
    const result = await archivePostAction(postId)

    if (result.success) {
      toast({
        title: 'Post arquivado!',
        description: 'O post foi arquivado com sucesso.',
      })
      refreshPosts()
    } else {
      toast({
        title: 'Erro ao arquivar post',
        description: result.error || 'Ocorreu um erro ao arquivar o post.',
        variant: 'destructive',
      })
    }
  }

  const refreshPosts = async () => {
    startTransition(async () => {
      const result = await getPostsPaginatedAction(filters, currentPage)
      setPosts(result.posts)
      setTotalPages(result.totalPages)
      setCurrentPage(result.currentPage)
    })
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header com botão */}
        <div className="mb-6 flex justify-end">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-brand-500 text-black hover:bg-brand-400"
          >
            <Plus size={18} className="mr-2" />
            Novo Post
          </Button>
        </div>

        <BlogStats stats={stats} />

        {/* Status Tabs */}
        <BlogStatusTabs
          activeStatus={filters.status}
          onStatusChange={handleStatusTabChange}
          counts={statusCounts}
        />

        <BlogFilters
          filters={filters}
          categories={categories}
          onFiltersChange={handleFiltersChange}
          resultsCount={posts.length}
        />

        <div className="relative">
          {isPending && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-slate-900/50">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-500" />
            </div>
          )}

          <BlogListTable
            posts={posts}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            onArchive={handleArchive}
          />

          <BlogPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            isLoading={isPending}
          />
        </div>
      </div>

      <BlogPostModal
        mode="create"
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={refreshPosts}
      />

      <BlogPostModal
        mode="edit"
        postId={editingPostId || undefined}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSuccess={refreshPosts}
      />

      {deletingPost && (
        <BlogDeleteDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          postTitle={deletingPost.title}
          postId={deletingPost.id}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  )
}
