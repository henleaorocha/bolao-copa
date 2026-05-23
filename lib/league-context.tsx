'use client'

import { createContext, useContext, useState, useMemo, ReactNode } from 'react'
import type { LeagueSummary } from './api/types'

export interface LeagueContextValue {
  league: LeagueSummary
  setLeague: (league: LeagueSummary) => void
}

const LeagueContext = createContext<LeagueContextValue | null>(null)

export interface LeagueProviderProps {
  initialLeague: LeagueSummary
  children: ReactNode
}

export function LeagueProvider({ initialLeague, children }: LeagueProviderProps) {
  const [league, setLeague] = useState<LeagueSummary>(initialLeague)

  const value = useMemo<LeagueContextValue>(
    () => ({ league, setLeague }),
    [league]
  )

  return (
    <LeagueContext.Provider value={value}>
      {children}
    </LeagueContext.Provider>
  )
}

export function useLeague(): LeagueContextValue {
  const context = useContext(LeagueContext)
  if (context === null) {
    throw new Error(
      'useLeague() must be called within a <LeagueProvider>. ' +
      'Ensure your component tree is wrapped with LeagueProvider at the root layout.'
    )
  }
  return context
}
