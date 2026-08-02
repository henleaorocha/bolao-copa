import { NextResponse, type NextRequest } from 'next/server'
import { resolveBaseUrl } from '@/lib/mcp/config'

/**
 * Manda o participante ao login preservando o pedido de autorização.
 *
 * Existe como Route Handler (e não dentro da própria página) porque Server
 * Components não podem gravar cookies. Reutiliza `x-invite-redirect`, o mesmo
 * mecanismo que o proxy já usa para retomar um convite depois do SSO:
 * InviteRedirectHandler copia o cookie para sessionStorage na tela de login e
 * /auth/callback-redirect navega para lá quando o Google devolve.
 */
export function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get('return')
  const baseUrl = resolveBaseUrl(request)

  // Só aceita destino interno: um `return` absoluto para fora viraria open
  // redirect assim que o usuário concluísse o login.
  let safeTarget = '/ligas'
  if (target) {
    try {
      const parsed = new URL(target, baseUrl)
      if (parsed.origin === new URL(baseUrl).origin) {
        safeTarget = `${parsed.pathname}${parsed.search}`
      }
    } catch {
      // mantém o padrão
    }
  }

  const response = NextResponse.redirect(new URL('/login', baseUrl))
  response.cookies.set('x-invite-redirect', safeTarget, {
    // Legível por document.cookie de propósito: InviteRedirectHandler roda no
    // browser e precisa lê-lo. Não é credencial — é só uma URL de retorno interna.
    httpOnly: false,
    maxAge: 60 * 15,
    sameSite: 'lax',
    path: '/',
  })

  return response
}
