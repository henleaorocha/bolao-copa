'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Crown, Medal } from 'lucide-react'
import { ALL_COPA_TEAMS, BET_DEADLINE } from '@/lib/copa-teams'
import type { ChampionBet } from '@/lib/api/types'
import PreCopaBetModal from '@/components/PreCopaBetModal'

interface YourBetCardProps {
  has_champion_bet: boolean
  champion_bet: ChampionBet | null
  leagueId: string
  onBetComplete: () => void
}

function getDaysRemaining(deadline: Date): number {
  const ms = deadline.getTime() - Date.now()
  if (ms <= 0) return 0
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function getTeamCode(teamName: string): string | null {
  return ALL_COPA_TEAMS.find(t => t.name === teamName)?.code ?? null
}

function TeamFlag({ teamName, code }: { teamName: string; code: string | null }) {
  const [imgError, setImgError] = useState(false)
  if (!code || imgError) {
    return <div className="w-8 h-6 rounded bg-slate-200 shrink-0" aria-hidden="true" />
  }
  return (
    <Image
      src={`https://flagcdn.com/w80/${code}.png`}
      alt={teamName}
      width={32}
      height={24}
      className="rounded object-cover shrink-0"
      onError={() => setImgError(true)}
    />
  )
}

export default function YourBetCard({
  has_champion_bet,
  champion_bet,
  leagueId,
  onBetComplete,
}: YourBetCardProps) {
  const [showModal, setShowModal] = useState(false)

  if (!has_champion_bet) return null

  const isBeforeDeadline = Date.now() < BET_DEADLINE.getTime()
  const daysRemaining = getDaysRemaining(BET_DEADLINE)
  const championCode = champion_bet ? getTeamCode(champion_bet.champion_team) : null
  const runnerUpCode = champion_bet ? getTeamCode(champion_bet.runner_up_team) : null

  function handleComplete() {
    setShowModal(false)
    onBetComplete()
  }

  return (
    <>
      <div className="w-full rounded-[28px] bg-white border border-slate-100 shadow-sm p-6 relative overflow-hidden h-full">
        {/* +50 PTS badge top-right */}
        <div className="absolute top-4 right-4">
          <span
            className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
            style={{ background: '#FFC72C22', color: '#B8860B' }}
          >
            +50 pts
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: '#FFC72C' }}
          >
            <Crown size={20} color="#244C5A" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-base font-black text-[#244C5A] leading-tight">Sua aposta</h3>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Campeão &amp; Vice
            </div>
          </div>
        </div>

        {champion_bet ? (
          <div className="space-y-2">
            {/* Champion row */}
            <div
              className="flex items-center gap-3 p-3 rounded-2xl"
              style={{ background: '#FFC72C18' }}
            >
              <TeamFlag teamName={champion_bet.champion_team} code={championCode} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Campeão
                </div>
                <div className="text-sm font-black text-[#244C5A] truncate">
                  {champion_bet.champion_team}
                </div>
              </div>
              <Crown size={18} color="#FFC72C" strokeWidth={2.5} className="shrink-0" />
            </div>

            {/* Runner-up row */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
              <TeamFlag teamName={champion_bet.runner_up_team} code={runnerUpCode} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Vice
                </div>
                <div className="text-sm font-black text-[#244C5A] truncate">
                  {champion_bet.runner_up_team}
                </div>
              </div>
              <Medal size={18} color="#0097A9" strokeWidth={2.5} className="shrink-0" />
            </div>

            {isBeforeDeadline && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-3 w-full py-2.5 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition"
              >
                Alterar aposta · {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'} restantes
              </button>
            )}
          </div>
        ) : (
          /* Bet placed but no data loaded yet — should not happen normally */
          <p className="text-sm text-slate-500">Carregando aposta...</p>
        )}
      </div>

      {showModal && (
        <PreCopaBetModal leagueId={leagueId} onComplete={handleComplete} />
      )}
    </>
  )
}
