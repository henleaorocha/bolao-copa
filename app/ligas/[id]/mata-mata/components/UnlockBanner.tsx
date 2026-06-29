'use client'

import type { KnockoutPhase } from '@/lib/bracket-skeleton'

const PHASE_SHORT_LABELS: Record<KnockoutPhase, string> = {
  '32nd': '16 avos',
  '16th': 'Oitavas',
  '8th': 'Quartas',
  semi: 'Semifinal',
  '3rd_place': '3º Lugar',
  final: 'Final',
}

interface UnlockBannerProps {
  newlyUnlockedPhase: KnockoutPhase | null
}

export default function UnlockBanner({ newlyUnlockedPhase }: UnlockBannerProps) {
  if (!newlyUnlockedPhase) return null

  const label = PHASE_SHORT_LABELS[newlyUnlockedPhase]

  return (
    <div
      role="alert"
      data-testid="unlock-banner"
      className="flex items-start gap-3 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 mb-6"
    >
      <span className="mt-0.5 shrink-0 text-yellow-500" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </span>
      <p className="text-sm text-yellow-800 leading-snug" data-testid="unlock-banner-text">
        <span className="font-black">{label} liberado!</span> Faça seus palpites antes do início dos jogos.
      </p>
    </div>
  )
}
