'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Save } from 'lucide-react'
import type { BracketResponse } from '@/lib/bracket'
import type { KnockoutPhase } from '@/lib/bracket-skeleton'
import { useLeaguePanel } from '../league-panel-context'
import StatusBanner from './components/StatusBanner'
import UnlockBanner from './components/UnlockBanner'
import PhaseSelector from './components/PhaseSelector'
import MatchCard from './components/MatchCard'

interface InputValues {
  [matchId: string]: { home: string; away: string }
}

function isUnsaved(
  matchId: string | null,
  prediction: { home: number; away: number } | null,
  input: { home: string; away: string } | undefined
): boolean {
  if (!matchId || !input) return false
  if (input.home === '' || input.away === '') return false
  if (prediction === null) return true
  return (
    input.home !== String(prediction.home) ||
    input.away !== String(prediction.away)
  )
}

export default function MataMataPage() {
  const params = useParams()
  const leagueId = params.id as string
  const { setMataMataUnlock } = useLeaguePanel()

  const [bracket, setBracket] = useState<BracketResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPhase, setSelectedPhase] = useState<KnockoutPhase>('32nd')
  const [inputValues, setInputValues] = useState<InputValues>({})
  const [saving, setSaving] = useState(false)
  // Seed selectedPhase from the server's activePhase exactly once on first load.
  // A ref (not state) so the guard survives re-renders and never overrides the
  // user's own tab navigation on subsequent renders (ADR-004).
  const phaseSeededRef = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetch(`/api/leagues/${leagueId}/bracket`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('Falha ao carregar bracket')
        const body = await res.json()
        const data: BracketResponse = body.data
        setBracket(data)
        setMataMataUnlock(data.newlyUnlockedPhase)

        if (!phaseSeededRef.current) {
          setSelectedPhase(data.activePhase)
          phaseSeededRef.current = true
        }

        const initial: InputValues = {}
        for (const phase of data.phases) {
          for (const slot of phase.slots) {
            if (slot.matchId && slot.prediction) {
              initial[slot.matchId] = {
                home: String(slot.prediction.home),
                away: String(slot.prediction.away),
              }
            } else if (slot.matchId) {
              initial[slot.matchId] = { home: '', away: '' }
            }
          }
        }
        setInputValues(initial)
        setLoading(false)
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          setError('Não foi possível carregar o chaveamento.')
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [leagueId, setMataMataUnlock])

  const currentPhase = useMemo(
    () => bracket?.phases.find((p) => p.phase === selectedPhase) ?? null,
    [bracket, selectedPhase]
  )

  const unsavedSlots = useMemo(() => {
    if (!currentPhase) return []
    return currentPhase.slots.filter(
      (s) => s.state === 'open' && isUnsaved(s.matchId, s.prediction, s.matchId ? inputValues[s.matchId] : undefined)
    )
  }, [currentPhase, inputValues])

  const hasUnsaved = unsavedSlots.length > 0

  const handleInputChange = (matchId: string, side: 'home' | 'away', value: string) => {
    setInputValues((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: value },
    }))
  }

  const handleSaveAll = async () => {
    if (!hasUnsaved || saving || !currentPhase) return
    setSaving(true)
    try {
      const results = await Promise.allSettled(
        unsavedSlots.map(async (slot) => {
          const matchId = slot.matchId!
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

      setBracket((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          phases: prev.phases.map((ph) => {
            if (ph.phase !== selectedPhase) return ph
            return {
              ...ph,
              slots: ph.slots.map((s) => {
                const result = results[unsavedSlots.indexOf(s)]
                if (!result || result.status !== 'fulfilled') return s
                const input = s.matchId ? inputValues[s.matchId] : null
                if (!input) return s
                return {
                  ...s,
                  prediction: {
                    home: parseInt(input.home, 10),
                    away: parseInt(input.away, 10),
                  },
                }
              }),
            }
          }),
        }
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="loading-state">
        <p className="text-slate-600">Carregando chaveamento...</p>
      </div>
    )
  }

  if (error || !bracket) {
    return (
      <div className="flex items-center justify-center py-20 p-4" data-testid="error-state">
        <p className="text-red-600 font-semibold">{error ?? 'Erro ao carregar chaveamento.'}</p>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p
            className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1"
            data-testid="header-label"
          >
            ELIMINATÓRIAS · 6 FASES
          </p>
          <h1 className="text-2xl font-black text-slate-900" data-testid="header-title">
            Chaveamento
          </h1>
          <p className="text-sm text-slate-500 mt-1" data-testid="header-subtitle">
            A partir das eliminatórias, cada palpite vale mais pontos
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

      {/* Pre-launch status banner */}
      <StatusBanner />

      {/* Phase-unlock banner (self-clears when newlyUnlockedPhase is null) */}
      <UnlockBanner newlyUnlockedPhase={bracket.newlyUnlockedPhase} />

      {/* Phase selector */}
      <PhaseSelector
        phases={bracket.phases}
        selectedPhase={selectedPhase}
        onPhaseChange={setSelectedPhase}
      />

      {/* Match cards */}
      {currentPhase && (
        <div className="space-y-3" data-testid="match-list">
          {currentPhase.slots.map((slot) => (
            <MatchCard
              key={slot.pos}
              slot={slot}
              homeInput={slot.matchId ? (inputValues[slot.matchId]?.home ?? '') : ''}
              awayInput={slot.matchId ? (inputValues[slot.matchId]?.away ?? '') : ''}
              onInputChange={handleInputChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}
