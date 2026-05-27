'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Trophy, CalendarDays, AlignJustify, Zap, Award, Users, User } from 'lucide-react'
import InviteShareButton from './InviteShareButton'

interface PainelSidebarProps {
  leagueId: string
  leagueName: string
  leagueLogoUrl: string | null
  inviteToken: string
  currentUserName: string | null
  currentUserAvatarColor: string
}

export default function PainelSidebar({
  leagueId,
  leagueName,
  leagueLogoUrl,
  inviteToken,
  currentUserName,
  currentUserAvatarColor,
}: PainelSidebarProps) {
  const pathname = usePathname()

  const NAV_ITEMS = [
    { label: 'Painel',    Icon: Trophy,        href: `/ligas/${leagueId}`,          exact: true  },
    { label: 'Palpites',  Icon: CalendarDays,  href: `/ligas/${leagueId}/palpites`, exact: false },
    { label: 'Tabela',    Icon: AlignJustify,  href: `/ligas/${leagueId}/tabela`,   exact: true  },
    { label: 'Mata-mata', Icon: Zap,           href: null,                          exact: true  },
    { label: 'Ranking',   Icon: Award,         href: null,                          exact: true  },
    { label: 'Ligas',     Icon: Users,         href: '/ligas',                      exact: true  },
    { label: 'Perfil',    Icon: User,          href: null,                          exact: true  },
  ]
  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== 'undefined' ? window.location.origin : '')}/join?token=${inviteToken}`
  const firstName = currentUserName?.split(' ')[0] ?? 'Você'
  const initials = (currentUserName ?? 'V').slice(0, 2).toUpperCase()

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen overflow-y-auto bg-[#244C5A] text-white">
      {/* League header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          {leagueLogoUrl ? (
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
              <Image src={leagueLogoUrl} alt={leagueName} width={40} height={40} className="object-cover w-full h-full" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#244C5A]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">BOLÃO</p>
            <p className="text-sm font-black truncate">{leagueName}</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2" aria-label="Navegação do painel">
        {NAV_ITEMS.map(({ label, Icon, href, exact }) => {
          const active = href
            ? exact
              ? pathname === href
              : pathname === href || pathname.startsWith(href + '/')
            : false
          const classes = [
            'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold mb-1 transition-colors min-h-[44px] w-full',
            active
              ? 'bg-[#0097A9] text-white'
              : href
                ? 'text-white/60 hover:text-white/90 hover:bg-white/5'
                : 'text-white/40 cursor-not-allowed pointer-events-none',
          ].join(' ')

          const content = (
            <>
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} className="shrink-0" />
              <span className="flex-1">{label}</span>
              {active && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFC72C] shrink-0" aria-hidden="true" />
              )}
            </>
          )

          if (href) {
            return (
              <Link key={label} href={href} className={classes}>
                {content}
              </Link>
            )
          }

          return (
            <div key={label} role="button" aria-disabled="true" className={classes}>
              {content}
            </div>
          )
        })}
      </nav>

      {/* Invite button */}
      <div className="px-4 pb-4">
        <InviteShareButton inviteUrl={inviteUrl} variant="sidebar" />
      </div>

      {/* User avatar */}
      <div className="px-4 pb-6 flex items-center gap-3 border-t border-white/10 pt-4">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
          style={{ background: currentUserAvatarColor }}
        >
          {initials}
        </div>
        <span className="text-sm font-semibold truncate">{firstName}</span>
      </div>
    </aside>
  )
}
