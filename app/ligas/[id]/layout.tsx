'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { LeaguePanelProvider, useLeaguePanel } from './league-panel-context'
import PainelSidebar from './components/PainelSidebar'
import PainelTopBar from './components/PainelTopBar'
import BottomTabBar from './components/BottomTabBar'

function Shell({ children }: { children: ReactNode }) {
  const params = useParams()
  const leagueId = params.id as string
  const { league, currentUser, isLoading, error } = useLeaguePanel()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Carregando...</p>
      </div>
    )
  }

  if (error || !league || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-red-600 font-semibold mb-4">{error || 'Liga não encontrada'}</p>
          <Link
            href="/ligas"
            className="px-6 py-3 bg-yellow-400 rounded-xl font-semibold text-slate-900 hover:bg-yellow-500"
          >
            Voltar para Ligas
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen lg:h-screen lg:overflow-hidden bg-slate-50">
      <div className="hidden lg:flex lg:h-screen lg:shrink-0">
        <PainelSidebar
          leagueId={leagueId}
          leagueName={league.name}
          leagueLogoUrl={league.logo_url}
          inviteToken={league.invite_token}
          currentUserName={currentUser.full_name}
          currentUserAvatarColor={currentUser.avatar_color}
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col min-h-screen lg:min-h-0 lg:h-screen">
        <div className="lg:hidden">
          <PainelTopBar
            leagueName={league.name}
            leagueLogoUrl={league.logo_url}
            inviteToken={league.invite_token}
            currentUserName={currentUser.full_name}
            currentUserAvatarColor={currentUser.avatar_color}
          />
        </div>

        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden pb-24 lg:pb-0">
          {children}
        </main>

        <div className="flex lg:hidden">
          <BottomTabBar leagueId={leagueId} />
        </div>
      </div>
    </div>
  )
}

export default function LeagueLayout({ children }: { children: ReactNode }) {
  return (
    <LeaguePanelProvider>
      <Shell>{children}</Shell>
    </LeaguePanelProvider>
  )
}
