'use client'

import { useState } from 'react'
import { Sparkles, Clock, Target, Share } from 'lucide-react'

interface LeagueWelcomeModalProps {
  leagueName: string
  inviteToken: string
  role: 'admin' | 'member'
  onComplete: () => void
}

const SCORING_ROWS = [
  { icon: '👑', name: 'Palpite de Campeão', subtitle: 'Acertar quem leva a taça', points: '+50' },
  { icon: '🏆', name: 'Palpite de Vice-Campeão', subtitle: 'Acertar quem perde a final', points: '+25' },
  { icon: '🎯', name: 'Placar Exato (Grupos)', subtitle: '2x1 = 2x1', points: '+10' },
  { icon: '✓', name: 'Vencedor/Empate (Grupos)', subtitle: 'Sem cravar o placar', points: '+5' },
  { icon: '↗', name: 'Multiplicador 16 avos', subtitle: 'Sobre pontos da partida', points: '1.5x' },
]

const STEP_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'COMO FUNCIONA',
  2: 'REGRAS DE TEMPO',
  3: 'PONTUAÇÃO',
  4: 'CONVIDE AGORA',
}

function StepIcon({ step }: { step: 1 | 2 | 3 | 4 }) {
  const props = { size: 28, color: '#244C5A', strokeWidth: 2.5 } as const
  if (step === 1) return <Sparkles {...props} />
  if (step === 2) return <Clock {...props} />
  if (step === 3) return <Target {...props} />
  return <Share {...props} />
}

function getHeadline(step: 1 | 2 | 3 | 4, leagueName: string): string {
  if (step === 1) return `Bem-vindo ao ${leagueName}!`
  if (step === 2) return 'Atenção aos horários'
  if (step === 3) return 'Quanto vale cada acerto'
  return 'Chama a galera pra jogar'
}

export default function LeagueWelcomeModal({
  leagueName,
  inviteToken,
  role,
  onComplete,
}: LeagueWelcomeModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [copied, setCopied] = useState(false)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
  const inviteUrl = `${siteUrl}/join?token=${inviteToken}`
  const waMessage = `Oi! Entra na minha liga do Bolão da Copa — vamos disputar juntos 🏆 ${inviteUrl}`
  const waHref = `https://wa.me/?text=${encodeURIComponent(waMessage)}`

  function nextStep() {
    if (step < 4) setStep((step + 1) as 1 | 2 | 3 | 4)
  }

  function prevStep() {
    if (step > 1) setStep((step - 1) as 1 | 2 | 3 | 4)
  }

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      data-testid="welcome-modal-backdrop"
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
          {/* Progress indicator */}
          <div
            className="flex gap-2 mb-6"
            aria-label={`Passo ${step} de 4`}
          >
            {([1, 2, 3, 4] as const).map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: i === step ? '#FFC72C' : 'rgba(255,255,255,0.4)' }}
              />
            ))}
          </div>

          {/* Icon + Label + Headline */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center">
              <StepIcon step={step} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
              {STEP_LABELS[step]}
            </p>
            <h2 className="text-xl font-black text-white leading-tight">
              {getHeadline(step, leagueName)}
            </h2>
          </div>
        </div>

        {/* White bottom zone */}
        <div className="bg-white p-6 flex flex-col flex-1 overflow-y-auto">
          {/* Screen-specific body */}
          {step === 1 && (
            <p className="text-sm text-slate-600 leading-relaxed">
              É simples: você palpita placares dos jogos da Copa e ganha pontos por acertos. No
              final, quem tem mais pontos leva a glória (e talvez um prêmio 👀).
            </p>
          )}

          {step === 2 && (
            <p className="text-sm text-slate-600 leading-relaxed">
              Palpites de Campeão e Vice fecham 1h antes do primeiro jogo da Copa. Cada palpite de
              partida fecha 1h antes do apito inicial daquele jogo. Depois disso, não tem mais como
              mexer.
            </p>
          )}

          {step === 3 && (
            <div>
              <div className="space-y-2">
                {SCORING_ROWS.map((row) => (
                  <div key={row.name} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                    <span className="text-lg w-7 text-center shrink-0">{row.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black text-[#244C5A] truncate">{row.name}</div>
                      <div className="text-[10px] text-slate-500">{row.subtitle}</div>
                    </div>
                    <span className="text-sm font-black text-[#0097A9] shrink-0">{row.points}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-slate-500 leading-relaxed">
                ↗ Eliminatórias valem mais: Oitavas 2x, Quartas 2.5x, Semi 3x, Final 4x.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                {role === 'admin' ? (
                  <>
                    Sua liga foi criada! Bolão fica mais divertido com gente — manda o link pros
                    amigos, família ou o time todo entrarem em <strong>{leagueName}</strong>.
                  </>
                ) : (
                  <>
                    Você entrou em <strong>{leagueName}</strong>! Chama mais amigos — bolão é mais
                    divertido com gente que você conhece.
                  </>
                )}
              </p>

              {/* Copy link row */}
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="flex-1 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200 font-mono truncate"
                  aria-label="Link de convite"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-3 rounded-xl font-black text-xs shrink-0 transition"
                  style={{ background: '#FFC72C', color: '#244C5A' }}
                >
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>

              {/* WhatsApp share */}
              <a
                data-testid="whatsapp-link"
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full py-4 rounded-2xl font-black text-white text-sm transition hover:opacity-90"
                style={{ background: '#25D366' }}
              >
                Compartilhar via WhatsApp
              </a>

              <p className="text-[10px] text-slate-400 text-center">
                Você também pode convidar depois pelo botão <strong>Convidar</strong> no topo da
                liga.
              </p>
            </div>
          )}

          {/* Navigation CTAs */}
          <div className="flex gap-3 mt-auto pt-6">
            {step > 1 && (
              <button
                onClick={prevStep}
                className="flex-1 py-4 rounded-2xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition"
              >
                ← Voltar
              </button>
            )}
            {step < 4 && (
              <button
                onClick={nextStep}
                className={`py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] transition ${
                  step > 1 ? 'flex-[2]' : 'w-full'
                }`}
                style={{ background: '#FFC72C', color: '#244C5A' }}
              >
                {step === 3 ? 'Convidar amigos →' : 'Próximo →'}
              </button>
            )}
            {step === 4 && (
              <button
                onClick={onComplete}
                className="flex-[2] py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] transition"
                style={{ background: '#FFC72C', color: '#244C5A' }}
              >
                Pronto, bora jogar! ⚡
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
