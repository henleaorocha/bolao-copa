// Constantes e resolução de ambiente do connector MCP.

/** Único escopo do connector. Somente leitura — não existe tool de escrita. */
export const MCP_SCOPE = 'bolao:read'

/** Caminho do endpoint MCP. É o "resource" do OAuth (RFC 8707). */
export const MCP_PATH = '/api/mcp'

/** Versão do protocolo MCP que este servidor implementa. */
export const MCP_PROTOCOL_VERSION = '2025-06-18'

export const AUTH_CODE_TTL_SECONDS = 300 // 5 min — o Claude troca em segundos
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 // 1 h
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 90 // 90 dias

/**
 * Origem pública do app.
 *
 * Preferimos derivar dos headers da própria requisição a fixar uma env var: as
 * URLs de discovery do OAuth precisam bater EXATAMENTE com o host que o Claude
 * usou para chegar aqui, senão a validação de issuer falha. Derivar do request
 * faz preview deploys da Vercel e localhost funcionarem sem configuração.
 * `NEXT_PUBLIC_SITE_URL` continua valendo como override explícito.
 */
export function resolveBaseUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')

  const headers = request.headers
  const host = headers.get('x-forwarded-host') ?? headers.get('host')
  if (!host) {
    // Sem host não há como montar metadata coerente; melhor falhar alto.
    throw new Error('[mcp] host ausente na requisição')
  }
  const proto =
    headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')

  return `${proto}://${host}`
}

export function mcpResourceUrl(baseUrl: string): string {
  return `${baseUrl}${MCP_PATH}`
}

interface SupabaseEnv {
  url: string
  anonKey: string
  serviceRoleKey: string
  jwtSecret: string
}

/**
 * Lê e valida as env vars do Supabase de uma vez.
 *
 * `SUPABASE_JWT_SECRET` é novo e exclusivo do connector (painel do Supabase →
 * Settings → API → JWT Secret). Sem ele o connector não consegue assumir a
 * identidade do usuário e cairíamos no anti-padrão de consultar tudo com service
 * role filtrando na mão — então a ausência é erro fatal, não degradação.
 */
export function requireSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const jwtSecret = process.env.SUPABASE_JWT_SECRET

  const missing = [
    !url && 'NEXT_PUBLIC_SUPABASE_URL',
    !anonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
    !jwtSecret && 'SUPABASE_JWT_SECRET',
  ].filter(Boolean)

  if (missing.length > 0) {
    throw new Error(`[mcp] variáveis de ambiente ausentes: ${missing.join(', ')}`)
  }

  return {
    url: url!,
    anonKey: anonKey!,
    serviceRoleKey: serviceRoleKey!,
    jwtSecret: jwtSecret!,
  }
}
