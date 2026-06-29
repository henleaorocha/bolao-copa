'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import type { BracketSlotView } from '@/lib/bracket'
import { slotMatchStatus } from '@/components/match/matchStatus'
import StatusBadge from '@/components/match/StatusBadge'
import ScoreInputs from '@/components/match/ScoreInputs'

const TZ = 'America/Sao_Paulo'

function formatKickoff(iso: string): string {
  const d = new Date(iso)
  const day = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: TZ })
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  return `${day} · ${time}`
}

function FlagImg({ name, code, size = 26 }: { name: string; code: string | null; size?: number }) {
  const [err, setErr] = useState(false)
  if (!code || err) {
    return (
      <div
        className="rounded bg-slate-200 shrink-0"
        style={{ width: size, height: Math.round(size * 0.75) }}
        aria-hidden="true"
      />
    )
  }
  return (
    <Image
      src={`https://flagcdn.com/w80/${code}.png`}
      alt={name}
      width={size}
      height={Math.round(size * 0.75)}
      className="rounded object-cover shrink-0"
      onError={() => setErr(true)}
    />
  )
}

interface MatchCardProps {
  slot: BracketSlotView
  leagueId: string
  homeInput: string
  awayInput: string
  onInputChange: (matchId: string, side: 'home' | 'away', value: string) => void
}

export default function MatchCard({ slot, leagueId, homeInput, awayInput, onInputChange }: MatchCardProps) {
  const status = slotMatchStatus(slot.state, slot.prediction !== null)
  const isPlaceholder = slot.state === 'placeholder'
  const isBettable = slot.state === 'open' && slot.matchId !== null
  const isLocked = slot.state === 'locked'
  const isFinished = slot.state === 'finished'

  const homeDisplay = slot.homeTeam ?? slot.homeLabel
  const awayDisplay = slot.awayTeam ?? slot.awayLabel

  const nameClass = [
    'text-[11px] font-black uppercase tracking-wide truncate min-w-0',
    isPlaceholder ? 'text-slate-400 italic' : 'text-[#244C5A]',
  ].join(' ')

  const hasDetailsLink = slot.matchId !== null && !isPlaceholder

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

      {/* Main row: [flag] home_name … center_score … away_name [flag] */}
      <div className="flex items-center gap-2">
        {/* Home team */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {isPlaceholder ? (
            <div className="w-[26px] h-[20px] rounded bg-slate-100 shrink-0" aria-hidden="true" />
          ) : (
            <FlagImg name={homeDisplay} code={slot.homeFlag} />
          )}
          <span className={nameClass} data-testid="home-display">{homeDisplay}</span>
        </div>

        {/* Center: inputs / prediction (finished) / locked prediction / placeholder separator */}
        <div className="shrink-0 flex items-center" data-testid="prediction-inputs">
          {isBettable && (
            <ScoreInputs
              matchId={slot.matchId!}
              homeInput={homeInput}
              awayInput={awayInput}
              onInputChange={onInputChange}
              size="sm"
              homeAriaLabel={`Placar ${slot.homeTeam}`}
              awayAriaLabel={`Placar ${slot.awayTeam}`}
            />
          )}
          {isFinished && (
            <span className="text-sm font-black text-slate-400 tabular-nums" data-testid="finished-prediction">
              {slot.prediction ? `${slot.prediction.home} × ${slot.prediction.away}` : '– × –'}
            </span>
          )}
          {isLocked && (
            <span className="text-sm font-black text-slate-400 tabular-nums" data-testid="locked-prediction-score">
              {slot.prediction ? `${slot.prediction.home} × ${slot.prediction.away}` : '– × –'}
            </span>
          )}
          {isPlaceholder && (
            <span className="text-slate-300 text-xs font-black px-1">×</span>
          )}
        </div>

        {/* Away team (mirrored: name then flag) */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
          <span className={`${nameClass} text-right`} data-testid="away-display">{awayDisplay}</span>
          {isPlaceholder ? (
            <div className="w-[26px] h-[20px] rounded bg-slate-100 shrink-0" aria-hidden="true" />
          ) : (
            <FlagImg name={awayDisplay} code={slot.awayFlag} />
          )}
        </div>
      </div>

      {/* Footer */}
      {(isFinished || hasDetailsLink) && (
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-50 gap-2">
          {/* Final result (finished only) */}
          {isFinished ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Resultado:
              </span>
              <span className="text-sm font-black text-[#244C5A] tabular-nums" data-testid="final-score">
                {slot.homeScore} × {slot.awayScore}
              </span>
            </div>
          ) : (
            <span />
          )}
          {hasDetailsLink && (
            <Link
              href={`/ligas/${leagueId}/palpites/${slot.matchId}`}
              className="text-[10px] font-bold text-[#0097A9] hover:underline shrink-0"
              data-testid="details-link"
            >
              Detalhes →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
