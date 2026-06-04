/**
 * Resolves the LOCAL Supabase credentials for the validation run.
 *
 * The committed .env.local points at the production project; the validation
 * harness must NEVER touch it (public.matches is global). Instead we read the
 * disposable local stack started with `supabase start`. Next.js gives process.env
 * precedence over .env.local, so the Playwright webServer can launch `next dev`
 * with these values and the app will talk to the local stack.
 */
import { execSync } from 'node:child_process'

export interface LocalSupabaseEnv {
  apiUrl: string
  anonKey: string
  serviceKey: string
}

let cached: LocalSupabaseEnv | null = null

export function getLocalSupabaseEnv(): LocalSupabaseEnv {
  if (cached) return cached
  let out: string
  try {
    out = execSync('supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    throw new Error('Local Supabase is not running. Start it with `supabase start` before the validation run.')
  }
  const pick = (key: string): string => {
    const m = out.match(new RegExp(`^${key}="?([^"\\n]+)"?`, 'm'))
    if (!m) throw new Error(`Local Supabase env missing ${key}.`)
    return m[1]
  }
  cached = {
    apiUrl: pick('API_URL'),
    anonKey: pick('ANON_KEY'),
    serviceKey: pick('SERVICE_ROLE_KEY'),
  }
  return cached
}

export function isLocalSupabaseRunning(): boolean {
  try {
    getLocalSupabaseEnv()
    return true
  } catch {
    return false
  }
}
