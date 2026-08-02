import { describe, it, expect, vi, beforeEach } from 'vitest'

// getCachedLeagueRanking embrulha o cálculo em unstable_cache no topo do módulo;
// sem este mock o import de lib/mcp/tools falha fora do runtime do Next.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
}))

// As tools consultam o Supabase sob a identidade do usuário. Aqui o cliente é
// substituído por um stub controlável — o objetivo é testar o protocolo e o
// contrato das tools, não o PostgREST.
const { supabaseState } = vi.hoisted(() => ({
  supabaseState: {
    rows: [] as unknown[],
    error: null as { message: string } | null,
    lastFilters: [] as Array<[string, unknown]>,
  },
}))

vi.mock('@supabase/supabase-js', () => {
  const builder = () => {
    const chain: Record<string, unknown> = {}
    const result = Promise.resolve({
      data: supabaseState.rows,
      error: supabaseState.error,
    })
    for (const method of ['select', 'order', 'range']) {
      chain[method] = () => chain
    }
    chain.eq = (column: string, value: unknown) => {
      supabaseState.lastFilters.push([column, value])
      return chain
    }
    chain.maybeSingle = () =>
      Promise.resolve({
        data: supabaseState.rows[0] ?? null,
        error: supabaseState.error,
      })
    chain.then = result.then.bind(result)
    chain.catch = result.catch.bind(result)
    return chain
  }

  return { createClient: () => ({ from: () => builder() }) }
})

import { handleJsonRpc } from '@/lib/mcp/jsonrpc'
import { MCP_PROTOCOL_VERSION } from '@/lib/mcp/config'

const CTX = { userId: '11111111-1111-1111-1111-111111111111' }

function parseToolResult(result: unknown): unknown {
  const payload = result as { content: Array<{ type: string; text: string }> }
  return JSON.parse(payload.content[0].text)
}

beforeEach(() => {
  supabaseState.rows = []
  supabaseState.error = null
  supabaseState.lastFilters = []
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'service-key'
  process.env.SUPABASE_JWT_SECRET ??= 'segredo-de-teste'
})

describe('handshake', () => {
  it('responde initialize anunciando tools e a versão do protocolo', async () => {
    const response = await handleJsonRpc(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: MCP_PROTOCOL_VERSION },
      },
      CTX
    )

    expect(response?.result).toMatchObject({
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'bolao-copa' },
    })
  })

  it('anuncia a própria versão quando o cliente pede outra', async () => {
    const response = await handleJsonRpc(
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1999-01-01' } },
      CTX
    )

    expect((response?.result as { protocolVersion: string }).protocolVersion).toBe(
      MCP_PROTOCOL_VERSION
    )
  })

  it('responde ping', async () => {
    const response = await handleJsonRpc({ jsonrpc: '2.0', id: 2, method: 'ping' }, CTX)
    expect(response).toEqual({ jsonrpc: '2.0', id: 2, result: {} })
  })

  it('não responde a notificações', async () => {
    // Mensagem sem `id` é notificação: responder violaria o JSON-RPC.
    expect(
      await handleJsonRpc({ jsonrpc: '2.0', method: 'notifications/initialized' }, CTX)
    ).toBeNull()
  })
})

describe('erros de protocolo', () => {
  it('rejeita mensagem sem jsonrpc 2.0', async () => {
    const response = await handleJsonRpc({ id: 1, method: 'ping' }, CTX)
    expect(response?.error?.code).toBe(-32600)
  })

  it('rejeita método desconhecido', async () => {
    const response = await handleJsonRpc(
      { jsonrpc: '2.0', id: 1, method: 'resources/list' },
      CTX
    )
    expect(response?.error?.code).toBe(-32601)
  })

  it('ignora notificação de método desconhecido em vez de erro', async () => {
    expect(
      await handleJsonRpc({ jsonrpc: '2.0', method: 'notifications/qualquer' }, CTX)
    ).toBeNull()
  })
})

describe('tools/list', () => {
  it('expõe as sete tools de leitura', async () => {
    const response = await handleJsonRpc({ jsonrpc: '2.0', id: 3, method: 'tools/list' }, CTX)
    const tools = (response?.result as { tools: Array<{ name: string }> }).tools

    expect(tools.map((t) => t.name).sort()).toEqual([
      'get_champion_bets',
      'get_league_members',
      'get_matches',
      'get_predictions',
      'get_ranking',
      'get_scoring_rules',
      'list_leagues',
    ])
  })

  it('marca todas como read-only', async () => {
    // O connector é somente leitura por decisão de produto; se uma tool de
    // escrita entrar sem revisar a anotação, este teste quebra.
    const response = await handleJsonRpc({ jsonrpc: '2.0', id: 4, method: 'tools/list' }, CTX)
    const tools = (
      response?.result as {
        tools: Array<{ annotations: { readOnlyHint: boolean; destructiveHint: boolean } }>
      }
    ).tools

    for (const tool of tools) {
      expect(tool.annotations.readOnlyHint).toBe(true)
      expect(tool.annotations.destructiveHint).toBe(false)
    }
  })

  it('descreve cada tool e seu input schema', async () => {
    const response = await handleJsonRpc({ jsonrpc: '2.0', id: 5, method: 'tools/list' }, CTX)
    const tools = (
      response?.result as {
        tools: Array<{ description: string; inputSchema: { type: string } }>
      }
    ).tools

    for (const tool of tools) {
      expect(tool.description.length).toBeGreaterThan(20)
      expect(tool.inputSchema.type).toBe('object')
    }
  })
})

describe('tools/call', () => {
  it('recusa tool inexistente', async () => {
    const response = await handleJsonRpc(
      { jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'salvar_palpite' } },
      CTX
    )
    expect(response?.error?.code).toBe(-32601)
  })

  it('exige params.name', async () => {
    const response = await handleJsonRpc(
      { jsonrpc: '2.0', id: 7, method: 'tools/call', params: {} },
      CTX
    )
    expect(response?.error?.code).toBe(-32600)
  })

  it('devolve as regras de pontuação do lib/scoring', async () => {
    const response = await handleJsonRpc(
      { jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'get_scoring_rules' } },
      CTX
    )

    const rules = parseToolResult(response?.result) as {
      base_points: { exact_score: number; correct_outcome: number }
      phase_multipliers: Record<string, number>
      champion_bonus: { champion: number; runner_up: number }
    }

    // Devem espelhar lib/scoring.ts — o Claude recalcula cenários a partir daqui,
    // então divergência silenciosa produziria simulações erradas.
    expect(rules.base_points).toEqual({ exact_score: 10, correct_outcome: 5, wrong: 0 })
    expect(rules.phase_multipliers.group).toBe(1)
    expect(rules.phase_multipliers.final).toBe(4)
    expect(rules.champion_bonus).toEqual({ champion: 50, runner_up: 25 })
  })

  it('reporta erro de argumento como isError, não como erro JSON-RPC', async () => {
    // Assim o modelo lê a mensagem e corrige a chamada sozinho.
    const response = await handleJsonRpc(
      {
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: { name: 'get_ranking', arguments: { league_id: 'nao-e-uuid' } },
      },
      CTX
    )

    expect(response?.error).toBeUndefined()
    const result = response?.result as { isError: boolean; content: Array<{ text: string }> }
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('league_id')
  })

  it('list_leagues filtra pelo usuário do token', async () => {
    supabaseState.rows = [
      {
        league_id: '22222222-2222-2222-2222-222222222222',
        role: 'admin',
        joined_at: '2026-01-01T00:00:00Z',
        leagues: {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Bolão da firma',
          description: null,
          access_type: 'private',
          member_count: 12,
          prizes: null,
          prize_pool: null,
          created_at: '2026-01-01T00:00:00Z',
        },
      },
    ]

    const response = await handleJsonRpc(
      { jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'list_leagues' } },
      CTX
    )

    const payload = parseToolResult(response?.result) as {
      leagues: Array<{ name: string; my_role: string }>
      count: number
    }

    expect(payload.count).toBe(1)
    expect(payload.leagues[0]).toMatchObject({ name: 'Bolão da firma', my_role: 'admin' })
    // A consulta precisa amarrar user_id ao dono do token — sem isso o RLS ainda
    // protegeria, mas a tool devolveria as ligas de todos os colegas de liga.
    expect(supabaseState.lastFilters).toContainEqual(['user_id', CTX.userId])
  })

  it('get_ranking recusa quem não é membro antes de tocar no cache service-role', async () => {
    supabaseState.rows = [] // sem linha em league_members = não é membro

    const response = await handleJsonRpc(
      {
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: {
          name: 'get_ranking',
          arguments: { league_id: '22222222-2222-2222-2222-222222222222' },
        },
      },
      CTX
    )

    const result = response?.result as { isError: boolean; content: Array<{ text: string }> }
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('não é membro')
  })

  it('propaga falha do banco como isError', async () => {
    supabaseState.error = { message: 'connection reset' }

    const response = await handleJsonRpc(
      { jsonrpc: '2.0', id: 12, method: 'tools/call', params: { name: 'list_leagues' } },
      CTX
    )

    const result = response?.result as { isError: boolean }
    expect(result.isError).toBe(true)
  })

  it('get_predictions pagina e sinaliza has_more', async () => {
    supabaseState.rows = Array.from({ length: 2 }, (_, i) => ({
      user_id: CTX.userId,
      match_id: `match-${i}`,
      predicted_home_score: 1,
      predicted_away_score: 0,
      updated_at: '2026-06-01T00:00:00Z',
    }))

    const response = await handleJsonRpc(
      {
        jsonrpc: '2.0',
        id: 13,
        method: 'tools/call',
        params: {
          name: 'get_predictions',
          arguments: {
            league_id: '22222222-2222-2222-2222-222222222222',
            limit: 2,
            offset: 0,
          },
        },
      },
      CTX
    )

    const payload = parseToolResult(response?.result) as {
      count: number
      limit: number
      has_more: boolean
    }

    // Página cheia = pode haver mais; é o sinal que faz o Claude continuar.
    expect(payload.count).toBe(2)
    expect(payload.limit).toBe(2)
    expect(payload.has_more).toBe(true)
  })

  it('get_predictions nunca aceita página maior que o teto do PostgREST', async () => {
    const response = await handleJsonRpc(
      {
        jsonrpc: '2.0',
        id: 14,
        method: 'tools/call',
        params: {
          name: 'get_predictions',
          arguments: {
            league_id: '22222222-2222-2222-2222-222222222222',
            limit: 999999,
          },
        },
      },
      CTX
    )

    // O PostgREST corta em 1000 linhas por resposta. Um limit acima disso faria
    // has_more (rows.length === limit) dar falso-negativo e o Claude pararia de
    // paginar sobre dados truncados.
    const payload = parseToolResult(response?.result) as { limit: number }
    expect(payload.limit).toBe(1000)
  })
})
