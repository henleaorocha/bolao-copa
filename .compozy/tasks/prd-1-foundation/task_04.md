---
status: completed
title: Implement middleware.ts with Supabase Auth Helpers for session validation and JWT refresh
type: backend
complexity: medium
dependencies:
  - task_01
  - task_02
---

# Implement middleware.ts with Supabase Auth Helpers for session validation and JWT refresh

## Overview

Create `middleware.ts` at the project root using Supabase Auth Helpers (@supabase/auth-helpers-nextjs) to validate sessions on every request, refresh expired JWTs, and protect routes. This middleware is the gatekeeper for authentication; all protected API routes and pages depend on it. Session state is persisted via HTTP-only cookies managed by Supabase.

<critical>
Read the **TechSpec "System Architecture"** section, specifically the Supabase Middleware component description. Read **"Core Interfaces"** for the `getSupabaseServerClient()` usage pattern. The middleware must validate sessions and refresh JWTs automatically—do NOT roll custom auth logic.

**IMPORTANTE**: Use `@supabase/ssr` (NÃO `@supabase/auth-helpers-nextjs` — esse pacote está deprecated). A função correta é `createServerClient` de `@supabase/ssr` com getter/setter de cookies.

HTTP-only cookies são OBRIGATÓRIOS para segurança; verificar em browser DevTools após testar.
</critical>

<requirements>

1. MUST create `middleware.ts` at project root with:
   - Import `createServerClient` from `@supabase/ssr` (NÃO `createMiddlewareClient` de `@supabase/auth-helpers-nextjs`)
   - On every request, fetch session via `supabase.auth.getSession()`
   - Refresh expired JWT tokens automatically (o `@supabase/ssr` faz isso internamente via cookie getter/setter)
   - Update response cookies with refreshed session via o padrão de cookies do `@supabase/ssr`

   ```typescript
   // Padrão correto com @supabase/ssr:
   import { createServerClient } from '@supabase/ssr'
   import { NextResponse } from 'next/server'
   import type { NextRequest } from 'next/server'

   export async function middleware(request: NextRequest) {
     let response = NextResponse.next({ request })
     const supabase = createServerClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
       {
         cookies: {
           getAll() { return request.cookies.getAll() },
           setAll(cookiesToSet) {
             cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
             response = NextResponse.next({ request })
             cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
           },
         },
       }
     )
     await supabase.auth.getUser()
     return response
   }
   ```

2. MUST configure route protection com comportamento diferenciado por tipo de rota:

   **Rotas de página** (ex: `/dashboard`): redirecionar para `/login` se sem sessão
   **Rotas de API** (ex: `/api/auth/me`): retornar `Response.json({status:'error', code:'SESSION_EXPIRED',...}, {status:401})` — NUNCA redirecionar para HTML em APIs

   ```
   Rotas protegidas como PÁGINA:    /dashboard, /dashboard/**
   Rotas protegidas como API:       /api/auth/me, /api/auth/logout
   Rotas públicas (sem verificação): /login, /auth/callback, /api/health, /
   ```

   O middleware deve inspecionar `request.nextUrl.pathname` e decidir o comportamento:
   ```typescript
   const isApiRoute = pathname.startsWith('/api/')
   const isPublicApiRoute = pathname === '/api/health'
   
   if (!session) {
     if (isApiRoute && !isPublicApiRoute) {
       return Response.json({ status: 'error', code: 'SESSION_EXPIRED', ... }, { status: 401 })
     }
     if (!isApiRoute && !publicPageRoutes.includes(pathname)) {
       return NextResponse.redirect(new URL('/login', request.url))
     }
   }
   ```

3. MUST handle session cookie management:
   - Use Next.js `cookies()` to read/write HTTP-only cookies
   - Cookie names should match Supabase Auth defaults:
     - `sb-[PROJECT_ID]-auth-token` (session token)
     - `sb-[PROJECT_ID]-auth-token-code-verifier` (PKCE verifier)
   - Cookies must be HTTP-only, SameSite=Lax, Secure (in production)

4. MUST implement error handling for session failures:
   - If session refresh fails → return 401 Unauthorized (frontend redirects to login)
   - If database is unreachable during session check → log error, return 503 (handled by API routes, not middleware)
   - Do NOT expose internal error details in responses

5. MUST support development and production environments:
   - Localhost: HTTP + HTTP-only cookies allowed
   - Production (Vercel): HTTPS enforced, Secure flag set

6. SHOULD include structured logging:
   - Log successful session validation (debug level)
   - Log session refresh (debug level)
   - Log session expiry or errors (warning level)

</requirements>

## Subtasks

- [ ] Create `middleware.ts` at project root
- [ ] Import `createServerClient` from `@supabase/ssr` (NOT `@supabase/auth-helpers-nextjs`)
- [ ] Implement `middleware()` function using the cookie getter/setter pattern do `@supabase/ssr`
- [ ] Usar `supabase.auth.getUser()` (não `getSession()`) para validação — `getUser()` é mais seguro pois valida com o servidor
- [ ] JWT refresh é automático via o cookie setter do `@supabase/ssr`
- [ ] Configure route matcher: protect `/dashboard` (redirect para /login), `/api/auth/*` (retornar JSON 401); permitir `/api/health`, `/login`, `/auth/callback` como públicos
- [ ] Test locally: `npm run dev` → visit `/dashboard` without auth → should redirect to `/login`
- [ ] Test locally: Authenticate via `/login` → visit `/dashboard` → should load (session is valid)
- [ ] Verify HTTP-only cookie: Open browser DevTools → Application → Cookies → verify `sb-*-auth-token` is HTTP-only (no JavaScript access)
- [ ] Test JWT refresh: Simulate token expiry (local testing only) → middleware should refresh automatically

## Implementation Details

**Files to create**:
- `middleware.ts` — Session validation and JWT refresh logic

**Files to import**:
- `lib/supabase/client.ts` (task_01) — Helper for `createServerClient`
- `@supabase/auth-helpers-nextjs` — Middleware utilities

**Middleware flow** (from TechSpec):
```
Request arrives → middleware.ts executes
  ├─ Fetch session via supabase.auth.getSession()
  ├─ If session is valid → allow request to proceed
  ├─ If token is expired → call refreshSession()
  │    ├─ Refresh succeeds → update cookies, allow request
  │    └─ Refresh fails → clear session, return 401
  └─ If no session → check route matcher
       ├─ If protected route (e.g., /dashboard) → redirect to /login
       └─ If public route → allow request
```

**Route protection logic**:
- Protected: `/dashboard`, `/dashboard/**`, `/api/auth/me`, `/api/auth/logout`
- Public: `/login`, `/auth/callback`, `/api/health`, root `/`

**Integration points**:
- Cookies are set/updated here; next.js automatically includes them in all subsequent requests
- All API routes (task_05) rely on middleware to validate session before request reaches them
- Frontend pages (task_06) can trust that if they're rendered, the user is authenticated (or the request was public)

**Reference TechSpec sections**:
- **"System Architecture"** → "Supabase Middleware" component
- **"Core Interfaces"** → Example `getSupabaseServerClient()` usage

### Relevant Files

- `middleware.ts` (created here)
- `lib/supabase/client.ts` (task_01) — Helper imported by middleware
- `next.config.ts` — May need to configure middleware (usually auto-detected)
- `tsconfig.json` (task_01) — Middleware imports must compile

### Dependent Files

- All API routes in `app/api/` (task_05) — Depend on middleware to validate session first
- Frontend pages: `/dashboard` (task_06) — Depend on middleware to enforce auth redirect
- `/login` page (task_06) — Public; not protected by middleware

### Related ADRs

- [[ADR-002]]: Justifies Next.js App Router with built-in middleware support
- [[ADR-003]]: Justifies using Supabase Auth Helpers for session management (official, secure)

## Deliverables

1. **middleware.ts**: Session validation, JWT refresh, cookie management, route protection
2. **Session validation logic**: On every request, verify session is valid or refresh if expired
3. **Error handling**: Failed session refresh returns 401; graceful error responses
4. **HTTP-only cookie verification**: Cookies are secure and not accessible to JavaScript
5. **Documentation**: Inline comments explaining middleware flow (optional but recommended)

## Tests

### Unit Tests
- N/A (middleware is integration-heavy; tested via integration tests)

### Integration Tests
- ✅ Verify session validation: Unauthenticated request to `/api/auth/me` → middleware retorna JSON 401 (NÃO redireciona para HTML)
- ✅ Verify route protection: Unauthenticated request to `/dashboard` → middleware redirects to `/login` (via Next.js redirect API)
- ✅ Verify public routes: Unauthenticated request to `/login` → middleware allows, page renders
- ✅ Verify public API: Unauthenticated `GET /api/health` → middleware allows, API route returns 200
- ✅ Verify authenticated request: After auth, request to `/dashboard` → middleware allows, page renders
- ✅ Verify HTTP-only cookie: After auth, inspect browser DevTools → cookie `sb-*-auth-token` has HttpOnly flag
- ✅ Verify JWT refresh (optional, advanced): Simulate token expiry → middleware refreshes → subsequent requests use new token
- ✅ Verify cookie update: After middleware refresh, response includes Set-Cookie header with updated token

## Success Criteria

- ✅ `middleware.ts` exists at project root usando `@supabase/ssr` (not `@supabase/auth-helpers-nextjs`)
- ✅ Middleware validates session on every request without errors
- ✅ `/dashboard` unauthenticated → redirect para `/login` (HTML redirect)
- ✅ `/api/auth/me` unauthenticated → JSON 401 (NÃO redirect)
- ✅ Public routes (`/login`, `/api/health`) are accessible without authentication
- ✅ Authenticated requests include HTTP-only session cookie
- ✅ `npm run dev` runs without errors; middleware is active
- ✅ Browser DevTools shows `sb-*-auth-token` cookie with HttpOnly=true
- ✅ Middleware logs (debug/warning) are structured and informative
- ✅ JWT refresh works: Expired tokens are refreshed automatically (tested locally or via unit mock)
- ✅ No sensitive data is exposed in error responses
