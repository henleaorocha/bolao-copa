import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatSuccess, formatError } from '@/lib/api/responses'
import { ensureUserSynced } from '@/lib/user-sync'
import type { LeagueSummary } from '@/lib/api/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now()

  try {
    const supabase = await getSupabaseServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        formatError('SESSION_EXPIRED', 'Sessão expirada', 401),
        { status: 401 }
      )
    }

    const { id: leagueId } = await params

    // Self-heal: guarantee a public.users row exists before inserting into
    // league_members. The handle_new_user trigger only fires on the FIRST auth
    // signup, so a user whose public.users row was removed (while auth.users
    // survived) would otherwise hit a foreign-key violation
    // (league_members_user_id_fkey → users.id) here and get a 500.
    await ensureUserSynced(supabase, user)

    // Parse body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const bodyObj = body && typeof body === 'object' ? (body as { token?: unknown }) : {}
    const token = bodyObj.token

    // Look up the league with the service role: a PRIVATE league is invisible to
    // a non-member under RLS, so reading it (and its invite_token) with the
    // user's client returns 404 and invites can never be accepted. The token is
    // the secret that authorises this read (migration 11 / ADR-003).
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const leagueResult = await adminClient
      .from('leagues')
      .select('id, name, access_type, logo_url, member_count, invite_token')
      .eq('id', leagueId)
      .single()

    if (leagueResult.error) {
      return NextResponse.json(
        formatError('LEAGUE_NOT_FOUND', 'Liga não encontrada', 404),
        { status: 404 }
      )
    }

    const league = leagueResult.data

    // Check if user is already a member
    const membershipCheck = await supabase
      .from('league_members')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .single()

    if (!membershipCheck.error) {
      return NextResponse.json(
        formatError('ALREADY_A_MEMBER', 'Usuário já é membro desta liga', 400),
        { status: 400 }
      )
    }

    // For private leagues, validate token
    if (league.access_type === 'private') {
      if (!token || typeof token !== 'string' || token !== league.invite_token) {
        return NextResponse.json(
          formatError('INVALID_TOKEN', 'Token inválido', 403),
          { status: 403 }
        )
      }
    }

    // Insert user as member. No .select() on purpose: the SELECT policy
    // (is_member_of_league, STABLE) evaluates against the pre-insert snapshot, so
    // RETURNING the just-inserted row is filtered and PostgREST reports it as an
    // RLS violation. The inserted row isn't needed — the summary is re-read below.
    const insertResult = await supabase
      .from('league_members')
      .insert({
        league_id: leagueId,
        user_id: user.id,
        role: 'member',
      })

    if (insertResult.error) {
      console.error('[api/leagues/[id]/join] Erro ao inserir membro:', insertResult.error?.message)
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao entrar na liga', 500),
        { status: 500 }
      )
    }

    // Update user's active_league_id
    const updateResult = await supabase
      .from('users')
      .update({ active_league_id: leagueId })
      .eq('id', user.id)

    if (updateResult.error) {
      console.error('[api/leagues/[id]/join] Erro ao atualizar active_league_id:', updateResult.error?.message)
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao entrar na liga', 500),
        { status: 500 }
      )
    }

    // Fetch updated league data for response (exclude invite_token)
    const leagueSummaryResult = await supabase
      .from('leagues')
      .select('id, name, access_type, logo_url, member_count')
      .eq('id', leagueId)
      .single()

    if (leagueSummaryResult.error) {
      console.error('[api/leagues/[id]/join] Erro ao buscar liga:', leagueSummaryResult.error?.message)
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao entrar na liga', 500),
        { status: 500 }
      )
    }

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/leagues/[id]/join',
        method: 'POST',
        user_id: user.id,
        league_id: leagueId,
        status_code: 200,
        duration_ms: duration,
      })
    )

    const response: LeagueSummary = {
      ...leagueSummaryResult.data,
      role: 'member',
    }

    return NextResponse.json(formatSuccess(response), { status: 200 })
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/leagues/[id]/join',
        method: 'POST',
        duration_ms: duration,
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError('DATABASE_ERROR', 'Erro ao entrar na liga', 500),
      { status: 500 }
    )
  }
}
