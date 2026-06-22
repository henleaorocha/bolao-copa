'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { MatchDetail } from '@/lib/api/types'
import BetHero from './components/BetHero'
import ScoringCard from './components/ScoringCard'
import DistributionCard from './components/DistributionCard'
import UnsavedModal from './components/UnsavedModal'

export default function BetDetailPage() {
  const params = useParams()
  const leagueId = params.id as string
  const matchId = params.matchId as string
  const router = useRouter()

  const [matchDetail, setMatchDetail] = useState<MatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [inputHome, setInputHome] = useState('')
  const [inputAway, setInputAway] = useState('')
  const [savedHome, setSavedHome] = useState<number | null>(null)
  const [savedAway, setSavedAway] = useState<number | null>(null)

  const [saving, setSaving] = useState(false)
  const [saveConfirm, setSaveConfirm] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetch(`/api/leagues/${leagueId}/matches/${matchId}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('Falha ao carregar jogo')
        const body = await res.json()
        const detail: MatchDetail = body.data
        setMatchDetail(detail)
        if (detail.prediction !== null) {
          const h = detail.prediction.predicted_home_score
          const a = detail.prediction.predicted_away_score
          setInputHome(String(h))
          setInputAway(String(a))
          setSavedHome(h)
          setSavedAway(a)
        }
        setLoading(false)
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          setError('Não foi possível carregar o jogo.')
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [leagueId, matchId])

  const isDirty =
    inputHome !== String(savedHome ?? '') || inputAway !== String(savedAway ?? '')

  const performSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/leagues/${leagueId}/predictions/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home_score: parseInt(inputHome, 10),
          away_score: parseInt(inputAway, 10),
        }),
      })
      if (!res.ok) throw new Error('Falha ao salvar palpite')
      setSavedHome(parseInt(inputHome, 10))
      setSavedAway(parseInt(inputAway, 10))
      setSaveConfirm(true)
      setTimeout(() => setSaveConfirm(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (isDirty) {
      setShowModal(true)
    } else {
      router.back()
    }
  }

  const handleSaveAndExit = async () => {
    await performSave()
    setShowModal(false)
    router.back()
  }

  const handleExitWithoutSaving = () => {
    setShowModal(false)
    router.back()
  }

  if (loading) {
    return (
      <div
        className="min-h-screen bg-slate-50 flex items-center justify-center"
        data-testid="loading-state"
      >
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full bg-slate-200 animate-pulse mx-auto mb-4"
            data-testid="loading-skeleton"
          />
          <p className="text-slate-500 text-sm">Carregando jogo...</p>
        </div>
      </div>
    )
  }

  if (error || !matchDetail) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-4">{error ?? 'Jogo não encontrado.'}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-yellow-400 rounded-xl font-semibold text-[#244C5A]"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <BetHero
          match={matchDetail}
          inputHome={inputHome}
          inputAway={inputAway}
          saving={saving}
          saveConfirm={saveConfirm}
          onInputHomeChange={setInputHome}
          onInputAwayChange={setInputAway}
          onSave={performSave}
          onBack={handleBack}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ScoringCard />
          <DistributionCard
            leagueId={leagueId}
            matchId={matchId}
            homeTeam={matchDetail.home_team}
            awayTeam={matchDetail.away_team}
            distribution={matchDetail.distribution}
            isDeadlinePassed={matchDetail.is_deadline_passed}
          />
        </div>
      </div>

      {showModal && (
        <UnsavedModal
          onSaveAndExit={handleSaveAndExit}
          onExitWithoutSaving={handleExitWithoutSaving}
          onDismiss={() => setShowModal(false)}
          saving={saving}
        />
      )}
    </div>
  )
}
