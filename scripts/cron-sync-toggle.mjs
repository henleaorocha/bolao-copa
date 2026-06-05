#!/usr/bin/env node
// Pausa / reativa / inspeciona o pg_cron `sync-matches-hourly` do Supabase.
//
//   node --env-file=.env.local scripts/cron-sync-toggle.mjs status   (default)
//   node --env-file=.env.local scripts/cron-sync-toggle.mjs pause     -> active=false
//   node --env-file=.env.local scripts/cron-sync-toggle.mjs resume    -> active=true
//
// PARA QUE SERVE: durante a validação manual com mock (ver scripts/gen-mock.mjs e
// docs/VALIDACAO-MANUAL.md Parte 3), o pg_cron de prod chama o deploy a cada hora
// e sobrescreve os placares simulados com o openfootball real. Pause antes do L1 e
// REATIVE no fim. O job é só desativado (active=false), nunca apagado.
//
// PRÉ-REQUISITO: o pacote `pg` não é dependência do projeto. Instale como throwaway:
//   npm i pg --no-save     (e, se quiser, `npm uninstall pg --no-save` no fim)
//
// Conexão direta no Postgres usando SUPABASE_DB_PASSWORD do .env.local.

let pg
try {
  pg = (await import('pg')).default
} catch {
  console.error("Falta o pacote 'pg'. Rode:  npm i pg --no-save")
  process.exit(1)
}

const ref = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').match(/https:\/\/([^.]+)\./)?.[1]
if (!ref || !process.env.SUPABASE_DB_PASSWORD) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_DB_PASSWORD. Use: node --env-file=.env.local ...')
  process.exit(1)
}

const action = process.argv[2] || 'status'
if (!['status', 'pause', 'resume'].includes(action)) {
  console.error('uso: node --env-file=.env.local scripts/cron-sync-toggle.mjs status|pause|resume')
  process.exit(1)
}
const JOB = 'sync-matches-hourly'

const client = new pg.Client({
  host: `db.${ref}.supabase.co`,
  port: 5432,
  user: 'postgres',
  database: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

const show = async (label) => {
  const { rows } = await client.query(
    'SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = $1',
    [JOB]
  )
  console.log(label, rows.length ? rows[0] : '(job não encontrado)')
  return rows[0]
}

await client.connect()
const job = await show('antes :')
if (!job) { await client.end(); process.exit(1) }

if (action !== 'status') {
  const active = action === 'resume'
  await client.query('SELECT cron.alter_job(job_id := $1, active := $2)', [job.jobid, active])
  await show('depois:')
}
await client.end()
