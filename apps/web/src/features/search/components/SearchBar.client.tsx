'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Clock, TrendingUp } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

// Valores padrão FORA do componente: um `= []` na lista de parâmetros cria um array novo a cada
// render, e o efeito que depende dele rodaria sem parar (laço infinito de renderização).
const NO_ITEMS: string[] = []

interface SearchBarProps {
  placeholder?: string
  /** Termo já buscado (preenche o campo ao abrir os resultados). */
  initialQuery?: string
  className?: string
  suggestions?: string[]
  recentSearches?: string[]
  onSearch?: (query: string) => void
}

export function SearchBar({
  placeholder = 'Buscar cursos, produtores, posts...',
  className,
  initialQuery = '',
  suggestions = NO_ITEMS,
  recentSearches = NO_ITEMS,
  onSearch,
}: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredSuggestions = useMemo(
    () =>
      query.length >= 2
        ? suggestions.filter((s) => s.toLowerCase().includes(query.toLowerCase()))
        : NO_ITEMS,
    [query, suggestions],
  )
  const hasRecentSearches = recentSearches.length > 0

  // Abre a lista ao digitar; com o campo vazio, só se houver buscas recentes.
  useEffect(() => {
    setIsOpen(query.length >= 2 || (query.length === 0 && hasRecentSearches))
  }, [query, hasRecentSearches])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim().length < 2) return

    setQuery(searchQuery)
    setIsOpen(false)

    if (onSearch) {
      onSearch(searchQuery)
    } else {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(query)
  }

  const handleClear = () => {
    setQuery('')
    inputRef.current?.focus()
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSearch(suggestion)
  }

  return (
    <div className={cn('relative w-full', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Limpar busca"
            onClick={handleClear}
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-lg border bg-popover shadow-lg"
        >
          {/* Recent Searches */}
          {query.length === 0 && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Buscas Recentes</span>
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(search)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-muted"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{search}</span>
                </button>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {filteredSuggestions.length > 0 && (
            <div className="p-2">
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">Sugestões</span>
              </div>
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-muted"
                >
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{suggestion}</span>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {query.length >= 2 && filteredSuggestions.length === 0 && recentSearches.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma sugestão encontrada
            </div>
          )}
        </div>
      )}
    </div>
  )
}
