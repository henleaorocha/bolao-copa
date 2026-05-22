---
status: completed
title: Write integration and unit tests covering happy path, error cases, and RLS enforcement
type: test
complexity: high
dependencies:
  - task_03
  - task_05
  - task_06
---

# Write integration and unit tests covering happy path, error cases, and RLS enforcement

## Overview

Build a comprehensive test suite covering unit tests for utilities, integration tests for the complete auth flow, RLS policy enforcement, API error handling, and database integrity. Tests run locally against `supabase start` (local Supabase instance) and in CI against a test Supabase project. This is critical for validating security (RLS) and catching regressions as PRDs extend the codebase.

<critical>
Read the **TechSpec "Testing Approach"** section for test scenarios and patterns. RLS policy tests are SECURITY-CRITICAL—verify that user A cannot read user B's data. All tests must be reproducible; use test fixtures and factory functions. Do NOT mock Supabase—use a real local instance (`supabase start`) and seed data. Tests must cover: happy path (auth → dashboard → logout), session validation, RLS isolation, API error codes, and database constraints. Read PRD "Success Metrics" for test coverage targets (all 7 tables, 0 constraint violations).
</critical>

<requirements>

1. MUST set up test infrastructure:
   - Use **Jest** or **Vitest** for unit tests (recommended: Vitest for Next.js)
   - Use **Supertest** or **node-fetch** for API integration tests
   - Use **@testing-library/react** for component/page rendering tests (optional for Foundation)
   - Configure test environment to connect to local Supabase (`supabase start`)
   - Create test fixtures: factories for creating test users, matches, predictions

2. MUST write unit tests (target: 80% de cobertura de **linhas** — `--coverage --coverage-reporter=lcov`):
   - `tests/unit/api-responses.test.ts`: Test response envelope helpers
   - `tests/unit/supabase-client.test.ts`: Test Supabase client initialization
   - `tests/unit/validation.test.ts`: Test input validation helpers (if created)
   - **Escopo do 80%**: Aplica-se aos arquivos em `lib/` e `app/api/`. Páginas UI (app/login, app/dashboard) são excluídas da meta de coverage; cobertas pelos integration tests.

3. MUST write integration tests for auth flow:
   - Happy path: Criar usuário via API do Supabase Auth (modo test) → verificar auto-enroll no league_members → verificar `/api/auth/me` retorna user + league
   - **NOTA**: O fluxo completo do Google OAuth não pode ser testado automaticamente (requer interação com UI do Google). Usar o SDK Admin do Supabase para criar usuários de teste programaticamente.
   - Session validation: Verify authenticated requests include valid session; unauthenticated requests são rejeitados com JSON 401 (não redirect)
   - Logout: Verify session is cleared after `POST /api/auth/logout`
   - Callback route: Verify `GET /auth/callback` sem `code` redireciona para `/login?error=auth_callback_failed`

4. MUST write integration tests for RLS enforcement (SECURITY-CRITICAL):
   - User A cannot read user B's predictions (verify via direct Supabase query as user A)
   - User A cannot read user B's champion bets
   - User A cannot read user B's scores
   - User A can read their own data
   - Test all three tables: `predictions`, `champion_bets`, `scores`

5. MUST write integration tests for API error handling:
   - `GET /api/auth/me` with no session → 401 SESSION_EXPIRED
   - `GET /api/auth/me` with expired session → 401 SESSION_EXPIRED (middleware refreshes; if fails, 401)
   - `GET /api/auth/me` with database unavailable → 500 DATABASE_ERROR
   - `GET /api/health` → 200 (always accessible)
   - `GET /api/health` with database unavailable → 503 DATABASE_UNAVAILABLE
   - All error responses include `code`, `error` (PT-BR), `statusCode`, `timestamp`

6. MUST write integration tests for database constraints:
   - Foreign key violation: Insert prediction with invalid match_id → fails
   - Unique constraint: Insert two predictions for same (user, league, match) → second fails
   - Trigger: Create new user via Supabase Auth → auto-enrolled in league_members

7. MUST write integration tests for page rendering:
   - `/login` page renders "Sign in with Google" button
   - `/dashboard` fetches `/api/auth/me` and displays user + league data
   - Unauthenticated access to `/dashboard` redirects to `/login`

8. SHOULD include test data factories:
   - `createTestUser(email)`: Create user via Supabase Auth
   - `createTestMatch(homeTeam, awayTeam, matchDate)`: Insert match
   - `createTestPrediction(userId, leagueId, matchId, scores)`: Insert prediction
   - All factories clean up after tests (delete created records)

9. SHOULD include performance benchmarks:
   - `/api/auth/me` should respond in < 500ms (benchmark p50, p95)
   - Middleware session validation should add < 50ms latency

</requirements>

## Subtasks

- [ ] Initialize test framework: Install Jest/Vitest, @testing-library/react, Supertest
- [ ] Configure test environment:
  - [ ] Set up `jest.config.js` or `vitest.config.ts`
  - [ ] Configure environment to connect to local Supabase (`supabase start`)
  - [ ] Create test database seed script (`scripts/seed-test-db.sql`)
  - [ ] Create test fixtures/factories in `tests/fixtures/`
- [ ] Write unit tests:
  - [ ] `tests/unit/api-responses.test.ts` — `formatSuccess()`, `formatError()`
  - [ ] `tests/unit/supabase-client.test.ts` — Client initialization
  - [ ] Achieve 80% code coverage
- [ ] Write integration tests for auth flow:
  - [ ] `tests/integration/auth.test.ts` — Happy path, session validation, logout
  - [ ] Test OAuth redirect (if mockable)
  - [ ] Test error cases (invalid credentials, database failure)
- [ ] Write integration tests for RLS:
  - [ ] `tests/integration/rls.test.ts` — User A cannot read user B's data
  - [ ] Test all three tables: predictions, champion_bets, scores
  - [ ] Verify foreign key constraints
- [ ] Write integration tests for API error handling:
  - [ ] `tests/integration/api-errors.test.ts` — 401, 500, 503 responses
  - [ ] Verify error response envelope (code, error, statusCode, timestamp)
  - [ ] Test all three endpoints: `/api/auth/me`, `/api/auth/logout`, `/api/health`
- [ ] Write integration tests for database constraints:
  - [ ] `tests/integration/database.test.ts` — FK, unique, trigger
  - [ ] Test auto-enrollment trigger
  - [ ] Test constraint violations return proper errors
- [ ] Write integration tests for page rendering:
  - [ ] `tests/integration/pages.test.ts` — Login, dashboard rendering
  - [ ] Test redirect logic
- [ ] Run all tests: `npm run test`
  - [ ] All tests pass
  - [ ] Coverage report shows ≥ 80% overall
  - [ ] RLS tests all pass (security validation)
- [ ] Add test scripts to `package.json`:
  - [ ] `npm run test` — Run all tests
  - [ ] `npm run test:watch` — Run tests in watch mode
  - [ ] `npm run test:coverage` — Run tests with coverage report

## Implementation Details

**Files to create**:
- `tests/unit/api-responses.test.ts` — Response helpers
- `tests/unit/supabase-client.test.ts` — Supabase client
- `tests/integration/auth.test.ts` — Auth flow
- `tests/integration/rls.test.ts` — RLS enforcement
- `tests/integration/api-errors.test.ts` — API error handling
- `tests/integration/database.test.ts` — DB constraints
- `tests/integration/pages.test.ts` — Page rendering
- `tests/fixtures/factories.ts` — Test user/data factories
- `jest.config.js` or `vitest.config.ts` — Test config
- `scripts/seed-test-db.sql` — Test data seeding

**Test data setup**:
- Create separate Supabase project for testing (or use `supabase start` for local dev)
- Seed test database with:
  - Two test users (A and B) with different emails
  - Default league (Test Bolão)
  - 3-5 mock matches
  - Test predictions for each user
- Clean up (delete test records) after each test

**Integration points**:
- Tests run against real Supabase instance (local or staging)
- Tests validate middleware, API routes, pages, database
- CI/CD (task_08) runs tests on every PR

**Reference TechSpec sections**:
- **"Testing Approach"**: Unit vs. integration tests, RLS test examples, test environment setup
- **"Success Metrics"**: Test coverage targets (80%+)

### Relevant Files

- `tests/` directory (created here) — All test files
- `jest.config.js` or `vitest.config.ts` (created here) — Test framework config
- `package.json` — Test scripts (modified)
- `/app/api/auth/*.ts` (task_05) — API routes being tested
- `/app/login/page.tsx`, `/app/dashboard/page.tsx` (task_06) — Pages being tested
- Database migrations (task_03) — Schema being tested

### Dependent Files

- GitHub Actions workflow (task_08) — Runs tests on every PR
- Documentation (task_08) — May reference test results

### Related ADRs

- [[ADR-004]]: Migrations create schema; tests validate it

## Deliverables

1. **Test infrastructure**: Jest/Vitest config, test environment setup, factories
2. **Unit tests**: 80%+ code coverage for response helpers, Supabase client
3. **Integration tests**: Auth flow, RLS enforcement, API error handling, database constraints
4. **Page rendering tests**: Login and dashboard pages render and interact correctly
5. **Test data factories**: Reusable functions for creating test users, matches, predictions
6. **Coverage report**: Generated by test runner; included in PR checks
7. **Test scripts**: `npm run test`, `npm run test:watch`, `npm run test:coverage`

## Tests

### Unit Tests (80% coverage target)
- ✅ `formatSuccess()` returns envelope with status='success', timestamp, data
- ✅ `formatError()` returns envelope with status='error', code, statusCode, timestamp, error
- ✅ Supabase client is initialized with correct environment variables
- ✅ Supabase client helper is exported and importable

### Integration Tests
- ✅ Happy path: Create test user → Auth succeeds → User auto-enrolled in league → `/api/auth/me` returns user + league (all fields correct)
- ✅ Session validation: Authenticated request includes valid session; unauthenticated request is rejected
- ✅ Logout: Call `POST /api/auth/logout` → session is cleared → subsequent requests fail with 401
- ✅ RLS enforcement: User A creates prediction → User B queries predictions → returns empty (RLS blocks access)
- ✅ RLS enforcement: User A queries own predictions → returns correct data
- ✅ RLS enforcement: Apply to all three tables (predictions, champion_bets, scores)
- ✅ API error: `/api/auth/me` without session → 401 SESSION_EXPIRED
- ✅ API error: `/api/auth/me` with database error → 500 DATABASE_ERROR
- ✅ API error: `/api/health` → 200 (or 503 if DB unavailable)
- ✅ Database constraint: Insert prediction with invalid match_id → fails (FK constraint)
- ✅ Database constraint: Insert duplicate prediction for (user, league, match) → fails (unique constraint)
- ✅ Trigger: Create new user via Auth → appears in `league_members` with league_id=1
- ✅ Page rendering: `/login` renders "Sign in with Google" button
- ✅ Page rendering: `/dashboard` fetches data and displays user + league context
- ✅ Page redirect: Unauthenticated access to `/dashboard` redirects to `/login`
- ✅ Performance: `/api/auth/me` < 500ms p95
- ✅ Performance: Middleware adds < 50ms latency

## Success Criteria

- ✅ All unit tests pass (`npm run test`)
- ✅ All integration tests pass
- ✅ Test coverage ≥ 80% de linhas em `lib/` e `app/api/` (relatório lcov gerado pelo test runner)
- ✅ RLS policies enforced: User A cannot read user B's predictions/champion_bets/scores
- ✅ API error responses include correct error codes and status codes
- ✅ Database constraints are enforced (FK, unique violations fail)
- ✅ Auto-enrollment trigger works (new users auto-enrolled)
- ✅ Page rendering tests verify login and dashboard work
- ✅ Performance benchmarks show `/api/auth/me` < 500ms p95
- ✅ Test fixtures are reusable and clean up properly
- ✅ CI test run (task_08) passes on every commit
- ✅ Coverage report is generated and accessible (part of CI/CD)
