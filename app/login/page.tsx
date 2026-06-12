import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import LoginButton from '@/components/LoginButton'
import { InviteRedirectHandler } from '@/components/InviteRedirectHandler'
import { Trophy, Flame, Lock } from 'lucide-react'

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/ligas')
  }

  const { error } = await searchParams

  return (
    <>
      <InviteRedirectHandler />
      <div
        className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden"
        style={{ background: '#244C5A' }}
      >
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(#FFC72C 1px, transparent 1px),
                              linear-gradient(90deg, #FFC72C 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Teal glow — top-right */}
        <div
          className="absolute -top-32 -right-20 w-[500px] h-[500px]
                     rounded-full opacity-30 blur-[100px] pointer-events-none"
          style={{ background: '#0097A9' }}
        />

        {/* Petrol glow — bottom-left */}
        <div
          className="absolute -bottom-40 -left-20 w-[600px] h-[600px]
                     rounded-full opacity-20 blur-[120px] pointer-events-none"
          style={{ background: '#244C5A' }}
        />

        {/* "2026" decorative numeral */}
        <div
          className="absolute top-10 right-10 font-black opacity-[0.04]
                     select-none pointer-events-none
                     text-[8rem] md:text-[14rem]"
          style={{ color: '#FFC72C', letterSpacing: '-0.05em', lineHeight: 1 }}
        >
          2026
        </div>

        {/* Content container */}
        <div className="relative z-10 w-full max-w-sm md:max-w-lg">
          {/* Brand header */}
          <div className="text-center mb-8">
            {/* Pill badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
              style={{ background: 'rgba(255,199,44,0.125)', color: '#FFC72C' }}
            >
              <Flame size={12} />
              <span className="text-[10px] font-black uppercase tracking-[0.25em]">
                Copa Mundo · USA · CAN · MEX
              </span>
            </div>

            {/* Trophy + BOLÃO wordmark */}
            <div className="flex items-center justify-center gap-3 mb-2">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center -rotate-6"
                style={{ background: '#FFC72C' }}
              >
                <Trophy size={32} style={{ color: '#244C5A' }} strokeWidth={2.5} />
              </div>
              <div
                className="text-4xl md:text-6xl font-black text-white leading-none"
                style={{ letterSpacing: '-0.03em' }}
              >
                BOLÃO
              </div>
            </div>

            {/* Subtitle */}
            <p
              className="text-base md:text-xl font-bold tracking-widest uppercase"
              style={{ color: '#0097A9' }}
            >
              BOLÃO DA COPA 2026
            </p>
          </div>

          {/* Login card */}
          <div
            className="rounded-[36px] p-8 border backdrop-blur-2xl"
            style={{
              background: 'rgba(255,255,255,0.08)',
              borderColor: 'rgba(255,255,255,0.15)',
            }}
          >
            {error === 'auth_callback_failed' && (
              <div
                role="alert"
                className="mb-4 rounded-2xl px-4 py-3 text-sm"
                style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5' }}
              >
                Erro ao fazer login com Google. Tente novamente.
              </div>
            )}

            <h2 className="text-white text-lg font-bold mb-1">Entre para jogar 🎯</h2>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Use sua conta Google para logar
            </p>

            <LoginButton />

            <div
              className="mt-4 pt-4 border-t flex items-center justify-center gap-2 text-[11px]"
              style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
            >
              <Lock size={12} />
              <span>SSO autenticado</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { val: '48', label: 'Seleções' },
              { val: '104', label: 'Jogos' },
              { val: '1', label: 'Paixão' },
            ].map((s) => (
              <div
                key={s.label}
                className="text-center p-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <div className="text-2xl font-black" style={{ color: '#FFC72C' }}>
                  {s.val}
                </div>
                <div
                  className="text-[10px] uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
