interface PublicWhatsAppButtonProps {
  phone: string
}

function getWhatsAppNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`
  }

  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits
  }

  return null
}

export function PublicWhatsAppButton({ phone }: PublicWhatsAppButtonProps) {
  const normalized = getWhatsAppNumber(phone)

  if (!normalized) {
    return null
  }

  const message = encodeURIComponent('Ola! Preciso de ajuda com a plataforma.')
  const href = `https://wa.me/${normalized}?text=${message}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com suporte no WhatsApp"
      className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_rgba(37,211,102,0.45)] transition-all duration-300 hover:scale-105 hover:bg-[#20bb5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="h-7 w-7 fill-current">
        <path d="M13.601 2.326A7.854 7.854 0 0 0 8.008 0C3.643 0 .09 3.555.09 7.92c0 1.396.365 2.757 1.06 3.956L0 16l4.227-1.102a7.936 7.936 0 0 0 3.781.965h.003c4.365 0 7.918-3.554 7.918-7.92a7.9 7.9 0 0 0-2.328-5.617m-5.593 12.19a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.51.654.67-2.445-.155-.251a6.57 6.57 0 0 1-1.007-3.505c0-3.626 2.957-6.583 6.593-6.583 1.75 0 3.394.682 4.634 1.922a6.54 6.54 0 0 1 1.922 4.633c-.001 3.627-2.958 6.584-6.584 6.584m3.615-4.917c-.198-.099-1.172-.578-1.354-.645-.182-.066-.314-.099-.446.1-.132.198-.512.645-.628.777-.116.132-.231.149-.429.05-.198-.1-.837-.308-1.594-.981-.589-.525-.986-1.173-1.102-1.371-.116-.198-.012-.305.087-.404.09-.089.198-.232.297-.347.099-.116.132-.198.198-.33.066-.132.033-.248-.017-.347-.05-.099-.446-1.076-.611-1.475-.161-.387-.325-.334-.446-.34q-.17-.009-.347-.008a.67.67 0 0 0-.479.224c-.165.181-.628.612-.628 1.49s.644 1.727.733 1.847c.09.12 1.26 1.95 3.055 2.734.428.185.762.295 1.022.377.43.137.821.118 1.13.072.345-.052 1.172-.479 1.338-.942.165-.463.165-.86.116-.942-.05-.083-.182-.132-.38-.231" />
      </svg>
      <span className="sr-only">Abrir WhatsApp de suporte</span>
    </a>
  )
}
