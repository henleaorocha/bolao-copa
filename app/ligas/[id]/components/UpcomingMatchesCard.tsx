'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { MatchWithPrediction } from '@/lib/api/types'

interface UpcomingMatchesCardProps {
  leagueId: string
}

function TeamFlag({ name, code }: { name: string; code: string | null }) {
  const [imgError, setImgError] = useState(false)
  if (!code || imgError) {
    return <div className="w-8 h-6 rounded bg-slate-200 shrink-0" aria-hidden="true" />
  }
  return (
    <Image
      src={`https://flagcdn.com/w80/${code}.png`}
      alt={name}
      width={32}
      height={24}
      className="rounded object-cover shrink-0"
      onError={() => setImgError(true)}
    />
  )
}

function SkeletonCard() {
  return (
    <div className="animate-pulse flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-6 rounded bg-slate-200 shrink-0" />
          <div className="h-3 bg-slate-200 rounded w-32" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-6 rounded bg-slate-200 shrink-0" />
          <div className="h-3 bg-slate-200 rounded w-24" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="h-3 bg-slate-200 rounded w-16" />
        <div className="h-4 bg-slate-200 rounded w-14" />
      </div>
    </div>
  )
}

const TZ = 'America/Sao_Paulo'

function formatMatchDate(matchDate: string): string {
  const d = new Date(matchDate)
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: TZ })
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  return `${date} · ${time}`
}

export default function UpcomingMatchesCard({ leagueId }: UpcomingMatchesCardProps) {
  const [matches, setMatches] = useState<MatchWithPrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetch(`/api/leagues/${leagueId}/matches?next=4`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('Falha ao carregar partidas')
        const body = await res.json()
        setMatches(body.data.matches)
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          setError('Não foi possível carregar os próximos jogos.')
        }
      })
      .finally(() => {
        setLoading(false)
      })

    return () => controller.abort()
  }, [leagueId])

  return (
    <div className="w-full rounded-[28px] bg-white border border-slate-100 shadow-sm p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-black text-[#244C5A] leading-tight">Próximos jogos</h3>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Palpite antes do prazo
          </div>
        </div>
        <Link
          href={`/ligas/${leagueId}/palpites`}
          className="text-xs font-bold text-[#0097A9] hover:underline shrink-0"
        >
          Ver Todos
        </Link>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-1" data-testid="loading-skeleton">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <p className="text-sm text-red-500 py-4 text-center" data-testid="error-state">
          {error}
        </p>
      )}

      {/* Empty state */}
      {!loading && !error && matches.length === 0 && (
        <p className="text-sm text-slate-500 py-4 text-center">
          Nenhum jogo próximo encontrado.
        </p>
      )}

      {/* Match list */}
      {!loading && !error && matches.length > 0 && (
        <div className="space-y-3">
          {matches.map((match) => (
            <Link
              key={match.id}
              href={`/ligas/${leagueId}/palpites/${match.id}`}
              className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
              data-testid="match-card"
            >
              {/* Teams */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <TeamFlag name={match.home_team} code={match.home_flag} />
                  <span className="text-sm font-bold text-[#244C5A] truncate">
                    {match.home_team}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TeamFlag name={match.away_team} code={match.away_flag} />
                  <span className="text-sm font-bold text-[#244C5A] truncate">
                    {match.away_team}
                  </span>
                </div>
              </div>

              {/* Meta + prediction + badge */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="text-[10px] text-slate-500">{formatMatchDate(match.match_date)}</div>
                {match.group && (
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Grupo {match.group}
                  </div>
                )}
                <div className="text-xs font-black text-[#244C5A]" data-testid="prediction-display">
                  {match.prediction
                    ? `${match.prediction.predicted_home_score} × ${match.prediction.predicted_away_score}`
                    : '–'}
                </div>
                {match.is_deadline_passed ? (
                  <span
                    className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-200 text-slate-500"
                    data-testid="badge-fechado"
                  >
                    FECHADO
                  </span>
                ) : (
                  <span
                    className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ background: '#0097A922', color: '#006677' }}
                    data-testid="badge-aberto"
                  >
                    ABERTO
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
