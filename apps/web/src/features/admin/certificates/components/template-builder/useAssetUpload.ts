import { useState } from 'react'
import { useToast } from '@/shared/hooks/use-toast'
import { getAssetLabel, type BuilderAssetTarget } from '../../lib/templateBuilderElements'

export const ASSET_ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const ASSET_MAX_SIZE_BYTES = 5 * 1024 * 1024

interface UploadedAsset {
  path: string
  signedUrl: string
}

/** Envia imagem de fundo ou assinatura do modelo para a API e avisa o resultado por toast. */
export function useAssetUpload(
  templateId: number,
  onUploaded: (target: BuilderAssetTarget, asset: UploadedAsset) => void,
) {
  const { toast } = useToast()
  const [uploadingTarget, setUploadingTarget] = useState<BuilderAssetTarget | null>(null)

  async function upload(target: BuilderAssetTarget, file: File) {
    if (!ASSET_ALLOWED_MIME_TYPES.includes(file.type)) {
      toast({
        title: 'Formato inválido',
        description: 'Use PNG, JPG, WEBP ou SVG.',
        variant: 'destructive',
      })
      return
    }

    if (file.size > ASSET_MAX_SIZE_BYTES) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo permitido é 5MB.',
        variant: 'destructive',
      })
      return
    }

    setUploadingTarget(target)

    try {
      // O servidor confere o conteúdo, grava no bucket privado e devolve o caminho + link assinado.
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(
        `/api/certificates/templates/${templateId}/assets?target=${encodeURIComponent(target)}`,
        { method: 'POST', body: formData, credentials: 'same-origin' },
      )
      const payload = (await response.json().catch(() => null)) as {
        path?: string
        signedUrl?: string
        message?: string
      } | null

      if (!response.ok || !payload?.path || !payload.signedUrl) {
        throw new Error(payload?.message || 'Falha no upload')
      }

      onUploaded(target, { path: payload.path, signedUrl: payload.signedUrl })

      toast({
        title: 'Upload concluído',
        description: `Arquivo de ${getAssetLabel(target)} enviado com sucesso.`,
      })
    } catch (error) {
      console.error('Certificate builder asset upload error:', error)
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível enviar o arquivo. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setUploadingTarget(null)
    }
  }

  return { uploadingTarget, upload }
}
