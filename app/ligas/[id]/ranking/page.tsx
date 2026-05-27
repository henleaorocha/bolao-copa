'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useLeaguePanel } from '../league-panel-context'
import type { RankingFullEntry } from '@/lib/api/types'
import Podium from './Podium'
import RankingTable from './RankingTable'
import PrizesStrip from '../components/PrizesStrip'

export default function RankingPage() {
  const params = useParams()
  const leagueId = params.id as string
  const { currentUser, league } = useLeaguePanel()

  const [ranking, setRanking] = useState<RankingFullEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetch(`/api/leagues/${leagueId}/ranking`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('Falha ao carregar ranking')
        const body = await res.json()
        setRanking(body.data.ranking)
        setLoading(false)
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          setError('Não foi possível carregar o ranking.')
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [leagueId])

  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-20"
        data-testid="loading-state"
      >
        <p className="text-slate-600">Carregando ranking...</p>
      </div>
    )
  }

  if (error || !ranking) {
    return (
      <div
        className="flex items-center justify-center py-20 p-4"
        data-testid="error-state"
      >
        <p className="text-red-600 font-semibold">
          {error ?? 'Erro ao carregar ranking.'}
        </p>
      </div>
    )
  }

  const myEntry = currentUser
    ? (ranking.find((e) => e.user_id === currentUser.id) ?? null)
    : null

  return (
    <div className="px-4 lg:px-8 py-6 space-y-4 max-w-full">
      <div data-testid="top-bar">
        <h1
          className="text-2xl font-black text-slate-900"
          data-testid="page-title"
        >
          Ranking
        </h1>
        <p
          className="text-sm text-slate-500 mt-1"
          data-testid="player-count-subtitle"
        >
          {ranking.length} {ranking.length === 1 ? 'jogador' : 'jogadores'}
        </p>
      </div>

      <div data-testid="podium-section">
        <Podium entries={ranking} />
      </div>

      <PrizesStrip prizes={league?.prizes ?? null} />

      {myEntry && (
        <div
          className="rounded-xl px-4 py-4"
          style={{ backgroundColor: '#244C5A' }}
          data-testid="sua-posicao-card"
        >
          <p className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-50 text-white">
            Sua posição
          </p>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white opacity-70"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                data-testid="sua-posicao-rank"
              >
                {myEntry.position}º
              </div>
              <div className="min-w-0">
                <p
                  className="text-sm font-bold text-white leading-tight truncate"
                  data-testid="sua-posicao-name"
                >
                  {myEntry.full_name ?? 'Você'}
                </p>
                <p
                  className="text-[10px] mt-0.5 text-white opacity-50"
                  data-testid="sua-posicao-exatos"
                >
                  {myEntry.exact_scores} exatos
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p
                className="text-2xl font-black leading-none"
                style={{ color: '#FFC72C' }}
                data-testid="sua-posicao-points"
              >
                {myEntry.points}
              </p>
              <p className="text-[10px] mt-0.5 text-white opacity-50">pts</p>
            </div>
          </div>
        </div>
      )}

      <RankingTable
        ranking={ranking}
        currentUserId={currentUser?.id ?? ''}
      />
    </div>
  )
}
