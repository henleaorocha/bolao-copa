'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Trophy, CalendarDays, AlignJustify, Award, Zap } from 'lucide-react'

interface BottomTabBarProps {
  leagueId: string
  mataMataUnlock?: boolean
}

export default function BottomTabBar({ leagueId, mataMataUnlock = false }: BottomTabBarProps) {
  const pathname = usePathname()

  const TABS = [
    { label: 'MATA-MATA', Icon: Zap,          href: `/ligas/${leagueId}/mata-mata`, exact: true,  showDot: mataMataUnlock },
    { label: 'TABELA',    Icon: AlignJustify, href: `/ligas/${leagueId}/tabela`,   exact: true,  showDot: false          },
    { label: 'PAINEL',    Icon: Trophy,       href: `/ligas/${leagueId}`,          exact: true,  showDot: false          },
    { label: 'PALPITES',  Icon: CalendarDays, href: `/ligas/${leagueId}/palpites`, exact: false, showDot: false          },
    { label: 'RANKING',   Icon: Award,        href: `/ligas/${leagueId}/ranking`,  exact: true,  showDot: false          },
  ]

  return (
    <nav
      role="tablist"
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 flex lg:hidden bg-white border-t border-slate-100 z-40"
    >
      {TABS.map(({ label, Icon, href, exact, showDot }) => {
        const active = href
          ? exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + '/')
          : false
        const classes = [
          'flex-1 flex flex-col items-center justify-center py-2 gap-1 text-[10px] font-bold tracking-wide transition-colors',
          active
            ? 'text-[#0097A9]'
            : href
              ? 'text-slate-400 hover:text-slate-600'
              : 'text-slate-400 opacity-50 cursor-not-allowed pointer-events-none',
        ].join(' ')

        const iconEl = (
          <div className="relative">
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            {showDot && (
              <span
                className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#FFC72C]"
                aria-hidden="true"
                data-testid="mata-mata-unlock-dot"
              />
            )}
          </div>
        )

        if (href) {
          return (
            <Link key={label} href={href} role="tab" aria-selected={active} className={classes}>
              {iconEl}
              {label}
            </Link>
          )
        }

        return (
          <button
            key={label}
            role="tab"
            aria-selected={false}
            aria-disabled="true"
            className={classes}
          >
            {iconEl}
            {label}
          </button>
        )
      })}
    </nav>
  )
}
