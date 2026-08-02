import { corsPreflight, jsonResponse, oauthError } from '@/lib/mcp/http'
import { revokeToken } from '@/lib/mcp/oauth-store'

// Token Revocation (RFC 7009). É o que o Claude chama quando o participante
// remove o conector.
//
// A RFC manda responder 200 mesmo para token desconhecido ou já revogado: a
// revogação é idempotente e a resposta não deve revelar se um token existia.

export async function POST(request: Request) {
  let form: URLSearchParams
  try {
    form = new URLSearchParams(await request.text())
  } catch {
    return oauthError('invalid_request', 'Corpo inválido')
  }

  const token = form.get('token')
  if (!token) {
    return oauthError('invalid_request', 'token é obrigatório')
  }

  try {
    await revokeToken(token)
  } catch (err) {
    console.error('[oauth/revoke] falha:', err instanceof Error ? err.message : err)
    return oauthError('server_error', 'Falha ao revogar', 500)
  }

  return jsonResponse({})
}

export async function OPTIONS() {
  return corsPreflight()
}
