'use client'

import { useState, useEffect } from 'react'
import { useLeague } from '@/lib/league-context'
import type { LeagueSummary, ApiResponse, AuthUser } from '@/lib/api/types'

export function LeagueSwitcher() {
  const { league: activeLeague, setLeague } = useLeague()
  const [leagues, setLeagues] = useState<LeagueSummary[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  // Fetch user's leagues on mount
  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        setIsFetching(true)
        const res = await fetch('/api/leagues')
        if (!res.ok) {
          console.error('[LeagueSwitcher] Failed to fetch leagues:', res.status)
          setIsFetching(false)
          return
        }
        const data: ApiResponse<LeagueSummary[]> = await res.json()
        if (data.status === 'success' && data.data) {
          setLeagues(data.data)
        }
      } catch (err) {
        console.error('[LeagueSwitcher] Error fetching leagues:', err)
      } finally {
        setIsFetching(false)
      }
    }

    fetchLeagues()
  }, [])

  const handleSelectLeague = async (leagueId: string) => {
    if (leagueId === activeLeague.id) {
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_league_id: leagueId }),
      })

      if (!res.ok) {
        console.error('[LeagueSwitcher] PATCH failed:', res.status)
        setIsLoading(false)
        return
      }

      const data: ApiResponse<{ user: Omit<AuthUser, 'created_at'>; league: LeagueSummary }> = await res.json()
      if (data.status === 'success' && data.data?.league) {
        setLeague(data.data.league)
        setIsOpen(false)
      }
    } catch (err) {
      console.error('[LeagueSwitcher] Error switching league:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching || !leagues.length) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100"
      >
        <span>{activeLeague.name}</span>
      </button>
    )
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span>{activeLeague.name}</span>
        <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded text-white"
              style={{ background: activeLeague.role === 'admin' ? '#FB923C' : '#0097A9' }}>
          {activeLeague.role === 'admin' ? 'Admin' : 'Membro'}
        </span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          <div className="py-1">
            {leagues.map((league) => (
              <button
                key={league.id}
                onClick={() => handleSelectLeague(league.id)}
                disabled={isLoading}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  league.id === activeLeague.id
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold">{league.name}</div>
                    <div className="text-xs text-slate-500">{league.member_count} membro{league.member_count !== 1 ? 's' : ''}</div>
                  </div>
                  {league.id === activeLeague.id && (
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
