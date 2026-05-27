import Image from 'next/image'
import type { TeamStanding } from '@/lib/standings'

interface StandingsRowProps {
  standing: TeamStanding
}

export function StandingsRow({ standing }: StandingsRowProps) {
  const { position, flag, team, points, played, won, drawn, lost, goalsFor, goalsAgainst, goalDiff } = standing
  const isQualifying = position <= 2

  return (
    <div
      className={[
        'flex items-center px-3 py-2 text-xs',
        isQualifying
          ? 'border-l-4 border-[#0097A9] bg-[#0097A9]/5'
          : 'border-l-4 border-transparent',
      ].join(' ')}
      data-testid="standings-row"
      data-qualifying={isQualifying}
    >
      {/* Position */}
      <span
        className="w-6 text-center font-black text-[#244C5A] shrink-0"
        data-testid="col-pos"
        aria-label={`Posição ${position}`}
      >
        {position}
      </span>

      {/* Flag */}
      <div className="w-8 shrink-0 mx-1.5">
        {flag ? (
          <Image
            src={`https://flagcdn.com/w80/${flag}.png`}
            alt={team}
            width={32}
            height={24}
            className="rounded object-cover"
          />
        ) : (
          <div
            className="w-8 h-6 rounded bg-slate-200"
            aria-hidden="true"
            data-testid="flag-placeholder"
          />
        )}
      </div>

      {/* Team name */}
      <span
        className="flex-1 min-w-0 font-bold text-[#244C5A] truncate"
        data-testid="col-team"
      >
        {team}
      </span>

      {/* Pts */}
      <span className="w-8 text-center font-black text-[#244C5A] shrink-0" data-testid="col-pts">
        {points}
      </span>

      {/* J */}
      <span className="w-6 text-center text-slate-600 shrink-0" data-testid="col-j">
        {played}
      </span>

      {/* V — hidden on mobile */}
      <span className="hidden sm:inline-block w-6 text-center text-slate-600 shrink-0" data-testid="col-v">
        {won}
      </span>

      {/* E — hidden on mobile */}
      <span className="hidden sm:inline-block w-6 text-center text-slate-600 shrink-0" data-testid="col-e">
        {drawn}
      </span>

      {/* D — hidden on mobile */}
      <span className="hidden sm:inline-block w-6 text-center text-slate-600 shrink-0" data-testid="col-d">
        {lost}
      </span>

      {/* GP — hidden on mobile */}
      <span className="hidden sm:inline-block w-7 text-center text-slate-600 shrink-0" data-testid="col-gp">
        {goalsFor}
      </span>

      {/* GC — hidden on mobile */}
      <span className="hidden sm:inline-block w-7 text-center text-slate-600 shrink-0" data-testid="col-gc">
        {goalsAgainst}
      </span>

      {/* SG — always visible */}
      <span className="w-7 text-center text-slate-600 shrink-0" data-testid="col-sg">
        {goalDiff > 0 ? `+${goalDiff}` : goalDiff}
      </span>
    </div>
  )
}
