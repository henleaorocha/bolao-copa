import { defineConfig } from '@playwright/test'
import { getLocalSupabaseEnv } from './tests/e2e/local-env'

// Base URL of the app under test. The validation run launches `next dev` itself
// (pointed at the LOCAL Supabase stack) unless an external server is provided.
const BASE_URL = process.env.VALIDATION_BASE_URL ?? 'http://localhost:3000'

// Wire the dev server with LOCAL Supabase credentials. process.env takes
// precedence over the committed .env.local (prod) in Next's env load order, so
// these overrides redirect the app to the disposable local stack. When the local
// stack isn't running we omit the webServer — the spec then self-skips.
function buildWebServer() {
  if (process.env.VALIDATION_BASE_URL) return undefined // external server provided
  try {
    const env = getLocalSupabaseEnv()
    return {
      command: 'next dev',
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: env.apiUrl,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: env.anonKey,
        SUPABASE_SERVICE_ROLE_KEY: env.serviceKey,
        NEXT_PUBLIC_SITE_URL: BASE_URL,
      },
    }
  } catch {
    return undefined
  }
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    screenshot: 'off',
    trace: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: buildWebServer(),
})
