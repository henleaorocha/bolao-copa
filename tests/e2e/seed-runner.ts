/**
 * Applies a preset-state SQL seed to the LOCAL Supabase database.
 *
 * The seeds insert into auth.users, which only a superuser may write — so they
 * run through `docker exec ... psql -U postgres` rather than the service-role
 * PostgREST client. The container name defaults to the local stack for this repo
 * and is overridable via SUPABASE_DB_CONTAINER.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export type SeedState = 'precup' | 'live' | 'finished'

const CONTAINER = process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_bolao-copa'

export function seedPath(state: SeedState): string {
  return resolve(process.cwd(), `supabase/seeds/state-${state}.sql`)
}

export function applySeed(state: SeedState): void {
  const sql = readFileSync(seedPath(state), 'utf8')
  execFileSync(
    'docker',
    ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q'],
    { input: sql, stdio: ['pipe', 'ignore', 'pipe'] }
  )
}
