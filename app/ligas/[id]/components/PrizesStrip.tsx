'use client'

interface PrizesStripProps {
  prizes: string | null
}

export default function PrizesStrip({ prizes }: PrizesStripProps) {
  if (!prizes) return null

  return (
    <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-[0.15em] text-yellow-700 mb-1">
        Premiação
      </p>
      <p className="text-sm font-semibold text-yellow-900 whitespace-pre-wrap">{prizes}</p>
    </div>
  )
}
