'use client'

import { useState } from 'react'

interface InviteShareButtonProps {
  inviteUrl: string
  variant: 'sidebar' | 'topbar'
}

export default function InviteShareButton({ inviteUrl, variant }: InviteShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = inviteUrl
        ta.setAttribute('readonly', '')
        ta.style.cssText = 'position:fixed;opacity:0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      } catch {
        // both strategies failed; user can copy from the URL display
      }
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const whatsappMessage = `Entre no meu bolão da Copa! 🏆 Clique para participar: ${inviteUrl}`
  const whatsappHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`

  if (variant === 'topbar') {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(prev => !prev)}
          aria-label="Compartilhar liga"
          className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
        {open && (
          <div
            data-testid="invite-popover"
            className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50"
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Convidar para a liga</p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 mb-3">
              <span className="text-xs text-gray-600 truncate flex-1">{inviteUrl}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                style={{ background: '#244C5A', color: '#fff' }}
              >
                {copied ? (
                  <span data-testid="copy-success">✓ Copiado!</span>
                ) : (
                  'Copiar link'
                )}
              </button>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-center transition-colors"
                style={{ background: '#25D366', color: '#fff' }}
              >
                WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>
    )
  }

  // sidebar variant
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition hover:opacity-90 min-h-[44px]"
        style={{ background: '#FFC72C', color: '#244C5A' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        CONVIDAR
      </button>
      {open && (
        <div
          data-testid="invite-popover"
          className="absolute bottom-14 left-0 right-0 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50"
        >
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Convidar para a liga</p>
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 mb-3">
            <span className="text-xs text-gray-600 truncate flex-1">{inviteUrl}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              style={{ background: '#244C5A', color: '#fff' }}
            >
              {copied ? (
                <span data-testid="copy-success">✓ Copiado!</span>
              ) : (
                'Copiar link'
              )}
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-center transition-colors"
              style={{ background: '#25D366', color: '#fff' }}
            >
              WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
