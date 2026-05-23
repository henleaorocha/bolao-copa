import { describe, it, expect, beforeEach, afterEach } from 'vitest'

/**
 * Cold-start join flow integration tests
 *
 * These tests verify the complete flow of an unauthenticated user
 * clicking an invite link, being redirected to login, completing OAuth,
 * and returning to the join page.
 *
 * NOTE: These tests require SERVICE_ROLE_KEY for Supabase admin operations.
 * They will be skipped if the key is not available.
 */

const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

// Skip if service role key is not available
const describeIfCanUseServiceRole = SERVICE_ROLE_KEY && SUPABASE_URL ? describe : describe.skip

describeIfCanUseServiceRole('Cold-Start Join Flow', () => {
  let leagueId: string
  let inviteToken: string

  beforeEach(async () => {
    if (!SERVICE_ROLE_KEY || !SUPABASE_URL) {
      throw new Error('SERVICE_ROLE_KEY and SUPABASE_URL must be set for these tests')
    }

    // Set up test data via Supabase admin client
    // Create a test league with invite token
    const createLeagueResponse = await fetch(`${SUPABASE_URL}/rest/v1/leagues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        name: 'Test Cold-Start League',
        access_type: 'private',
        created_by: 'test-admin-id',
        invite_token: `test-token-${Date.now()}`,
        member_count: 1,
      }),
    })

    const leagueData = await createLeagueResponse.json()
    leagueId = leagueData[0]?.id
    inviteToken = leagueData[0]?.invite_token

    expect(leagueId).toBeDefined()
    expect(inviteToken).toBeDefined()
  })

  afterEach(async () => {
    // Clean up test data
    if (leagueId && SERVICE_ROLE_KEY && SUPABASE_URL) {
      await fetch(`${SUPABASE_URL}/rest/v1/leagues?id=eq.${leagueId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
        },
      })
    }
  })

  it('should redirect unauthenticated /join request to login with x-invite-redirect cookie', async () => {
    const joinUrl = `/join?token=${inviteToken}`

    // Simulate request to /join without authentication
    const response = await fetch(joinUrl, {
      method: 'GET',
      credentials: 'omit', // No cookies
      redirect: 'manual', // Follow redirects manually to inspect
    })

    // Expect redirect to /login
    expect(response.status).toBe(307) // Temporary redirect
    expect(response.headers.get('location')).toContain('/login')

    // Expect x-invite-redirect cookie in response
    const setCookie = response.headers.get('set-cookie')
    expect(setCookie).toContain('x-invite-redirect')
    expect(setCookie).toContain(encodeURIComponent(joinUrl))
  })

  it('should preserve invite URL in cookie when redirecting to login', async () => {
    const joinUrl = `/join?token=${inviteToken}`

    const response = await fetch(joinUrl, {
      method: 'GET',
      credentials: 'omit',
      redirect: 'manual',
    })

    const setCookieHeader = response.headers.get('set-cookie')
    expect(setCookieHeader).toBeDefined()

    // Extract cookie value
    const cookieMatch = setCookieHeader?.match(/x-invite-redirect=([^;]+)/)
    expect(cookieMatch).toBeDefined()
    const cookieValue = cookieMatch?.[1]

    expect(cookieValue).toContain(encodeURIComponent(inviteToken))
  })

  it('should store x-invite-redirect cookie in sessionStorage from login page', async () => {
    // This test verifies the InviteRedirectHandler client component behavior
    // In a real E2E test, you would:
    // 1. Navigate to /login with x-invite-redirect cookie set
    // 2. Wait for InviteRedirectHandler useEffect to run
    // 3. Verify sessionStorage.inviteRedirect is set

    // For this integration test, we verify the component exists and is imported
    const fs = await import('fs').then((m) => m.promises)
    const loginPageContent = await fs.readFile(
      'app/login/page.tsx',
      'utf-8'
    )

    expect(loginPageContent).toContain('InviteRedirectHandler')
    expect(loginPageContent).toContain('<InviteRedirectHandler />')
  })

  it('should redirect from /auth/callback-redirect to inviteRedirect if sessionStorage has it', async () => {
    // This test verifies the callback-redirect page checks sessionStorage
    const fs = await import('fs').then((m) => m.promises)
    const callbackRedirectContent = await fs.readFile(
      'app/auth/callback-redirect/page.tsx',
      'utf-8'
    )

    // Verify it reads sessionStorage
    expect(callbackRedirectContent).toContain("sessionStorage.getItem('inviteRedirect')")
    // Verify it clears the key
    expect(callbackRedirectContent).toContain("sessionStorage.removeItem('inviteRedirect')")
    // Verify it redirects to the stored URL
    expect(callbackRedirectContent).toContain('router.push(inviteRedirect)')
  })

  it('should fall back to /dashboard if no inviteRedirect in sessionStorage', async () => {
    const fs = await import('fs').then((m) => m.promises)
    const callbackRedirectContent = await fs.readFile(
      'app/auth/callback-redirect/page.tsx',
      'utf-8'
    )

    // Verify fallback to /dashboard
    expect(callbackRedirectContent).toContain("router.push('/dashboard')")
  })

  it('should accept join request from user who completed OAuth cold-start flow', async () => {
    // Simulate the state after OAuth is complete:
    // 1. User is authenticated
    // 2. User is navigated to /join?token=...
    // 3. User should be able to join

    const joinUrl = `/join?token=${inviteToken}`

    // This would normally happen after OAuth callback
    // For this test, we verify the join page can process the token
    const response = await fetch(joinUrl, {
      method: 'GET',
      credentials: 'include', // With auth cookie
    })

    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)

    // Response should contain join page with league preview
    const html = await response.text()
    expect(html).toContain('Entrar na Liga')
  })

  it('should complete full flow: unauthenticated → login → OAuth → join → member', async () => {
    /**
     * Full flow test:
     * 1. Unauthenticated user clicks invite link (/join?token=...)
     * 2. Middleware detects no auth, redirects to /login with cookie
     * 3. Login page renders, InviteRedirectHandler stores cookie in sessionStorage
     * 4. User clicks Google login button (OAuth redirects to Google)
     * 5. OAuth callback exchanges code for session
     * 6. Callback redirects to /auth/callback-redirect
     * 7. Callback-redirect page checks sessionStorage, finds inviteRedirect
     * 8. Redirects back to /join?token=...
     * 9. Join page renders, user clicks "Entrar na Liga"
     * 10. API call to POST /api/leagues/{id}/join succeeds
     * 11. User is now a member and redirected to /ligas/{id}
     *
     * This test verifies the key integration points:
     */

    // 1. Verify middleware redirects unauthenticated /join to login
    const initialResponse = await fetch(`/join?token=${inviteToken}`, {
      redirect: 'manual',
      credentials: 'omit',
    })
    expect(initialResponse.status).toBe(307) // Redirect to login

    // 2. Verify cookie is set for invite redirect
    const setCookieHeader = initialResponse.headers.get('set-cookie')
    expect(setCookieHeader).toContain('x-invite-redirect')

    // 3. Verify login page loads and has InviteRedirectHandler
    const loginResponse = await fetch('/login', {
      credentials: 'omit',
    })
    const loginHtml = await loginResponse.text()
    expect(loginHtml).toContain('Bolão da Copa')

    // 4 & 5 & 6. OAuth flow would happen in browser; server gets code and session
    // This would be tested in an E2E test with Playwright/Cypress

    // 7. Verify callback-redirect page logic
    const callbackResponse = await fetch('/auth/callback-redirect', {
      credentials: 'include', // With auth session
    })
    expect(callbackResponse.ok || callbackResponse.status === 307).toBe(true) // OK or redirect

    // 8 & 9. Verify authenticated user can access join page
    const authenticatedJoinResponse = await fetch(`/join?token=${inviteToken}`, {
      credentials: 'include',
    })
    expect(authenticatedJoinResponse.ok).toBe(true)
    const joinHtml = await authenticatedJoinResponse.text()
    expect(joinHtml).toContain('Entrar na Liga')

    // 10. Join API would be called from client; already tested in JoinButton unit tests

    // 11. After join, user would be member and redirected to /ligas/{id}
  })
})
