import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import { isAcceptableRedirectUri } from '@/lib/mcp/redirect-uri'
import { resolveBaseUrl } from '@/lib/mcp/config'
import { protectedResourceMetadataUrl, readBearer, unauthorized } from '@/lib/mcp/auth'

// Guardas do Authorization Server que decidem quem entra e para onde o code vai.

beforeAll(() => {
  // consent-token e config exigem as env do Supabase; valores fictícios bastam
  // para os caminhos exercitados aqui.
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://projeto.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'service-key'
  process.env.SUPABASE_JWT_SECRET ??= 'segredo-de-teste'
})

describe('isAcceptableRedirectUri', () => {
  it('aceita HTTPS', () => {
    expect(isAcceptableRedirectUri('https://claude.ai/api/mcp/auth_callback')).toBe(true)
  })

  it('aceita HTTP apenas em loopback (cliente de linha de comando)', () => {
    expect(isAcceptableRedirectUri('http://localhost:8765/callback')).toBe(true)
    expect(isAcceptableRedirectUri('http://127.0.0.1:8765/callback')).toBe(true)
    // HTTP em host remoto entregaria o authorization code em texto claro.
    expect(isAcceptableRedirectUri('http://exemplo.com/callback')).toBe(false)
  })

  it('aceita esquema próprio de aplicativo desktop', () => {
    expect(isAcceptableRedirectUri('claude://oauth/callback')).toBe(true)
  })

  it('recusa esquemas executáveis pelo navegador', () => {
    for (const uri of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
      'vbscript:msgbox',
    ]) {
      expect(isAcceptableRedirectUri(uri)).toBe(false)
    }
  })

  it('recusa URI com fragmento (RFC 6749 §3.1.2)', () => {
    expect(isAcceptableRedirectUri('https://claude.ai/callback#frag')).toBe(false)
  })

  it('recusa entrada que não é URL', () => {
    expect(isAcceptableRedirectUri('nao-e-url')).toBe(false)
    expect(isAcceptableRedirectUri('')).toBe(false)
  })
})

describe('resolveBaseUrl', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL

  afterEach(() => {
    if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
  })

  it('deriva do host da requisição quando não há override', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    const request = new Request('https://ignorado.example/api/mcp', {
      headers: { host: 'bolao.vercel.app', 'x-forwarded-proto': 'https' },
    })
    expect(resolveBaseUrl(request)).toBe('https://bolao.vercel.app')
  })

  it('usa http em localhost quando o proto não vem no header', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    const request = new Request('http://localhost:3000/api/mcp', {
      headers: { host: 'localhost:3000' },
    })
    expect(resolveBaseUrl(request)).toBe('http://localhost:3000')
  })

  it('respeita NEXT_PUBLIC_SITE_URL e remove barra final', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://bolao.example.com/'
    const request = new Request('https://outro.example/api/mcp', {
      headers: { host: 'outro.example' },
    })
    expect(resolveBaseUrl(request)).toBe('https://bolao.example.com')
  })
})

describe('protectedResourceMetadataUrl', () => {
  it('insere o caminho do recurso DEPOIS do .well-known (RFC 9728)', () => {
    // Se virar sufixo do host, o cliente MCP não encontra o documento e o fluxo
    // de autorização nunca começa.
    expect(protectedResourceMetadataUrl('https://bolao.example.com')).toBe(
      'https://bolao.example.com/.well-known/oauth-protected-resource/api/mcp'
    )
  })
})

describe('readBearer', () => {
  it('extrai o token do header Authorization', () => {
    const request = new Request('https://x.example', {
      headers: { authorization: 'Bearer abc123' },
    })
    expect(readBearer(request)).toBe('abc123')
  })

  it('aceita o esquema em qualquer caixa', () => {
    const request = new Request('https://x.example', {
      headers: { authorization: 'bearer abc123' },
    })
    expect(readBearer(request)).toBe('abc123')
  })

  it('devolve null sem header ou com outro esquema', () => {
    expect(readBearer(new Request('https://x.example'))).toBeNull()
    expect(
      readBearer(
        new Request('https://x.example', { headers: { authorization: 'Basic abc' } })
      )
    ).toBeNull()
  })
})

describe('unauthorized', () => {
  it('anuncia o metadata do recurso no WWW-Authenticate', async () => {
    // Sem este header o Claude só mostra "não autorizado" e o participante nunca
    // recebe o convite para conectar.
    delete process.env.NEXT_PUBLIC_SITE_URL
    const request = new Request('https://bolao.example.com/api/mcp', {
      headers: { host: 'bolao.example.com', 'x-forwarded-proto': 'https' },
    })

    const response = unauthorized(request, 'Token ausente')

    expect(response.status).toBe(401)
    const header = response.headers.get('WWW-Authenticate')
    expect(header).toContain('Bearer')
    expect(header).toContain(
      'resource_metadata="https://bolao.example.com/.well-known/oauth-protected-resource/api/mcp"'
    )
    await expect(response.json()).resolves.toMatchObject({ error: 'invalid_token' })
  })
})

describe('consent token', () => {
  it('faz round-trip do pedido de autorização', async () => {
    const { createConsentToken, verifyConsentToken } = await import(
      '@/lib/mcp/consent-token'
    )

    const payload = {
      clientId: 'mcp_abc',
      redirectUri: 'https://claude.ai/api/mcp/auth_callback',
      codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
      scope: 'bolao:read',
      state: 'xyz',
      resource: 'https://bolao.example.com/api/mcp',
      userId: '11111111-1111-1111-1111-111111111111',
    }

    const verified = verifyConsentToken(createConsentToken(payload))
    expect(verified).toMatchObject(payload)
  })

  it('recusa token adulterado', async () => {
    const { createConsentToken, verifyConsentToken } = await import(
      '@/lib/mcp/consent-token'
    )

    const token = createConsentToken({
      clientId: 'mcp_abc',
      redirectUri: 'https://claude.ai/api/mcp/auth_callback',
      codeChallenge: 'challenge',
      scope: 'bolao:read',
      state: null,
      resource: null,
      userId: '11111111-1111-1111-1111-111111111111',
    })

    // Troca o corpo mantendo a assinatura: é exatamente o ataque de redirecionar
    // o code para um destino do atacante.
    const [, signature] = token.split('.')
    const forjado = Buffer.from(
      JSON.stringify({
        clientId: 'mcp_abc',
        redirectUri: 'https://atacante.example/callback',
        codeChallenge: 'challenge',
        scope: 'bolao:read',
        state: null,
        resource: null,
        userId: '11111111-1111-1111-1111-111111111111',
        exp: Math.floor(Date.now() / 1000) + 600,
      })
    ).toString('base64url')

    expect(verifyConsentToken(`${forjado}.${signature}`)).toBeNull()
  })

  it('recusa token expirado', async () => {
    const { createConsentToken, verifyConsentToken } = await import(
      '@/lib/mcp/consent-token'
    )

    const token = createConsentToken({
      clientId: 'mcp_abc',
      redirectUri: 'https://claude.ai/api/mcp/auth_callback',
      codeChallenge: 'challenge',
      scope: 'bolao:read',
      state: null,
      resource: null,
      userId: '11111111-1111-1111-1111-111111111111',
    })

    vi.useFakeTimers()
    try {
      vi.setSystemTime(Date.now() + 11 * 60 * 1000)
      expect(verifyConsentToken(token)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('recusa formato inválido', async () => {
    const { verifyConsentToken } = await import('@/lib/mcp/consent-token')
    expect(verifyConsentToken('sem-ponto')).toBeNull()
    expect(verifyConsentToken('a.b.c')).toBeNull()
  })
})
