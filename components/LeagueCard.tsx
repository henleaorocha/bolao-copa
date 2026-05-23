'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { LeagueHubItem } from '@/lib/api/types'

const SHIELD_COLORS = ['#FFC72C', '#0097A9', '#244C5A', '#7E4FE3', '#16A34A', '#FB923C']

// Groups the alphabet into blocks of 5 (A–E→0, F–J→1, …, P–T→3, U–Y→4, Z→5)
// so the 6-color palette is distributed evenly across league name initials.
export function getShieldColor(name: string): string {
  const firstChar = (name[0] || 'A').toUpperCase()
  const pos = Math.max(0, firstChar.charCodeAt(0) - 65)
  return SHIELD_COLORS[Math.floor(pos / 5) % SHIELD_COLORS.length]
}

export interface LeagueCardProps {
  league: LeagueHubItem
}

export default function LeagueCard({ league }: LeagueCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function handleEntrar() {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_league_id: league.id }),
      })

      if (res.ok) {
        router.push(`/ligas/${league.id}`)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const shieldColor = getShieldColor(league.name)

  return (
    <div className="flex flex-col rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          data-testid="league-shield"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-xl font-bold text-white"
          style={{ backgroundColor: shieldColor }}
          aria-hidden="true"
        >
          {league.name[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-bold text-gray-900">{league.name}</h3>
            {league.is_main && (
              <span
                data-testid="principal-badge"
                className="shrink-0 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800"
              >
                PRINCIPAL
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{league.member_count} participantes</p>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600">Erro ao entrar na liga. Tente novamente.</p>
      )}
      <button
        onClick={handleEntrar}
        disabled={loading}
        className="mt-3 md:mt-auto w-full rounded-lg bg-[#0097A9] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#007a8a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0097A9] disabled:opacity-50"
      >
        {loading ? 'Entrando...' : 'ENTRAR →'}
      </button>
    </div>
  )
}
