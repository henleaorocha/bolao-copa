'use client'

export type DateFilter = 'all' | 'today' | 'tomorrow'

interface PalpitesFiltersProps {
  activeDate: DateFilter
  onDateChange: (date: DateFilter) => void
  activeGroup: string
  onGroupChange: (group: string) => void
  dateCounts: { all: number; today: number; tomorrow: number }
}

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

const DATE_TABS: { key: DateFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'today', label: 'Hoje' },
  { key: 'tomorrow', label: 'Amanhã' },
]

export default function PalpitesFilters({
  activeDate,
  onDateChange,
  activeGroup,
  onGroupChange,
  dateCounts,
}: PalpitesFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Date tabs */}
      <div className="flex gap-2 flex-wrap">
        {DATE_TABS.map(({ key, label }) => {
          const count = dateCounts[key]
          const isActive = activeDate === key
          return (
            <button
              key={key}
              onClick={() => onDateChange(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                isActive
                  ? 'bg-[#0097A9] text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-[#0097A9]'
              }`}
              data-testid={`date-tab-${key}`}
            >
              {label}
              <span className={`text-xs ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                ({count})
              </span>
            </button>
          )
        })}
      </div>

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
