import { MCP_PATH, resolveBaseUrl } from './config'
import { resolveAccessToken, touchToken, type ResolvedAccessToken } from './oauth-store'

/**
 * URL do metadata do Resource Server (RFC 9728).
 *
 * O caminho do recurso é inserido DEPOIS de `.well-known/...` — não é um sufixo
 * do host. É por este endereço, anunciado no header `WWW-Authenticate` de um 401,
 * que o Claude descobre sozinho onde fica o Authorization Server.
 */
export function protectedResourceMetadataUrl(baseUrl: string): string {
  return `${baseUrl}/.well-known/oauth-protected-resource${MCP_PATH}`
}

/**
 * 401 no formato que dispara o fluxo de autorização no cliente MCP.
 *
 * Sem o header `WWW-Authenticate` o Claude apenas reporta "não autorizado" e o
 * usuário fica sem o botão de conectar — este header É o convite ao OAuth.
 */
export function unauthorized(request: Request, description: string): Response {
  const baseUrl = resolveBaseUrl(request)
  return new Response(
    JSON.stringify({ error: 'invalid_token', error_description: description }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Bearer realm="bolao", error="invalid_token", error_description="${description}", resource_metadata="${protectedResourceMetadataUrl(
          baseUrl
        )}"`,
      },
    }
  )
}

/** Extrai o Bearer do header Authorization, se houver. */
export function readBearer(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}

/**
 * Resolve o token da requisição para uma identidade.
 *
 * Devolve `null` em qualquer falha (ausente, desconhecido, expirado, revogado) —
 * o chamador responde 401 sem distinguir os casos, para não dar a um atacante um
 * oráculo sobre quais tokens existem.
 */
export async function authenticate(
  request: Request
): Promise<ResolvedAccessToken | null> {
  const token = readBearer(request)
  if (!token) return null

  const resolved = await resolveAccessToken(token)
  if (!resolved) return null

  void touchToken(resolved.tokenId)
  return resolved
}
