import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import LoginButton from '@/components/LoginButton'
import { InviteRedirectHandler } from '@/components/InviteRedirectHandler'

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  const { error } = await searchParams

  return (
    <>
      <InviteRedirectHandler />
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
          <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
            Bolão da Copa 2026
          </h1>
          <p className="mb-8 text-center text-sm text-gray-500">
            Faça login para participar
          </p>

          {error === 'auth_callback_failed' && (
            <p
              role="alert"
              className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              Erro ao fazer login com Google. Tente novamente.
            </p>
          )}

          <LoginButton />
        </div>
      </div>
    </>
  )
}
