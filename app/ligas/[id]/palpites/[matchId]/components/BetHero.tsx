'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { MatchDetail } from '@/lib/api/types'

interface BetHeroProps {
  match: MatchDetail
  inputHome: string
  inputAway: string
  saving: boolean
  saveConfirm: boolean
  onInputHomeChange: (val: string) => void
  onInputAwayChange: (val: string) => void
  onSave: () => void
  onBack: () => void
}

function TeamFlag({ name, code }: { name: string; code: string | null }) {
  const [imgError, setImgError] = useState(false)
  if (!code || imgError) {
    return <div className="w-16 h-11 rounded bg-white/20 shrink-0 mx-auto" aria-hidden="true" />
  }
  return (
    <Image
      src={`https://flagcdn.com/w80/${code}.png`}
      alt={name}
      width={64}
      height={44}
      className="rounded object-cover mx-auto"
      onError={() => setImgError(true)}
    />
  )
}

function formatMatchDateTime(matchDate: string): string {
  const d = new Date(matchDate)
  const tz = 'America/Sao_Paulo'
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  })
}

function phaseLabelPT(phase: MatchDetail['phase']): string {
  const labels: Record<string, string> = {
    group: 'Fase de grupos',
    '32nd': '16 avos de final',
    '16th': 'Oitavas de final',
    '8th': 'Quartas de final',
    '4th': 'Semifinal',
    semi: 'Semifinal',
    '3rd_place': '3º lugar',
    final: 'Final',
  }
  return labels[phase] ?? phase
}

export default function BetHero({
  match,
  inputHome,
  inputAway,
  saving,
  saveConfirm,
  onInputHomeChange,
  onInputAwayChange,
  onSave,
  onBack,
}: BetHeroProps) {
  const disabled = match.is_deadline_passed
  const isSaveEnabled =
    !disabled &&
    !saving &&
    inputHome !== '' &&
    inputAway !== '' &&
    parseInt(inputHome, 10) >= 0 &&
    parseInt(inputAway, 10) >= 0

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 mb-4"
        data-testid="back-btn"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Voltar
      </button>

      <div
        className="rounded-[32px] overflow-hidden shadow-xl"
        style={{ background: 'linear-gradient(135deg, #244C5A, #0097A9)', color: 'white' }}
      >
        <div className="p-6 relative">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-10 blur-3xl bg-yellow-400" />

          <div className="flex items-center justify-between mb-6 relative z-10">
            <span
              className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/20"
              data-testid="phase-badge"
            >
              {phaseLabelPT(match.phase)}
            </span>
            {disabled ? (
              <span
                className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-500 text-white"
                data-testid="status-badge-fechado"
              >
                FECHADO
              </span>
            ) : (
              <span
                className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-yellow-400 text-[#244C5A]"
                data-testid="status-badge-open"
              >
                Palpites abertos
              </span>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 relative z-10">
            <div className="text-center">
              <TeamFlag name={match.home_team} code={match.home_flag} />
              <div className="text-xl font-black mt-2 leading-tight" data-testid="home-team-name">
                {match.home_team}
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-60">
                SEU PALPITE
              </div>
              <div className="flex items-center gap-2 bg-white rounded-2xl p-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="-"
                  value={inputHome}
                  disabled={disabled}
                  onChange={(e) => onInputHomeChange(e.target.value)}
                  className="w-14 h-14 text-center text-3xl font-black bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-[#0097A9] disabled:bg-slate-100 disabled:text-slate-300"
                  style={{ color: '#244C5A' }}
                  aria-label={`Placar ${match.home_team}`}
                  data-testid="input-home"
                />
                <span className="text-slate-300 font-black text-xl">×</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="-"
                  value={inputAway}
                  disabled={disabled}
                  onChange={(e) => onInputAwayChange(e.target.value)}
                  className="w-14 h-14 text-center text-3xl font-black bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-[#0097A9] disabled:bg-slate-100 disabled:text-slate-300"
                  style={{ color: '#244C5A' }}
                  aria-label={`Placar ${match.away_team}`}
                  data-testid="input-away"
                />
              </div>
              <button
                onClick={onSave}
                disabled={!isSaveEnabled}
                className="px-5 py-2.5 rounded-xl text-sm font-black flex items-center gap-1.5 shadow-lg hover:scale-105 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 bg-yellow-400 text-[#244C5A]"
                data-testid="save-btn"
              >
                {saveConfirm ? '✓ Salvo!' : saving ? 'Salvando...' : 'Salvar palpite'}
              </button>
            </div>

            <div className="text-center">
              <TeamFlag name={match.away_team} code={match.away_flag} />
              <div className="text-xl font-black mt-2 leading-tight" data-testid="away-team-name">
                {match.away_team}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-3 text-xs opacity-80 relative z-10">
            <div className="flex items-center gap-1.5">
              <span aria-hidden="true">📅</span>
              {formatMatchDateTime(match.match_date)}
            </div>
            {(match.venue || match.city) && (
              <div className="flex items-center gap-1.5" data-testid="venue-city">
                <span aria-hidden="true">🏟️</span>
                {[match.venue, match.city].filter(Boolean).join(', ')}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span aria-hidden="true">⏰</span>
              Fecha 1h antes do início
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
