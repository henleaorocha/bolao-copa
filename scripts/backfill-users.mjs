// Backfill public.users rows for auth.users that lost theirs (manual deletion).
// Uses the service role → bypasses RLS and does not depend on handle_new_user
// (which only fires on the FIRST auth signup, never on re-login).
//
// Recreates id/email/full_name/avatar_url from each auth user's Google metadata.
// can_create_league is left at the column default (false); the two operator
// e-mails are granted true (mirrors migration 25).
//
//   node scripts/backfill-users.mjs          → DRY RUN (prints plan, writes nothing)
//   node scripts/backfill-users.mjs --apply  → writes the rows
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] })
)
const a = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const OPERATORS = new Set(['hen.leao.rocha@gmail.com', 'henrique.rocha@arkmeds.com'])

const { data: authList, error: aerr } = await a.auth.admin.listUsers({ perPage: 1000 })
if (aerr) { console.error('listUsers:', aerr.message); process.exit(1) }
const { data: pubRows, error: perr } = await a.from('users').select('id')
if (perr) { console.error('select users:', perr.message); process.exit(1) }
const pubIds = new Set(pubRows.map(r => r.id))

const orphans = authList.users.filter(u => !pubIds.has(u.id))
const isTest = (e) => /@example\.com$/i.test(e ?? '')
const real = orphans.filter(u => !isTest(u.email))
const test = orphans.filter(u => isTest(u.email))

const rowFor = (u) => {
  const m = u.user_metadata ?? {}
  return {
    id: u.id,
    email: u.email,
    full_name: m.full_name ?? m.name ?? null,
    avatar_url: m.avatar_url ?? m.picture ?? null,
    can_create_league: OPERATORS.has((u.email ?? '').toLowerCase()),
  }
}

console.log(`Mode: ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}`)
console.log(`auth.users: ${authList.users.length} | public.users: ${pubIds.size} | orphans: ${orphans.length}\n`)
console.log(`REAL users to backfill (${real.length}):`)
for (const u of real) { const r = rowFor(u); console.log(`  + ${r.email}  name="${r.full_name}"  can_create=${r.can_create_league}`) }
console.log(`\nTEST/@example.com orphans NOT backfilled (${test.length}) — safe to delete from auth.users if unwanted:`)
for (const u of test) console.log(`  - ${u.email}`)

if (!APPLY) { console.log('\nDry run complete. Re-run with --apply to write the REAL rows.'); process.exit(0) }

let ok = 0, fail = 0
for (const u of real) {
  const { error } = await a.from('users').upsert(rowFor(u), { onConflict: 'id', ignoreDuplicates: true })
  if (error) { fail++; console.log(`  ❌ ${u.email}: ${error.message}`) } else { ok++ }
}
console.log(`\nDone. inserted/ok=${ok} failed=${fail}`)
