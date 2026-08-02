import { corsPreflight, jsonResponse, oauthError } from '@/lib/mcp/http'
import { registerClient } from '@/lib/mcp/oauth-store'
import { isAcceptableRedirectUri } from '@/lib/mcp/redirect-uri'

// Dynamic Client Registration (RFC 7591).
//
// Endpoint aberto, como manda o fluxo de MCP: o Claude de cada participante se
// cadastra sozinho antes do primeiro login. Registrar um client NÃO dá acesso a
// nada — só cria um identificador. O acesso a dados exige que um participante
// real faça login e aprove o consentimento, e o token resultante é limitado ao
// que o RLS daquele usuário permite.

const MAX_REDIRECT_URIS = 5
const MAX_NAME_LENGTH = 120

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return oauthError('invalid_client_metadata', 'Corpo JSON inválido')
  }

  if (!body || typeof body !== 'object') {
    return oauthError('invalid_client_metadata', 'Corpo JSON inválido')
  }

  const metadata = body as Record<string, unknown>
  const redirectUris = metadata.redirect_uris

  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    return oauthError('invalid_redirect_uri', 'redirect_uris é obrigatório')
  }
  if (redirectUris.length > MAX_REDIRECT_URIS) {
    return oauthError(
      'invalid_redirect_uri',
      `no máximo ${MAX_REDIRECT_URIS} redirect_uris`
    )
  }
  if (!redirectUris.every((u) => typeof u === 'string' && isAcceptableRedirectUri(u))) {
    return oauthError('invalid_redirect_uri', 'redirect_uri não permitido')
  }

  const requestedAuthMethod =
    typeof metadata.token_endpoint_auth_method === 'string'
      ? metadata.token_endpoint_auth_method
      : 'none'

  if (
    !['none', 'client_secret_post', 'client_secret_basic'].includes(requestedAuthMethod)
  ) {
    return oauthError(
      'invalid_client_metadata',
      'token_endpoint_auth_method não suportado'
    )
  }

  const rawName = typeof metadata.client_name === 'string' ? metadata.client_name : null
  const clientName = rawName ? rawName.slice(0, MAX_NAME_LENGTH) : null

  try {
    const { clientId, clientSecret } = await registerClient({
      clientName,
      redirectUris: redirectUris as string[],
      tokenEndpointAuthMethod: requestedAuthMethod,
    })

    return jsonResponse(
      {
        client_id: clientId,
        ...(clientSecret ? { client_secret: clientSecret } : {}),
        client_id_issued_at: Math.floor(Date.now() / 1000),
        // 0 = não expira. Não há rotação automática de secret neste AS.
        client_secret_expires_at: 0,
        client_name: clientName,
        redirect_uris: redirectUris,
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: requestedAuthMethod,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[oauth/register] falha:', err instanceof Error ? err.message : err)
    return oauthError('server_error', 'Falha ao registrar o cliente', 500)
  }
}

export async function OPTIONS() {
  return corsPreflight()
}
