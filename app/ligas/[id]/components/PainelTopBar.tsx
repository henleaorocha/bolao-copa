'use client'

import Link from 'next/link'
import Image from 'next/image'
import InviteShareButton from './InviteShareButton'

interface PainelTopBarProps {
  leagueName: string
  leagueLogoUrl: string | null
  inviteToken: string
  currentUserName: string | null
  currentUserAvatarColor: string
}

export default function PainelTopBar({
  leagueName,
  leagueLogoUrl,
  inviteToken,
}: PainelTopBarProps) {
  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== 'undefined' ? window.location.origin : '')}/join?token=${inviteToken}`

  return (
    <header className="flex lg:hidden items-center justify-between px-4 py-3 bg-[#244C5A] text-white sticky top-0 z-30">
      <Link href="/ligas" className="flex items-center gap-3 min-w-0 flex-1 min-h-[44px]">
        {leagueLogoUrl ? (
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
            <Image src={leagueLogoUrl} alt={leagueName} width={32} height={32} className="object-cover w-full h-full" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-[#244C5A]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 leading-none">BOLÃO</p>
          <p className="text-sm font-black truncate leading-tight">{leagueName}</p>
        </div>
      </Link>

      <div className="flex-shrink-0 ml-3">
        <InviteShareButton inviteUrl={inviteUrl} variant="topbar" />
      </div>
    </header>
  )
}
