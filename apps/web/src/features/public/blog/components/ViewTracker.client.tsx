// =====================================================
// VIEW TRACKER - CLIENT COMPONENT
// =====================================================

'use client'

import { useEffect } from 'react'
import { useSessionId } from '@/shared/hooks/useSessionId'

interface ViewTrackerProps {
  postId: number
}

/**
 * Avisa a API que o post foi lido. A chamada sai DO NAVEGADOR (e não de uma Server Action) para a
 * API ver o IP e o navegador reais do leitor: é com eles que ela evita contar a mesma pessoa duas
 * vezes. O limite de tentativas por IP também só funciona assim.
 */
export function ViewTracker({ postId }: ViewTrackerProps) {
  const sessionId = useSessionId()

  useEffect(() => {
    if (!sessionId) return

    fetch(`/api/public/blog/posts/${postId}/views`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
      credentials: 'same-origin',
    }).catch(() => {
      // Contagem de leitura nunca deve atrapalhar quem está lendo.
    })
  }, [postId, sessionId])

  return null
}
