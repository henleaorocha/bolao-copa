import { createHmac } from 'node:crypto'
import { requireSupabaseEnv } from './config'
import { base64url, safeEqual } from './crypto'

/**
 * Token assinado que carrega o pedido de autorização entre a tela de
 * consentimento e o POST que a confirma.
 *
 * Por que não passar os campos soltos no formulário: um POST vindo de fora
 * poderia inventar `client_id` / `redirect_uri` e transformar a tela de consent
 * numa máquina de emitir code para o destino do atacante. Assinando o pedido
 * inteiro — inclusive o `user_id` de quem viu a tela — o handler só aceita
 * exatamente o que ele mesmo emitiu, para a mesma pessoa.
 */

export interface ConsentPayload {
  clientId: string
  redirectUri: string
  codeChallenge: string
  scope: string
  state: string | null
  resource: string | null
  userId: string
  exp: number
}

const CONSENT_TTL_SECONDS = 600

/**
 * Chave dedicada, derivada do segredo do Supabase.
 *
 * Separação de domínio: um HMAC com rótulo próprio garante que esta chave não
 * pode assinar (nem ser confundida com) um JWT de usuário, mesmo compartilhando
 * a raiz do segredo.
 */
function consentKey(): Buffer {
  const { jwtSecret } = requireSupabaseEnv()
  return createHmac('sha256', jwtSecret).update('mcp-consent-v1').digest()
}

function sign(body: string): string {
  return base64url(createHmac('sha256', consentKey()).update(body).digest())
}

export function createConsentToken(
  payload: Omit<ConsentPayload, 'exp'>
): string {
  const full: ConsentPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + CONSENT_TTL_SECONDS,
  }
  const body = base64url(JSON.stringify(full))
  return `${body}.${sign(body)}`
}

export function verifyConsentToken(token: string): ConsentPayload | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [body, signature] = parts
  if (!safeEqual(sign(body), signature)) return null

  let payload: ConsentPayload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString())
  } catch {
    return null
  }

  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return null
  if (typeof payload.userId !== 'string' || typeof payload.clientId !== 'string') {
    return null
  }

  return payload
}
