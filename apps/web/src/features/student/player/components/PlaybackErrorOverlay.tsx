import { AlertCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

/** Cobre o player quando o vídeo não abre; oferece abrir o link original em outra aba. */
export function PlaybackErrorOverlay({ externalUrl }: { externalUrl?: string | null }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6 text-center">
      <div className="space-y-3 text-white">
        <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
        <p className="font-semibold">Não foi possível reproduzir este vídeo</p>
        <p className="text-sm text-slate-300">
          Verifique o link do conteúdo ou abra o vídeo diretamente em uma nova aba.
        </p>
        {externalUrl && (
          <Button asChild variant="secondary">
            <a href={externalUrl} target="_blank" rel="noopener noreferrer">
              Abrir vídeo
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}
