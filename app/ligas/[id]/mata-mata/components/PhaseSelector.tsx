'use client'

import type { KnockoutPhase } from '@/lib/bracket-skeleton'
import type { BracketPhaseView } from '@/lib/bracket'

const CHIP_LABELS: Record<KnockoutPhase, string> = {
  '32nd': '32 avos',
  '16th': 'Oitavas',
  '8th': 'Quartas',
  semi: 'Semifinal',
  '3rd_place': '3º Lugar',
  final: 'Final',
}

const PHASE_GAME_COUNTS: Record<KnockoutPhase, number> = {
  '32nd': 16,
  '16th': 8,
  '8th': 4,
  semi: 2,
  '3rd_place': 1,
  final: 1,
}

interface PhaseSelectorProps {
  phases: BracketPhaseView[]
  selectedPhase: KnockoutPhase
  onPhaseChange: (phase: KnockoutPhase) => void
}

export default function PhaseSelector({ phases, selectedPhase, onPhaseChange }: PhaseSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Fases do mata-mata"
      className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide"
      data-testid="phase-selector"
    >
      {phases.map(({ phase, multiplier }) => {
        const isActive = phase === selectedPhase
        const label = CHIP_LABELS[phase]
        const count = PHASE_GAME_COUNTS[phase]

        return (
          <button
            key={phase}
            role="tab"
            aria-selected={isActive}
            aria-label={`${label} — ${multiplier}× — ${count} ${count === 1 ? 'jogo' : 'jogos'}`}
            data-testid={`phase-chip-${phase}`}
            onClick={() => onPhaseChange(phase)}
            className={[
              'flex flex-col items-center shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-colors border',
              isActive
                ? 'bg-[#244C5A] text-white border-[#244C5A]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50',
            ].join(' ')}
          >
            <span className="whitespace-nowrap">{label}</span>
            <span className={['text-[10px] font-normal whitespace-nowrap', isActive ? 'text-white/70' : 'text-slate-400'].join(' ')}>
              {multiplier}× · {count}j
            </span>
          </button>
        )
      })}
    </div>
  )
}
