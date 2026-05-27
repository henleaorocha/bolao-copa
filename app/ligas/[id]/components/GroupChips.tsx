'use client'

import { useState } from 'react'

interface GroupChipsProps {
  groups: string[]
}

export default function GroupChips({ groups }: GroupChipsProps) {
  const [active, setActive] = useState<string | null>(null)

  function handleChipClick(letter: string) {
    setActive(letter)
    const id = `grupo-${letter.toLowerCase()}`
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="lg:hidden w-full overflow-x-auto py-2" data-testid="group-chips-row">
      <div className="flex gap-2 px-4 w-max">
        {groups.map((letter) => {
          const isActive = active === letter
          return (
            <button
              key={letter}
              onClick={() => handleChipClick(letter)}
              data-testid={`group-chip-${letter}`}
              aria-pressed={isActive}
              className={[
                'px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-colors min-w-[36px]',
                isActive
                  ? 'bg-[#0097A9] text-white'
                  : 'bg-slate-100 text-[#244C5A] hover:bg-slate-200',
              ].join(' ')}
            >
              {letter}
            </button>
          )
        })}
      </div>
    </div>
  )
}
