'use client'

import type { BracketSlotView } from '@/lib/bracket'
import { slotMatchStatus } from '@/components/match/matchStatus'
import StatusBadge from '@/components/match/StatusBadge'
import TeamRow from '@/components/match/TeamRow'
import ScoreInputs from '@/components/match/ScoreInputs'
import FinalResult from '@/components/match/FinalResult'

const TZ = 'America/Sao_Paulo'

function formatKickoff(iso: string): string {
  const d = new Date(iso)
  const day = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: TZ })
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  return `${day} · ${time}`
}

interface MatchCardProps {
  slot: BracketSlotView
  homeInput: string
  awayInput: string
  onInputChange: (matchId: string, side: 'home' | 'away', value: string) => void
}

export default function MatchCard({ slot, homeInput, awayInput, onInputChange }: MatchCardProps) {
  // Derive the shared five-state status (ADR-003). An open slot with a saved
  // prediction becomes `predicted` → renders the ✓ PALPITADO badge; every other
  // slot state passes through unchanged.
  const status = slotMatchStatus(slot.state, slot.prediction !== null)
  const isBettable = slot.state === 'open' && slot.matchId !== null
  const isPlaceholder = slot.state === 'placeholder'

  const homeDisplay = slot.homeTeam ?? slot.homeLabel
  const awayDisplay = slot.awayTeam ?? slot.awayLabel

  return (
    <div
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"
      data-testid="match-card"
      data-state={slot.state}
    >
      {/* Top row: multiplier badge + kickoff + status badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-[#244C5A] text-white shrink-0">
          {slot.multiplier}×
        </span>
        {slot.kickoff && !isPlaceholder && (
          <span className="text-[10px] text-slate-400 flex-1 min-w-0 truncate">
            {formatKickoff(slot.kickoff)}
          </span>
        )}
        <div className="ml-auto shrink-0">
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Teams / Placeholders */}
      <div className="space-y-2.5 mb-3">
        <TeamRow
          name={homeDisplay}
          flag={slot.homeFlag}
          placeholder={isPlaceholder}
          nameTestId="home-display"
        />
        <TeamRow
          name={awayDisplay}
          flag={slot.awayFlag}
          placeholder={isPlaceholder}
          nameTestId="away-display"
        />
      </div>

      {/* Finished result */}
      {slot.state === 'finished' && (
        <FinalResult
          homeScore={slot.homeScore}
          awayScore={slot.awayScore}
          prediction={slot.prediction}
        />
      )}

      {/* Prediction inputs (open only) */}
      {isBettable && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-50" data-testid="prediction-inputs">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide font-bold mr-auto">Palpite</span>
          <ScoreInputs
            matchId={slot.matchId!}
            homeInput={homeInput}
            awayInput={awayInput}
            onInputChange={onInputChange}
            size="sm"
            homeAriaLabel={`Placar ${slot.homeTeam}`}
            awayAriaLabel={`Placar ${slot.awayTeam}`}
          />
        </div>
      )}

      {/* Locked: show saved prediction read-only */}
      {slot.state === 'locked' && slot.prediction && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-50" data-testid="locked-prediction">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Palpite:</span>
          <span className="text-sm font-black text-[#244C5A]" data-testid="locked-prediction-score">
            {slot.prediction.home} × {slot.prediction.away}
          </span>
        </div>
      )}
    </div>
  )
}
