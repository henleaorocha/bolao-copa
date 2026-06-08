'use client'

const SCORING_ROWS = [
  { label: 'Palpite de Campeão', desc: 'Acertar quem leva a taça', points: '+50 pts' },
  { label: 'Palpite de Vice-Campeão', desc: 'Acertar quem perde a final', points: '+25 pts' },
  { label: 'Placar Exato', desc: 'Grupos — cravar o placar exato', points: '+10 pts' },
  { label: 'Vencedor/Empate', desc: 'Grupos — sem cravar o placar', points: '+5 pts' },
  { label: '16 Avos de Final', desc: 'Multiplicador sobre pontos da partida', points: '1.5×' },
  { label: 'Oitavas de Final', desc: 'Multiplicador sobre pontos da partida', points: '2×' },
  { label: 'Quartas de Final', desc: 'Multiplicador sobre pontos da partida', points: '2.5×' },
  { label: 'Semi e Final', desc: 'Multiplicador sobre pontos da partida', points: '3× / 4×' },
]

export default function ScoringSchemeCard() {
  return (
    <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Tabela de Pontos
        </h2>
        <a
          href="/regras.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-[#0097A9] hover:underline"
        >
          Ver regras completas →
        </a>
      </div>
      <div className="divide-y divide-slate-100">
        {SCORING_ROWS.map(row => (
          <div key={row.label} className="flex items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <span className="block text-sm font-semibold text-slate-700 leading-tight">
                {row.label}
              </span>
              <span className="block text-xs text-slate-400 leading-tight">{row.desc}</span>
            </div>
            <span className="shrink-0 text-xs font-bold text-[#0097A9] bg-[#0097A9]/8 px-2 py-0.5 rounded-full">
              {row.points}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
