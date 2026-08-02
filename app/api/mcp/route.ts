import { authenticate, unauthorized } from '@/lib/mcp/auth'
import { MCP_PROTOCOL_VERSION } from '@/lib/mcp/config'
import { CORS_HEADERS, corsPreflight } from '@/lib/mcp/http'
import {
  ERROR_INTERNAL,
  ERROR_PARSE,
  fail,
  handleJsonRpc,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from '@/lib/mcp/jsonrpc'
import type { ToolContext } from '@/lib/mcp/tools'

// Servidor MCP (transporte Streamable HTTP, modo stateless).
//
// Implementado à mão em vez de via SDK: o subconjunto de JSON-RPC que um servidor
// só-de-tools precisa é pequeno, e sem sessão nem stream não há máquina de estado
// para gerenciar. Isso evita uma dependência a mais no caminho autenticado e
// combina com o modelo de função efêmera da Vercel, onde não há memória entre
// requisições para guardar sessão de qualquer forma.
//
// O protocolo em si vive em lib/mcp/jsonrpc.ts; aqui ficam só as preocupações
// HTTP: autenticação, CORS e códigos de status.

export const dynamic = 'force-dynamic'

function rpcResponse(body: unknown, status = 200): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
      ...CORS_HEADERS,
    },
  })
}

export async function POST(request: Request) {
  const identity = await authenticate(request)
  if (!identity) {
    return unauthorized(request, 'Token ausente, expirado ou revogado')
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return rpcResponse(fail(null, ERROR_PARSE, 'JSON inválido'), 400)
  }

  const ctx: ToolContext = { userId: identity.userId }

  try {
    if (Array.isArray(payload)) {
      const results = await Promise.all(
        payload.map((item) => handleJsonRpc(item as JsonRpcRequest, ctx))
      )
      const responses = results.filter((r): r is JsonRpcResponse => r !== null)
      // Lote só de notificações não tem corpo de resposta.
      return responses.length === 0 ? rpcResponse(null, 202) : rpcResponse(responses)
    }

    const response = await handleJsonRpc(payload as JsonRpcRequest, ctx)
    return response === null ? rpcResponse(null, 202) : rpcResponse(response)
  } catch (err) {
    console.error('[mcp] falha inesperada:', err instanceof Error ? err.message : err)
    return rpcResponse(fail(null, ERROR_INTERNAL, 'Erro interno'), 500)
  }
}

/**
 * Este servidor não abre stream SSE — não há notificação iniciada pelo servidor
 * para entregar. A spec permite recusar o GET com 405, e é o que os clientes
 * interpretam como "só POST".
 */
export async function GET() {
  return new Response(
    JSON.stringify({ error: 'Este endpoint MCP aceita apenas POST (JSON-RPC).' }),
    { status: 405, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
  )
}

export async function OPTIONS() {
  return corsPreflight()
}
