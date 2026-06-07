export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { ensureUserSynced } from '@/lib/user-sync'
import { getLeaguesHub } from '@/lib/leagues/get-leagues-hub'
import { canCreateLeague } from '@/lib/leagues/can-create-league'
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

  // Login lands here (auth/callback-redirect → /ligas) when there's no invite.
  // Recreate the public.users row if it's missing: the handle_new_user trigger
  // only fires on the first auth signup, so a returning user whose public.users
  // row was removed (auth.users still present) would otherwise stay orphaned and
  // later hit a foreign-key 500 on join. This is the no-invite self-heal.
  await ensureUserSynced(supabase, user)

  const fullName: string = user.user_metadata?.full_name ?? ''
  const firstName = fullName.split(' ')[0] || 'usuário'

  const [leagues, canCreate, countdown] = await Promise.all([
    getLeaguesHub(supabase, user.id),
    canCreateLeague(supabase, user.id),
    Promise.resolve(getDaysUntilCopa()),
  ])

  const hasLeagues = leagues.length > 0
  // No-league guidance (ADR-005) is for users who cannot create a league: their
  // only way in is an invite link / open league. Capable users keep the hub
  // layout (their create card) even with zero leagues, per ADR-001.
  const showEmptyState = !hasLeagues && !canCreate

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
          {hasLeagues || canCreate ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {leagues.map((league) => (
                <LeagueCard key={league.id} league={league} />
              ))}

              {/* Hide (not disable) the create entry point for users without the
                  capability — keeps the hub uncluttered (ADR-001). */}
              {canCreate && <CreateLeagueModal />}
            </div>
          ) : null}

          {showEmptyState && (
            <div
              data-testid="no-league-empty-state"
              className="rounded-[28px] border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#244C5A] text-2xl text-white">
                🎟️
              </div>
              <h2 className="text-lg font-black text-[#244C5A]">
                Você ainda não está em nenhuma liga
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                Acesse com o link de convite de uma liga — ou entre em uma liga aberta —
                para começar a palpitar. Assim que você participar, ela aparece aqui.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Copa countdown banner */}
      <div className="px-6 pb-12">
        <CountdownBanner countdown={countdown} />
      </div>
    </div>
  )
}
