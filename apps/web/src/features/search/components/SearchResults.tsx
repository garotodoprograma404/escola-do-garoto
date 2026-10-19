import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, User, FileText, Star, Users } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import type { SearchResult } from '../types'
import { formatCurrency } from '@/shared/lib/utils'

interface SearchResultsProps {
  results: SearchResult[]
  query: string
}

export function SearchResults({ results, query }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mb-2 text-muted-foreground">
          Nenhum resultado encontrado para <strong>&quot;{query}&quot;</strong>
        </div>
        <p className="text-sm text-muted-foreground">
          Tente usar palavras-chave diferentes ou mais genéricas
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <SearchResultCard key={`${result.type}-${result.id}`} result={result} />
      ))}
    </div>
  )
}

function SearchResultCard({ result }: { result: SearchResult }) {
  const Icon = getIconForType(result.type)

  return (
    <Link href={result.url}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Thumbnail */}
            {result.thumbnail_url ? (
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={result.thumbnail_url}
                  alt={result.title}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {getTypeLabel(result.type)}
                    </Badge>
                    {result.metadata?.category && (
                      <span className="text-xs text-muted-foreground">
                        {result.metadata.category}
                      </span>
                    )}
                  </div>
                  <h3 className="line-clamp-1 text-lg font-semibold">{result.title}</h3>
                </div>

                {/* Price (for courses) */}
                {result.type === 'course' && result.metadata?.price !== undefined && (
                  <div className="flex-shrink-0 text-right">
                    <div className="text-lg font-bold text-primary">
                      {result.metadata.price === 0
                        ? 'Grátis'
                        : `${formatCurrency(result.metadata.price)}`}
                    </div>
                  </div>
                )}
              </div>

              <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                {result.description}
              </p>

              {/* Metadata */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {result.type === 'course' && (
                  <>
                    {result.metadata?.rating !== undefined && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{result.metadata.rating.toFixed(1)}</span>
                      </div>
                    )}
                    {result.metadata?.students_count !== undefined && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{result.metadata.students_count} alunos</span>
                      </div>
                    )}
                  </>
                )}

                {result.type === 'producer' && result.metadata?.courses_count !== undefined && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    <span>{result.metadata.courses_count} cursos</span>
                  </div>
                )}

                {result.type === 'blog_post' && (
                  <>
                    {result.metadata?.author && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{result.metadata.author}</span>
                      </div>
                    )}
                    {result.metadata?.published_at && (
                      <span>
                        {new Date(result.metadata.published_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function getIconForType(type: SearchResult['type']) {
  switch (type) {
    case 'course':
      return BookOpen
    case 'producer':
      return User
    case 'blog_post':
      return FileText
    default:
      return BookOpen
  }
}

function getTypeLabel(type: SearchResult['type']): string {
  switch (type) {
    case 'course':
      return 'Curso'
    case 'producer':
      return 'Produtor'
    case 'blog_post':
      return 'Blog'
    default:
      return 'Resultado'
  }
}
