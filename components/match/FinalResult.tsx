// Finished-match block, shared by both screens: `Resultado: x × y`, plus
// `Palpite: a × b` when the user has a saved prediction. Test ids (`finished-scores`,
// `final-score`, `finished-prediction`) are preserved from the original Mata-mata card.
// Exact-score "hit" highlighting is out of scope here (PRD Phase 2).

interface FinalResultProps {
  homeScore: number | null
  awayScore: number | null
  prediction?: { home: number; away: number } | null
}

export default function FinalResult({ homeScore, awayScore, prediction = null }: FinalResultProps) {
  return (
    <div
      className="flex items-center gap-2 pt-2 border-t border-slate-50"
      data-testid="finished-scores"
    >
      <span className="text-[11px] text-slate-400 uppercase tracking-wide font-bold">Resultado:</span>
      <span className="text-sm font-black text-[#244C5A]" data-testid="final-score">
        {homeScore} × {awayScore}
      </span>
      {prediction && (
        <span className="ml-auto text-[10px] text-slate-400" data-testid="finished-prediction">
          Palpite: {prediction.home} × {prediction.away}
        </span>
      )}
    </div>
  )
}
