'use client'

import { useEffect, useState } from 'react'
import type { MatchPlayerPredictions } from '@/lib/api/types'

interface PlayerPredictionsModalProps {
  leagueId: string
  matchId: string
  homeTeam: string
  awayTeam: string
  onClose: () => void
}

function formatPoints(points: number): string {
  const value = Number.isInteger(points) ? String(points) : points.toFixed(1)
  return points > 0 ? `+${value}` : value
}

export default function PlayerPredictionsModal({
  leagueId,
  matchId,
  homeTeam,
  awayTeam,
  onClose,
}: PlayerPredictionsModalProps) {
  const [data, setData] = useState<MatchPlayerPredictions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // The modal mounts fresh each time it opens and leagueId/matchId are stable
    // for its lifetime, so the initial loading/error state already applies — no
    // need to reset it synchronously here.
    const controller = new AbortController()

    fetch(`/api/leagues/${leagueId}/matches/${matchId}/predictions`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('Falha ao carregar palpites')
        const body = await res.json()
        setData(body.data as MatchPlayerPredictions)
        setLoading(false)
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          setError('Não foi possível carregar os palpites.')
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [leagueId, matchId])

  const players = data?.players ?? []
  const predictedCount = players.filter(
    (p) => p.predicted_home_score !== null && p.predicted_away_score !== null
  ).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      data-testid="player-predictions-overlay"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[80vh] flex flex-col"
        data-testid="player-predictions-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-[#244C5A]">Palpites dos jogadores</h2>
            <p className="text-xs text-slate-500 truncate">
              {data?.is_finished &&
              data.home_score !== null &&
              data.away_score !== null ? (
                <>
                  {homeTeam} <b className="text-[#244C5A]">{data.home_score} x {data.away_score}</b> {awayTeam}
                </>
              ) : (
                <>
                  {homeTeam} <span className="text-slate-300">×</span> {awayTeam}
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none shrink-0"
            data-testid="player-predictions-close"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1" data-testid="player-predictions-body">
          {loading ? (
            <div className="p-6 space-y-3" data-testid="player-predictions-loading">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
                  <div className="h-3 flex-1 rounded bg-slate-200 animate-pulse" />
                  <div className="h-3 w-12 rounded bg-slate-200 animate-pulse" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="p-6 text-sm text-red-600 text-center" data-testid="player-predictions-error">
              {error}
            </p>
          ) : players.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 text-center">
              Nenhum jogador nesta liga ainda.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {players.map((p) => {
                const initials = (p.full_name ?? 'U').charAt(0).toUpperCase()
                const hasPick =
                  p.predicted_home_score !== null && p.predicted_away_score !== null
                return (
                  <li
                    key={p.user_id}
                    className={`flex items-center gap-3 px-5 py-3 ${
                      p.is_current_user ? 'bg-yellow-50' : ''
                    }`}
                    data-testid="player-prediction-row"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: p.avatar_color }}
                      aria-hidden="true"
                    >
                      {initials}
                    </div>
                    <span className="flex-1 min-w-0 text-sm font-semibold text-slate-900 truncate">
                      {p.full_name ?? 'Usuário'}
                      {p.is_current_user && (
                        <span className="ml-1 text-[11px] font-bold text-[#0097A9]">(você)</span>
                      )}
                    </span>

                    {hasPick ? (
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-black text-[#244C5A] tabular-nums">
                          {p.predicted_home_score} <span className="text-slate-300 font-normal">x</span> {p.predicted_away_score}
                        </span>
                        {data?.is_finished && p.points !== null && (
                          <span
                            className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                              p.points > 0
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                            title={p.is_exact ? 'Placar exato' : undefined}
                          >
                            {formatPoints(p.points)}
                            {p.is_exact ? ' ✓' : ''}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic shrink-0">Sem palpite</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && players.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 text-[11px] text-slate-400">
            {predictedCount} de {players.length}{' '}
            {players.length === 1 ? 'jogador palpitou' : 'jogadores palpitaram'}
          </div>
        )}
      </div>
    </div>
  )
}
