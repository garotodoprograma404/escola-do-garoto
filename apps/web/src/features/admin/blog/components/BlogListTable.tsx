'use client'

import {
  Eye,
  Heart,
  MessageSquare,
  Edit,
  Trash2,
  Calendar,
  Clock,
  MoreVertical,
  Upload,
  Archive,
  FileText,
  ExternalLink,
} from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import type { BlogPost } from '../types'

interface BlogListTableProps {
  posts: BlogPost[]
  onEdit: (post: BlogPost) => void
  onDelete: (id: string) => void
  onPublish: (id: string) => void
  onUnpublish: (id: string) => void
  onArchive: (id: string) => void
}

function getStatusBadge(post: BlogPost): React.ReactNode {
  if (post.status === 'draft' && post.scheduledFor) {
    return (
      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        Agendado
      </Badge>
    )
  }

  switch (post.status) {
    case 'published':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Publicado
        </Badge>
      )
    case 'draft':
      return (
        <Badge
          variant="secondary"
          className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
        >
          Rascunho
        </Badge>
      )
    case 'archived':
      return (
        <Badge variant="outline" className="text-slate-600 dark:text-slate-400">
          Arquivado
        </Badge>
      )
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function BlogListTable({
  posts,
  onEdit,
  onDelete,
  onPublish,
  onUnpublish,
  onArchive,
}: BlogListTableProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">
          Nenhum post encontrado. Crie seu primeiro post.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Post</TableHead>
            <TableHead>Autor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Métricas</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => (
            <TableRow key={post.id}>
              {/* Post Info */}
              <TableCell>
                <div className="space-y-1">
                  <p className="font-medium text-slate-900 dark:text-white">{post.title}</p>
                  <p className="line-clamp-1 text-sm text-slate-600 dark:text-slate-400">
                    {post.excerpt}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {post.categoryName && (
                      <Badge variant="outline" className="text-xs">
                        {post.categoryName}
                      </Badge>
                    )}
                    <span className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                      <Clock size={12} />
                      {post.readingTime} min
                    </span>
                  </div>
                </div>
              </TableCell>

              {/* Author */}
              <TableCell>
                <div className="flex items-center gap-2">
                  {post.authorAvatar ? (
                    <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                      {post.authorName.charAt(0)}
                    </div>
                  )}
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {post.authorName}
                  </span>
                </div>
              </TableCell>

              {/* Status */}
              <TableCell>{getStatusBadge(post)}</TableCell>

              {/* Date */}
              <TableCell>
                <div className="space-y-1 text-sm">
                  {post.status === 'published' && post.publishedAt && (
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                      <Calendar size={12} />
                      {formatDate(post.publishedAt)}
                    </div>
                  )}
                  {post.status === 'draft' && post.scheduledFor && (
                    <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <Calendar size={12} />
                      {formatDate(post.scheduledFor)}
                    </div>
                  )}
                  {post.status === 'draft' && !post.scheduledFor && (
                    <div className="text-slate-600 dark:text-slate-400">
                      Atualizado {formatDate(post.updatedAt)}
                    </div>
                  )}
                </div>
              </TableCell>

              {/* Metrics */}
              <TableCell>
                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1" title="Visualizações">
                    <Eye size={14} />
                    {post.views}
                  </span>
                  <span className="flex items-center gap-1" title="Curtidas">
                    <Heart size={14} />
                    {post.likes}
                  </span>
                  <span className="flex items-center gap-1" title="Comentários">
                    <MessageSquare size={14} />
                    {post.commentsCount}
                  </span>
                </div>
              </TableCell>

              {/* Actions */}
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Ações do post ${post.title}`}>
                      <MoreVertical size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {/* Preview - sempre disponível */}
                    <DropdownMenuItem
                      onClick={() => window.open(`/preview/blog/${post.slug}`, '_blank')}
                    >
                      <ExternalLink size={16} className="mr-2" />
                      Visualizar Preview
                    </DropdownMenuItem>

                    {/* Editar - sempre disponível */}
                    <DropdownMenuItem onClick={() => onEdit(post)}>
                      <Edit size={16} className="mr-2" />
                      Editar
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Ações baseadas no status */}
                    {post.status === 'draft' && (
                      <>
                        <DropdownMenuItem onClick={() => onPublish(post.id)}>
                          <Upload size={16} className="mr-2" />
                          Publicar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onArchive(post.id)}>
                          <Archive size={16} className="mr-2" />
                          Arquivar
                        </DropdownMenuItem>
                      </>
                    )}

                    {post.status === 'published' && (
                      <>
                        <DropdownMenuItem onClick={() => onUnpublish(post.id)}>
                          <FileText size={16} className="mr-2" />
                          Despublicar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onArchive(post.id)}>
                          <Archive size={16} className="mr-2" />
                          Arquivar
                        </DropdownMenuItem>
                      </>
                    )}

                    {post.status === 'archived' && (
                      <DropdownMenuItem onClick={() => onPublish(post.id)}>
                        <Upload size={16} className="mr-2" />
                        Publicar
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    {/* Excluir - sempre disponível */}
                    <DropdownMenuItem
                      onClick={() => onDelete(post.id)}
                      className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-900/20"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
