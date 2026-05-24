export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { getLeaguesHub } from '@/lib/leagues/get-leagues-hub'
import { getDaysUntilCopa } from '@/lib/leagues/get-days-until-copa'
import type { CopaCountdown } from '@/lib/leagues/get-days-until-copa'
import LeagueCard from '@/components/LeagueCard'
import LogoutButton from '@/components/LogoutButton'
import CreateLeagueModal from '@/components/CreateLeagueModal'

function CountdownBanner({ countdown }: { countdown: CopaCountdown }) {
  return (
    <div
      data-testid="countdown-banner"
      className="mx-auto max-w-5xl rounded-2xl bg-amber-50 px-6 py-5 flex items-center gap-4"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-400">
        <span aria-hidden="true" className="text-lg">⚽</span>
      </div>
      <div>
        {countdown.isUnderway ? (
          <p className="font-semibold text-amber-900">A Copa está acontecendo.</p>
        ) : (
          <p className="font-semibold text-amber-900">
            A Copa começa em {countdown.days} dias
          </p>
        )}
        <p className="mt-0.5 text-sm text-amber-700">
          Não esqueça: palpite de Campeão fecha 1h antes do 1° jogo!
        </p>
      </div>
    </div>
  )
}

export default async function LigasPage() {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const fullName: string = user.user_metadata?.full_name ?? ''
  const firstName = fullName.split(' ')[0] || 'usuário'

  const [leagues, countdown] = await Promise.all([
    getLeaguesHub(supabase, user.id),
    Promise.resolve(getDaysUntilCopa()),
  ])

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Branded header — same dark background as hero */}
      <header className="bg-[#244C5A]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-lg">
              🏆
            </div>
            <div className="leading-tight">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
                Bolão Copa
              </p>
              <p className="text-base font-bold text-white">2026</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Hero — dark petrol-blue; padding-bottom creates space for card overlap */}
      <section className="bg-[#244C5A] px-6 pb-24 pt-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-white/80">
            E aí, <strong className="font-bold text-white">{firstName}</strong> 👋
          </p>
          <h1 className="mt-2 text-4xl font-extrabold leading-tight text-white md:text-5xl">
            Suas ligas{' '}
            <span className="text-yellow-400">te esperam</span>
          </h1>
          <p className="mt-3 max-w-sm text-sm text-white/70">
            Escolha uma liga para palpitar ou crie uma nova com a galera.
          </p>
        </div>
      </section>

      {/* Card grid — negative margin-top pulls cards up into the hero overlap zone;
          overflow:hidden must NOT be set on the hero or the overlap is clipped */}
      <section className="-mt-16 px-6 pb-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {leagues.map((league) => (
              <LeagueCard key={league.id} league={league} />
            ))}

            <CreateLeagueModal />
          </div>
        </div>
      </section>

      {/* Copa countdown banner */}
      <div className="px-6 pb-12">
        <CountdownBanner countdown={countdown} />
      </div>
    </div>
  )
}
