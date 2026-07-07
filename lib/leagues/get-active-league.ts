import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type { LeagueSummary } from '@/lib/api/types'

// Tag por usuário para o cache da liga ativa do root layout.
//
// O root layout (`app/layout.tsx`) precisa da liga ativa para o `LeagueProvider`
// (Topbar/LeagueSwitcher). Antes isso era 1 `getUser()` + até 4 queries em TODA
// navegação e TODO prefetch de `<Link>` (layout é dinâmico) — a maior fonte de
// Active CPU/invocações restante na Vercel Fluid depois do fix do proxy.
//
// Agora a resolução da liga é cacheada por `userId` (service-role, sem
// cookies/headers para ser cacheável). Invalide (`revalidateTag`) quando a liga
// ativa do usuário puder mudar:
//   - entrada em liga nova            → /api/leagues/[id]/join
//   - criação de liga (vira ativa)    → POST /api/leagues
//   - troca de liga ativa             → PATCH /api/auth/me
// `member_count`/`role` de terceiros são cosméticos aqui; o backstop de
// `revalidate` abaixo auto-corrige sem precisar de invalidação cruzada.
export function activeLeagueTag(userId: string): string {
  return `active-league:${userId}`
}

// Janela máxima de obsolescência (segundos) caso nenhuma invalidação dispare.
const ACTIVE_LEAGUE_REVALIDATE_SECONDS = 300

// Resolve a liga ativa do usuário SOMENTE-LEITURA (não reseta active_league_id
// como `resolveActiveLeague`, pois escrever dentro de um cache é proibido):
// 1. active_league_id, se o usuário ainda for membro;
// 2. senão, a primeira liga por joined_at ASC;
// 3. sem ligas → null.
async function loadActiveLeagueForUser(
  userId: string
): Promise<LeagueSummary | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const userResult = await supabase
    .from('users')
    .select('active_league_id')
    .eq('id', userId)
    .single()

  if (userResult.error) {
    console.error('[active-league] Erro ao ler usuário:', userResult.error.message)
    return null
  }

  let effectiveLeagueId: string | null = null
  const activeLeagueId = userResult.data.active_league_id

  if (activeLeagueId) {
    const membershipCheck = await supabase
      .from('league_members')
      .select('user_id')
      .eq('user_id', userId)
      .eq('league_id', activeLeagueId)
      .single()

    if (!membershipCheck.error) {
      effectiveLeagueId = activeLeagueId
    }
  }

  if (!effectiveLeagueId) {
    const fallbackResult = await supabase
      .from('league_members')
      .select('league_id')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true })
      .limit(1)
      .single()

    if (fallbackResult.error) {
      // Usuário sem ligas (não é erro).
      return null
    }

    effectiveLeagueId = fallbackResult.data.league_id
  }

  const [leagueResult, memberResult] = await Promise.all([
    supabase
      .from('leagues')
      .select('id, name, access_type, logo_url, member_count')
      .eq('id', effectiveLeagueId)
      .single(),
    supabase
      .from('league_members')
      .select('role')
      .eq('user_id', userId)
      .eq('league_id', effectiveLeagueId)
      .single(),
  ])

  if (leagueResult.error || memberResult.error) {
    const err = leagueResult.error ?? memberResult.error
    console.error('[active-league] Erro de banco:', err?.message)
    return null
  }

  return {
    ...leagueResult.data,
    role: memberResult.data.role,
  } as LeagueSummary
}

// Versão cacheada. A chave inclui `userId`, então cada usuário tem sua própria
// entrada; cada uma carrega sua tag `active-league:<userId>`.
export function getCachedActiveLeague(
  userId: string
): Promise<LeagueSummary | null> {
  return unstable_cache(
    () => loadActiveLeagueForUser(userId),
    ['active-league-v1', userId],
    {
      revalidate: ACTIVE_LEAGUE_REVALIDATE_SECONDS,
      tags: [activeLeagueTag(userId)],
    }
  )()
}
