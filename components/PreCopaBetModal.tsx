'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Crown, Medal, Sparkles, Save } from 'lucide-react'
import { FEATURED_TEAMS, ALL_COPA_TEAMS } from '@/lib/copa-teams'
import type { CopaTeam } from '@/lib/copa-teams'
import { getDaysUntilCopa } from '@/lib/leagues/get-days-until-copa'

interface PreCopaBetModalProps {
  leagueId: string
  onComplete: () => void
}

type BetStep = 1 | 2 | 3

interface BetModalState {
  step: BetStep
  champion: CopaTeam | null
  runnerUp: CopaTeam | null
  isSubmitting: boolean
}

const OTHER_TEAMS = ALL_COPA_TEAMS.slice(FEATURED_TEAMS.length)

const STEP_LABELS: Record<BetStep, string> = {
  1: 'APOSTA PRÉ-COPA · VALE +50 PTS',
  2: 'APOSTA PRÉ-COPA · VALE +25 PTS',
  3: 'APOSTA PRÉ-COPA · VALE MUITO',
}

const STEP_HEADLINES: Record<BetStep, string> = {
  1: 'Quem leva a taça?',
  2: 'E o vice-campeão?',
  3: 'Confirme sua aposta',
}

const STEP_SUBTITLES: Record<BetStep, string> = {
  1: 'Escolha a seleção que vai ganhar a Copa 2026',
  2: 'Qual seleção chega na final mas leva o vice?',
  3: '',
}

function StepIcon({ step }: { step: BetStep }) {
  const props = { size: 28, color: '#244C5A', strokeWidth: 2.5 } as const
  if (step === 1) return <Crown {...props} />
  if (step === 2) return <Medal {...props} />
  return <Sparkles {...props} />
}

function TeamCard({
  team,
  isSelected,
  isChampion,
  onClick,
}: {
  team: CopaTeam
  isSelected: boolean
  isChampion: boolean
  onClick: () => void
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <button
      onClick={isChampion ? undefined : onClick}
      disabled={isChampion}
      data-testid={`team-card-${team.code}`}
      className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition ${
        isSelected
          ? 'border-[#FFC72C] bg-yellow-50'
          : isChampion
          ? 'border-slate-200 bg-slate-100 opacity-50'
          : 'border-slate-200 bg-white hover:border-[#0097A9]'
      }`}
    >
      {imgError ? (
        <div className="w-16 h-12 rounded-md bg-slate-200" aria-hidden="true" />
      ) : (
        <Image
          src={`https://flagcdn.com/w80/${team.code}.png`}
          alt={team.name}
          width={64}
          height={48}
          className="rounded-md object-cover"
          onError={() => setImgError(true)}
        />
      )}
      <span className="text-[10px] font-bold text-[#244C5A] text-center leading-tight">
        {team.name}
      </span>
      {isChampion && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl">
          <span className="text-[8px] font-black text-white tracking-widest bg-slate-800/70 px-1 py-0.5 rounded">
            CAMPEÃO
          </span>
        </div>
      )}
    </button>
  )
}

function TeamGrid({
  step,
  champion,
  selected,
  onSelect,
}: {
  step: 1 | 2
  champion: CopaTeam | null
  selected: CopaTeam | null
  onSelect: (team: CopaTeam) => void
}) {
  const [othersExpanded, setOthersExpanded] = useState(false)

  function renderCard(team: CopaTeam) {
    const isChampion = step === 2 && champion?.code === team.code
    const isSelected = selected?.code === team.code
    return (
      <TeamCard
        key={team.code}
        team={team}
        isSelected={isSelected}
        isChampion={isChampion}
        onClick={() => onSelect(team)}
      />
    )
  }

  const otherIsSelected = selected && OTHER_TEAMS.some(t => t.code === selected.code)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {FEATURED_TEAMS.map(renderCard)}
      </div>
      <button
        type="button"
        onClick={() => setOthersExpanded(v => !v)}
        className="flex w-full items-center justify-between"
      >
        <span className="text-xs font-black uppercase tracking-widest text-slate-400">
          Outras seleções {otherIsSelected && !othersExpanded ? `· ${selected!.name}` : ''}
        </span>
        <span className="text-xs text-slate-400">{othersExpanded ? '▲' : '▼'}</span>
      </button>
      {othersExpanded && (
        <div className="grid grid-cols-4 gap-2">
          {OTHER_TEAMS.map(renderCard)}
        </div>
      )}
    </div>
  )
}

export default function PreCopaBetModal({ leagueId, onComplete }: PreCopaBetModalProps) {
  const [state, setState] = useState<BetModalState>({
    step: 1,
    champion: null,
    runnerUp: null,
    isSubmitting: false,
  })
  const [error, setError] = useState<string | null>(null)

  const { days } = getDaysUntilCopa()

  function handleSelectChampion(team: CopaTeam) {
    setState(s => ({ ...s, champion: team }))
  }

  function handleSelectRunnerUp(team: CopaTeam) {
    setState(s => ({ ...s, runnerUp: team }))
  }

  function goToStep2() {
    setState(s => ({ ...s, step: 2, runnerUp: null }))
  }

  function goToStep3() {
    setState(s => ({ ...s, step: 3 }))
  }

  function goBack() {
    setState(s => ({ ...s, step: (s.step - 1) as BetStep }))
  }

  async function handleConfirm() {
    if (!state.champion || !state.runnerUp || state.isSubmitting) return
    setState(s => ({ ...s, isSubmitting: true }))
    setError(null)

    try {
      const res = await fetch(`/api/leagues/${leagueId}/champion-bet`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          champion_team: state.champion.name,
          runner_up_team: state.runnerUp.name,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erro ao salvar aposta. Tente novamente.')
        setState(s => ({ ...s, isSubmitting: false }))
        return
      }

      onComplete()
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setState(s => ({ ...s, isSubmitting: false }))
    }
  }

  return (
    <div
      data-testid="bet-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: 'rgba(36,76,90,0.8)' }}
    >
      <div
        className="rounded-[36px] shadow-2xl max-w-md w-full overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient top zone */}
        <div
          className="px-6 pt-6 pb-8"
          style={{ background: 'linear-gradient(135deg, #0097A9 0%, #4CAF82 100%)' }}
        >
          {/* Progress indicator — 3 horizontal dashes */}
          <div
            className="flex gap-2 mb-6"
            aria-label={`Passo ${state.step} de 3`}
            data-testid="progress-indicator"
          >
            {([1, 2, 3] as const).map((i) => (
              <div
                key={i}
                data-testid={`progress-dash-${i}`}
                className="flex-1 h-1 rounded-full transition-colors"
                style={{ background: i === state.step ? '#FFC72C' : 'rgba(255,255,255,0.4)' }}
              />
            ))}
          </div>

          {/* Icon + Label + Headline + Subtitle */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center">
              <StepIcon step={state.step} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
              {STEP_LABELS[state.step]}
            </p>
            <h2 className="text-xl font-black text-white leading-tight">
              {STEP_HEADLINES[state.step]}
            </h2>
            {STEP_SUBTITLES[state.step] && (
              <p className="text-xs text-white/70 leading-relaxed">
                {STEP_SUBTITLES[state.step]}
              </p>
            )}
          </div>
        </div>

        {/* White bottom zone — scrollable */}
        <div className="bg-white px-4 pt-4 pb-6 flex flex-col flex-1 overflow-y-auto">
          {state.step === 1 && (
            <TeamGrid
              step={1}
              champion={null}
              selected={state.champion}
              onSelect={handleSelectChampion}
            />
          )}

          {state.step === 2 && (
            <TeamGrid
              step={2}
              champion={state.champion}
              selected={state.runnerUp}
              onSelect={handleSelectRunnerUp}
            />
          )}

          {state.step === 3 && state.champion && state.runnerUp && (
            <div className="space-y-4">
              {/* Champion row */}
              <div
                className="flex items-center gap-3 p-4 rounded-xl border-2"
                style={{ borderColor: '#FFC72C', background: '#FFFBEB' }}
              >
                <span className="text-2xl" aria-hidden="true">👑</span>
                <div className="flex-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#FFC72C]">
                    CAMPEÃO · +50 PTS
                  </div>
                  <div className="text-base font-black text-[#244C5A]">
                    {state.champion.name}
                  </div>
                </div>
              </div>

              {/* Vice row */}
              <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 bg-slate-50">
                <span className="text-2xl" aria-hidden="true">🥈</span>
                <div className="flex-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    VICE · +25 PTS
                  </div>
                  <div className="text-base font-black text-[#244C5A]">
                    {state.runnerUp.name}
                  </div>
                </div>
              </div>

              {/* Deadline notice */}
              <p className="text-center text-sm text-slate-500">
                Fecha em{' '}
                <span className="font-black text-[#244C5A]">
                  {days} {days === 1 ? 'dia' : 'dias'}
                </span>
              </p>

              {/* Error message */}
              {error && (
                <p role="alert" className="text-sm text-red-500 text-center">
                  {error}
                </p>
              )}
            </div>
          )}

          {/* Navigation CTAs */}
          <div className="flex gap-3 mt-auto pt-6">
            {state.step === 1 && (
              <button
                onClick={goToStep2}
                disabled={!state.champion}
                className="w-full py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: '#FFC72C', color: '#244C5A' }}
              >
                Escolher Vice →
              </button>
            )}

            {state.step === 2 && (
              <>
                <button
                  onClick={goBack}
                  className="flex-1 py-4 rounded-2xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition"
                >
                  ← Voltar
                </button>
                <button
                  onClick={goToStep3}
                  disabled={!state.runnerUp}
                  className="flex-[2] py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ background: '#FFC72C', color: '#244C5A' }}
                >
                  Revisar aposta →
                </button>
              </>
            )}

            {state.step === 3 && (
              <>
                <button
                  onClick={goBack}
                  disabled={state.isSubmitting}
                  className="flex-1 py-4 rounded-2xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition disabled:opacity-50"
                >
                  ← Voltar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={state.isSubmitting}
                  className="flex-[2] py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ background: '#FFC72C', color: '#244C5A' }}
                >
                  {state.isSubmitting ? (
                    'Salvando...'
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Save size={16} />
                      Confirmar aposta
                    </span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
