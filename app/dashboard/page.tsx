import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/client'

// A tela de dashboard foi descontinuada. Mantemos apenas um redirect:
// logado -> /ligas, deslogado -> /login.
export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  redirect(user ? '/ligas' : '/login')
}
