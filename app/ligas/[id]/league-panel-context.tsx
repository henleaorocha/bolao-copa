'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import type { LeagueDetail, AuthUser } from '@/lib/api/types'

interface LeaguePanelContextValue {
  league: LeagueDetail | null
  currentUser: AuthUser | null
  isLoading: boolean
  error: string | null
  refetchLeague: () => Promise<void>
}

const LeaguePanelCtx = createContext<LeaguePanelContextValue | null>(null)

export function LeaguePanelProvider({ children }: { children: ReactNode }) {
  const params = useParams()
  const leagueId = params.id as string

  const [league, setLeague] = useState<LeagueDetail | null>(null)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [meRes, leagueRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(`/api/leagues/${leagueId}`),
      ])
      if (!meRes.ok) throw new Error('Sessão expirada')
      if (!leagueRes.ok) {
        const err = await leagueRes.json()
        throw new Error(err.error || 'Liga não encontrada')
      }
      const [meData, leagueData] = await Promise.all([meRes.json(), leagueRes.json()])
      setCurrentUser(meData.data.user)
      setLeague(leagueData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar liga')
    } finally {
      setIsLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <LeaguePanelCtx.Provider value={{ league, currentUser, isLoading, error, refetchLeague: fetchData }}>
      {children}
    </LeaguePanelCtx.Provider>
  )
}

export function useLeaguePanel() {
  const ctx = useContext(LeaguePanelCtx)
  if (!ctx) throw new Error('useLeaguePanel must be used within LeaguePanelProvider')
  return ctx
}
