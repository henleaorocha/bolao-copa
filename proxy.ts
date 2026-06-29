import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Páginas acessíveis sem autenticação.
// /regras.html é estático (public/) e não-sensível: liberado para abrir no app
// e ser compartilhado por link (ex: WhatsApp) sem exigir login.
const PAGINAS_PUBLICAS = ['/', '/login', '/auth/callback', '/auth/callback-redirect', '/regras.html']

// Checagem otimista de sessão: apenas detecta a PRESENÇA do cookie de auth do
// Supabase, sem validar o JWT pela rede. O token do @supabase/ssr é gravado em
// cookies `sb-<ref>-auth-token` (eventualmente fragmentado em `.0`, `.1`, ...).
//
// Por que não validar aqui: o Proxy roda no runtime Node em TODA navegação e
// prefetch (Next 16), então um `auth.getUser()` por request era a maior fonte de
// Active CPU/invocações na Vercel Fluid. Os docs do Next recomendam exatamente
// uma "optimistic check" no proxy e deixar a validação forte para as rotas. Cada
// handler de API e cada página já chamam `auth.getUser()` por conta própria, e os
// Route Handlers persistem o token renovado nos cookies da resposta — então a
// sessão segue sendo refrescada normalmente pelo tráfego de API do app.
function temCookieDeSessao(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ehPaginaPublica = PAGINAS_PUBLICAS.some((rota) => pathname === rota)

  if (temCookieDeSessao(request)) {
    return NextResponse.next()
  }

  // Sem sessão: /join preserva a URL original para retomar o convite pós-login.
  if (pathname === '/join') {
    const urlOriginal = request.nextUrl.toString()
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.set('x-invite-redirect', urlOriginal, {
      httpOnly: false,
      maxAge: 60 * 60,
      path: '/',
    })
    return response
  }

  // Demais páginas protegidas redirecionam para login.
  if (!ehPaginaPublica) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Roda apenas em páginas. As rotas /api/* foram excluídas de propósito: cada
  // handler autentica a própria sessão (getUser → 401) e as rotas públicas
  // (/api/health, /api/admin/sync-matches via Bearer) se protegem sozinhas. Tirar
  // /api/* daqui elimina uma invocação de função + um getUser por chamada de API.
  // Assets estáticos também são excluídos.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
