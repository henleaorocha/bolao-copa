import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatSuccess, formatError } from '@/lib/api/responses'
import type { LeagueDetail, LeagueMember, RankingEntry, UserStats } from '@/lib/api/types'

interface LeagueMemberRecord {
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  onboarded_at: string | null
  users: {
    full_name: string | null
    avatar_url: string | null
    avatar_color: string
  }[]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now()

  // Reject unexpected query params
  const allowedParams: string[] = []
  for (const key of request.nextUrl.searchParams.keys()) {
    if (!allowedParams.includes(key)) {
      return NextResponse.json(
        formatError('INVALID_PARAMS', 'Parâmetros inválidos na requisição', 400),
        { status: 400 }
      )
    }
  }

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

    // Check if user is a member of the league
    const membershipCheck = await supabase
      .from('league_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .single()

    if (membershipCheck.error) {
      return NextResponse.json(
        formatError('NOT_A_MEMBER', 'Usuário não é membro desta liga', 403),
        { status: 403 }
      )
    }

    // Fetch league details
    const leagueResult = await supabase
      .from('leagues')
      .select(
        `id, name, access_type, logo_url, member_count, description, created_by, created_at, invite_token, prize_pool`
      )
      .eq('id', leagueId)
      .single()

    if (leagueResult.error) {
      return NextResponse.json(
        formatError('LEAGUE_NOT_FOUND', 'Liga não encontrada', 404),
        { status: 404 }
      )
    }

    // Fetch members
    const membersResult = await supabase
      .from('league_members')
      .select(
        `
        user_id,
        role,
        joined_at,
        onboarded_at,
        users (
          full_name,
          avatar_url,
          avatar_color
        )
      `
      )
      .eq('league_id', leagueId)
      .order('joined_at', { ascending: true })

    if (membersResult.error) {
      console.error('[api/leagues/[id] GET] Erro ao buscar membros:', membersResult.error?.message)
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao buscar membros da liga', 500),
        { status: 500 }
      )
    }

    // Map members to LeagueMember[]
    const members: LeagueMember[] = membersResult.data.map((row: LeagueMemberRecord) => ({
      user_id: row.user_id,
      full_name: row.users?.[0]?.full_name ?? null,
      avatar_url: row.users?.[0]?.avatar_url ?? null,
      avatar_color: row.users?.[0]?.avatar_color ?? '',
      role: row.role,
      joined_at: row.joined_at,
    }))

    const currentMember = membersResult.data.find((m: LeagueMemberRecord) => m.user_id === user.id)
    const user_onboarded_at = currentMember?.onboarded_at ?? null

    const { data: betData, error: betError } = await supabase
      .from('champion_bets')
      .select('*')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .maybeSingle()

    const has_champion_bet = !betError && betData !== null
    const champion_bet = has_champion_bet ? betData : null

    const user_stats: UserStats = {
      position: 0,
      points: 0,
      guesses_made: 0,
      guesses_total: 0,
      exact_scores: 0,
    }

    const ranking: RankingEntry[] = members
      .slice()
      .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
      .slice(0, 5)
      .map((m, i) => ({
        user_id: m.user_id,
        full_name: m.full_name,
        avatar_color: m.avatar_color,
        points: 0,
        position: i + 1,
      }))

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/leagues/[id]',
        method: 'GET',
        user_id: user.id,
        league_id: leagueId,
        status_code: 200,
        duration_ms: duration,
      })
    )

    const { prize_pool, ...leagueData } = leagueResult.data
    const response = {
      ...leagueData,
      prizes: prize_pool ?? null,
      role: membershipCheck.data.role,
      user_onboarded_at,
      members,
      has_champion_bet,
      champion_bet,
      user_stats,
      ranking,
    } as LeagueDetail

    return NextResponse.json(formatSuccess(response), { status: 200 })
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/leagues/[id]',
        method: 'GET',
        duration_ms: duration,
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError('DATABASE_ERROR', 'Erro ao buscar liga', 500),
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    // Check if user is the league admin
    const leagueResult = await supabase
      .from('leagues')
      .select('id, created_by')
      .eq('id', leagueId)
      .single()

    if (leagueResult.error) {
      return NextResponse.json(
        formatError('LEAGUE_NOT_FOUND', 'Liga não encontrada', 404),
        { status: 404 }
      )
    }

    if (leagueResult.data.created_by !== user.id) {
      return NextResponse.json(
        formatError('NOT_ADMIN', 'Apenas administrador pode modificar a liga', 403),
        { status: 403 }
      )
    }

    // Parse body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        formatError('INVALID_BODY', 'Corpo da requisição inválido', 400),
        { status: 400 }
      )
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        formatError('INVALID_BODY', 'Corpo da requisição inválido', 400),
        { status: 400 }
      )
    }

    const { name, access_type } = body as { name?: unknown; access_type?: unknown }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string') {
        return NextResponse.json(
          formatError('INVALID_BODY', 'Nome deve ser string', 400),
          { status: 400 }
        )
      }
      const trimmed = name.trim()
      if (trimmed.length < 2 || trimmed.length > 50) {
        return NextResponse.json(
          formatError('INVALID_BODY', 'Nome deve ter entre 2 e 50 caracteres', 400),
          { status: 400 }
        )
      }
    }

    // Validate access_type if provided
    if (access_type !== undefined) {
      if (access_type !== 'open' && access_type !== 'private') {
        return NextResponse.json(
          formatError('INVALID_BODY', 'access_type deve ser "open" ou "private"', 400),
          { status: 400 }
        )
      }
    }

    // Prepare update object
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) {
      updateData.name = (name as string).trim()
    }
    if (access_type !== undefined) {
      updateData.access_type = access_type
    }

    // If no fields to update, return current state
    if (Object.keys(updateData).length === 0) {
      const currentLeague = await supabase
        .from('leagues')
        .select('id, name, access_type, logo_url, member_count')
        .eq('id', leagueId)
        .single()

      if (currentLeague.error) {
        return NextResponse.json(
          formatError('DATABASE_ERROR', 'Erro ao buscar liga', 500),
          { status: 500 }
        )
      }

      const memberResult = await supabase
        .from('league_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('league_id', leagueId)
        .single()

      const duration = Date.now() - start
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          endpoint: '/api/leagues/[id]',
          method: 'PATCH',
          user_id: user.id,
          league_id: leagueId,
          status_code: 200,
          duration_ms: duration,
        })
      )

      return NextResponse.json(
        formatSuccess({
          ...currentLeague.data,
          role: memberResult.data?.role ?? 'member',
        }),
        { status: 200 }
      )
    }

    // Update league
    const updateResult = await supabase
      .from('leagues')
      .update(updateData)
      .eq('id', leagueId)
      .select('id, name, access_type, logo_url, member_count')
      .single()

    if (updateResult.error) {
      console.error('[api/leagues/[id] PATCH] Erro ao atualizar liga:', updateResult.error?.message)
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao atualizar liga', 500),
        { status: 500 }
      )
    }

    const memberResult = await supabase
      .from('league_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .single()

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/leagues/[id]',
        method: 'PATCH',
        user_id: user.id,
        league_id: leagueId,
        status_code: 200,
        duration_ms: duration,
      })
    )

    return NextResponse.json(
      formatSuccess({
        ...updateResult.data,
        role: memberResult.data?.role ?? 'admin',
      }),
      { status: 200 }
    )
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/leagues/[id]',
        method: 'PATCH',
        duration_ms: duration,
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError('DATABASE_ERROR', 'Erro ao atualizar liga', 500),
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Check if user is the league admin
    const leagueResult = await supabase
      .from('leagues')
      .select('id, name, created_by')
      .eq('id', leagueId)
      .single()

    if (leagueResult.error) {
      return NextResponse.json(
        formatError('LEAGUE_NOT_FOUND', 'Liga não encontrada', 404),
        { status: 404 }
      )
    }

    if (leagueResult.data.created_by !== user.id) {
      return NextResponse.json(
        formatError('NOT_ADMIN', 'Apenas administrador pode deletar a liga', 403),
        { status: 403 }
      )
    }

    // Parse body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        formatError('INVALID_BODY', 'Corpo da requisição inválido', 400),
        { status: 400 }
      )
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        formatError('INVALID_BODY', 'Corpo da requisição inválido', 400),
        { status: 400 }
      )
    }

    const { confirm_name } = body as { confirm_name?: unknown }

    if (!confirm_name || typeof confirm_name !== 'string') {
      return NextResponse.json(
        formatError('INVALID_BODY', 'confirm_name é obrigatório', 400),
        { status: 400 }
      )
    }

    // Verify name matches
    if (confirm_name !== leagueResult.data.name) {
      return NextResponse.json(
        formatError('CONFIRM_NAME_MISMATCH', 'Nome de confirmação não coincide', 400),
        { status: 400 }
      )
    }

    // Delete league (cascade will handle league_members and users.active_league_id)
    const deleteResult = await supabase
      .from('leagues')
      .delete()
      .eq('id', leagueId)

    if (deleteResult.error) {
      console.error('[api/leagues/[id] DELETE] Erro ao deletar liga:', deleteResult.error?.message)
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao deletar liga', 500),
        { status: 500 }
      )
    }

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/leagues/[id]',
        method: 'DELETE',
        user_id: user.id,
        league_id: leagueId,
        status_code: 200,
        duration_ms: duration,
      })
    )

    return NextResponse.json(formatSuccess({ ok: true }), { status: 200 })
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/leagues/[id]',
        method: 'DELETE',
        duration_ms: duration,
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError('DATABASE_ERROR', 'Erro ao deletar liga', 500),
      { status: 500 }
    )
  }
}
