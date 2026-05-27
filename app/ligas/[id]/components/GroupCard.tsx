import type { GroupStanding } from '@/lib/standings'
import { StandingsRow } from './StandingsRow'

interface GroupCardProps {
  standing: GroupStanding
}

export function GroupCard({ standing }: GroupCardProps) {
  const { group, teams } = standing
  const anchorId = `grupo-${group.toLowerCase()}`

  return (
    <div
      id={anchorId}
      className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-white scroll-mt-4"
      data-testid={`group-card-${group}`}
    >
      {/* Dark header */}
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{ backgroundColor: '#1C3A45' }}
      >
        <span
          className="text-sm font-black text-white uppercase tracking-wide"
          data-testid="group-label"
        >
          GRUPO {group}
        </span>
        <span
          className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ backgroundColor: '#FFB800', color: '#1C3A45' }}
          data-testid="team-count-badge"
        >
          4 SELEÇÕES
        </span>
      </div>

      {/* Column labels */}
      <div className="flex items-center px-3 py-1 bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wide text-slate-400">
        <span className="w-6 text-center shrink-0">Pos</span>
        <span className="w-8 shrink-0 mx-1.5" />
        <span className="flex-1 min-w-0">SELEÇÃO</span>
        <span className="w-8 text-center shrink-0">PTS</span>
        <span className="w-6 text-center shrink-0">J</span>
        <span className="hidden sm:inline-block w-6 text-center shrink-0">V</span>
        <span className="hidden sm:inline-block w-6 text-center shrink-0">E</span>
        <span className="hidden sm:inline-block w-6 text-center shrink-0">D</span>
        <span className="hidden sm:inline-block w-7 text-center shrink-0">GP</span>
        <span className="hidden sm:inline-block w-7 text-center shrink-0">GC</span>
        <span className="w-7 text-center shrink-0">SG</span>
      </div>

      {/* Team rows */}
      <div className="divide-y divide-slate-50">
        {teams.map((team) => (
          <StandingsRow key={team.team} standing={team} />
        ))}
      </div>
    </div>
  )
}
