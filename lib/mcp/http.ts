// Helpers de resposta compartilhados pelas rotas de OAuth e do MCP.

/**
 * CORS permissivo.
 *
 * Seguro aqui porque estes endpoints são autenticados por Bearer, nunca por
 * cookie: sem `Allow-Credentials`, um site terceiro não consegue emprestar a
 * sessão do navegador para chamar em nome do usuário. Necessário porque clientes
 * MCP web (claude.ai) fazem discovery e chamadas direto do browser.
 */
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Protocol-Version',
  'Access-Control-Expose-Headers': 'WWW-Authenticate, MCP-Protocol-Version',
  'Access-Control-Max-Age': '86400',
}

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {}
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...CORS_HEADERS,
      ...init.headers,
    },
  })
}

/** Erro no formato da RFC 6749 §5.2 — é o que os clientes OAuth sabem ler. */
export function oauthError(
  error: string,
  description: string,
  status = 400
): Response {
  return jsonResponse({ error, error_description: description }, { status })
}
