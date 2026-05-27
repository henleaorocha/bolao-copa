'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import LeagueWelcomeModal from '@/components/LeagueWelcomeModal'
import PreCopaBetModal from '@/components/PreCopaBetModal'
import ChampionBanner from './components/ChampionBanner'
import PrizesStrip from './components/PrizesStrip'
import StatsRow from './components/StatsRow'
import YourBetCard from './components/YourBetCard'
import UpcomingMatchesCard from './components/UpcomingMatchesCard'
import RankingCard from './components/RankingCard'
import ScoringSchemeCard from './components/ScoringSchemeCard'
import { useLeaguePanel } from './league-panel-context'

export default function LeagueDetailPage() {
  const params = useParams()
  const leagueId = params.id as string
  const { league, currentUser, refetchLeague } = useLeaguePanel()

  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [showBetModal, setShowBetModal] = useState(false)
  const [modalInitialized, setModalInitialized] = useState(false)

  useEffect(() => {
    if (league && !modalInitialized) {
      setModalInitialized(true)
      setShowWelcomeModal(league.user_onboarded_at === null)
    }
  }, [league, modalInitialized])

  if (!league || !currentUser) return null

  return (
    <>
      <div className="p-4 lg:p-8">
        {/* User greeting + back button */}
        <div className="mb-4 lg:mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Olá, {currentUser.full_name?.split(' ')[0] ?? 'Você'}!
            </h1>
            <p className="text-sm text-slate-600 mt-1">{league.name}</p>
          </div>
          <Link
            href="/ligas"
            className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors shrink-0 mt-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Ligas
          </Link>
        </div>

        <div className="mb-4">
          <ChampionBanner
            has_champion_bet={league.has_champion_bet}
            leagueId={leagueId}
            onBetComplete={refetchLeague}
          />
        </div>

        <div className="mb-4">
          <PrizesStrip prizes={league.prizes} />
        </div>

        <div className="mb-4">
          <StatsRow user_stats={league.user_stats} member_count={league.member_count} />
        </div>

        <div className="mb-4 lg:grid lg:grid-cols-3 gap-6 space-y-4 lg:space-y-0">
          <div>
            <YourBetCard
              has_champion_bet={league.has_champion_bet}
              champion_bet={league.champion_bet}
              leagueId={leagueId}
              onBetComplete={refetchLeague}
            />
          </div>
          <div className="lg:col-span-2">
            <UpcomingMatchesCard leagueId={leagueId} />
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-2 gap-6 space-y-4 lg:space-y-0">
          <RankingCard
            ranking={league.ranking}
            currentUserId={currentUser.id}
          />
          <ScoringSchemeCard />
        </div>
      </div>

      {showWelcomeModal && (
        <LeagueWelcomeModal
          leagueName={league.name}
          inviteToken={league.invite_token}
          role={league.role}
          onComplete={() => {
            fetch(`/api/leagues/${leagueId}/me`, { method: 'PATCH' }).catch(() => {})
            setShowWelcomeModal(false)
            if (!league.has_champion_bet) {
              setShowBetModal(true)
            }
          }}
        />
      )}

      {showBetModal && (
        <PreCopaBetModal
          leagueId={leagueId}
          onComplete={() => {
            setShowBetModal(false)
            refetchLeague()
          }}
        />
      )}
    </>
  )
}
