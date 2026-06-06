import type { CSSProperties } from 'react'
import type { MatchStatus } from './matchStatus'

// One badge for the whole app's five-state vocabulary (ADR-003). Labels are always
// text (never color-only) for accessibility. Colors are preserved verbatim from the
// two original cards: ABERTO amber, PALPITADO/ENCERRADO teal, FECHADO/A DEFINIR slate.

const BADGE_BASE =
  'text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap'

interface BadgeStyle {
  label: string
  className: string
  style?: CSSProperties
  testId: string
}

const BADGE_STYLES: Record<MatchStatus, BadgeStyle> = {
  placeholder: {
    label: 'A DEFINIR',
    className: 'bg-slate-100 text-slate-400',
    testId: 'badge-placeholder',
  },
  open: {
    label: 'ABERTO',
    className: '',
    style: { background: '#FFF3CD', color: '#856404' },
    testId: 'badge-open',
  },
  predicted: {
    label: '✓ PALPITADO',
    className: '',
    style: { background: '#0097A922', color: '#006677' },
    testId: 'badge-predicted',
  },
  locked: {
    label: 'FECHADO',
    className: 'bg-slate-200 text-slate-500',
    testId: 'badge-locked',
  },
  finished: {
    label: 'ENCERRADO',
    className: '',
    style: { background: '#0097A922', color: '#006677' },
    testId: 'badge-finished',
  },
}

interface StatusBadgeProps {
  status: MatchStatus
  // Each screen may override the test id to preserve its existing selectors
  // (e.g. Palpites' `badge-aberto`/`badge-palpitado`/`badge-fechado`).
  testId?: string
}

export default function StatusBadge({ status, testId }: StatusBadgeProps) {
  const badge = BADGE_STYLES[status]
  return (
    <span
      data-testid={testId ?? badge.testId}
      className={[BADGE_BASE, badge.className].filter(Boolean).join(' ')}
      style={badge.style}
    >
      {badge.label}
    </span>
  )
}
