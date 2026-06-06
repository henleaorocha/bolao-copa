'use client'

import Link from 'next/link'
import type { MatchWithPrediction } from '@/lib/api/types'
import { groupMatchStatus, type MatchStatus } from '@/components/match/matchStatus'
import StatusBadge from '@/components/match/StatusBadge'
import TeamRow from '@/components/match/TeamRow'
import ScoreInputs from '@/components/match/ScoreInputs'
import FinalResult from '@/components/match/FinalResult'

interface MatchRowProps {
  match: MatchWithPrediction
  leagueId: string
  homeInput: string
  awayInput: string
  onInputChange: (matchId: string, side: 'home' | 'away', value: string) => void
}

const TZ = 'America/Sao_Paulo'

// Palpites keeps its original badge test ids (`badge-aberto/palpitado/fechado`); the new
// finished state uses `badge-finished` (no prior Palpites id existed). Group matches never
// yield `placeholder`, but the map is total to stay type-safe.
const BADGE_TEST_ID: Record<MatchStatus, string> = {
  placeholder: 'badge-placeholder',
  open: 'badge-aberto',
  predicted: 'badge-palpitado',
  locked: 'badge-fechado',
  finished: 'badge-finished',
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

export default function MatchRow({
  match,
  leagueId,
  homeInput,
  awayInput,
  onInputChange,
}: MatchRowProps) {
  const status = groupMatchStatus(match)
  const isOpen = status === 'open' || status === 'predicted'
  const isFinished = status === 'finished'
  const disabled = !isOpen

  const prediction = match.prediction
    ? { home: match.prediction.predicted_home_score, away: match.prediction.predicted_away_score }
    : null

  const groupLabel = match.group ? `GRUPO ${match.group}` : match.phase.toUpperCase()
  const badgeTestId = BADGE_TEST_ID[status]

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm" data-testid="match-row">

      {/* ── MOBILE layout (same as UpcomingMatchesCard) ───────────────────── */}
      <div className="lg:hidden flex items-stretch gap-3 p-3">
        {/* Left: teams stacked */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-2.5">
          <TeamRow name={match.home_team} flag={match.home_flag} nameTestId="home-team-name" />
          <TeamRow name={match.away_team} flag={match.away_flag} nameTestId="away-team-name" />
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

          {/* Score inputs (hidden once the match is finished — FinalResult shows below) */}
          {!isFinished && (
            <ScoreInputs
              matchId={match.id}
              homeInput={homeInput}
              awayInput={awayInput}
              onInputChange={onInputChange}
              disabled={disabled}
              homeAriaLabel={`Placar ${match.home_team}`}
              awayAriaLabel={`Placar ${match.away_team}`}
              size="sm"
            />
          )}

          {/* Status badge */}
          <StatusBadge status={status} testId={badgeTestId} />
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
          <StatusBadge status={status} testId={`${badgeTestId}-lg`} />
        </div>

        {/* Middle: home | inputs | away */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <TeamRow name={match.home_team} flag={match.home_flag} size={32} nameTestId="home-team-name-lg" />
          </div>

          {!isFinished && (
            <ScoreInputs
              matchId={match.id}
              homeInput={homeInput}
              awayInput={awayInput}
              onInputChange={onInputChange}
              disabled={disabled}
              homeAriaLabel={`Placar ${match.home_team}`}
              awayAriaLabel={`Placar ${match.away_team}`}
              size="md"
              testIdSuffix="-lg"
            />
          )}

          <div className="flex-1 flex justify-end min-w-0">
            <TeamRow name={match.away_team} flag={match.away_flag} size={32} nameTestId="away-team-name-lg" />
          </div>
        </div>

        {/* Bottom: scoring info + details link (hidden once finished) */}
        {!isFinished && (
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
        )}
      </div>

      {/* Finished result — rendered once for both layouts (avoids duplicate test ids) */}
      {isFinished && (
        <div className="px-3 lg:px-4 pb-2">
          <FinalResult homeScore={match.home_score} awayScore={match.away_score} prediction={prediction} />
        </div>
      )}

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
