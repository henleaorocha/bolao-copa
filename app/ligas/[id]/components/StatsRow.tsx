'use client'

import type { UserStats } from '@/lib/api/types'
import { TOTAL_MATCH_COUNT } from '@/lib/copa-teams'

interface StatsRowProps {
  user_stats: UserStats
  member_count: number
  matches_played: number
}

export default function StatsRow({ user_stats, member_count, matches_played }: StatsRowProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Sua Posição */}
      <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
          Sua Posição
        </span>
        <span className="block text-3xl font-black text-[#0097A9] leading-none">
          {user_stats.position}°
        </span>
        <span className="block text-xs text-slate-400 mt-1">de {member_count}</span>
      </div>

      {/* Pontos — featured card */}
      <div className="rounded-xl bg-[#244C5A] shadow-sm p-4 relative overflow-hidden">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">
          Pontos
        </span>
        <span className="block text-3xl font-black text-[#FFC72C] leading-none">
          {user_stats.points}
        </span>
        <span className="block text-xs text-white/40 mt-1">acumulados</span>
        {/* subtle decorative icon */}
        <svg
          className="absolute right-3 bottom-3 opacity-10 text-white"
          width="36" height="36" viewBox="0 0 24 24" fill="currentColor"
          aria-hidden="true"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </div>

      {/* Jogos já realizados — tournament-wide, identical for every member */}
      <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
          JOGOS JÁ REALIZADOS
        </span>
        <span className="block text-3xl font-black text-slate-900 leading-none">
          {matches_played}/{TOTAL_MATCH_COUNT}
        </span>
        <span className="block text-xs text-slate-400 mt-1">fase de grupos + mata-mata</span>
      </div>

      {/* Acertos Exatos */}
      <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
          Acertos Exatos
        </span>
        <span className="block text-3xl font-black text-[#16A34A] leading-none">
          {user_stats.exact_scores}
        </span>
        <span className="block text-xs text-slate-400 mt-1">placar cravado</span>
      </div>
    </div>
  )
}
