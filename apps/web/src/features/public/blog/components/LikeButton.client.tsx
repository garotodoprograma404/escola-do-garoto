'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useToast } from '@/shared/hooks/use-toast'
import { apiRequest } from '@/lib/api-client'
import { cn } from '@/shared/lib/utils'

interface LikeButtonProps {
  postId: number
  /** Caminho da página, para voltar a ela depois do login. */
  returnPath: string
  initialLikes: number
  initialLiked: boolean
  isLoggedIn: boolean
}

/** Curtir/descurtir o post. Visitante sem login é levado ao login e volta para o post. */
export function LikeButton({
  postId,
  returnPath,
  initialLikes,
  initialLiked,
  isLoggedIn,
}: LikeButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [liked, setLiked] = useState(initialLiked)
  const [likes, setLikes] = useState(initialLikes)
  const [isPending, setIsPending] = useState(false)

  const handleClick = async () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(returnPath)}`)
      return
    }

    setIsPending(true)
    const result = await apiRequest<{ action: 'liked' | 'unliked'; total_likes: number }>(
      `/blog/posts/${postId}/like`,
      { method: 'POST' },
    )
    setIsPending(false)

    if (!result.ok) {
      toast({
        title: 'Não foi possível curtir',
        description: result.error.message,
        variant: 'destructive',
      })
      return
    }

    // O servidor devolve a contagem certa (várias pessoas curtem ao mesmo tempo).
    setLiked(result.data.action === 'liked')
    setLikes(result.data.total_likes)
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={liked}
      aria-label={liked ? 'Descurtir este post' : 'Curtir este post'}
    >
      <Heart className={cn('mr-2 h-4 w-4', liked && 'fill-red-500 text-red-500')} />
      {liked ? 'Curtido' : 'Curtir'} · {likes}
    </Button>
  )
}
