'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Crown, Medal } from 'lucide-react'
import { ALL_COPA_TEAMS } from '@/lib/copa-teams'
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

function getTeamCode(teamName: string): string | null {
  return ALL_COPA_TEAMS.find((t) => t.name === teamName)?.code ?? null
}

function MiniFlag({ teamName }: { teamName: string }) {
  const code = getTeamCode(teamName)
  const [imgError, setImgError] = useState(false)
  if (!code || imgError) {
    return (
      <span
        className="w-5 h-3.5 rounded-sm bg-slate-200 inline-block shrink-0"
        aria-hidden="true"
      />
    )
  }
  return (
    <Image
      src={`https://flagcdn.com/w80/${code}.png`}
      alt={teamName}
      width={20}
      height={14}
      className="rounded-sm object-cover shrink-0"
      onError={() => setImgError(true)}
    />
  )
}

function ChampionPick({
  champion,
  runnerUp,
}: {
  champion: string | null
  runnerUp: string | null
}) {
  if (!champion && !runnerUp) {
    return (
      <span className="text-[11px] text-slate-300" data-testid="pick-empty">
        —
      </span>
    )
  }
  return (
    <div className="flex flex-col gap-1" data-testid="pick-content">
      <div className="flex items-center gap-1.5 min-w-0" title={`Campeão: ${champion ?? '—'}`}>
        <Crown size={11} color="#FFC72C" fill="#FFC72C" className="shrink-0" />
        {champion ? <MiniFlag teamName={champion} /> : null}
        <span className="text-[11px] font-semibold text-slate-600 truncate" data-testid="pick-champion">
          {champion ?? '—'}
        </span>
      </div>
      <div className="flex items-center gap-1.5 min-w-0" title={`Vice: ${runnerUp ?? '—'}`}>
        <Medal size={11} color="#0097A9" className="shrink-0" />
        {runnerUp ? <MiniFlag teamName={runnerUp} /> : null}
        <span className="text-[11px] font-semibold text-slate-500 truncate" data-testid="pick-runner-up">
          {runnerUp ?? '—'}
        </span>
      </div>
    </div>
  )
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
  // Picks are revealed by the server only after betting closes (it nulls them
  // out beforehand), so the column simply follows whether any pick is present.
  const revealed = ranking.some((e) => e.champion_team || e.runner_up_team)

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm">
      <table className="w-full table-fixed">
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
            <th className="w-12 px-3 py-3 text-left">#</th>
            <th className="px-2 py-3 text-left">Jogador</th>
            {revealed && (
              <th
                className="hidden lg:table-cell w-44 px-3 py-3 text-left"
                data-testid="pick-header"
              >
                Campeão / Vice
              </th>
            )}
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
            const hasPick = !!(entry.champion_team || entry.runner_up_team)
            return (
              <tr
                key={entry.user_id}
                className={`border-b border-slate-50 last:border-b-0 transition-colors ${isSelf ? 'bg-yellow-50' : 'hover:bg-slate-50'}`}
                data-testid={isSelf ? 'self-row' : 'member-row'}
              >
                <td className="px-3 py-3 align-top">
                  <PositionBadge position={entry.position} />
                </td>
                <td className="px-2 py-3 align-top">
                  <div className="flex items-center gap-2">
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
                      {revealed && hasPick && (
                        <div className="lg:hidden mt-1.5" data-testid="mobile-pick">
                          <ChampionPick
                            champion={entry.champion_team}
                            runnerUp={entry.runner_up_team}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                {revealed && (
                  <td
                    className="hidden lg:table-cell px-3 py-3 align-top"
                    data-testid="desktop-pick-cell"
                  >
                    <ChampionPick
                      champion={entry.champion_team}
                      runnerUp={entry.runner_up_team}
                    />
                  </td>
                )}
                <td
                  className="hidden lg:table-cell px-3 py-3 text-center text-sm font-bold text-slate-600 align-top"
                  data-testid="desktop-exact-cell"
                >
                  {entry.exact_scores}
                </td>
                <td
                  className="hidden lg:table-cell px-3 py-3 text-center text-sm font-bold text-slate-600 align-top"
                  data-testid="desktop-outcome-cell"
                >
                  {entry.correct_outcomes}
                </td>
                <td className="px-3 py-3 text-right text-sm font-bold text-slate-700 align-top">
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
