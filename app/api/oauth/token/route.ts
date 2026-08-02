import { sha256, safeEqual, verifyPkceS256 } from '@/lib/mcp/crypto'
import { corsPreflight, jsonResponse, oauthError } from '@/lib/mcp/http'
import {
  consumeAuthCode,
  getClient,
  issueTokenPair,
  rotateRefreshToken,
  type OAuthClient,
} from '@/lib/mcp/oauth-store'

// Token endpoint (RFC 6749 §3.2, com as restrições do OAuth 2.1).
// Grants suportados: authorization_code (PKCE obrigatório) e refresh_token.

interface ClientCredentials {
  clientId: string | null
  clientSecret: string | null
}

/**
 * Lê as credenciais do client em qualquer um dos métodos anunciados no metadata:
 * `client_secret_basic` (header) tem precedência sobre `client_secret_post`
 * (corpo), como manda a RFC 6749 §2.3.1.
 */
function readClientCredentials(
  request: Request,
  form: URLSearchParams
): ClientCredentials {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.toLowerCase().startsWith('basic ')) {
    try {
      const decoded = Buffer.from(authHeader.slice(6).trim(), 'base64').toString()
      const separator = decoded.indexOf(':')
      if (separator > -1) {
        return {
          clientId: decodeURIComponent(decoded.slice(0, separator)),
          clientSecret: decodeURIComponent(decoded.slice(separator + 1)),
        }
      }
    } catch {
      // credencial malformada cai no caminho do corpo
    }
  }

  return {
    clientId: form.get('client_id'),
    clientSecret: form.get('client_secret'),
  }
}

/** Client confidencial precisa provar o secret; client público (PKCE) não tem um. */
function clientSecretIsValid(client: OAuthClient, provided: string | null): boolean {
  if (!client.client_secret_hash) return true
  if (!provided) return false
  return safeEqual(sha256(provided), client.client_secret_hash)
}

export async function POST(request: Request) {
  let form: URLSearchParams
  try {
    form = new URLSearchParams(await request.text())
  } catch {
    return oauthError('invalid_request', 'Corpo inválido')
  }

  const grantType = form.get('grant_type')
  const { clientId, clientSecret } = readClientCredentials(request, form)

  if (!clientId) {
    return oauthError('invalid_client', 'client_id ausente', 401)
  }

  let client: OAuthClient | null
  try {
    client = await getClient(clientId)
  } catch (err) {
    console.error('[oauth/token] getClient:', err instanceof Error ? err.message : err)
    return oauthError('server_error', 'Falha interna', 500)
  }

  if (!client || !clientSecretIsValid(client, clientSecret)) {
    return oauthError('invalid_client', 'Cliente não autenticado', 401)
  }

  try {
    if (grantType === 'authorization_code') {
      return await handleAuthorizationCode(form, client)
    }
    if (grantType === 'refresh_token') {
      return await handleRefreshToken(form, client)
    }
    return oauthError('unsupported_grant_type', `grant_type não suportado: ${grantType}`)
  } catch (err) {
    console.error('[oauth/token] falha:', err instanceof Error ? err.message : err)
    return oauthError('server_error', 'Falha interna', 500)
  }
}

async function handleAuthorizationCode(
  form: URLSearchParams,
  client: OAuthClient
): Promise<Response> {
  const code = form.get('code')
  const redirectUri = form.get('redirect_uri')
  const codeVerifier = form.get('code_verifier')

  if (!code || !redirectUri || !codeVerifier) {
    return oauthError(
      'invalid_request',
      'code, redirect_uri e code_verifier são obrigatórios'
    )
  }

  const result = await consumeAuthCode(code)
  if (!result.ok) {
    // Mensagem única para os três casos: distinguir "não existe" de "expirou" de
    // "já usado" daria a um atacante um oráculo sobre codes válidos.
    return oauthError('invalid_grant', 'Código inválido, expirado ou já utilizado')
  }

  const record = result.record

  // O code pertence a este client? Sem esta checagem, um client registrado
  // qualquer poderia resgatar o código emitido para outro.
  if (record.client_id !== client.client_id) {
    return oauthError('invalid_grant', 'Código não pertence a este cliente')
  }

  // Igualdade exata com o redirect_uri usado na autorização (RFC 6749 §4.1.3).
  if (record.redirect_uri !== redirectUri) {
    return oauthError('invalid_grant', 'redirect_uri não confere')
  }

  // PKCE: prova que quem resgata é quem iniciou o fluxo, mesmo se o code vazou.
  if (!verifyPkceS256(codeVerifier, record.code_challenge)) {
    return oauthError('invalid_grant', 'code_verifier inválido')
  }

  const tokens = await issueTokenPair({
    clientId: client.client_id,
    userId: record.user_id,
    scope: record.scope,
  })

  return tokenResponse(tokens)
}

async function handleRefreshToken(
  form: URLSearchParams,
  client: OAuthClient
): Promise<Response> {
  const refreshToken = form.get('refresh_token')
  if (!refreshToken) {
    return oauthError('invalid_request', 'refresh_token é obrigatório')
  }

  const tokens = await rotateRefreshToken({
    refreshToken,
    clientId: client.client_id,
  })

  if (!tokens) {
    return oauthError('invalid_grant', 'refresh_token inválido, expirado ou revogado')
  }

  return tokenResponse(tokens)
}

function tokenResponse(tokens: {
  accessToken: string
  refreshToken: string
  expiresIn: number
  scope: string
}): Response {
  return jsonResponse({
    access_token: tokens.accessToken,
    token_type: 'Bearer',
    expires_in: tokens.expiresIn,
    refresh_token: tokens.refreshToken,
    scope: tokens.scope,
  })
}

export async function OPTIONS() {
  return corsPreflight()
}
