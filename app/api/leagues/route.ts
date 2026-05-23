import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatSuccess, formatError } from '@/lib/api/responses'
import type { LeagueSummary, LeagueMemberWithLeague } from '@/lib/api/types'

export async function GET(request: NextRequest) {
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

    // Get all leagues where user is a member, ordered by joined_at DESC
    const result = await supabase
      .from('league_members')
      .select(
        `
        league_id,
        joined_at,
        role,
        leagues (
          id,
          name,
          access_type,
          logo_url,
          member_count
        )
      `
      )
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })

    if (result.error) {
      console.error('[api/leagues GET] Erro de banco:', result.error?.message)
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao buscar ligas', 500),
        { status: 500 }
      )
    }

    const leagues: LeagueSummary[] = result.data.map((row: LeagueMemberWithLeague) => ({
      id: row.leagues[0].id,
      name: row.leagues[0].name,
      access_type: row.leagues[0].access_type,
      logo_url: row.leagues[0].logo_url,
      role: row.role,
      member_count: row.leagues[0].member_count,
    }))

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/leagues',
        user_id: user.id,
        status_code: 200,
        duration_ms: duration,
      })
    )

    return NextResponse.json(formatSuccess(leagues))
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/leagues',
        duration_ms: duration,
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError('DATABASE_ERROR', 'Erro ao buscar ligas', 500),
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const {
      name,
      access_type,
      description,
    } = body as {
      name?: unknown
      access_type?: unknown
      description?: unknown
    }

    // Validate name
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        formatError('INVALID_BODY', 'Nome da liga é obrigatório', 400),
        { status: 400 }
      )
    }

    const trimmedName = name.trim()
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return NextResponse.json(
        formatError('INVALID_BODY', 'Nome deve ter entre 2 e 50 caracteres', 400),
        { status: 400 }
      )
    }

    // Validate access_type
    if (!access_type || typeof access_type !== 'string' || !['open', 'private'].includes(access_type)) {
      return NextResponse.json(
        formatError('INVALID_BODY', 'Tipo de acesso inválido', 400),
        { status: 400 }
      )
    }

    // Validate description (optional)
    if (description !== undefined && description !== null) {
      if (typeof description !== 'string') {
        return NextResponse.json(
          formatError('INVALID_BODY', 'Descrição deve ser texto', 400),
          { status: 400 }
        )
      }
      if (description.length > 200) {
        return NextResponse.json(
          formatError('INVALID_BODY', 'Descrição não pode exceder 200 caracteres', 400),
          { status: 400 }
        )
      }
    }

    // Create the league
    const leagueResult = await supabase
      .from('leagues')
      .insert({
        name: trimmedName,
        access_type: access_type as 'open' | 'private',
        description: description && typeof description === 'string' ? description.trim() : null,
        created_by: user.id,
      })
      .select('id, name, access_type, logo_url, member_count')
      .single()

    if (leagueResult.error) {
      console.error('[api/leagues POST] Erro ao criar liga:', leagueResult.error?.message)
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao criar liga', 500),
        { status: 500 }
      )
    }

    const leagueId = leagueResult.data.id

    // Add creator as admin member
    const memberResult = await supabase
      .from('league_members')
      .insert({
        league_id: leagueId,
        user_id: user.id,
        role: 'admin',
      })
      .select('role')
      .single()

    if (memberResult.error) {
      console.error('[api/leagues POST] Erro ao adicionar membro admin:', memberResult.error?.message)
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao criar liga', 500),
        { status: 500 }
      )
    }

    // Set active_league_id for the creator
    const updateResult = await supabase
      .from('users')
      .update({ active_league_id: leagueId })
      .eq('id', user.id)

    if (updateResult.error) {
      console.error('[api/leagues POST] Erro ao atualizar active_league_id:', updateResult.error?.message)
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao criar liga', 500),
        { status: 500 }
      )
    }

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/leagues',
        method: 'POST',
        user_id: user.id,
        league_id: leagueId,
        status_code: 201,
        duration_ms: duration,
      })
    )

    const response: LeagueSummary = {
      id: leagueResult.data.id,
      name: leagueResult.data.name,
      access_type: leagueResult.data.access_type,
      logo_url: leagueResult.data.logo_url,
      role: memberResult.data.role,
      member_count: leagueResult.data.member_count,
    }

    return NextResponse.json(formatSuccess(response), { status: 201 })
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/leagues',
        method: 'POST',
        duration_ms: duration,
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError('DATABASE_ERROR', 'Erro ao criar liga', 500),
      { status: 500 }
    )
  }
}
