import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireSupabaseEnv } from './config'
import { signSupabaseUserJwt } from './crypto'

/**
 * Cliente com service role — ignora RLS.
 *
 * Uso restrito às tabelas de OAuth (mcp_oauth_*), que não têm dono no sentido de
 * RLS e são escritas pelo próprio servidor. NUNCA use este cliente para ler dados
 * do bolão num contexto de connector: é exatamente o atalho que transformaria o
 * isolamento entre participantes em código nosso, e não em policy do banco.
 */
export function getServiceClient(): SupabaseClient {
  const env = requireSupabaseEnv()
  return createClient(env.url, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Cliente que atua COMO o usuário do token — sujeito a RLS.
 *
 * É a peça central do connector: assinamos um JWT de curta duração com o segredo
 * do projeto e o PostgREST passa a tratar a conexão como aquele participante.
 * Consequência prática: `list_leagues` devolve as ligas dele porque
 * `leagues_select_open` diz isso, e os palpites de colegas só aparecem em jogos
 * já encerrados porque `predictions_select_league_peers` diz isso. Nenhuma dessas
 * regras é reimplementada aqui.
 */
export function getUserClient(userId: string, email?: string | null): SupabaseClient {
  const env = requireSupabaseEnv()

  const jwt = signSupabaseUserJwt({
    userId,
    email,
    secret: env.jwtSecret,
    issuer: `${env.url}/auth/v1`,
  })

  return createClient(env.url, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
}
