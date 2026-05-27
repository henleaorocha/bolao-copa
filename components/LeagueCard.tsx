'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Users } from 'lucide-react'
import type { LeagueHubItem } from '@/lib/api/types'

const SHIELD_COLORS = ['#FFC72C', '#0097A9', '#244C5A', '#7E4FE3', '#16A34A', '#FB923C']

// Groups the alphabet into blocks of 5 (A–E→0, F–J→1, …, P–T→3, U–Y→4, Z→5)
// so the 6-color palette is distributed evenly across league name initials.
export function getShieldColor(name: string): string {
  const firstChar = (name[0] || 'A').toUpperCase()
  const pos = Math.max(0, firstChar.charCodeAt(0) - 65)
  return SHIELD_COLORS[Math.floor(pos / 5) % SHIELD_COLORS.length]
}

// "Igor Henrique Silva" → "Igor H." ; single-word names stay as-is.
export function shortOwnerName(name: string | null): string | null {
  if (!name) return null
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return null
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`
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
  const owner = shortOwnerName(league.owner_name)

  return (
    <div className="flex h-full flex-col rounded-2xl bg-white p-5 shadow-sm">
      <div
        data-testid="league-shield"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white"
        style={{ backgroundColor: shieldColor }}
        aria-hidden="true"
      >
        {league.name[0]?.toUpperCase()}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <h3 className="truncate text-lg font-bold text-[#1F3A44]">{league.name}</h3>
        {league.is_main && (
          <span
            data-testid="principal-badge"
            className="shrink-0 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800"
          >
            PRINCIPAL
          </span>
        )}
      </div>

      <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
        <Users aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span>{league.member_count} participantes</span>
        {owner && (
          <>
            <span aria-hidden="true">·</span>
            <span className="truncate">{owner}</span>
          </>
        )}
      </p>

      {error && (
        <p className="mt-2 text-xs text-red-600">Erro ao entrar na liga. Tente novamente.</p>
      )}

      <div className="mt-4 border-t border-gray-100 pt-3 md:mt-auto">
        <button
          onClick={handleEntrar}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-[#0097A9] transition-colors hover:text-[#007a8a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0097A9] disabled:opacity-50"
        >
          {loading ? (
            'Entrando...'
          ) : (
            <>
              ENTRAR <span aria-hidden="true">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
