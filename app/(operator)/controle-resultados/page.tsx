export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { requireOperator } from '@/lib/operator'
import OperatorResultTable, {
  type OperatorMatch,
} from './OperatorResultTable'

// Unlisted operator surface (ADR-008): reached only by typing the URL directly;
// it is intentionally NOT linked from any participant UI. The email gate is the
// SAME `requireOperator()` shared with the result-control API.
export default async function ControleResultadosPage() {
  const gate = await requireOperator()
  if (!gate.ok) {
    // No session → send to login; an authenticated non-operator gets a 404 so
    // the page's existence stays hidden.
    if (gate.status === 401) {
      redirect('/login')
    }
    notFound()
  }

  // Reads with the service-role client, consistent with the result-control API.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, home_team, away_team, match_date, phase, status, home_score, away_score, is_manual, manual_updated_at'
    )
    .order('match_date', { ascending: true })

  if (error) {
    throw new Error(`Erro ao carregar partidas: ${error.message}`)
  }

  const matches = (data ?? []) as OperatorMatch[]

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Operador
          </p>
          <h1 className="text-2xl font-extrabold text-[#244C5A]">
            Controle de Resultados
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Salvar marca a partida como manual (protegida do sync automático).
            Liberar devolve ao controle automático.
          </p>
        </header>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <OperatorResultTable matches={matches} />
        </div>
      </div>
    </div>
  )
}
