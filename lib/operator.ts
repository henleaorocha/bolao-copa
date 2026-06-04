import { getSupabaseServerClient } from '@/lib/supabase/client'

// Operator authority is limited to two named accounts (ADR-004 / ADR-008).
// This is the single source of truth shared by BOTH the unlisted operator page
// and the result-control API, so the email gate cannot drift between them.
export const OPERATOR_EMAILS = new Set([
  'hen.leao.rocha@gmail.com',
  'henrique.rocha@arkmeds.com',
])

/**
 * Shared server-side email gate for operator surfaces.
 *
 * Reads the authenticated Supabase session (same pattern as the bracket route)
 * and returns a discriminated result:
 *  - `{ ok: true }`              — an allowed operator is signed in
 *  - `{ ok: false, status: 401 }` — no authenticated session
 *  - `{ ok: false, status: 403 }` — authenticated, but not an operator account
 */
export async function requireOperator(): Promise<
  { ok: true } | { ok: false; status: 401 | 403 }
> {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { ok: false, status: 401 }
  }

  const email = user.email?.toLowerCase()
  if (!email || !OPERATOR_EMAILS.has(email)) {
    return { ok: false, status: 403 }
  }

  return { ok: true }
}
