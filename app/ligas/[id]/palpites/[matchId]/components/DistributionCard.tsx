import type { OutcomeDistribution } from '@/lib/api/types'

interface DistributionCardProps {
  homeTeam: string
  awayTeam: string
  distribution: OutcomeDistribution | null
  isDeadlinePassed: boolean
}

export default function DistributionCard({
  homeTeam,
  awayTeam,
  distribution,
  isDeadlinePassed,
}: DistributionCardProps) {
  const showDistribution = isDeadlinePassed && distribution !== null

  return (
    <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#0097A922]">
          <span className="text-base" aria-hidden="true">👥</span>
        </div>
        <h3 className="text-base font-black text-[#244C5A]">Palpites da liga</h3>
      </div>

      {!showDistribution ? (
        <div
          className="text-sm text-slate-500 flex items-center gap-1.5"
          data-testid="distribution-locked"
        >
          <span aria-hidden="true">🔒</span>
          <span>Disponível após o prazo de apostas</span>
        </div>
      ) : (
        <div className="space-y-2 text-sm" data-testid="distribution-chart">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>
              Vitória <b className="text-[#244C5A]">{homeTeam}</b>
            </span>
            <span>{distribution!.home_win}%</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
            <div style={{ width: `${distribution!.home_win}%`, background: '#0097A9' }} />
            <div style={{ width: `${distribution!.draw}%`, background: '#F59E0B' }} />
            <div style={{ width: `${distribution!.away_win}%`, background: '#244C5A' }} />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Empate</span>
            <span>{distribution!.draw}%</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Vitória <b className="text-[#244C5A]">{awayTeam}</b>
            </span>
            <span>{distribution!.away_win}%</span>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            {distribution!.total_predictions}{' '}
            {distribution!.total_predictions === 1 ? 'palpite' : 'palpites'} na liga
          </div>
        </div>
      )}
    </div>
  )
}
