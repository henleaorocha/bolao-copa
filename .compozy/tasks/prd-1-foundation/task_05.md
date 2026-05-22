---
status: completed
title: "Create API routes: /api/auth/me, /api/auth/logout, /api/health"
type: backend
complexity: medium
dependencies:
  - task_03
  - task_04
---

# Create API routes: /api/auth/me, /api/auth/logout, /api/health

## Overview

Implement three RESTful API routes that are the minimal backend for Foundation. `/api/auth/me` returns the authenticated user and their league context (used by frontend to bootstrap); `/api/auth/logout` clears the session; `/api/health` checks database connectivity for deployment verification. All responses follow a consistent JSON envelope structure with error codes. Middleware (task_04) validates sessions before requests reach these routes.

<critical>
Read the **TechSpec "API Endpoints"** section for exact request/response specifications, error codes, and status codes. Reference **"Core Interfaces"** for ApiResponse envelope structure. These endpoints are the contract for the entire frontend; small changes break the UI. Implement exactly as specified. All error responses must include `code`, `statusCode`, and user-facing `error` messages in Portuguese (PT-BR). Test all error paths (401, 500, 503) in task_07.
</critical>

<requirements>

1. MUST create `GET /auth/callback` route (CRÍTICO — sem isso o OAuth nunca completa):
   - **Path**: `app/auth/callback/route.ts`
   - **Requires auth**: No (é exatamente onde a sessão é criada)
   - **Behavior**:
     1. Ler o parâmetro `code` de `request.nextUrl.searchParams`
     2. Se `code` existe: chamar `supabase.auth.exchangeCodeForSession(code)`
     3. Redirecionar para `/dashboard` em caso de sucesso
     4. Se `code` ausente ou troca falhar: redirecionar para `/login?error=auth_callback_failed`
   - **Nota**: Esta rota é o destino de redirect do Google OAuth configurado em task_02

   ```typescript
   // app/auth/callback/route.ts
   import { createServerClient } from '@supabase/ssr'
   import { cookies } from 'next/headers'
   import { NextRequest, NextResponse } from 'next/server'

   export async function GET(request: NextRequest) {
     const code = request.nextUrl.searchParams.get('code')
     if (code) {
       const cookieStore = await cookies()
       const supabase = createServerClient(/* ... */)
       const { error } = await supabase.auth.exchangeCodeForSession(code)
       if (!error) {
         return NextResponse.redirect(new URL('/dashboard', request.url))
       }
     }
     return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url))
   }
   ```

2. MUST create structured API response helper functions:
   - `formatSuccess<T>(data: T): ApiSuccessResponse<T>` → returns `{status: 'success', data, timestamp}`
   - `formatError(code: string, message: string, statusCode: number): ApiErrorResponse` → returns `{status: 'error', error, code, statusCode, timestamp}`
   - Both responses include ISO 8601 `timestamp`

2. MUST implement `GET /api/auth/me`:
   - **Requires authentication**: Yes (middleware validates, returns 401 if invalid)
   - **Returns**: User object (id, email, full_name, avatar_url, avatar_color, created_at) + League object (id, name, access_type, logo_url, role)
   - **Behavior**: Query `users` table for authenticated user, query `league_members` to find their league role, return combined object
   - **Error cases**:
     - 401 if session is invalid (middleware handles)
     - 500 if database query fails (return generic error message in PT-BR)
   - **Performance**: Target < 500ms p95 (two database queries)

3. MUST implement `POST /api/auth/logout`:
   - **Requires authentication**: Yes
   - **Returns**: `{status: 'success', data: {ok: true}, timestamp}`
   - **Behavior**: Call `supabase.auth.signOut()` to clear session on backend
   - **Error cases**: 500 if signout fails
   - **Note**: Frontend also clears cookies via Set-Cookie response headers

4. MUST implement `GET /api/health`:
   - **Requires authentication**: No (public endpoint)
   - **Returns**: `{status: 'success', data: {status: 'ok', database: 'connected'}, timestamp}`
   - **Behavior**: Execute simple query (e.g., `SELECT 1`) to verify database is reachable
   - **Error cases**: 503 if database is unreachable

5. MUST handle all error cases with structured responses:
   - 401: `{status: 'error', error: 'Sessão expirada', code: 'SESSION_EXPIRED', statusCode: 401}`
   - 500: `{status: 'error', error: 'Erro ao buscar dados do usuário', code: 'DATABASE_ERROR', statusCode: 500}`
   - 503: `{status: 'error', error: 'Banco de dados indisponível', code: 'DATABASE_UNAVAILABLE', statusCode: 503}`
   - All user-facing error messages in PT-BR

6. MUST implement input validation:
   - Reject requests with invalid Content-Type (POST endpoints)
   - Reject requests with unexpected query parameters
   - Return 400 Bad Request with clear error code

7. MUST implementar proteção básica para `POST /api/auth/logout`:
   - Verificar header `Origin` ou `Referer` para mitigar CSRF simples
   - Se `Origin` não corresponder ao domínio esperado, retornar 403
   - O cookie HTTP-only já provê proteção primária, mas validação de origin adiciona defesa em profundidade

7. SHOULD include structured logging:
   - Log each endpoint call (info level): timestamp, endpoint, user_id, status, duration_ms
   - Log errors (warning/error level): error code, stack trace (development only)

</requirements>

## Subtasks

- [x] **CRÍTICO**: Criar `app/auth/callback/route.ts` com handler GET:
  - [x] Ler `code` de `request.nextUrl.searchParams`
  - [x] Chamar `supabase.auth.exchangeCodeForSession(code)`
  - [x] Redirecionar para `/dashboard` em caso de sucesso
  - [x] Redirecionar para `/login?error=auth_callback_failed` em caso de falha
- [x] Create `lib/api/responses.ts` with `formatSuccess()` and `formatError()` helper functions
- [x] Create `app/api/auth/me/route.ts` with GET handler
  - [x] Query authenticated user from `users` table
  - [x] Query league membership from `league_members` table
  - [x] Return user + league context
  - [x] Handle 401 (no session) and 500 (database error)
- [x] Create `app/api/auth/logout/route.ts` with POST handler
  - [x] Call `supabase.auth.signOut()`
  - [x] Return success response
  - [x] Handle 500 errors
- [x] Create `app/api/health/route.ts` with GET handler
  - [x] Execute `SELECT 1` on database
  - [x] Return success if connected
  - [x] Return 503 if connection fails
- [x] Add comprehensive error handling to all routes
- [x] Add structured logging to all routes
- [ ] Test locally: `npm run dev` → call all three endpoints via curl or Postman
- [ ] Verify error responses: Manually test 401, 500, 503 scenarios

## Implementation Details

**Files to create**:
- `app/auth/callback/route.ts` — **CRÍTICO**: handler de callback OAuth (troca code por sessão)
- `lib/api/responses.ts` — Response envelope helpers
- `app/api/auth/me/route.ts` — Fetch user + league
- `app/api/auth/logout/route.ts` — Clear session
- `app/api/health/route.ts` — Database connectivity check

**Database queries** (from TechSpec):
- `/api/auth/me`:
  ```sql
  SELECT id, email, full_name, avatar_url, avatar_color, created_at FROM users WHERE id = $1;
  SELECT role FROM league_members WHERE user_id = $1 AND league_id = '00000000-0000-0000-0000-000000000001';
  SELECT id, name, access_type, logo_url FROM leagues WHERE id = '00000000-0000-0000-0000-000000000001';
  ```
- `/api/health`:
  ```sql
  SELECT 1;
  ```

**Response envelopes** (from TechSpec):
- Success: `{status: 'success', data: {...}, timestamp: ISO8601}`
- Error: `{status: 'error', error: 'msg', code: 'CODE', statusCode: 400, timestamp: ISO8601}`

**Integration points**:
- All routes use `getSupabaseServerClient()` from `lib/supabase/client.ts` (task_01)
- Middleware (task_04) validates session before routes execute
- Frontend (task_06) calls these endpoints after login
- Tests (task_07) verify error paths and response structure

**Reference TechSpec sections**:
- **"API Endpoints"**: Exact request/response specs, error codes, status codes
- **"Core Interfaces"**: ApiResponse envelope and AuthUser/LeagueContext types
- **"Integration Points"**: Error handling expectations

### Relevant Files

- `lib/api/responses.ts` (created here) — Response helpers
- `lib/supabase/client.ts` (task_01) — Supabase client
- `app/api/auth/me/route.ts`, `app/api/auth/logout/route.ts`, `app/api/health/route.ts` (created here)
- Middleware (task_04) — Session validation before route execution

### Dependent Files

- `/app/login/page.tsx` (task_06) — Calls `/api/auth/logout`
- `/app/dashboard/page.tsx` (task_06) — Calls `/api/auth/me` to fetch user context
- Integration tests (task_07) — Test all three endpoints with mocked sessions

### Related ADRs

- [[ADR-003]]: Justifies using Supabase Auth Helpers (session management by official package)

## Deliverables

1. **GET /auth/callback**: Troca code OAuth por sessão Supabase; redireciona para /dashboard ou /login
2. **Response envelope helpers**: `lib/api/responses.ts` with `formatSuccess()` and `formatError()`
3. **GET /api/auth/me**: Returns authenticated user + league context
4. **POST /api/auth/logout**: Clears session via Supabase Auth (com validação de Origin)
5. **GET /api/health**: Checks database connectivity
6. **Error handling**: All endpoints handle 401, 500, 503 with structured error responses
7. **Structured logging**: All endpoints log calls and errors with consistent format
8. **Type definitions**: TypeScript types for request/response objects (exported from `lib/api/types.ts` or similar)

## Tests

### Unit Tests
- ✅ `formatSuccess()` returns envelope with status='success', timestamp, data
- ✅ `formatError()` returns envelope with status='error', code, statusCode, timestamp
- ✅ Response helpers preserve all fields in data object
- ✅ Timestamp is valid ISO 8601 format

### Integration Tests
- ✅ `/api/auth/me` with valid session: Returns 200 with user + league data
- ✅ `/api/auth/me` without session: Returns 401 with SESSION_EXPIRED error code
- ✅ `/api/auth/me` with database error: Returns 500 with DATABASE_ERROR error code
- ✅ `/api/auth/logout` with valid session: Returns 200, session is cleared
- ✅ `/api/auth/logout` without session: Returns 401
- ✅ `/api/health` without auth: Returns 200 with database: 'connected'
- ✅ `/api/health` with database unavailable: Returns 503 with DATABASE_UNAVAILABLE code
- ✅ All error responses include error message in Portuguese (PT-BR)
- ✅ All error responses include code (e.g., SESSION_EXPIRED, DATABASE_ERROR, DATABASE_UNAVAILABLE)
- ✅ All responses include timestamp field (ISO 8601)
- ✅ Response Content-Type is application/json

## Success Criteria

- ✅ `app/auth/callback/route.ts` existe e troca code por sessão corretamente
- ✅ Após OAuth completo via Google, usuário é redirecionado para `/dashboard` (não fica preso na tela do Google)
- ✅ All three API routes exist in correct paths
- ✅ `GET /api/auth/me` returns user (id, email, full_name, avatar_url, avatar_color, created_at) + league (id, name, access_type, logo_url, role)
- ✅ `POST /api/auth/logout` clears session and returns success response
- ✅ `GET /api/health` returns 200 with database status (or 503 if unreachable)
- ✅ All error responses include `code`, `error` (PT-BR), `statusCode`, `timestamp`
- ✅ Middleware blocks unauthenticated requests to `/api/auth/me` and `/api/auth/logout` (returns 401)
- ✅ `/api/health` is public (no auth required)
- ✅ Logged calls include endpoint, user_id, status, duration_ms
- ✅ No sensitive data in error responses (no stack traces in production)
- ✅ All endpoints run < 500ms p95 (verified via Vercel logs or local testing)
