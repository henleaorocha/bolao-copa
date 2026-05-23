import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatSuccess, formatError } from '@/lib/api/responses'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
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

    const { id: leagueId, userId: targetUserId } = await params

    // Check if league exists and get created_by
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

    const league = leagueResult.data

    // Check if current user is the league admin
    if (league.created_by !== user.id) {
      return NextResponse.json(
        formatError('NOT_ADMIN', 'Apenas o administrador pode remover membros', 403),
        { status: 403 }
      )
    }

    // Check if trying to remove self (admin)
    if (targetUserId === league.created_by) {
      return NextResponse.json(
        formatError('CANNOT_REMOVE_ADMIN', 'O administrador não pode se remover da liga', 400),
        { status: 400 }
      )
    }

    // Remove the member
    const deleteResult = await supabase
      .from('league_members')
      .delete()
      .eq('league_id', leagueId)
      .eq('user_id', targetUserId)

    if (deleteResult.error) {
      console.error('[api/leagues/[id]/members/[userId] DELETE] Erro ao remover membro:', deleteResult.error?.message)
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao remover membro', 500),
        { status: 500 }
      )
    }

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/leagues/[id]/members/[userId]',
        method: 'DELETE',
        user_id: user.id,
        league_id: leagueId,
        removed_user_id: targetUserId,
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
        endpoint: '/api/leagues/[id]/members/[userId]',
        method: 'DELETE',
        duration_ms: duration,
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError('DATABASE_ERROR', 'Erro ao remover membro', 500),
      { status: 500 }
    )
  }
}
