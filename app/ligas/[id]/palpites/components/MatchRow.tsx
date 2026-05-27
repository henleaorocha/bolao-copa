'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import type { MatchWithPrediction } from '@/lib/api/types'

interface MatchRowProps {
  match: MatchWithPrediction
  leagueId: string
  homeInput: string
  awayInput: string
  onInputChange: (matchId: string, side: 'home' | 'away', value: string) => void
}

const TZ = 'America/Sao_Paulo'

function TeamFlag({ name, code, size = 32 }: { name: string; code: string | null; size?: number }) {
  const [imgError, setImgError] = useState(false)
  if (!code || imgError) {
    return <div className="rounded bg-slate-200 shrink-0" style={{ width: size, height: Math.round(size * 0.75) }} aria-hidden="true" />
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

function formatShortDate(matchDate: string): string {
  const d = new Date(matchDate)
  const dayMonth = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: TZ })
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  return `${dayMonth} · ${time}`
}

function formatMatchDateTime(matchDate: string): string {
  const d = new Date(matchDate)
  const weekday = d
    .toLocaleDateString('pt-BR', { weekday: 'short', timeZone: TZ })
    .replace('.', '')
  const dayMonth = d
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: TZ })
    .replace('.', '')
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return `${cap(weekday)}, ${dayMonth} · ${time}`
}

function StatusBadge({ badge, withTestId = false }: { badge: 'fechado' | 'palpitado' | 'aberto'; withTestId?: boolean }) {
  if (badge === 'fechado') {
    return (
      <span
        className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 whitespace-nowrap"
        {...(withTestId ? { 'data-testid': 'badge-fechado' } : {})}
      >
        FECHADO
      </span>
    )
  }
  if (badge === 'palpitado') {
    return (
      <span
        className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap"
        style={{ background: '#0097A922', color: '#006677' }}
        {...(withTestId ? { 'data-testid': 'badge-palpitado' } : {})}
      >
        ✓ PALPITADO
      </span>
    )
  }
  return (
    <span
      className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: '#FFF3CD', color: '#856404' }}
      {...(withTestId ? { 'data-testid': 'badge-aberto' } : {})}
    >
      ABERTO
    </span>
  )
}

export default function MatchRow({
  match,
  leagueId,
  homeInput,
  awayInput,
  onInputChange,
}: MatchRowProps) {
  const disabled = match.is_deadline_passed

  const badge: 'fechado' | 'palpitado' | 'aberto' = match.is_deadline_passed
    ? 'fechado'
    : match.prediction !== null
    ? 'palpitado'
    : 'aberto'

  const groupLabel = match.group ? `GRUPO ${match.group}` : match.phase.toUpperCase()

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm" data-testid="match-row">

      {/* ── MOBILE layout (same as UpcomingMatchesCard) ───────────────────── */}
      <div className="lg:hidden flex items-stretch gap-3 p-3">
        {/* Left: teams stacked */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <TeamFlag name={match.home_team} code={match.home_flag} size={28} />
            <span className="text-sm font-bold text-[#244C5A] truncate" data-testid="home-team-name">
              {match.home_team}
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <TeamFlag name={match.away_team} code={match.away_flag} size={28} />
            <span className="text-sm font-bold text-[#244C5A] truncate" data-testid="away-team-name">
              {match.away_team}
            </span>
          </div>
        </div>

        {/* Right: date/group + inputs + badge */}
        <div className="flex flex-col items-end justify-between shrink-0 gap-1.5">
          {/* Date + group */}
          <div className="text-right">
            <div className="text-[10px] text-slate-400 whitespace-nowrap">
              {formatShortDate(match.match_date)}
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {groupLabel}
            </div>
          </div>

          {/* Score inputs */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="–"
              value={homeInput}
              onChange={(e) => onInputChange(match.id, 'home', e.target.value)}
              disabled={disabled}
              className="w-9 h-8 text-center text-sm font-black text-[#244C5A] rounded-lg border border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 focus:outline-none focus:border-[#0097A9] bg-slate-50"
              aria-label={`Placar ${match.home_team}`}
              data-testid={`input-home-${match.id}`}
            />
            <span className="text-slate-300 text-xs font-black">×</span>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="–"
              value={awayInput}
              onChange={(e) => onInputChange(match.id, 'away', e.target.value)}
              disabled={disabled}
              className="w-9 h-8 text-center text-sm font-black text-[#244C5A] rounded-lg border border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 focus:outline-none focus:border-[#0097A9] bg-slate-50"
              aria-label={`Placar ${match.away_team}`}
              data-testid={`input-away-${match.id}`}
            />
          </div>

          {/* Status badge */}
          <StatusBadge badge={badge} withTestId={true} />
        </div>
      </div>

      {/* ── DESKTOP layout (group + datetime + status on top, horizontal teams) ── */}
      <div className="hidden lg:block p-4">
        {/* Top row */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[#244C5A] text-white shrink-0">
            {groupLabel}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400 flex-1 min-w-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span className="truncate">{formatMatchDateTime(match.match_date)}</span>
          </span>
          <StatusBadge badge={badge} />
        </div>

        {/* Middle: home | inputs | away */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <TeamFlag name={match.home_team} code={match.home_flag} />
            <div className="min-w-0">
              <div className="text-sm font-black text-[#244C5A] truncate" data-testid="home-team-name-lg">
                {match.home_team}
              </div>
              <div className="text-[10px] text-slate-400 uppercase">
                {match.home_flag?.toUpperCase() ?? ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="–"
              value={homeInput}
              onChange={(e) => onInputChange(match.id, 'home', e.target.value)}
              disabled={disabled}
              className="w-10 h-9 text-center text-sm font-black text-[#244C5A] rounded-lg border border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 focus:outline-none focus:border-[#0097A9] bg-slate-50"
              aria-label={`Placar ${match.home_team}`}
            />
            <span className="text-slate-400 text-xs font-black">×</span>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="–"
              value={awayInput}
              onChange={(e) => onInputChange(match.id, 'away', e.target.value)}
              disabled={disabled}
              className="w-10 h-9 text-center text-sm font-black text-[#244C5A] rounded-lg border border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 focus:outline-none focus:border-[#0097A9] bg-slate-50"
              aria-label={`Placar ${match.away_team}`}
            />
          </div>

          <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
            <div className="min-w-0 text-right">
              <div className="text-sm font-black text-[#244C5A] truncate" data-testid="away-team-name-lg">
                {match.away_team}
              </div>
              <div className="text-[10px] text-slate-400 uppercase">
                {match.away_flag?.toUpperCase() ?? ''}
              </div>
            </div>
            <TeamFlag name={match.away_team} code={match.away_flag} />
          </div>
        </div>

        {/* Bottom: scoring info + details link */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Placar exato: +10 pts · Vencedor/empate: +5 pts
          </span>
          <Link
            href={`/ligas/${leagueId}/palpites/${match.id}`}
            className="text-[10px] font-bold text-[#0097A9] hover:underline shrink-0 ml-2"
          >
            Detalhes →
          </Link>
        </div>
      </div>

      {/* Mobile: details link footer */}
      <div className="lg:hidden flex items-center justify-between px-3 pb-2.5 pt-0">
        <span className="flex items-center gap-1 text-[10px] text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          +10 pts exato · +5 pts vencedor
        </span>
        <Link
          href={`/ligas/${leagueId}/palpites/${match.id}`}
          className="text-[10px] font-bold text-[#0097A9] hover:underline shrink-0"
          data-testid="details-link"
        >
          Detalhes →
        </Link>
      </div>
    </div>
  )
}
