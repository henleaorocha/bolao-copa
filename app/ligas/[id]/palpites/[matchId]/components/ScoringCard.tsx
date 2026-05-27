export default function ScoringCard() {
  return (
    <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-yellow-100">
          <span className="text-base" aria-hidden="true">⚡</span>
        </div>
        <h3 className="text-base font-black text-[#244C5A]">Quanto vale acertar</h3>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between p-2.5 rounded-xl bg-slate-50">
          <span className="text-[#244C5A]">Placar exato</span>
          <span className="font-black text-[#0097A9]" data-testid="scoring-exact">+10 pts</span>
        </div>
        <div className="flex justify-between p-2.5 rounded-xl bg-slate-50">
          <span className="text-[#244C5A]">Apenas vencedor/empate</span>
          <span className="font-black text-[#0097A9]" data-testid="scoring-outcome">+5 pts</span>
        </div>
        <div className="flex justify-between p-2.5 rounded-xl bg-yellow-50">
          <span className="text-[#244C5A]">Multiplicador da fase</span>
          <span className="font-black text-[#244C5A]">1×</span>
        </div>
      </div>
    </div>
  )
}
