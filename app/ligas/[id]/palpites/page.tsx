'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import type { MatchWithPrediction } from '@/lib/api/types'
import PalpitesFilters, { type DateFilter } from './components/PalpitesFilters'
import MatchRow from './components/MatchRow'
import { Save } from 'lucide-react'

interface InputValues {
  [matchId: string]: { home: string; away: string }
}

const TZ = 'America/Sao_Paulo'

function getLocalDateStr(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: TZ })
}

function formatSectionHeader(matchDate: string): string {
  const d = new Date(matchDate)
  const weekday = d
    .toLocaleDateString('pt-BR', { weekday: 'long', timeZone: TZ })
    .toUpperCase()
    .split('-')[0]
  const dayMonth = d
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: TZ })
    .replace('.', '')
    .toUpperCase()
  return `${weekday} · ${dayMonth}`
}

function isUnsaved(
  match: MatchWithPrediction,
  input: { home: string; away: string } | undefined
): boolean {
  if (!input || match.is_deadline_passed) return false
  if (input.home === '' || input.away === '') return false
  if (match.prediction === null) return true
  return (
    input.home !== String(match.prediction.predicted_home_score) ||
    input.away !== String(match.prediction.predicted_away_score)
  )
}

export default function PalpitesPage() {
  const params = useParams()
  const leagueId = params.id as string

  const [allMatches, setAllMatches] = useState<MatchWithPrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeDate, setActiveDate] = useState<DateFilter>('today')
  const [activeGroup, setActiveGroup] = useState<string>('all')
  const [inputValues, setInputValues] = useState<InputValues>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetch(`/api/leagues/${leagueId}/matches?phase=group`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('Falha ao carregar partidas')
        const body = await res.json()
        const matches: MatchWithPrediction[] = body.data.matches
        setAllMatches(matches)
        const initial: InputValues = {}
        for (const m of matches) {
          initial[m.id] = {
            home: m.prediction !== null ? String(m.prediction.predicted_home_score) : '',
            away: m.prediction !== null ? String(m.prediction.predicted_away_score) : '',
          }
        }
        setInputValues(initial)
        setLoading(false)
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          setError('Não foi possível carregar os palpites.')
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [leagueId])

  const todayStr = useMemo(() => getLocalDateStr(new Date()), [])
  const tomorrowStr = useMemo(() => getLocalDateStr(new Date(Date.now() + 86400000)), [])

  const dateCounts = useMemo(
    () => ({
      all: allMatches.length,
      today: allMatches.filter((m) => getLocalDateStr(new Date(m.match_date)) === todayStr).length,
      tomorrow: allMatches.filter((m) => getLocalDateStr(new Date(m.match_date)) === tomorrowStr).length,
    }),
    [allMatches, todayStr, tomorrowStr]
  )

  const filteredMatches = useMemo(
    () =>
      allMatches.filter((m) => {
        if (activeDate === 'today' && getLocalDateStr(new Date(m.match_date)) !== todayStr) return false
        if (activeDate === 'tomorrow' && getLocalDateStr(new Date(m.match_date)) !== tomorrowStr) return false
        if (activeGroup !== 'all' && m.group !== activeGroup) return false
        return true
      }),
    [allMatches, activeDate, activeGroup, todayStr, tomorrowStr]
  )

  const groupedByDate = useMemo(() => {
    const groupMap = new Map<string, MatchWithPrediction[]>()
    for (const m of filteredMatches) {
      const key = getLocalDateStr(new Date(m.match_date))
      if (!groupMap.has(key)) groupMap.set(key, [])
      groupMap.get(key)!.push(m)
    }
    return Array.from(groupMap.entries()).map(([dateKey, matches]) => ({
      dateKey,
      label: formatSectionHeader(matches[0].match_date),
      matches,
    }))
  }, [filteredMatches])

  const unsavedMatchIds = useMemo(
    () => allMatches.filter((m) => isUnsaved(m, inputValues[m.id])).map((m) => m.id),
    [allMatches, inputValues]
  )

  const hasUnsaved = unsavedMatchIds.length > 0

  const handleInputChange = (matchId: string, side: 'home' | 'away', value: string) => {
    setInputValues((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: value },
    }))
  }

  const handleSaveAll = async () => {
    if (!hasUnsaved || saving) return
    setSaving(true)
    try {
      const results = await Promise.allSettled(
        unsavedMatchIds.map(async (matchId) => {
          const input = inputValues[matchId]
          const res = await fetch(`/api/leagues/${leagueId}/predictions/${matchId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              home_score: parseInt(input.home, 10),
              away_score: parseInt(input.away, 10),
            }),
          })
          if (!res.ok) throw new Error(`Failed to save ${matchId}`)
          return matchId
        })
      )

      setAllMatches((prev) =>
        prev.map((m) => {
          const idx = unsavedMatchIds.indexOf(m.id)
          if (idx === -1) return m
          const result = results[idx]
          if (result.status === 'fulfilled') {
            const input = inputValues[m.id]
            return {
              ...m,
              prediction: {
                predicted_home_score: parseInt(input.home, 10),
                predicted_away_score: parseInt(input.away, 10),
              },
            }
          }
          return m
        })
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-600">Carregando palpites...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 p-4">
        <p className="text-red-600 font-semibold">{error}</p>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">
            FASE DE GRUPOS · 72 JOGOS
          </div>
          <h1 className="text-2xl font-black text-slate-900">Palpites</h1>
          <p className="text-sm text-slate-500 mt-1">
            Chute os placares antes do início de cada jogo.
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={!hasUnsaved || saving}
          className="shrink-0 mt-2 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black text-[#244C5A] bg-[#FFC72C] disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-sm"
          data-testid="save-all-btn"
        >
          <Save size={15} />
          {saving ? 'Salvando...' : 'Salvar todos'}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <PalpitesFilters
          activeDate={activeDate}
          onDateChange={setActiveDate}
          activeGroup={activeGroup}
          onGroupChange={setActiveGroup}
          dateCounts={dateCounts}
        />
      </div>

      {/* Match list grouped by date */}
      {filteredMatches.length === 0 ? (
        <p className="text-center text-slate-500 py-8" data-testid="empty-state">
          Nenhum jogo encontrado para este filtro.
        </p>
      ) : (
        <div className="space-y-8" data-testid="match-list">
          {groupedByDate.map(({ dateKey, label, matches }) => (
            <div key={dateKey}>
              <div
                className="flex items-center justify-between mb-3"
                data-testid={`date-section-${dateKey}`}
              >
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  {label}
                </span>
                <span className="text-[11px] text-slate-400">
                  {matches.length} {matches.length === 1 ? 'jogo' : 'jogos'}
                </span>
              </div>
              <div className="space-y-3">
                {matches.map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    leagueId={leagueId}
                    homeInput={inputValues[match.id]?.home ?? ''}
                    awayInput={inputValues[match.id]?.away ?? ''}
                    onInputChange={handleInputChange}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
