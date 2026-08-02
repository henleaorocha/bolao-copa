import { NextResponse, type NextRequest } from 'next/server'
import { resolveBaseUrl } from '@/lib/mcp/config'
import { verifyConsentToken } from '@/lib/mcp/consent-token'
import { createAuthCode } from '@/lib/mcp/oauth-store'
import { getSupabaseServerClient } from '@/lib/supabase/client'

// Recebe a decisão da tela de consentimento e emite (ou nega) o authorization code.

function redirectBack(target: URL): NextResponse {
  // 303 força o navegador a trocar POST por GET no destino.
  return NextResponse.redirect(target, { status: 303 })
}

export async function POST(request: NextRequest) {
  const baseUrl = resolveBaseUrl(request)

  // Defesa contra CSRF em profundidade. O consent_token assinado já impede que um
  // terceiro fabrique um pedido válido para OUTRA pessoa (ele embute o user_id e
  // é conferido contra a sessão), mas checar a origem custa nada e barra o ataque
  // antes de tocar no banco.
  const origin = request.headers.get('origin')
  if (origin && origin !== baseUrl) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Origem inválida' },
      { status: 403 }
    )
  }

  const form = await request.formData()
  const consentToken = form.get('consent_token')
  const decision = form.get('decision')

  if (typeof consentToken !== 'string') {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'consent_token ausente' },
      { status: 400 }
    )
  }

  const payload = verifyConsentToken(consentToken)
  if (!payload) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Pedido expirado ou adulterado. Tente conectar novamente.',
      },
      { status: 400 }
    )
  }

  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // O token vale só para a pessoa que viu a tela: se a sessão mudou (ou sumiu)
  // entre a exibição e o clique, o pedido não pode ser aproveitado.
  if (!user || user.id !== payload.userId) {
    return NextResponse.json(
      { error: 'access_denied', error_description: 'Sessão inválida' },
      { status: 401 }
    )
  }

  const target = new URL(payload.redirectUri)
  if (payload.state) target.searchParams.set('state', payload.state)

  if (decision !== 'allow') {
    target.searchParams.set('error', 'access_denied')
    target.searchParams.set('error_description', 'Autorização recusada pelo usuário')
    return redirectBack(target)
  }

  try {
    const code = await createAuthCode({
      clientId: payload.clientId,
      userId: payload.userId,
      redirectUri: payload.redirectUri,
      codeChallenge: payload.codeChallenge,
      scope: payload.scope,
      resource: payload.resource,
    })
    target.searchParams.set('code', code)
    return redirectBack(target)
  } catch (err) {
    console.error('[oauth/consent] falha:', err instanceof Error ? err.message : err)
    target.searchParams.set('error', 'server_error')
    target.searchParams.set('error_description', 'Falha ao emitir o código')
    return redirectBack(target)
  }
}
