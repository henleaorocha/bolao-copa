import { MCP_PROTOCOL_VERSION } from './config'
import { TOOLS_BY_NAME, toolListPayload, type ToolContext } from './tools'

// Núcleo JSON-RPC do servidor MCP, separado da rota HTTP para ser testável sem
// subir um servidor. A rota cuida de autenticação, CORS e códigos HTTP; aqui só
// existe protocolo.

export const JSONRPC_VERSION = '2.0'

export const ERROR_PARSE = -32700
export const ERROR_INVALID_REQUEST = -32600
export const ERROR_METHOD_NOT_FOUND = -32601
export const ERROR_INTERNAL = -32603

export interface JsonRpcRequest {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: Record<string, unknown>
}

export interface JsonRpcResponse {
  jsonrpc: string
  id: string | number | null
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

export function ok(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: JSONRPC_VERSION, id, result }
}

export function fail(
  id: string | number | null,
  code: number,
  message: string
): JsonRpcResponse {
  return { jsonrpc: JSONRPC_VERSION, id, error: { code, message } }
}

const SERVER_INSTRUCTIONS =
  'Dados do Bolão da Copa 2026 do usuário autenticado (somente leitura). ' +
  'Comece por list_leagues para obter os league_id. Para análises hipotéticas ' +
  '(e se o time X tivesse avançado, ranking cruzando várias ligas), leia ' +
  'get_predictions + get_matches + get_scoring_rules e faça a conta você mesmo; ' +
  'get_ranking devolve apenas a classificação oficial vigente.'

/**
 * Processa uma mensagem JSON-RPC.
 *
 * Devolve `null` para notificações (mensagem sem `id`), que por definição não
 * têm resposta — o chamador traduz isso em 202 sem corpo.
 */
export async function handleJsonRpc(
  message: JsonRpcRequest,
  ctx: ToolContext
): Promise<JsonRpcResponse | null> {
  const id = message.id ?? null
  const isNotification = message.id === undefined || message.id === null

  if (message.jsonrpc !== JSONRPC_VERSION || typeof message.method !== 'string') {
    return isNotification ? null : fail(id, ERROR_INVALID_REQUEST, 'Requisição inválida')
  }

  switch (message.method) {
    case 'initialize': {
      // Ecoa a versão pedida quando é a que implementamos; caso contrário anuncia
      // a nossa e deixa o cliente decidir se continua (handshake do MCP).
      const requested = message.params?.protocolVersion
      const negotiated =
        typeof requested === 'string' && requested === MCP_PROTOCOL_VERSION
          ? requested
          : MCP_PROTOCOL_VERSION

      return ok(id, {
        protocolVersion: negotiated,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'bolao-copa', version: '1.0.0' },
        instructions: SERVER_INSTRUCTIONS,
      })
    }

    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null

    case 'ping':
      return ok(id, {})

    case 'tools/list':
      return ok(id, { tools: toolListPayload() })

    case 'tools/call': {
      const params = message.params ?? {}
      const name = params.name
      const args = (params.arguments ?? {}) as Record<string, unknown>

      if (typeof name !== 'string') {
        return fail(id, ERROR_INVALID_REQUEST, 'params.name é obrigatório')
      }

      const tool = TOOLS_BY_NAME.get(name)
      if (!tool) {
        return fail(id, ERROR_METHOD_NOT_FOUND, `Tool desconhecida: ${name}`)
      }

      try {
        const result = await tool.handler(args, ctx)
        return ok(id, { content: [{ type: 'text', text: JSON.stringify(result) }] })
      } catch (err) {
        // Erro de tool volta como resultado com isError, não como erro JSON-RPC:
        // assim o modelo lê a mensagem e corrige o argumento sozinho, em vez de a
        // conversa ser interrompida pelo cliente.
        const detail = err instanceof Error ? err.message : 'Erro desconhecido'
        console.error(`[mcp] tool ${name} falhou:`, detail)
        return ok(id, {
          content: [{ type: 'text', text: `Erro ao executar ${name}: ${detail}` }],
          isError: true,
        })
      }
    }

    default:
      return isNotification
        ? null
        : fail(id, ERROR_METHOD_NOT_FOUND, `Método não suportado: ${message.method}`)
  }
}
