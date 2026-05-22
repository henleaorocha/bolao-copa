---
status: completed
title: Configure Supabase project with Google OAuth, connection pooling, and RLS
type: infra
complexity: medium
dependencies:
  - task_01
---

# Configure Supabase project with Google OAuth, connection pooling, and RLS

## Overview

Configure the Supabase project to enable Google OAuth authentication, set production/local redirect URLs, enable connection pooling (PgBouncer), and enable global Row-Level Security (RLS). This task is security-critical and blocks all database and auth tasks. No code is written; configuration is UI-based in Supabase dashboard.

<critical>
Read the **TechSpec "Integration Points"** section for Google OAuth flow details. Read **"Data Models"** for RLS policy requirements. Google OAuth credentials must already be pre-configured in Supabase per the PRD ("credentials already provided by customer"). Your job is to enable them, set URLs, and enable infrastructure. Do NOT create RLS policies here—that is part of task_03 (migrations).
</critical>

<requirements>

1. MUST verify Google OAuth credentials are pre-configured in Supabase:
   - Client ID and Secret are set in Auth → Providers → Google
   - If missing, obtain from customer and set them

2. MUST configure OAuth redirect URLs in Supabase:
   - Local development: `http://localhost:3000/auth/callback`
   - Production (Vercel): `https://bolao-copa.vercel.app/auth/callback`
   - Also add wildcard for Vercel preview: `https://*.vercel.app/auth/callback` (optional, for PR previews)

3. MUST enable connection pooling (PgBouncer):
   - In Supabase dashboard → Project Settings → Database → Connection Pooling
   - Set mode to `Transaction` (default safe mode)
   - Set pool size to 15 (suitable for Vercel concurrency)
   - Enable pooling; note the pooled connection string (will be used by middleware in task_04)

4. MUST enable Row-Level Security (RLS) globally:
   - In Supabase dashboard → Project Settings → Database → RLS
   - Toggle "Enable RLS" ON for the entire database
   - Note: Policies will be created in task_03

5. MUST configure Auth settings:
   - Session timeout: 7 days (Supabase default)
   - PKCE: Enabled (default, for OAuth security)
   - Email confirmation: Not required for Foundation (Google OAuth is implicit verification)

6. SHOULD enable CORS for Vercel domain:
   - In Supabase dashboard → Project Settings → API
   - Add `https://bolao-copa.vercel.app` to allowed origins (if not auto-added)

</requirements>

## Subtasks

- [ ] Verify Google OAuth credentials (Client ID + Secret) exist in Supabase Auth → Providers → Google
- [ ] Configure OAuth redirect URLs: `http://localhost:3000/auth/callback`, `https://bolao-copa.vercel.app/auth/callback`
- [ ] Enable connection pooling (PgBouncer) with pool size 15, mode=Transaction
- [ ] Note the pooled connection string (URI format for use in task_04)
- [ ] Enable global RLS in Database settings
- [ ] Verify PKCE is enabled in Auth settings
- [ ] Test OAuth by visiting http://localhost:3000 and initiating a login flow (will fail until task_04 middleware exists, but OAuth redirect should work)
- [ ] Document Supabase project URL and anon key in `.env.local` (task_01 template)

## Implementation Details

**Configuration locations** (all in Supabase dashboard):
- **Auth Providers**: https://app.supabase.com/project/[PROJECT_ID]/auth/providers
- **Connection Pooling**: https://app.supabase.com/project/[PROJECT_ID]/settings/database
- **RLS Settings**: https://app.supabase.com/project/[PROJECT_ID]/auth/row-level-security
- **API Settings**: https://app.supabase.com/project/[PROJECT_ID]/settings/api

**Supabase credentials** (to fill in `.env.local` from task_01):
- `NEXT_PUBLIC_SUPABASE_URL` — Project URL (visible in Settings → API)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon key (visible in Settings → API)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (visible in Settings → API, secret)

**Connection pooling details**:
- Mode: `Transaction` (safest; resets state after each transaction)
- Pool size: 15 (reasonable for Vercel's concurrency limits)
- Pooled URI will be used in task_04 middleware (if needed; by default, Supabase client uses the main URI)

### Relevant Files

- `.env.local` (task_01) — Will contain `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` populated here
- Supabase dashboard (browser, no source code)

### Dependent Files

- `middleware.ts` (task_04) — Uses the configured OAuth provider and connection pool
- Database migrations (task_03) — Depend on RLS being enabled
- All API routes (task_05) — Use `NEXT_PUBLIC_SUPABASE_URL` and keys from `.env.local`

### Related ADRs

- [[ADR-003]]: Justifies use of Supabase Auth Helpers (official, secure by default)

## Deliverables

1. **Google OAuth enabled and redirect URLs set** in Supabase
2. **Connection pooling enabled** with pool size 15
3. **Global RLS enabled** (policies created in task_03)
4. **Supabase credentials populated** in `.env.local`
5. **No code artifacts** (all configuration is in Supabase dashboard UI)

## Tests

### Unit Tests
- N/A (infrastructure configuration; no code to test)

### Integration Tests
- ✅ Verify Google OAuth redirect works: Visit http://localhost:3000, initiate login → should redirect to Google consent screen (may fail to return until middleware exists, but redirect itself should work)
- ✅ Verify connection pool is active: In Supabase dashboard → Database → Connection Pooling, verify pool size and mode are set
- ✅ Verify RLS is enabled: In Supabase dashboard → Auth → Row-Level Security, toggle should be ON
- ✅ Verify Supabase keys are valid: `npm run dev` in task_01 project should not show Supabase connection errors

## Success Criteria

- ✅ Google OAuth credentials (Client ID + Secret) are configured in Supabase
- ✅ OAuth redirect URLs include `http://localhost:3000/auth/callback` and `https://bolao-copa.vercel.app/auth/callback`
- ✅ Connection pooling is enabled with mode=Transaction, pool size=15
- ✅ Global RLS is enabled in Database settings
- ✅ `.env.local` contains valid `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ PKCE is enabled (default in Supabase)
- ✅ OAuth redirect to Google consent screen works (endpoint is reachable)
