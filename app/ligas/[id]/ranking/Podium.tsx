'use client'

import { Crown } from 'lucide-react'
import type { RankingFullEntry } from '@/lib/api/types'

interface PodiumProps {
  entries: RankingFullEntry[]
}

const PODIUM_COLORS: Record<number, string> = {
  1: '#FFC72C',
  2: '#CBD5E1',
  3: '#FB923C',
}

const PODIUM_HEIGHTS: Record<number, number> = {
  1: 100,
  2: 70,
  3: 50,
}

export default function Podium({ entries }: PodiumProps) {
  const top3 = entries.slice(0, 3)
  const allZero = top3.length > 0 && top3.every((e) => e.points === 0)

  if (allZero) {
    return (
      <div
        className="rounded-[32px] p-8 text-center"
        style={{ background: 'linear-gradient(180deg, #244C5A 0%, #1a3a47 100%)' }}
        data-testid="podium-empty-state"
      >
        <Crown size={32} color="#FFC72C" className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-bold text-white/70">
          A pontuação começa quando os jogos rolarem
        </p>
      </div>
    )
  }

  // Visual order: 2nd | 1st | 3rd
  const visual = [top3[1], top3[0], top3[2]].filter(
    (e): e is RankingFullEntry => e != null,
  )

  return (
    <div
      className="rounded-[32px] p-6 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #244C5A 0%, #1a3a47 100%)' }}
    >
      <div className="flex items-end justify-center gap-3">
        {visual.map((entry) => {
          const initial = (entry.full_name ?? 'U').charAt(0).toUpperCase()
          const parts = (entry.full_name ?? 'Usuário').split(' ')
          const firstName = parts[0]
          const familyName = parts.slice(1).join(' ')
          const podiumColor = PODIUM_COLORS[entry.position]
          const podiumHeight = PODIUM_HEIGHTS[entry.position]
          const isFirst = entry.position === 1

          return (
            <div
              key={entry.user_id}
              className="flex flex-col items-center flex-1 min-w-0"
              style={{ maxWidth: 120 }}
              data-testid={`podium-entry-${entry.position}`}
            >
              <div className="relative mb-2 mt-8">
                {isFirst && (
                  <div
                    className="absolute -top-7 left-1/2 -translate-x-1/2"
                    data-testid="crown"
                  >
                    <Crown size={24} color="#FFC72C" fill="#FFC72C" />
                  </div>
                )}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-xl"
                  style={{ backgroundColor: entry.avatar_color }}
                  data-testid={`avatar-${entry.position}`}
                >
                  {initial}
                </div>
              </div>
              <div className="text-center mb-2 w-full min-w-0 px-1">
                <div className="text-xs font-bold text-white leading-tight truncate">
                  {firstName}
                </div>
                {familyName && (
                  <div className="text-xs text-white/60 truncate">{familyName}</div>
                )}
              </div>
              <div
                className="w-full rounded-t-2xl flex flex-col items-center justify-end pb-3 pt-2 font-black"
                style={{
                  backgroundColor: podiumColor,
                  height: podiumHeight,
                  color: isFirst ? '#244C5A' : 'white',
                }}
              >
                <div className="text-2xl leading-none">{entry.position}º</div>
                <div className="text-[10px] uppercase tracking-widest mt-1 opacity-80">
                  {entry.points} pts
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
