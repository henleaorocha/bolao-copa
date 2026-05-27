'use client'

import Link from 'next/link'
import type { RankingEntry } from '@/lib/api/types'

interface RankingCardProps {
  ranking: RankingEntry[]
  currentUserId: string
  leagueId: string
}

interface BadgeStyle {
  bg: string
  text: string
  testId: string
}

const BADGE_STYLES: Record<number, BadgeStyle> = {
  1: { bg: 'bg-yellow-400', text: 'text-yellow-900', testId: 'gold-badge' },
  2: { bg: 'bg-slate-300', text: 'text-slate-700', testId: 'silver-badge' },
  3: { bg: 'bg-orange-300', text: 'text-orange-900', testId: 'bronze-badge' },
}

function PositionBadge({ position }: { position: number }) {
  const style = BADGE_STYLES[position]
  if (style) {
    return (
      <span
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${style.bg} ${style.text}`}
        aria-label={style.testId}
        data-testid={style.testId}
      >
        {position}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
      {position}
    </span>
  )
}

export default function RankingCard({ ranking, currentUserId, leagueId }: RankingCardProps) {
  return (
    <div className="rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Ranking</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {ranking.map((entry) => {
          const isCurrentUser = entry.user_id === currentUserId
          const initials = (entry.full_name || 'U').charAt(0).toUpperCase()
          return (
            <div
              key={entry.user_id}
              className={`flex items-center gap-3 px-4 py-3 ${isCurrentUser ? 'bg-yellow-50' : ''}`}
            >
              <PositionBadge position={entry.position} />
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ backgroundColor: entry.avatar_color }}
              >
                {initials}
              </div>
              <span className="flex-1 text-sm font-semibold text-slate-900 truncate">
                {entry.full_name || 'Usuário'}
              </span>
              <span className="text-sm font-bold text-slate-700">{entry.points} pts</span>
            </div>
          )
        })}
      </div>
      <div className="px-4 py-3 border-t border-slate-100 text-right">
        <Link
          href={`/ligas/${leagueId}/ranking`}
          className="text-sm font-semibold text-yellow-600 hover:text-yellow-700 transition-colors"
        >
          Ver tudo →
        </Link>
      </div>
    </div>
  )
}
