'use client'

import { useState } from 'react'
import { Flame, Crown, CalendarDays } from 'lucide-react'
import { BET_DEADLINE } from '@/lib/copa-teams'
import PreCopaBetModal from '@/components/PreCopaBetModal'

interface ChampionBannerProps {
  has_champion_bet: boolean
  leagueId: string
  onBetComplete: () => void
}

function getCountdown(deadline: Date): { days: number; hours: number; isPast: boolean } {
  const ms = deadline.getTime() - Date.now()
  if (ms <= 0) return { days: 0, hours: 0, isPast: true }
  const totalHours = Math.floor(ms / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  return { days, hours, isPast: false }
}

export default function ChampionBanner({ has_champion_bet, leagueId, onBetComplete }: ChampionBannerProps) {
  const [showModal, setShowModal] = useState(false)
  const { days, hours, isPast } = getCountdown(BET_DEADLINE)

  if (isPast) return null

  function handleComplete() {
    setShowModal(false)
    onBetComplete()
  }

  return (
    <>
      <div
        className="w-full rounded-[28px] p-6 relative overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg, #244C5A 0%, #1a3a47 100%)' }}
      >
        {/* Decorative glow */}
        <div
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: '#0097A9' }}
        />
        {/* Watermark number */}
        <div
          className="absolute -bottom-10 -right-2 font-black opacity-[0.06] select-none pointer-events-none leading-none"
          style={{ fontSize: '9rem', color: '#FFC72C' }}
        >
          {days}
        </div>

        <div className="relative z-10 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <div
              className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2 flex items-center gap-1.5"
              style={{ color: '#FFC72C' }}
            >
              <Flame size={12} />
              Atenção · Palpite de campeão fecha em
            </div>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black leading-none">{days}</span>
              <span className="text-sm opacity-70 mb-1">dias · {hours}h</span>
            </div>
            <div className="text-xs opacity-60 mt-2 flex items-center gap-1.5">
              <CalendarDays size={12} />
              México × África do Sul · 11/6 · 19:00
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-3 rounded-2xl font-black text-sm shadow-xl hover:scale-105 transition flex items-center gap-2 shrink-0"
            style={{ background: '#FFC72C', color: '#244C5A' }}
          >
            <Crown size={16} strokeWidth={2.5} />
            {has_champion_bet ? 'Revisar Aposta' : 'Apostar Campeão'}
          </button>
        </div>
      </div>

      {showModal && (
        <PreCopaBetModal leagueId={leagueId} onComplete={handleComplete} />
      )}
    </>
  )
}
