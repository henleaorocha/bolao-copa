import type { SupabaseClient } from '@supabase/supabase-js'
import { PHASE_MULTIPLIERS } from '@/lib/scoring'
import { getCachedLeagueRanking } from '@/lib/leagues/get-league-ranking'
import { getUserClient } from './supabase'

// Tools do connector. Todas SOMENTE LEITURA.
//
// Princípio de desenho: poucas tools "grossas" que devolvem dados crus, em vez de
// uma tool por análise. O Claude roda a análise no sandbox dele — simular
// cenários, cruzar ligas, gerar planilha — e para isso precisa dos palpites e das
// REGRAS, não de um simulador pronto que só responde as perguntas que anteciparmos.
//
// Nenhum handler filtra por permissão: cada consulta roda sob a identidade do
// usuário (getUserClient) e o RLS do banco decide o que existe. Ver comentário em
// lib/mcp/supabase.ts.

export interface ToolContext {
  userId: string
  email?: string | null
}

export interface ToolDefinition {
  name: string
  title: string
  description: string
  inputSchema: Record<string, unknown>
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>
}

// Teto de linhas do PostgREST (db-max-rows), confirmado contra o banco de
// produção: pedir 1500 devolve 1000. O limite da tool NÃO pode passar disso.
//
// Se passasse, `has_more` (rows.length === limit) daria falso-negativo — 1000
// devolvidas para um limit de 2000 — e o Claude pararia de paginar achando que
// leu tudo, analisando um recorte silenciosamente truncado. É a mesma classe de
// bug que já zerou membros no ranking (ver comentário em lib/predictions.ts).
const MAX_PAGE_SIZE = 1000
const DEFAULT_PAGE_SIZE = 500

function emptySchema(): Record<string, unknown> {
  return { type: 'object', properties: {}, additionalProperties: false }
}

function requireUuid(args: Record<string, unknown>, key: string): string {
  const value = args[key]
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw new Error(`${key} deve ser um UUID`)
  }
  return value
}

function optionalString(args: Record<string, unknown>, key: string): string | null {
  const value = args[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readPaging(args: Record<string, unknown>): { limit: number; offset: number } {
  const rawLimit = typeof args.limit === 'number' ? args.limit : DEFAULT_PAGE_SIZE
  const rawOffset = typeof args.offset === 'number' ? args.offset : 0
  return {
    limit: Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_PAGE_SIZE),
    offset: Math.max(Math.trunc(rawOffset), 0),
  }
}

function client(ctx: ToolContext): SupabaseClient {
  return getUserClient(ctx.userId, ctx.email)
}

function failIfError(error: { message: string } | null, what: string): void {
  if (error) throw new Error(`Falha ao ler ${what}: ${error.message}`)
}

// ── Tools ────────────────────────────────────────────────────────────────────

const listLeagues: ToolDefinition = {
  name: 'list_leagues',
  title: 'Listar minhas ligas',
  description:
    'Lista as ligas (bolões) das quais o usuário autenticado participa, com o papel dele em cada uma. Chame esta tool primeiro em qualquer análise: todas as demais tools de liga exigem um league_id, e é aqui que ele é obtido.',
  inputSchema: emptySchema(),
  async handler(_args, ctx) {
    const { data, error } = await client(ctx)
      .from('league_members')
      .select(
        'league_id, role, joined_at, leagues (id, name, description, access_type, member_count, prizes, prize_pool, created_at)'
      )
      .eq('user_id', ctx.userId)
      .order('joined_at', { ascending: true })

    failIfError(error, 'ligas')

    interface LeagueEmbed {
      id: string
      name: string
      description: string | null
      access_type: string
      member_count: number
      prizes: string | null
      prize_pool: string | null
      created_at: string
    }
    interface Row {
      league_id: string
      role: string
      joined_at: string
      // PostgREST devolve join to-one como objeto; tipos antigos modelam array.
      leagues: LeagueEmbed | LeagueEmbed[] | null
    }

    const leagues = ((data ?? []) as Row[]).map((row) => {
      const league = Array.isArray(row.leagues) ? row.leagues[0] : row.leagues
      return {
        league_id: row.league_id,
        name: league?.name ?? null,
        description: league?.description ?? null,
        access_type: league?.access_type ?? null,
        member_count: league?.member_count ?? null,
        prizes: league?.prizes ?? null,
        prize_pool: league?.prize_pool ?? null,
        my_role: row.role,
        joined_at: row.joined_at,
      }
    })

    return { leagues, count: leagues.length }
  },
}

const getLeagueMembers: ToolDefinition = {
  name: 'get_league_members',
  title: 'Listar membros de uma liga',
  description:
    'Lista os participantes de uma liga, com nome e data de entrada. Use quando precisar associar user_id a nome — get_predictions e get_ranking identificam pessoas por user_id.',
  inputSchema: {
    type: 'object',
    properties: {
      league_id: { type: 'string', description: 'UUID da liga (ver list_leagues)' },
    },
    required: ['league_id'],
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const leagueId = requireUuid(args, 'league_id')

    const { data, error } = await client(ctx)
      .from('league_members')
      .select('user_id, role, joined_at, users (full_name, avatar_color)')
      .eq('league_id', leagueId)
      .order('joined_at', { ascending: true })

    failIfError(error, 'membros da liga')

    interface UserEmbed {
      full_name: string | null
      avatar_color: string | null
    }
    interface Row {
      user_id: string
      role: string
      joined_at: string
      users: UserEmbed | UserEmbed[] | null
    }

    const members = ((data ?? []) as Row[]).map((row) => {
      const user = Array.isArray(row.users) ? row.users[0] : row.users
      return {
        user_id: row.user_id,
        full_name: user?.full_name ?? null,
        role: row.role,
        joined_at: row.joined_at,
        is_me: row.user_id === ctx.userId,
      }
    })

    return { league_id: leagueId, members, count: members.length }
  },
}

const getMatches: ToolDefinition = {
  name: 'get_matches',
  title: 'Listar jogos da Copa',
  description:
    'Lista os jogos da Copa com placar e fase. Os jogos são globais (os mesmos para todas as ligas). Use para apurar resultados, montar cenários alternativos ou cruzar com palpites. Nomes de times vêm em português.',
  inputSchema: {
    type: 'object',
    properties: {
      phase: {
        type: 'string',
        enum: ['group', '32nd', '16th', '8th', '4th', 'semi', '3rd_place', 'final'],
        description: 'Filtra por fase. Omita para trazer todas.',
      },
      status: {
        type: 'string',
        enum: ['scheduled', 'live', 'finished'],
        description: 'Filtra por situação. Omita para trazer todas.',
      },
    },
    additionalProperties: false,
  },
  async handler(args, ctx) {
    let query = client(ctx)
      .from('matches')
      .select(
        'id, home_team, away_team, match_date, phase, group, status, home_score, away_score, winner_team'
      )
      .order('match_date', { ascending: true })

    const phase = optionalString(args, 'phase')
    const status = optionalString(args, 'status')
    if (phase) query = query.eq('phase', phase)
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    failIfError(error, 'jogos')

    return { matches: data ?? [], count: data?.length ?? 0 }
  },
}

const getPredictions: ToolDefinition = {
  name: 'get_predictions',
  title: 'Ler palpites de uma liga',
  description:
    'Lê os palpites de placar de uma liga. Traz os seus sempre, e os dos demais membros apenas em jogos já encerrados (palpites de jogos não realizados são privados por regra do banco). Combine com get_matches e get_scoring_rules para recalcular pontos ou simular cenários. Resultado paginado: se has_more for true, repita aumentando offset.',
  inputSchema: {
    type: 'object',
    properties: {
      league_id: { type: 'string', description: 'UUID da liga' },
      user_id: {
        type: 'string',
        description: 'Filtra por um participante específico (opcional)',
      },
      match_id: { type: 'string', description: 'Filtra por um jogo (opcional)' },
      limit: {
        type: 'integer',
        description: `Máximo de linhas (padrão ${DEFAULT_PAGE_SIZE}, teto ${MAX_PAGE_SIZE})`,
      },
      offset: { type: 'integer', description: 'Deslocamento para paginar' },
    },
    required: ['league_id'],
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const leagueId = requireUuid(args, 'league_id')
    const { limit, offset } = readPaging(args)

    let query = client(ctx)
      .from('predictions')
      .select(
        'user_id, match_id, predicted_home_score, predicted_away_score, updated_at'
      )
      .eq('league_id', leagueId)
      // Ordem estável pela PK: sem ela a paginação pode repetir/pular linhas
      // conforme o trigger de updated_at reordena o resultado entre chamadas.
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1)

    const userFilter = optionalString(args, 'user_id')
    const matchFilter = optionalString(args, 'match_id')
    if (userFilter) query = query.eq('user_id', userFilter)
    if (matchFilter) query = query.eq('match_id', matchFilter)

    const { data, error } = await query
    failIfError(error, 'palpites')

    const rows = data ?? []
    return {
      league_id: leagueId,
      predictions: rows,
      count: rows.length,
      offset,
      limit,
      has_more: rows.length === limit,
    }
  },
}

const getChampionBets: ToolDefinition = {
  name: 'get_champion_bets',
  title: 'Ler apostas de campeão e vice',
  description:
    'Lê as apostas de campeão e vice-campeão de uma liga. A sua aparece sempre; as dos demais membros só depois que a final estiver encerrada. Vale 50 pontos acertar o campeão e 25 o vice.',
  inputSchema: {
    type: 'object',
    properties: {
      league_id: { type: 'string', description: 'UUID da liga' },
    },
    required: ['league_id'],
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const leagueId = requireUuid(args, 'league_id')

    const { data, error } = await client(ctx)
      .from('champion_bets')
      .select('user_id, champion_team, runner_up_team, updated_at')
      .eq('league_id', leagueId)

    failIfError(error, 'apostas de campeão')

    return { league_id: leagueId, bets: data ?? [], count: data?.length ?? 0 }
  },
}

const getRanking: ToolDefinition = {
  name: 'get_ranking',
  title: 'Ler o ranking oficial de uma liga',
  description:
    'Devolve a classificação oficial da liga, já com desempate aplicado: pontos, posição, placares exatos e acertos de resultado. Use quando a pergunta for sobre a classificação como ela é. Para cenários hipotéticos, prefira recalcular a partir de get_predictions + get_scoring_rules.',
  inputSchema: {
    type: 'object',
    properties: {
      league_id: { type: 'string', description: 'UUID da liga' },
    },
    required: ['league_id'],
    additionalProperties: false,
  },
  async handler(args, ctx) {
    const leagueId = requireUuid(args, 'league_id')

    // O ranking é computado e cacheado com service role (os números são iguais
    // para todos os membros). Como aquele caminho ignora RLS, a checagem de
    // pertencimento precisa ser feita AQUI, sob a identidade do usuário: se ele
    // não for membro, o RLS de league_members não devolve linha alguma.
    const { data: membership, error } = await client(ctx)
      .from('league_members')
      .select('user_id')
      .eq('league_id', leagueId)
      .eq('user_id', ctx.userId)
      .maybeSingle()

    failIfError(error, 'pertencimento à liga')
    if (!membership) {
      throw new Error('Você não é membro desta liga')
    }

    const ranking = await getCachedLeagueRanking(leagueId)
    return { league_id: leagueId, ranking, count: ranking.length }
  },
}

const getScoringRules: ToolDefinition = {
  name: 'get_scoring_rules',
  title: 'Consultar as regras de pontuação',
  description:
    'Devolve as regras de pontuação do bolão (placar exato, acerto de resultado, multiplicadores por fase, bônus de campeão/vice) e o critério de desempate. Chame antes de recalcular pontos ou simular qualquer cenário — não presuma as regras.',
  inputSchema: emptySchema(),
  async handler() {
    return {
      base_points: {
        exact_score: 10,
        correct_outcome: 5,
        wrong: 0,
      },
      phase_multipliers: {
        group: 1,
        ...PHASE_MULTIPLIERS,
      },
      champion_bonus: {
        champion: 50,
        runner_up: 25,
      },
      notes: [
        'Pontos da fase de grupos = pontos base × 1.',
        'Pontos do mata-mata = pontos base × multiplicador da fase.',
        'Acerto de resultado considera o sinal da diferença de gols (vitória/empate/derrota).',
        'Só jogos com status "finished" pontuam.',
        'Numa final decidida nos pênaltis o placar fica empatado e o vencedor vem de matches.winner_team — é ele que define campeão e vice para o bônus.',
      ],
      tiebreakers: [
        '1. Maior pontuação',
        '2. Ter ao menos um placar exato',
        '3. Maior número de placares exatos',
        '4. Placar exato mais recente (por data do jogo)',
        '5. Nome em ordem alfabética',
      ],
    }
  },
}

export const TOOLS: ToolDefinition[] = [
  listLeagues,
  getLeagueMembers,
  getMatches,
  getPredictions,
  getChampionBets,
  getRanking,
  getScoringRules,
]

export const TOOLS_BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]))

/** Formato que o MCP expõe em tools/list (sem o handler). */
export function toolListPayload() {
  return TOOLS.map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: {
      title: tool.title,
      // Todo o connector é read-only; declarar isso permite ao cliente tratar as
      // chamadas como seguras (sem prompt de confirmação a cada uso).
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  }))
}
