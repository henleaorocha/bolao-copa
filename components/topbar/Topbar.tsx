'use client'

import { useLeague } from '@/lib/league-context'
import { LeagueSwitcher } from './LeagueSwitcher'

export function Topbar() {
  const { league } = useLeague()

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 md:px-8 md:py-4 shadow-sm">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                 style={{ background: '#244C5A' }}>
              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Liga Ativa</div>
              <div className="text-sm md:text-base font-black text-slate-900 truncate">{league.name}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 ml-4 flex-shrink-0">
          <LeagueSwitcher />
        </div>
      </div>
    </header>
  )
}
