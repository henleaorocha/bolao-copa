import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

// Primitivas de cripto do connector. Tudo com `node:crypto` de propósito: assinar
// um JWT HS256 e verificar PKCE são ~20 linhas cada, e uma dependência a menos é
// uma dependência a menos para auditar num caminho que emite credencial.

export function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** Token opaco de 32 bytes. Só existe em claro na resposta HTTP; o banco guarda o hash. */
export function generateToken(): string {
  return base64url(randomBytes(32))
}

/** Identificador público, não-secreto (client_id). */
export function generateId(prefix: string): string {
  return `${prefix}_${base64url(randomBytes(16))}`
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/**
 * Comparação em tempo constante para segredos de tamanho arbitrário.
 *
 * `timingSafeEqual` lança se os buffers tiverem tamanhos diferentes — o que por
 * si só vazaria o tamanho do segredo. Hashear ambos os lados primeiro normaliza
 * o comprimento e mantém a comparação constante.
 */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

/**
 * Verifica um par PKCE S256 (RFC 7636).
 *
 * `plain` não é aceito: OAuth 2.1 exige S256 e a coluna code_challenge_method
 * tem CHECK para o mesmo valor, então um code com 'plain' nunca chega aqui.
 */
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  // O verifier tem tamanho legal definido pela RFC: 43–128 chars.
  if (verifier.length < 43 || verifier.length > 128) return false
  const computed = base64url(createHash('sha256').update(verifier).digest())
  return safeEqual(computed, challenge)
}

/**
 * Assina um JWT HS256 no formato que o Supabase (GoTrue/PostgREST) espera para um
 * usuário autenticado.
 *
 * É isto que faz o connector herdar o RLS do app em vez de reimplementar
 * permissão em TypeScript: o PostgREST valida a assinatura com o mesmo segredo do
 * projeto, e `auth.uid()` passa a devolver o `sub` daqui dentro das policies.
 *
 * TTL curtíssimo (minutos) porque o token é criado sob demanda, usado na mesma
 * requisição e descartado — nunca é devolvido ao Claude nem persistido.
 */
export function signSupabaseUserJwt(args: {
  userId: string
  email?: string | null
  secret: string
  issuer: string
  ttlSeconds?: number
}): string {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload: Record<string, unknown> = {
    sub: args.userId,
    aud: 'authenticated',
    role: 'authenticated',
    iss: args.issuer,
    iat: now,
    exp: now + (args.ttlSeconds ?? 300),
  }
  if (args.email) payload.email = args.email

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload)
  )}`
  const signature = base64url(
    createHmac('sha256', args.secret).update(signingInput).digest()
  )

  return `${signingInput}.${signature}`
}
