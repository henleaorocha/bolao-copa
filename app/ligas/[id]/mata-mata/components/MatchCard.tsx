'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { BracketSlotView } from '@/lib/bracket'

const TZ = 'America/Sao_Paulo'

function formatKickoff(iso: string): string {
  const d = new Date(iso)
  const day = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: TZ })
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  return `${day} · ${time}`
}

function TeamFlag({ name, code, size = 28 }: { name: string; code: string | null; size?: number }) {
  const [imgError, setImgError] = useState(false)
  if (!code || imgError) {
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
      onError={() => setImgError(true)}
    />
  )
}

function StateBadge({ state }: { state: BracketSlotView['state'] }) {
  if (state === 'placeholder') {
    return (
      <span
        data-testid="badge-placeholder"
        className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 whitespace-nowrap"
      >
        A DEFINIR
      </span>
    )
  }
  if (state === 'open') {
    return (
      <span
        data-testid="badge-open"
        className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap"
        style={{ background: '#FFF3CD', color: '#856404' }}
      >
        ABERTO
      </span>
    )
  }
  if (state === 'locked') {
    return (
      <span
        data-testid="badge-locked"
        className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 whitespace-nowrap"
      >
        FECHADO
      </span>
    )
  }
  return (
    <span
      data-testid="badge-finished"
      className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: '#0097A922', color: '#006677' }}
    >
      ENCERRADO
    </span>
  )
}

interface MatchCardProps {
  slot: BracketSlotView
  homeInput: string
  awayInput: string
  onInputChange: (matchId: string, side: 'home' | 'away', value: string) => void
}

export default function MatchCard({ slot, homeInput, awayInput, onInputChange }: MatchCardProps) {
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
      {/* Top row: match label + multiplier badge + state badge */}
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
          <StateBadge state={slot.state} />
        </div>
      </div>

      {/* Teams / Placeholders */}
      <div className="space-y-2.5 mb-3">
        {/* Home slot */}
        <div className="flex items-center gap-2 min-w-0">
          {!isPlaceholder && slot.homeFlag ? (
            <TeamFlag name={slot.homeTeam!} code={slot.homeFlag} />
          ) : (
            <div className="w-7 h-[21px] rounded bg-slate-100 shrink-0" aria-hidden="true" />
          )}
          <span
            className={[
              'text-sm font-bold truncate min-w-0',
              isPlaceholder ? 'text-slate-400 italic' : 'text-[#244C5A]',
            ].join(' ')}
            data-testid="home-display"
          >
            {homeDisplay}
          </span>
        </div>

        {/* Away slot */}
        <div className="flex items-center gap-2 min-w-0">
          {!isPlaceholder && slot.awayFlag ? (
            <TeamFlag name={slot.awayTeam!} code={slot.awayFlag} />
          ) : (
            <div className="w-7 h-[21px] rounded bg-slate-100 shrink-0" aria-hidden="true" />
          )}
          <span
            className={[
              'text-sm font-bold truncate min-w-0',
              isPlaceholder ? 'text-slate-400 italic' : 'text-[#244C5A]',
            ].join(' ')}
            data-testid="away-display"
          >
            {awayDisplay}
          </span>
        </div>
      </div>

      {/* Scores section */}
      {slot.state === 'finished' && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-50" data-testid="finished-scores">
          <span className="text-[11px] text-slate-400 uppercase tracking-wide font-bold">Resultado:</span>
          <span className="text-sm font-black text-[#244C5A]" data-testid="final-score">
            {slot.homeScore} × {slot.awayScore}
          </span>
          {slot.prediction && (
            <span className="ml-auto text-[10px] text-slate-400" data-testid="finished-prediction">
              Palpite: {slot.prediction.home} × {slot.prediction.away}
            </span>
          )}
        </div>
      )}

      {/* Prediction inputs (open only) */}
      {isBettable && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-50" data-testid="prediction-inputs">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide font-bold mr-auto">Palpite</span>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            placeholder="–"
            value={homeInput}
            onChange={(e) => onInputChange(slot.matchId!, 'home', e.target.value)}
            className="w-9 h-8 text-center text-sm font-black text-[#244C5A] rounded-lg border border-slate-200 focus:outline-none focus:border-[#0097A9] bg-slate-50"
            aria-label={`Placar ${slot.homeTeam}`}
            data-testid={`input-home-${slot.matchId}`}
          />
          <span className="text-slate-300 text-xs font-black">×</span>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            placeholder="–"
            value={awayInput}
            onChange={(e) => onInputChange(slot.matchId!, 'away', e.target.value)}
            className="w-9 h-8 text-center text-sm font-black text-[#244C5A] rounded-lg border border-slate-200 focus:outline-none focus:border-[#0097A9] bg-slate-50"
            aria-label={`Placar ${slot.awayTeam}`}
            data-testid={`input-away-${slot.matchId}`}
          />
        </div>
      )}

      {/* Locked/Placeholder: show saved prediction read-only */}
      {(slot.state === 'locked') && slot.prediction && (
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
