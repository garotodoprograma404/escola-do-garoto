'use client'

import { useState } from 'react'
import { ImageUpload } from '@/shared/components/ImageUpload.client'
import { uploadProducerAvatar } from '../actions/profile-actions'

interface AvatarUploadProps {
  avatarUrl: string | null
}

export function AvatarUpload({ avatarUrl }: AvatarUploadProps) {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleUploadComplete(url: string) {
    const formData = new FormData()
    formData.append('avatar_url', url)

    const result = await uploadProducerAvatar(formData)

    if (result.success) {
      setMessage({ type: 'success', text: 'Avatar atualizado com sucesso!' })
      setTimeout(() => setMessage(null), 3000)
    } else {
      setMessage({ type: 'error', text: result.error || 'Erro ao atualizar avatar' })
    }
  }

  function handleUploadError(error: string) {
    setMessage({ type: 'error', text: error })
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <ImageUpload
        type="avatar"
        currentImage={avatarUrl}
        onUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
        size="lg"
        shape="circle"
      />

      {message && (
        <div
          className={`rounded-md p-2 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <p className="text-sm text-muted-foreground">Clique no ícone para alterar a foto</p>
    </div>
  )
}
