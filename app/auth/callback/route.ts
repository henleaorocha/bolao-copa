import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            // httpOnly forçado: o token de auth (que embute o provider_token do
            // Google) não deve ser legível por document.cookie.
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, httpOnly: true })
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Redirect to a client-side page that checks sessionStorage for inviteRedirect
      return NextResponse.redirect(new URL('/auth/callback-redirect', request.url))
    }

    console.warn('[auth/callback] Falha na troca de code:', error.message)
  }

  return NextResponse.redirect(
    new URL('/login?error=auth_callback_failed', request.url)
  )
}
