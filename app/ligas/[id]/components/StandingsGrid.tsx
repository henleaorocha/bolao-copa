import type { GroupStanding } from '@/lib/standings'
import GroupChips from './GroupChips'
import { GroupCard } from './GroupCard'

interface StandingsGridProps {
  standings: GroupStanding[]
}

export default function StandingsGrid({ standings }: StandingsGridProps) {
  const sorted = [...standings].sort((a, b) => a.group.localeCompare(b.group))
  const groups = sorted.map((s) => s.group)

  return (
    <div>
      <GroupChips groups={groups} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4" data-testid="standings-grid">
        {sorted.map((standing) => (
          <GroupCard key={standing.group} standing={standing} />
        ))}
      </div>
    </div>
  )
}
