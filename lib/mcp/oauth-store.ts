import {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTH_CODE_TTL_SECONDS,
  MCP_SCOPE,
  REFRESH_TOKEN_TTL_SECONDS,
} from './config'
import { generateId, generateToken, sha256 } from './crypto'
import { getServiceClient } from './supabase'

// Persistência do Authorization Server. Toda função aqui recebe/devolve segredos
// em CLARO na fronteira e grava apenas hashes — o banco nunca vê um token
// utilizável.

export interface OAuthClient {
  client_id: string
  client_secret_hash: string | null
  client_name: string | null
  redirect_uris: string[]
}

export interface AuthCodeRecord {
  code_hash: string
  client_id: string
  user_id: string
  redirect_uri: string
  code_challenge: string
  scope: string
  resource: string | null
  expires_at: string
  used_at: string | null
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
  scope: string
}

export interface ResolvedAccessToken {
  tokenId: string
  userId: string
  clientId: string
  scope: string
}

// ── Clients ──────────────────────────────────────────────────────────────────

export async function registerClient(args: {
  clientName: string | null
  redirectUris: string[]
  /** `none` = client público (só PKCE). Qualquer outro valor gera um secret. */
  tokenEndpointAuthMethod: string
}): Promise<{ clientId: string; clientSecret: string | null }> {
  const supabase = getServiceClient()

  const clientId = generateId('mcp')
  const clientSecret =
    args.tokenEndpointAuthMethod === 'none' ? null : generateToken()

  const { error } = await supabase.from('mcp_oauth_clients').insert({
    client_id: clientId,
    client_secret_hash: clientSecret ? sha256(clientSecret) : null,
    client_name: args.clientName,
    redirect_uris: args.redirectUris,
  })

  if (error) throw new Error(`registerClient falhou: ${error.message}`)

  return { clientId, clientSecret }
}

export async function getClient(clientId: string): Promise<OAuthClient | null> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('mcp_oauth_clients')
    .select('client_id, client_secret_hash, client_name, redirect_uris')
    .eq('client_id', clientId)
    .maybeSingle()

  if (error) throw new Error(`getClient falhou: ${error.message}`)
  return (data as OAuthClient | null) ?? null
}

// ── Authorization codes ──────────────────────────────────────────────────────

export async function createAuthCode(args: {
  clientId: string
  userId: string
  redirectUri: string
  codeChallenge: string
  scope: string
  resource: string | null
}): Promise<string> {
  const supabase = getServiceClient()
  const code = generateToken()

  const { error } = await supabase.from('mcp_oauth_codes').insert({
    code_hash: sha256(code),
    client_id: args.clientId,
    user_id: args.userId,
    redirect_uri: args.redirectUri,
    code_challenge: args.codeChallenge,
    code_challenge_method: 'S256',
    scope: args.scope,
    resource: args.resource,
    expires_at: new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000).toISOString(),
  })

  if (error) throw new Error(`createAuthCode falhou: ${error.message}`)
  return code
}

/**
 * Consome um authorization code (uso único).
 *
 * Reapresentação de um code já usado é tratada como vazamento: a RFC 6749 §10.5
 * manda revogar os tokens derivados daquela autorização, então derrubamos todas
 * as sessões ativas daquele par client+usuário antes de recusar.
 */
export async function consumeAuthCode(
  code: string
): Promise<
  | { ok: true; record: AuthCodeRecord }
  | { ok: false; reason: 'not_found' | 'expired' | 'replayed' }
> {
  const supabase = getServiceClient()
  const codeHash = sha256(code)

  const { data, error } = await supabase
    .from('mcp_oauth_codes')
    .select(
      'code_hash, client_id, user_id, redirect_uri, code_challenge, scope, resource, expires_at, used_at'
    )
    .eq('code_hash', codeHash)
    .maybeSingle()

  if (error) throw new Error(`consumeAuthCode falhou: ${error.message}`)
  if (!data) return { ok: false, reason: 'not_found' }

  const record = data as AuthCodeRecord

  if (record.used_at) {
    await revokeTokensForClientUser(record.client_id, record.user_id)
    return { ok: false, reason: 'replayed' }
  }

  if (new Date(record.expires_at).getTime() <= Date.now()) {
    return { ok: false, reason: 'expired' }
  }

  // Marca o consumo condicionando a used_at IS NULL: se duas trocas simultâneas
  // chegarem, só uma escreve e a outra vê zero linhas afetadas.
  const { data: claimed, error: claimError } = await supabase
    .from('mcp_oauth_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('code_hash', codeHash)
    .is('used_at', null)
    .select('code_hash')

  if (claimError) throw new Error(`consumeAuthCode falhou: ${claimError.message}`)
  if (!claimed || claimed.length === 0) {
    await revokeTokensForClientUser(record.client_id, record.user_id)
    return { ok: false, reason: 'replayed' }
  }

  return { ok: true, record }
}

// ── Tokens ───────────────────────────────────────────────────────────────────

export async function issueTokenPair(args: {
  clientId: string
  userId: string
  scope: string
}): Promise<TokenPair> {
  const supabase = getServiceClient()

  const accessToken = generateToken()
  const refreshToken = generateToken()
  const now = Date.now()

  const { error } = await supabase.from('mcp_oauth_tokens').insert({
    access_token_hash: sha256(accessToken),
    refresh_token_hash: sha256(refreshToken),
    client_id: args.clientId,
    user_id: args.userId,
    scope: args.scope,
    access_expires_at: new Date(now + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString(),
    refresh_expires_at: new Date(now + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString(),
  })

  if (error) throw new Error(`issueTokenPair falhou: ${error.message}`)

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    scope: args.scope,
  }
}

/**
 * Troca um refresh token por um par novo, rotacionando (RFC 9700).
 *
 * A linha é atualizada no lugar e o hash antigo some, então um refresh token
 * capturado deixa de valer assim que o cliente legítimo renovar.
 */
export async function rotateRefreshToken(args: {
  refreshToken: string
  clientId: string
}): Promise<TokenPair | null> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('mcp_oauth_tokens')
    .select('id, client_id, user_id, scope, refresh_expires_at, revoked_at')
    .eq('refresh_token_hash', sha256(args.refreshToken))
    .maybeSingle()

  if (error) throw new Error(`rotateRefreshToken falhou: ${error.message}`)
  if (!data) return null
  if (data.revoked_at) return null
  if (data.client_id !== args.clientId) return null
  if (
    data.refresh_expires_at &&
    new Date(data.refresh_expires_at).getTime() <= Date.now()
  ) {
    return null
  }

  const accessToken = generateToken()
  const refreshToken = generateToken()
  const now = Date.now()

  const { data: updated, error: updateError } = await supabase
    .from('mcp_oauth_tokens')
    .update({
      access_token_hash: sha256(accessToken),
      refresh_token_hash: sha256(refreshToken),
      access_expires_at: new Date(now + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString(),
      refresh_expires_at: new Date(
        now + REFRESH_TOKEN_TTL_SECONDS * 1000
      ).toISOString(),
    })
    .eq('id', data.id)
    .is('revoked_at', null)
    .select('id')

  if (updateError) throw new Error(`rotateRefreshToken falhou: ${updateError.message}`)
  if (!updated || updated.length === 0) return null

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    scope: data.scope as string,
  }
}

export async function resolveAccessToken(
  accessToken: string
): Promise<ResolvedAccessToken | null> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('mcp_oauth_tokens')
    .select('id, user_id, client_id, scope, access_expires_at, revoked_at')
    .eq('access_token_hash', sha256(accessToken))
    .maybeSingle()

  if (error) throw new Error(`resolveAccessToken falhou: ${error.message}`)
  if (!data) return null
  if (data.revoked_at) return null
  if (new Date(data.access_expires_at as string).getTime() <= Date.now()) return null

  return {
    tokenId: data.id as string,
    userId: data.user_id as string,
    clientId: data.client_id as string,
    scope: data.scope as string,
  }
}

/** Best-effort: telemetria de uso, nunca deve derrubar uma chamada MCP válida. */
export async function touchToken(tokenId: string): Promise<void> {
  try {
    const supabase = getServiceClient()
    await supabase
      .from('mcp_oauth_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenId)
  } catch {
    // silencioso por design
  }
}

/** Revoga por access OU refresh token (RFC 7009 não exige distinguir). */
export async function revokeToken(token: string): Promise<void> {
  const supabase = getServiceClient()
  const hash = sha256(token)
  const revokedAt = new Date().toISOString()

  await supabase
    .from('mcp_oauth_tokens')
    .update({ revoked_at: revokedAt })
    .or(`access_token_hash.eq.${hash},refresh_token_hash.eq.${hash}`)
    .is('revoked_at', null)
}

async function revokeTokensForClientUser(
  clientId: string,
  userId: string
): Promise<void> {
  const supabase = getServiceClient()
  await supabase
    .from('mcp_oauth_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .eq('user_id', userId)
    .is('revoked_at', null)
}

export { MCP_SCOPE }
