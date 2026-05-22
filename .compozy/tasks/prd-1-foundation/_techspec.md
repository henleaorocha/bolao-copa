# TechSpec: Bolão da Copa 2026 — Foundation

## Executive Summary

Foundation establishes the infrastructure for Bolão da Copa 2026, a World Cup betting pool platform. The implementation delivers:

1. **Google OAuth authentication** via Supabase Auth, with HTTP-only session management
2. **Complete database schema** (7 tables: users, leagues, league_members, matches, predictions, champion_bets, scores) with Row-Level Security (RLS) policies and automated user enrollment
3. **Minimal backend API** (`GET /api/auth/me`, `POST /api/auth/logout`, `GET /api/health`) for frontend bootstrap and session management
4. **Vercel-deployable Next.js application** with TypeScript, Tailwind CSS, and Supabase integration

**Architecture**: Next.js 13+ App Router (modern) + Supabase Auth Helpers middleware (secure, official) + Supabase CLI migrations (auditable, reversible). The primary trade-off: we prioritize security by default (HTTP-only cookies, RLS enforcement) over implementation speed. This foundation is stable enough for PRD 2–5 to extend without rework.

**Scope**: Foundation does not include league creation UI, match predictions, scoring logic, or ranking systems—those are PRD 2–5. Its job is to verify: "Can a user authenticate and is their data safely stored?"

---

## System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Client Browser                            │
│  (Next.js App Router - Login, Dashboard, Auth Flow)        │
└────────┬────────────────────────────────────────────────────┘
         │
         ├─────── GET /api/auth/me ────────┐
         ├──────── POST /api/auth/logout ───┤
         └────── GET /api/health ──────────┤
                                           │
┌─────────────────────────────────────────▼─────────────────────────┐
│                    Next.js Backend (Vercel)                       │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ middleware.ts — Auth validation + JWT refresh (Supabase)    │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ API Routes (/app/api/*)                                     │ │
│  │  ├─ /api/auth/me — Fetch user + league context             │ │
│  │  ├─ /api/auth/logout — Clear session                        │ │
│  │  └─ /api/health — Database connectivity check              │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────┬──────────────────────────────────────────────────────┬─────┘
       │                                                      │
       │  Supabase Auth Helpers                              │
       │  (JWT management, session refresh)                  │
       │                                                      │
┌──────▼───────────────────────────────────────────────────┬──▼──────┐
│             Supabase (PostgreSQL Backend)               │          │
│  ┌────────────────────────────────────────────────────┐ │ Google  │
│  │ Auth (Managed): sessions, JWT tokens, OAuth state │ │ OAuth   │
│  └────────────────────────────────────────────────────┘ │ Provider│
│  ┌────────────────────────────────────────────────────┐ │          │
│  │ Database (7 tables):                               │ │          │
│  │  ├─ users (from Auth)                             │ │          │
│  │  ├─ leagues (with default "Test Bolão")           │ │          │
│  │  ├─ league_members (users + trigger auto-enroll)  │ │          │
│  │  ├─ matches (seed data, mock)                     │ │          │
│  │  ├─ predictions (RLS: user own only)              │ │          │
│  │  ├─ champion_bets (RLS: user own only)            │ │          │
│  │  └─ scores (RLS: user own only)                   │ │          │
│  │ Triggers: on new user auth → auto-enroll in      │ │          │
│  │ league_members (league_id=1)                      │ │          │
│  │ RLS Policies: users cannot query other users' data│ │          │
│  └────────────────────────────────────────────────────┘ │          │
│  ┌────────────────────────────────────────────────────┐ │          │
│  │ Connection Pooling (PgBouncer): manages pooled    │ │          │
│  │ connections for concurrent requests               │ │          │
│  └────────────────────────────────────────────────────┘ │          │
└──────────────────────────────────────────────────────┬──┴──────────┘
                                                       │
                                      Google OAuth Redirect
```

### Key Components

**1. Next.js Application (Client + Server)**
- **Purpose**: Render pages, handle auth flow, expose API routes
- **Tech**: Next.js 13+ App Router, TypeScript, Tailwind CSS
- **Boundaries**: Serves login, dashboard, and API endpoints; delegates auth to Supabase

**2. Supabase Auth (Managed)**
- **Purpose**: Handle Google OAuth, manage sessions, issue JWT tokens
- **Tech**: Supabase Auth (PostgreSQL + OAuth provider integration)
- **Boundaries**: Auth state machine; credentials pre-configured in Supabase project

**3. Supabase Middleware** (`@supabase/auth-helpers-nextjs`)
- **Purpose**: Validate sessions on every request, refresh expired JWTs, initialize Supabase client
- **Tech**: TypeScript middleware in `middleware.ts`
- **Boundaries**: Runs on all routes; enforces authentication for protected pages/API routes

**4. Database** (PostgreSQL via Supabase)
- **Purpose**: Store users, leagues, matches, predictions, scores
- **Tech**: Supabase-managed PostgreSQL with RLS policies and triggers
- **Boundaries**: 7 tables, foreign key constraints, automated user enrollment trigger

**5. API Routes** (`/app/api/*`)
- **Purpose**: Provide RESTful endpoints for frontend to query authenticated user context
- **Tech**: Next.js API routes with structured error responses
- **Boundaries**: Require valid session (enforced by middleware), return JSON

---

## Implementation Design

### Core Interfaces

**1. Supabase Client (Server Component)**
```typescript
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function getSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieStore }
  )
}

// Usage in Server Component:
const supabase = await getSupabaseServerClient()
const { data: { session } } = await supabase.auth.getSession()
```

**2. API Response Envelope (Structured Errors)**
```typescript
type ApiSuccessResponse<T> = {
  status: 'success'
  data: T
  timestamp: string
}

type ApiErrorResponse = {
  status: 'error'
  error: string              // User-facing message
  code: string               // Machine-readable error code
  statusCode: number         // HTTP status code
  timestamp: string
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse
```

**3. Auth User Context** (returned by `/api/auth/me`)
```typescript
interface AuthUser {
  id: string                 // UUID from Supabase Auth
  email: string
  full_name: string | null
  avatar_url: string | null
  avatar_color: string       // Hex color code
  created_at: string         // ISO 8601 timestamp
}

interface LeagueContext {
  id: string                 // UUID
  name: string               // "Test Bolão" in Foundation
  access_type: 'open' | 'private'
  logo_url: string | null
  role: 'member' | 'admin'
}

interface AuthMeResponse {
  user: AuthUser
  league: LeagueContext
}
```

### Data Models

**1. Users Table** (from Supabase Auth)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,                   -- Supabase Auth user ID
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  avatar_color TEXT DEFAULT '#FFC72C',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**2. Leagues Table**
```sql
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  access_type TEXT CHECK (access_type IN ('open', 'private')),
  logo_url TEXT,
  prize_pool TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default league:
INSERT INTO leagues (id, name, access_type, created_by)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Bolão', 'open', NULL);
```

**3. League Members Table** (Join + Roles)
```sql
CREATE TABLE league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, user_id)
);

-- Trigger: Auto-enroll new users in default league (id=1)
CREATE TRIGGER enroll_user_in_default_league
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_enroll_default_league();

CREATE FUNCTION auto_enroll_default_league()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO league_members (league_id, user_id, role)
    VALUES ('00000000-0000-0000-0000-000000000001', NEW.id, 'member');
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;
```

**4. Matches Table** (Seed data)
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  match_date TIMESTAMPTZ NOT NULL,
  phase TEXT CHECK (phase IN ('group', '32nd', '16th', '8th', '4th', 'semi', '3rd_place', 'final')),
  "group" TEXT,                         -- Group code (e.g., 'A', 'B')
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished')),
  home_score INTEGER,
  away_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**5. Predictions Table** (RLS enforced)
```sql
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  predicted_home_score INTEGER,
  predicted_away_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, league_id, match_id)
);

-- RLS: users can only read/write their own
CREATE POLICY user_predictions_rls ON predictions
  FOR ALL USING (auth.uid() = user_id);
```

**6. Champion Bets Table** (RLS enforced)
```sql
CREATE TABLE champion_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  champion_team TEXT NOT NULL,
  runner_up_team TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, league_id)
);

-- RLS: users can only read/write their own
CREATE POLICY user_champion_bets_rls ON champion_bets
  FOR ALL USING (auth.uid() = user_id);
```

**7. Scores Table** (RLS enforced, read-only for user)
```sql
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  points_earned INTEGER NOT NULL,
  breakdown JSONB,                     -- e.g., {"exact_match": 10, "phase_multiplier": 1}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: users can only read their own
CREATE POLICY user_scores_rls ON scores
  FOR SELECT USING (auth.uid() = user_id);
```

### API Endpoints

**1. `GET /api/auth/me`** — Fetch Authenticated User + League Context
```
Method: GET
Path: /api/auth/me
Authentication: Required (session via cookie)

Response: 200 OK
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "avatar_url": null,
      "avatar_color": "#FFC72C",
      "created_at": "2026-05-22T10:00:00Z"
    },
    "league": {
      "id": "00000000-0000-0000-0000-000000000001",
      "name": "Test Bolão",
      "access_type": "open",
      "logo_url": null,
      "role": "member"
    }
  },
  "timestamp": "2026-05-22T10:00:00Z"
}

Error Responses:
- 401 Unauthorized: { status: "error", error: "Sessão expirada", code: "SESSION_EXPIRED", statusCode: 401 }
- 500 Internal Server Error: { status: "error", error: "Erro ao buscar dados do usuário", code: "DATABASE_ERROR", statusCode: 500 }
```

**2. `POST /api/auth/logout`** — Clear Session
```
Method: POST
Path: /api/auth/logout
Authentication: Required

Response: 200 OK
{
  "status": "success",
  "data": { "ok": true },
  "timestamp": "2026-05-22T10:00:00Z"
}

Error Responses:
- 500 Internal Server Error: { status: "error", error: "Erro ao fazer logout", code: "LOGOUT_FAILED", statusCode: 500 }
```

**3. `GET /api/health`** — Database Connectivity Check
```
Method: GET
Path: /api/health
Authentication: Not required

Response: 200 OK
{
  "status": "success",
  "data": {
    "status": "ok",
    "database": "connected"
  },
  "timestamp": "2026-05-22T10:00:00Z"
}

Error Responses:
- 503 Service Unavailable: { status: "error", error: "Banco de dados indisponível", code: "DATABASE_UNAVAILABLE", statusCode: 503 }
```

---

## Integration Points

### Google OAuth via Supabase Auth

**Service**: Google Cloud OAuth 2.0 (managed by Supabase)
**Purpose**: User authentication and identity provider

**Flow**:
1. Frontend redirects user to `/auth/authorize` (Supabase-managed endpoint)
2. User is redirected to Google consent screen
3. User approves; Google redirects back to `https://bolao-copa.vercel.app/auth/callback?code=...`
4. Supabase Auth Handler exchanges code for session token (JWT)
5. Session stored as HTTP-only cookie in browser
6. Middleware validates cookie on subsequent requests

**Credentials**: Pre-configured in Supabase project (Google OAuth Client ID and Secret). Environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public key for browser-side Supabase client
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side secret (for admin operations, if needed)

**Error Handling**:
- If Google OAuth fails: Supabase returns error; frontend displays "Erro ao fazer login com Google. Tente novamente."
- If session expires: Middleware attempts JWT refresh; if unsuccessful, user is redirected to login
- If database is unreachable during session validation: Return 503 error

**Retry Strategy**:
- Session refresh is automatic (no manual retry needed)
- Failed auth redirects user to login page; user retries by clicking "Sign in with Google" again

---

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|---------------------|-----------------|
| **Project Root** | new | Create Next.js 13+ App Router project structure with TypeScript + Tailwind CSS. Low risk; standard setup. | Initialize with `npx create-next-app@latest` + configure `tsconfig.json`, `tailwind.config.ts` |
| **Middleware** | new | Add `middleware.ts` for Supabase Auth Helpers session management. Medium risk; auth is security-critical. | Test JWT refresh with expired tokens; verify Supabase cookie names match |
| **API Routes** | new | Create `/app/api/auth/me`, `/app/api/auth/logout`, `/app/api/health`. Low risk; simple query/delete operations. | Add comprehensive error handling; test all error codes |
| **Supabase Project** | new | Configure Supabase Auth, enable Google OAuth, create 7 tables, add RLS policies, create triggers. Medium risk; complex schema; RLS misconfiguration could leak data. | Run Supabase RLS test tool on all policies; verify isolation in integration tests |
| **Database Migrations** | new | Create Supabase CLI migrations for all schema. Low risk; migrations are reversible. | Test rollback of each migration; verify idempotency |
| **Frontend Pages** | new | Create `/app/login` (minimal) and `/app/dashboard` (post-auth). Low risk; Foundation UI is minimal. | Add error boundaries; test unauthenticated access to /dashboard (should redirect to /login) |
| **Environment Variables** | new | Add Supabase keys to `.env.local` and Vercel project. Medium risk; credentials must be kept secret. | Document in `CLAUDE.md`; use Vercel Secrets Manager; rotate keys if exposed |
| **CI/CD Pipeline** | new | Add GitHub Actions for linting, type-checking, testing, deploying to Vercel. Low risk; standard CI setup. | Ensure migrations run during Vercel deploy; monitor build logs |
| **Documentation** | new | Write README, API docs, deployment guide, schema diagram. Low risk; documentation debt is manageable. | Use Mermaid diagrams for schema; link to Supabase docs |

---

## Testing Approach

### Unit Tests

**Components to test**:
- Utility functions (error formatting, response envelopes)
- Supabase client initialization
- Environment variable validation

**Example**:
```typescript
// tests/unit/api-responses.test.ts
describe('ApiResponse', () => {
  it('should format success response', () => {
    const response = formatSuccess({ data: 'test' })
    expect(response.status).toBe('success')
    expect(response.timestamp).toBeDefined()
  })

  it('should format error response with code', () => {
    const response = formatError('SESSION_EXPIRED', 'Sessão expirada', 401)
    expect(response.status).toBe('error')
    expect(response.code).toBe('SESSION_EXPIRED')
    expect(response.statusCode).toBe(401)
  })
})
```

### Integration Tests

**Test scenarios**:

1. **Happy path**: User authenticates → auto-enrolled in default league → `/api/auth/me` returns user + league
   ```typescript
   // tests/integration/auth.test.ts
   it('should authenticate user and return user + league context', async () => {
     const session = await authenticateTestUser()
     const response = await fetch('/api/auth/me', { headers: { cookie: session } })
     expect(response.status).toBe(200)
     const data = await response.json()
     expect(data.data.user.email).toBeDefined()
     expect(data.data.league.id).toBe('00000000-0000-0000-0000-000000000001')
   })
   ```

2. **Session validation**: Verify unauthenticated requests are rejected
   ```typescript
   it('should reject unauthenticated requests to /api/auth/me', async () => {
     const response = await fetch('/api/auth/me')
     expect(response.status).toBe(401)
   })
   ```

3. **RLS enforcement**: Verify user A cannot read user B's predictions
   ```typescript
   it('should enforce RLS on predictions table', async () => {
     const userA = await createTestUser('a@example.com')
     const userB = await createTestUser('b@example.com')
     const predictionB = await createPrediction(userB.id, matchId, 2, 1)
     
     const result = await supabase
       .from('predictions')
       .select('*')
       .eq('id', predictionB.id)
       .withAuth(userA.session)  // Query as userA
     
     expect(result.data).toEqual([])  // RLS blocks access
   })
   ```

4. **Error handling**: API gracefully handles database errors
   ```typescript
   it('should return 503 if database is unavailable', async () => {
     // Mock database connection failure
     const response = await fetch('/api/health')
     expect(response.status).toBe(503)
     const data = await response.json()
     expect(data.code).toBe('DATABASE_UNAVAILABLE')
   })
   ```

**Test data setup**:
- Create test Supabase project (separate from production)
- Seed default league before each test run
- Use factories for creating test users, matches, predictions

**Environment**: Tests run locally against `supabase start` (local Supabase stack) and in CI against staging Supabase project

---

## Development Sequencing

### Build Order

This build order respects dependencies and enables parallel work where possible.

1. **Setup: Next.js Project + Environment**
   - Initialize Next.js 13+ App Router with TypeScript, Tailwind CSS
   - Create `.env.local` with Supabase credentials
   - Install dependencies: `next`, `@supabase/auth-helpers-nextjs`, `@supabase/supabase-js`
   - No dependencies; can start immediately

2. **Supabase Project Configuration**
   - Enable Google OAuth in Supabase Auth settings
   - Configure redirect URLs (local: `http://localhost:3000/**`, production: `https://bolao-copa.vercel.app/**`)
   - Enable connection pooling (PgBouncer)
   - Enable RLS on all tables (global setting)
   - Depends on step 1 (credentials available)

3. **Database Migrations (7 tables + RLS + triggers)**
   - Create Supabase CLI migration files:
     - `20260522000001_create_users.sql` — users table (from Auth)
     - `20260522000002_create_leagues.sql` — leagues + seed default league
     - `20260522000003_create_league_members.sql` — league_members + trigger
     - `20260522000004_create_matches.sql` — matches (seed mock data)
     - `20260522000005_create_predictions.sql` — predictions table
     - `20260522000006_create_champion_bets.sql` — champion_bets table
     - `20260522000007_create_scores.sql` — scores table
     - `20260522000008_rls_policies.sql` — all RLS policies
   - Apply locally: `supabase db push`
   - Depends on step 2 (Supabase project exists)

4. **Middleware + Auth Setup**
   - Create `middleware.ts` with Supabase Auth Helpers
   - Configure session cookie handling
   - Set up JWT refresh logic
   - Test locally: `npm run dev` → check browser DevTools for HTTP-only cookie
   - Depends on step 1 (Next.js project) and step 2 (Supabase Auth configured)

5. **API Routes**
   - Create `/app/api/auth/me` — query user + league from database
   - Create `/app/api/auth/logout` — clear session via Supabase Auth
   - Create `/app/api/health` — check database connectivity
   - Add structured error response formatting
   - Depends on step 4 (middleware) and step 3 (database schema exists)

6. **Frontend Pages + Auth Flow**
   - Create `/app/login` — minimal page with "Sign in with Google" button (use Supabase Auth UI or custom)
   - Create `/app/dashboard/layout.tsx` — check session, redirect to login if unauthenticated
   - Create `/app/dashboard/page.tsx` — fetch `/api/auth/me`, display user + league
   - Add logout button on dashboard
   - Depends on step 5 (API routes exist)

7. **Integration Tests**
   - Write comprehensive tests covering happy path, error cases, RLS enforcement
   - Use test fixtures for Supabase (local dev environment)
   - Depends on steps 3–6 (all components exist)

8. **Documentation + Deployment**
   - Write README with setup instructions, environment variables, migration steps
   - Create API documentation (endpoints, error codes)
   - Create schema diagram (Mermaid or similar)
   - Set up GitHub Actions CI/CD pipeline
   - Configure Vercel with environment variables
   - Depends on steps 1–7 (all components implemented)

### Technical Dependencies

**Blocking dependencies**:
1. **Supabase project** must be created and Google OAuth credentials configured before steps 2–4 can proceed
2. **Database schema** must exist before API routes can query tables (step 5 depends on step 3)
3. **Middleware** must be functional before API routes can rely on auth validation (step 5 depends on step 4)
4. **API routes** must exist before frontend can fetch data (step 6 depends on step 5)

**Optional parallelization**:
- Step 4 (middleware) and step 3 (migrations) can progress in parallel if both teams have Supabase project access
- Step 7 (tests) can start once step 3 (schema) is complete; doesn't need to wait for step 6 (UI)

---

## Monitoring and Observability

### Key Metrics

**Application-level**:
- **Login success rate**: % of auth attempts that succeed (target: 100%)
- **Session validity**: % of requests with valid session token (target: >99%)
- **API latency**: `/api/auth/me` response time (target: <500ms p95)
- **Database query time**: Average time to fetch user + league (target: <100ms)

**Infrastructure-level**:
- **Vercel deployment frequency**: How often code is deployed (target: on every merge)
- **Vercel build success rate**: % of builds that complete successfully (target: >99%)
- **Database connection pool utilization**: Current vs. max connections (target: <80% utilization)

### Logging

**Structured logging format** (JSON):
```json
{
  "timestamp": "2026-05-22T10:00:00Z",
  "level": "info",
  "service": "api",
  "endpoint": "/api/auth/me",
  "user_id": "uuid",
  "duration_ms": 45,
  "status_code": 200,
  "error": null
}
```

**Log events**:
- `auth_login_success` — User authenticated successfully
- `auth_login_failure` — Google OAuth or session creation failed (log reason: invalid credentials, database error, etc.)
- `auth_session_expired` — User's JWT token expired
- `auth_logout_success` — User logged out
- `api_error` — API endpoint returned error (log endpoint, error code, status code)
- `rls_violation_attempted` — User tried to access data they don't own (RLS policy blocked); treat as security event
- `database_error` — Query failed (log error message, query type)

**Log destinations**:
- Local development: console output via `console.log()` (structured JSON)
- Vercel staging/production: Vercel logs (accessible via Vercel dashboard) + optionally Datadog/New Relic

### Alerting

**Thresholds** (production only):
- **Login success rate < 95%**: Alert (potential auth service outage)
- **API latency > 1000ms p95**: Alert (database or Vercel issue)
- **Database connection pool > 90%**: Alert (scaling issue, need more connections)
- **RLS violation attempts > 10 in 1 hour**: Alert (potential security incident, review logs)

**Escalation**: Alert → Slack channel (#bolao-alerts) → on-call developer

---

## Technical Considerations

### Key Decisions

**1. Next.js App Router vs. Pages Router** [[ADR-002]]
- **Decision**: Use App Router
- **Rationale**: Modern, built for Server Components, native Supabase middleware integration, future-proof
- **Trade-off**: Slightly steeper learning curve; some third-party packages may lag in support
- **Alternatives rejected**: Pages Router (in maintenance mode, more legacy)

**2. Supabase Auth Helpers + Middleware** [[ADR-003]]
- **Decision**: Use official Supabase Auth Helpers package for session management
- **Rationale**: Battle-tested, secure by default (HTTP-only cookies), zero custom auth code
- **Trade-off**: Dependency on third-party package; less flexibility for custom auth logic
- **Alternatives rejected**: Custom middleware (more code, more bugs), client-side auth (security risk)

**3. Supabase CLI Migrations** [[ADR-004]]
- **Decision**: Version control database schema with Supabase CLI migrations
- **Rationale**: Auditable, reversible, reproducible across environments
- **Trade-off**: Must write SQL DDL; no ORM abstraction
- **Alternatives rejected**: Manual Supabase Studio (no audit trail), ORM migrations (premature abstraction)

**4. Bootstrapped Default League** [[ADR-001]]
- **Decision**: Auto-enroll new users in a hardcoded "Test Bolão" league via SQL trigger
- **Rationale**: Enables end-to-end testing of auth + database in Foundation; unblocks PRD 2
- **Trade-off**: Temporary data must be cleaned up before PRD 2 production rollout
- **Alternatives rejected**: No default league (can't test end-to-end), manual seed data (friction)

**5. Structured Error Responses**
- **Decision**: All API errors return JSON envelope with `code` + `statusCode` + user-facing `error` message
- **Rationale**: Consistent error handling across all endpoints; easier client-side error parsing
- **Trade-off**: All responses must follow the envelope pattern (slight verbosity)
- **Alternatives rejected**: HTTP status codes only (less informative), exception middleware (more setup)

**6. Comprehensive Integration Tests**
- **Decision**: Test happy path + error cases + RLS enforcement
- **Rationale**: Catches bugs early; RLS is security-critical and must be verified
- **Trade-off**: More test code to maintain; slower test suite
- **Alternatives rejected**: Happy path only (insufficient coverage), manual testing (unreliable)

### Known Risks

**1. Google OAuth Credential Misconfiguration**
- **Risk**: If credentials are wrong, users cannot log in; Foundation fails
- **Likelihood**: Medium (credentials pre-configured, but human error possible)
- **Mitigation**: 
  - Verify credentials in Supabase dashboard before implementation starts
  - Test auth flow locally with multiple Google test accounts
  - Document exact credential setup steps in README
  - Add `/api/health` endpoint to monitor integration

**2. Supabase Connection Pooling Exhausted**
- **Risk**: If connection pool is too small, concurrent users experience "too many connections" errors
- **Likelihood**: Low (pooling is enabled by default; unlikely to hit limit in Foundation)
- **Mitigation**:
  - Monitor connection pool utilization in Vercel logs
  - Increase `max_connections` in Supabase project settings if needed
  - Load-test locally with k6 or similar tool before deploy

**3. RLS Policies Too Permissive**
- **Risk**: Users could query other users' predictions/scores; data leakage
- **Likelihood**: Medium (RLS is complex; easy to get policy syntax wrong)
- **Mitigation**:
  - Use Supabase RLS test tool to verify each policy
  - Write integration tests that verify user A cannot read user B's data
  - Have security review of RLS policies before production deploy

**4. Database Migration Fails on Deploy**
- **Risk**: If migration is invalid, Vercel deploy fails; service is down
- **Likelihood**: Low (migrations tested locally before deploy)
- **Mitigation**:
  - Test every migration locally with `supabase db push`
  - Use reversible migrations (include both UP and DOWN logic)
  - Keep migration history in git; can always revert
  - Monitor Vercel build logs for migration errors

**5. Session Management Broken**
- **Risk**: User is authenticated but cannot fetch data due to middleware/cookie misconfiguration
- **Likelihood**: Low (Supabase Auth Helpers is well-tested)
- **Mitigation**:
  - Verify HTTP-only cookie is set correctly (check DevTools Cookies tab)
  - Test session refresh after token expiry (wait 1 hour, simulate time jump in tests)
  - Test on staging before production deploy

**6. Test Users Remain After Foundation**
- **Risk**: Test Bolão league interferes with real leagues in PRD 2
- **Likelihood**: Low (can be cleaned up manually)
- **Mitigation**:
  - Document cleanup plan in PRD 2 handoff
  - Mark Test Bolão as read-only or archived before PRD 2 production rollout
  - Add assertion in PRD 2: `assert(leagues.find(l => l.id === 1).archived === true)`

---

## Architecture Decision Records

- [ADR-001: Bootstrapped Default League for Foundation](adrs/adr-001.md) — New users are automatically enrolled in a hardcoded "Test Bolão" league during migrations to enable end-to-end testing without requiring league creation logic (PRD 2).
- [ADR-002: Next.js App Router para Foundation](adrs/adr-002.md) — Use Next.js 13+ App Router with Server Components and built-in middleware for modern, maintainable architecture aligned with Supabase Auth Helpers.
- [ADR-003: Supabase Auth Helpers + Middleware para Autenticação](adrs/adr-003.md) — Use official Supabase Auth Helpers package for secure, battle-tested session management with HTTP-only cookies and automatic JWT refresh.
- [ADR-004: Supabase CLI Migrations para Versionamento de Banco de Dados](adrs/adr-004.md) — Version control database schema with Supabase CLI migrations for auditability, reversibility, and reproducibility across environments.
