'use client'

import type { RankingFullEntry } from '@/lib/api/types'

interface RankingTableProps {
  ranking: RankingFullEntry[]
  currentUserId: string
}

const BADGE_COLORS: Record<number, { bg: string; text: string; testId: string }> = {
  1: { bg: 'bg-yellow-400', text: 'text-yellow-900', testId: 'gold-badge' },
  2: { bg: 'bg-slate-300', text: 'text-slate-700', testId: 'silver-badge' },
  3: { bg: 'bg-orange-300', text: 'text-orange-900', testId: 'bronze-badge' },
}

function PositionBadge({ position }: { position: number }) {
  const style = BADGE_COLORS[position]
  if (style) {
    return (
      <span
        className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-black ${style.bg} ${style.text}`}
        data-testid={style.testId}
      >
        {position}º
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-semibold bg-slate-100 text-slate-400"
      data-testid="neutral-badge"
    >
      {position}º
    </span>
  )
}

export default function RankingTable({ ranking, currentUserId }: RankingTableProps) {
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm">
      <table className="w-full table-fixed">
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
            <th className="w-12 px-3 py-3 text-left">#</th>
            <th className="px-2 py-3 text-left">Jogador</th>
            <th
              className="hidden lg:table-cell w-16 px-3 py-3 text-center"
              data-testid="exatos-header"
            >
              Exatos
            </th>
            <th
              className="hidden lg:table-cell w-20 px-3 py-3 text-center"
              data-testid="acertos-header"
            >
              Acertos
            </th>
            <th className="w-20 px-3 py-3 text-right">Pontos</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((entry) => {
            const isSelf = entry.user_id === currentUserId
            const initial = (entry.full_name ?? 'U').charAt(0).toUpperCase()
            return (
              <tr
                key={entry.user_id}
                className={`border-b border-slate-50 last:border-b-0 transition-colors ${isSelf ? 'bg-yellow-50' : 'hover:bg-slate-50'}`}
                data-testid={isSelf ? 'self-row' : 'member-row'}
              >
                <td className="px-3 py-3">
                  <PositionBadge position={entry.position} />
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                      style={{ backgroundColor: entry.avatar_color }}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {entry.full_name ?? 'Usuário'}
                        </span>
                        {isSelf && (
                          <span
                            className="inline-flex items-center flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800"
                            data-testid="voce-badge"
                          >
                            Você
                          </span>
                        )}
                      </div>
                      <div
                        className="lg:hidden text-[10px] text-slate-400 mt-0.5"
                        data-testid="mobile-subtext"
                      >
                        <span data-testid="mobile-exact-count">{entry.exact_scores}</span>{' '}
                        exatos ·{' '}
                        <span data-testid="mobile-outcome-count">{entry.correct_outcomes}</span>{' '}
                        acertos
                      </div>
                    </div>
                  </div>
                </td>
                <td
                  className="hidden lg:table-cell px-3 py-3 text-center text-sm font-bold text-slate-600"
                  data-testid="desktop-exact-cell"
                >
                  {entry.exact_scores}
                </td>
                <td
                  className="hidden lg:table-cell px-3 py-3 text-center text-sm font-bold text-slate-600"
                  data-testid="desktop-outcome-cell"
                >
                  {entry.correct_outcomes}
                </td>
                <td className="px-3 py-3 text-right text-sm font-bold text-slate-700">
                  {entry.points} pts
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
