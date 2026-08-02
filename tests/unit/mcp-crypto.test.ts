import { describe, it, expect } from 'vitest'
import { createHmac, createHash } from 'node:crypto'
import {
  base64url,
  generateToken,
  safeEqual,
  sha256,
  signSupabaseUserJwt,
  verifyPkceS256,
} from '@/lib/mcp/crypto'

describe('base64url', () => {
  it('remove padding e usa o alfabeto url-safe', () => {
    const encoded = base64url(Buffer.from([251, 255, 190]))
    expect(encoded).not.toContain('=')
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
  })
})

describe('generateToken', () => {
  it('gera valores distintos e longos o bastante para serem imprevisíveis', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateToken()))
    expect(tokens.size).toBe(50)
    for (const token of tokens) {
      // 32 bytes em base64url = 43 caracteres
      expect(token.length).toBe(43)
    }
  })
})

describe('safeEqual', () => {
  it('aceita iguais e recusa diferentes', () => {
    expect(safeEqual('segredo', 'segredo')).toBe(true)
    expect(safeEqual('segredo', 'segred0')).toBe(false)
  })

  it('não lança quando os tamanhos diferem', () => {
    // timingSafeEqual cru lança nesse caso; hashear antes é o que evita isso.
    expect(() => safeEqual('a', 'abcdefghijklmnop')).not.toThrow()
    expect(safeEqual('a', 'abcdefghijklmnop')).toBe(false)
  })
})

describe('verifyPkceS256', () => {
  // Vetor de teste da RFC 7636, apêndice B.
  const RFC_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
  const RFC_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'

  it('valida o par canônico da RFC 7636', () => {
    expect(verifyPkceS256(RFC_VERIFIER, RFC_CHALLENGE)).toBe(true)
  })

  it('recusa verifier que não corresponde ao challenge', () => {
    const outro = 'a'.repeat(43)
    expect(verifyPkceS256(outro, RFC_CHALLENGE)).toBe(false)
  })

  it('recusa verifier fora do tamanho legal (43–128)', () => {
    // Um verifier curto reduz o espaço de busca e anula a proteção do PKCE.
    expect(verifyPkceS256('curto', base64url(createHash('sha256').update('curto').digest()))).toBe(
      false
    )
    const longo = 'a'.repeat(129)
    expect(verifyPkceS256(longo, base64url(createHash('sha256').update(longo).digest()))).toBe(
      false
    )
  })
})

describe('signSupabaseUserJwt', () => {
  const SECRET = 'segredo-de-teste-do-projeto'

  function decode(token: string) {
    const [header, payload, signature] = token.split('.')
    return {
      header: JSON.parse(Buffer.from(header, 'base64url').toString()),
      payload: JSON.parse(Buffer.from(payload, 'base64url').toString()),
      signature,
      signingInput: `${header}.${payload}`,
    }
  }

  it('emite as claims que o RLS do Supabase consome', () => {
    const token = signSupabaseUserJwt({
      userId: '11111111-1111-1111-1111-111111111111',
      email: 'fulano@example.com',
      secret: SECRET,
      issuer: 'https://projeto.supabase.co/auth/v1',
    })

    const { header, payload } = decode(token)

    expect(header).toEqual({ alg: 'HS256', typ: 'JWT' })
    // `sub` alimenta auth.uid() e `role` alimenta auth.role() nas policies —
    // se qualquer um dos dois sair errado, o connector lê os dados errados.
    expect(payload.sub).toBe('11111111-1111-1111-1111-111111111111')
    expect(payload.role).toBe('authenticated')
    expect(payload.aud).toBe('authenticated')
    expect(payload.iss).toBe('https://projeto.supabase.co/auth/v1')
    expect(payload.email).toBe('fulano@example.com')
  })

  it('produz assinatura HS256 verificável com o segredo do projeto', () => {
    const token = signSupabaseUserJwt({
      userId: '22222222-2222-2222-2222-222222222222',
      secret: SECRET,
      issuer: 'https://projeto.supabase.co/auth/v1',
    })

    const { signingInput, signature } = decode(token)
    const esperada = base64url(createHmac('sha256', SECRET).update(signingInput).digest())

    expect(signature).toBe(esperada)
  })

  it('expira em minutos, não em horas', () => {
    const token = signSupabaseUserJwt({
      userId: '33333333-3333-3333-3333-333333333333',
      secret: SECRET,
      issuer: 'https://projeto.supabase.co/auth/v1',
    })

    const { payload } = decode(token)
    const vida = payload.exp - payload.iat
    expect(vida).toBeLessThanOrEqual(300)
    expect(vida).toBeGreaterThan(0)
  })

  it('omite email quando não informado', () => {
    const token = signSupabaseUserJwt({
      userId: '44444444-4444-4444-4444-444444444444',
      secret: SECRET,
      issuer: 'https://projeto.supabase.co/auth/v1',
    })

    expect(decode(token).payload.email).toBeUndefined()
  })
})

describe('sha256', () => {
  it('é estável e hexadecimal', () => {
    expect(sha256('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    )
  })
})
