'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Trophy, CalendarDays, AlignJustify, Award, User } from 'lucide-react'

interface BottomTabBarProps {
  leagueId: string
}

export default function BottomTabBar({ leagueId }: BottomTabBarProps) {
  const pathname = usePathname()

  const TABS = [
    { label: 'PAINEL',   Icon: Trophy,       href: `/ligas/${leagueId}`,          exact: true  },
    { label: 'PALPITES', Icon: CalendarDays, href: `/ligas/${leagueId}/palpites`, exact: false },
    { label: 'TABELA',   Icon: AlignJustify, href: `/ligas/${leagueId}/tabela`,   exact: true  },
    { label: 'RANKING',  Icon: Award,        href: null,                          exact: true  },
    { label: 'PERFIL',   Icon: User,         href: null,                          exact: true  },
  ]

  return (
    <nav
      role="tablist"
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 flex lg:hidden bg-white border-t border-slate-100 z-40"
    >
      {TABS.map(({ label, Icon, href, exact }) => {
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

        if (href) {
          return (
            <Link key={label} href={href} role="tab" aria-selected={active} className={classes}>
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
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
            <Icon size={20} strokeWidth={1.8} />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
