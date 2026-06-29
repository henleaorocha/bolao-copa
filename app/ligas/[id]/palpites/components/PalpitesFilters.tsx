'use client'

interface PalpitesFiltersProps {
  activeGroup: string
  onGroupChange: (group: string) => void
}

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export default function PalpitesFilters({
  activeGroup,
  onGroupChange,
}: PalpitesFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Group chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => onGroupChange('all')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-colors ${
            activeGroup === 'all'
              ? 'bg-[#244C5A] text-white'
              : 'bg-white text-slate-500 border border-slate-200 hover:border-[#244C5A]'
          }`}
          data-testid="group-chip-all"
        >
          TODOS
        </button>
        {GROUPS.map((g) => (
          <button
            key={g}
            onClick={() => onGroupChange(g)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-colors ${
              activeGroup === g
                ? 'bg-[#244C5A] text-white'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-[#244C5A]'
            }`}
            data-testid={`group-chip-${g}`}
          >
            GRUPO {g}
          </button>
        ))}
      </div>
    </div>
  )
}
