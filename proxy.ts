import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Páginas acessíveis sem autenticação
const PAGINAS_PUBLICAS  = ['/', '/login', '/auth/callback']
// Rotas de API acessíveis sem autenticação de sessão.
// /api/admin/sync-matches não usa sessão: é chamada pelo cron (pg_cron) com
// `Authorization: Bearer <service_role_key>`, validada dentro do próprio handler.
const APIS_PUBLICAS     = ['/api/health', '/api/admin/sync-matches']

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          // Atualiza cookies no request para componentes server-side
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // Recria response com request atualizado para que cookies sejam visíveis
          response = NextResponse.next({ request })
          // Propaga cookies para o browser via Set-Cookie.
          // httpOnly forçado: nenhum código client-side lê a sessão (apenas o
          // login dispara OAuth), então o token de auth — que embute o
          // provider_token do Google — não deve ser legível por document.cookie.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...options, httpOnly: true })
          )
          // Aplica headers de cache-control do Supabase (previne cache CDN de respostas auth)
          Object.entries(headers).forEach(([chave, valor]) =>
            response.headers.set(chave, valor)
          )
        },
      },
    }
  )

  // getUser() valida o JWT com o servidor Supabase a cada requisição.
  // Mais seguro que getSession() pois detecta tokens revogados e expirados.
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.warn('[middleware] Erro ao validar sessão:', error.message)
  }

  const { pathname } = request.nextUrl
  const ehRotaApi      = pathname.startsWith('/api/')
  const ehApiPublica   = APIS_PUBLICAS.some((rota) => pathname === rota)
  const ehPaginaPublica = PAGINAS_PUBLICAS.some((rota) => pathname === rota)

  if (!user) {
    // For unauthenticated /join requests, preserve the original URL in a cookie
    if (pathname === '/join') {
      const urlOriginal = request.nextUrl.toString()
      const urlLogin = new URL('/login', request.url)
      response = NextResponse.redirect(urlLogin)
      response.cookies.set('x-invite-redirect', urlOriginal, {
        httpOnly: false,
        maxAge: 60 * 60,
        path: '/',
      })
      return response
    }

    if (ehRotaApi && !ehApiPublica) {
      // APIs protegidas: retornar JSON 401 — nunca redirecionar para HTML
      return Response.json(
        {
          status: 'error',
          error: 'Sessão expirada ou inválida. Faça login novamente.',
          code: 'SESSION_EXPIRED',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      )
    }

    // APIs públicas passam direto (ex: /api/health); apenas páginas redirecionam
    if (!ehRotaApi && !ehPaginaPublica) {
      const urlLogin = new URL('/login', request.url)
      return NextResponse.redirect(urlLogin)
    }
  }

  return response
}

export const config = {
  // Executa em todas as rotas exceto assets estáticos
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
