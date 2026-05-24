import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatError } from '@/lib/api/responses'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { data, error } = await supabase
    .from('league_members')
    .update({ onboarded_at: new Date().toISOString() })
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .select('user_id')

  if (error) {
    return NextResponse.json(
      formatError('DATABASE_ERROR', 'Erro ao atualizar status de onboarding', 500),
      { status: 500 }
    )
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      formatError('NOT_A_MEMBER', 'Usuário não é membro desta liga', 403),
      { status: 403 }
    )
  }

  return new NextResponse(null, { status: 204 })
}
