import { redirect } from 'next/navigation'
import { Trophy, ShieldCheck, Eye, Ban } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { MCP_SCOPE } from '@/lib/mcp/config'
import { getClient } from '@/lib/mcp/oauth-store'
import { createConsentToken } from '@/lib/mcp/consent-token'

// Tela de consentimento do connector (authorization_endpoint do OAuth).
//
// É a única barreira que separa "qualquer um registrou um client" de "esse
// client lê meus dados": aqui um participante autenticado vê QUEM está pedindo e
// PARA ONDE o código vai, e decide.

export const dynamic = 'force-dynamic'

interface AuthorizePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function ErrorScreen({ title, detail }: { title: string; detail: string }) {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#244C5A' }}
    >
      <div
        className="w-full max-w-md rounded-[32px] p-8 border backdrop-blur-2xl text-center"
        style={{
          background: 'rgba(255,255,255,0.08)',
          borderColor: 'rgba(255,255,255,0.15)',
        }}
      >
        <Ban size={32} className="mx-auto mb-4" style={{ color: '#fca5a5' }} />
        <h1 className="text-white text-lg font-bold mb-2">{title}</h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {detail}
        </p>
      </div>
    </main>
  )
}

export default async function AuthorizePage({ searchParams }: AuthorizePageProps) {
  const params = await searchParams

  const clientId = first(params.client_id)
  const redirectUri = first(params.redirect_uri)
  const responseType = first(params.response_type)
  const codeChallenge = first(params.code_challenge)
  const codeChallengeMethod = first(params.code_challenge_method)
  const state = first(params.state)
  const resource = first(params.resource)
  const requestedScope = first(params.scope)

  if (!clientId || !redirectUri) {
    return (
      <ErrorScreen
        title="Pedido inválido"
        detail="Faltam client_id ou redirect_uri. Remova e adicione o conector novamente no Claude."
      />
    )
  }

  const client = await getClient(clientId)
  if (!client) {
    return (
      <ErrorScreen
        title="Aplicativo desconhecido"
        detail="Este client_id não está registrado. Remova e adicione o conector novamente no Claude."
      />
    )
  }

  // Comparação exata de redirect_uri (OAuth 2.1). Sem correspondência não dá para
  // devolver erro por redirect — seria mandar dados a um destino não confiável.
  if (!client.redirect_uris.includes(redirectUri)) {
    return (
      <ErrorScreen
        title="Destino não autorizado"
        detail="O redirect_uri informado não corresponde ao que este aplicativo registrou."
      />
    )
  }

  // Daqui em diante o destino é confiável, então erros voltam pelo redirect —
  // é assim que o Claude consegue exibir a causa da falha.
  const errorRedirect = (error: string, description: string): never => {
    const url = new URL(redirectUri)
    url.searchParams.set('error', error)
    url.searchParams.set('error_description', description)
    if (state) url.searchParams.set('state', state)
    redirect(url.toString())
  }

  if (responseType !== 'code') {
    errorRedirect('unsupported_response_type', 'Apenas response_type=code')
  }
  if (!codeChallenge || codeChallengeMethod !== 'S256') {
    errorRedirect('invalid_request', 'PKCE com code_challenge_method=S256 é obrigatório')
  }
  if (requestedScope && !requestedScope.split(/\s+/).includes(MCP_SCOPE)) {
    errorRedirect('invalid_scope', `Escopo suportado: ${MCP_SCOPE}`)
  }

  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Sem sessão válida (cookie ausente ou expirado): vai ao login e volta para
    // este mesmo pedido depois do SSO.
    const currentUrl = `/oauth/authorize?${new URLSearchParams(
      Object.entries(params).flatMap(([k, v]) => {
        const value = first(v)
        return value === null ? [] : [[k, value] as [string, string]]
      })
    ).toString()}`
    redirect(`/api/oauth/login-redirect?return=${encodeURIComponent(currentUrl)}`)
  }

  const consentToken = createConsentToken({
    clientId,
    redirectUri,
    codeChallenge: codeChallenge!,
    scope: MCP_SCOPE,
    state,
    resource,
    userId: user!.id,
  })

  const appName = client.client_name?.trim() || 'Aplicativo sem nome'
  const redirectHost = new URL(redirectUri).host || redirectUri

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#244C5A' }}
    >
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center -rotate-6"
            style={{ background: '#FFC72C' }}
          >
            <Trophy size={26} style={{ color: '#244C5A' }} strokeWidth={2.5} />
          </div>
          <div className="text-3xl font-black text-white leading-none tracking-tight">
            BOLÃO
          </div>
        </div>

        <div
          className="rounded-[32px] p-8 border backdrop-blur-2xl"
          style={{
            background: 'rgba(255,255,255,0.08)',
            borderColor: 'rgba(255,255,255,0.15)',
          }}
        >
          <h1 className="text-white text-lg font-bold mb-1">
            Autorizar <span style={{ color: '#FFC72C' }}>{appName}</span>?
          </h1>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Conectado como {user!.email}
          </p>

          <ul className="space-y-3 mb-6">
            <li className="flex gap-3 text-sm text-white/90">
              <Eye size={18} className="shrink-0 mt-0.5" style={{ color: '#0097A9' }} />
              <span>
                Ler suas ligas, jogos, palpites e ranking — exatamente o que você já
                enxerga no app, nada além.
              </span>
            </li>
            <li className="flex gap-3 text-sm text-white/90">
              <ShieldCheck
                size={18}
                className="shrink-0 mt-0.5"
                style={{ color: '#0097A9' }}
              />
              <span>Somente leitura: não pode salvar palpites nem alterar nada.</span>
            </li>
          </ul>

          <div
            className="rounded-2xl px-4 py-3 mb-6 text-[11px] leading-relaxed"
            style={{ background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.55)' }}
          >
            O código de acesso será enviado para{' '}
            <span className="font-mono text-white/80">{redirectHost}</span>. Se você não
            reconhece este destino, recuse.
          </div>

          <form method="POST" action="/api/oauth/consent" className="flex gap-3">
            <input type="hidden" name="consent_token" value={consentToken} />
            <button
              type="submit"
              name="decision"
              value="deny"
              className="flex-1 py-3.5 px-4 rounded-2xl font-bold text-sm border transition hover:bg-white/5"
              style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'white' }}
            >
              Recusar
            </button>
            <button
              type="submit"
              name="decision"
              value="allow"
              className="flex-1 py-3.5 px-4 rounded-2xl font-bold text-sm transition hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: '#FFC72C', color: '#244C5A' }}
            >
              Autorizar
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
