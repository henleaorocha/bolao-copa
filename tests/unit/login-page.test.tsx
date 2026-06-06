import { describe, it, expect } from 'vitest'

/**
 * Login copy is neutral / employer-agnostic (task_03).
 * The page is an async server component that calls getSupabaseServerClient, so we
 * assert against its source (same convention as join-page.test.ts) to keep the test
 * free of Supabase/Next request plumbing.
 */
describe('LoginPage copy', () => {
  async function loginSource() {
    const fs = await import('fs').then((m) => m.promises)
    return fs.readFile('app/login/page.tsx', 'utf-8')
  }

  it('renders the neutral Google description', async () => {
    expect(await loginSource()).toContain('Use sua conta Google para logar')
  })

  it('renders the SSO badge without the Arkmeds.com suffix', async () => {
    const src = await loginSource()
    expect(src).toContain('SSO autenticado')
    expect(src).not.toContain('SSO autenticado · Arkmeds.com')
  })

  it('drops the old employer / Arkmeds.com references', async () => {
    const src = await loginSource()
    expect(src).not.toContain('da empresa')
    expect(src).not.toContain('Arkmeds.com')
  })

  it('keeps the Google sign-in affordance', async () => {
    expect(await loginSource()).toContain('LoginButton')
  })
})
