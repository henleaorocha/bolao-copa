# PRD 1: Foundation — Bolão da Copa 2026

## Overview

**Bolão da Copa 2026** is a web platform for World Cup betting pools (bolões) where users create leagues, make predictions on match outcomes and tournament winners, and compete on ranking leaderboards.

**Foundation** is the infrastructure phase: establish user authentication (Google SSO), create the database schema, and verify end-to-end integration. This phase does not include league creation UI, prediction mechanics, or scoring—those come in PRD 2–5. Foundation's job is to answer: "Can a user log in, and is their data safely stored?"

**Problem it solves**: Teams need a working backend and database before building league management, prediction logic, and ranking systems. Without Foundation, all downstream PRDs are at risk of architectural debt or late-stage integration failures.

**Who it is for**: 
- End users: Any World Cup fan who wants to join bolões and compete (eventual)
- Initial: Internal testers and the development team verifying the stack works

**Why it is valuable**: 
- Unblocks PRD 2–5; reduces scope creep later
- Validates Supabase + Next.js integration; catches auth/database misconfigurations early
- Establishes data model contracts that all PRDs depend on

---

## Goals

1. **User authentication works end-to-end**: A user can authenticate with Google and their identity is persisted in Supabase.
2. **Database schema is complete and consistent**: All required tables (users, leagues, league_members, matches, predictions, champion_bets, scores) exist with correct relationships and constraints.
3. **Backend API is functional**: Users can query their profile and league assignment via `GET /api/me` or equivalent; the API respects authentication and returns correct data.
4. **Stack is deployable**: Code runs locally and on Vercel; Supabase connection pooling is enabled and functional.
5. **Test coverage is sufficient**: A new tester can verify the entire stack with one happy-path test: authenticate → get user data → see league assignment.

**Timeline**: Foundation is the first phase; no subsequent PRDs proceed until Foundation is complete and tested.

---

## User Stories

### Primary Persona: End User (World Cup Participant)

- As a World Cup fan, I want to log in with my Google account so that I don't have to remember another password.
- As a logged-in user, I want to see my profile data (email, display name, avatar) so that I know the system knows who I am.
- As a new user, I want to be automatically enrolled in a default league so that I have a starting point to explore the app (even if I leave it later).

### Secondary Persona: QA / Tester

- As a tester, I want to authenticate as different users (via multiple Google accounts) so that I can verify multi-user scenarios locally and on staging.
- As a tester, I want to inspect the Supabase database directly and confirm all tables are populated correctly so that I can catch data integrity issues early.

### Secondary Persona: Developer (Future PRD authors)

- As a PRD 2–5 implementer, I want a stable database schema with clear relationships (foreign keys, RLS policies) so that I don't have to refactor the data model mid-development.
- As an API consumer (frontend), I want `GET /api/me` to return all user + league context so that I can bootstrap the app without multiple requests.

---

## Core Features

### 1. Google OAuth Authentication (SSO)

**What it does**: Users click "Sign in with Google," are redirected to Google's OAuth consent screen, and return authenticated to the app. The system creates a user record in Supabase and maintains a session.

**Why important**: OAuth eliminates password management burden and aligns with modern SaaS patterns. Supabase Auth handles the complexity (PKCE, session storage) out-of-the-box.

**Functional requirements**:
- Google OAuth client ID and secret are pre-configured in Supabase (credential already provided by customer)
- Login button is the primary entry point; unauthenticated users are redirected to login page
- After successful authentication, user is redirected to dashboard (minimal: `/dashboard` or `/api/me` verification page)
- Session persists across page reloads (via HTTP-only cookies managed by Supabase middleware)
- Logout clears the session and redirects to login page

**Data model**:
- `users` table with: `id` (UUID), `email`, `user_metadata` (display name, avatar), `created_at`
- All user data comes from Supabase Auth; no custom user creation flow in Foundation

---

### 2. Database Schema (7 Tables)

**What it does**: Establishes the complete data model for World Cup bolões, with users, leagues, matches, predictions, and scoring.

**Why important**: All downstream logic (PRD 2–5) depends on this schema. Early design prevents painful refactoring.

**Tables and relationships**:

#### `users`
- `id` (UUID, PK): Supabase Auth user ID
- `email` (text, unique)
- `full_name` (text, nullable): display name
- `avatar_url` (text, nullable): profile picture URL
- `avatar_color` (text, default `#FFC72C`): selected color for avatar background
- `created_at` (timestamptz, default now())
- Constraints: PK, UNIQUE(email)

#### `leagues`
- `id` (UUID, PK): unique league identifier
- `name` (text): league display name (e.g., "Test Bolão")
- `description` (text, nullable)
- `access_type` (enum: 'open' | 'private')
- `logo_url` (text, nullable): league logo/badge
- `prize_pool` (text, nullable): description of prize (e.g., "Bragging rights")
- `created_by` (UUID, FK → users.id, nullable): creator user ID
- `created_at` (timestamptz, default now())
- Constraints: PK; FK created_by → users(id)
- **Seed data**: One hardcoded league with id=1 (or UUID equivalent), name="Test Bolão", access_type='open'

#### `league_members`
- `id` (UUID, PK)
- `league_id` (UUID, FK → leagues.id)
- `user_id` (UUID, FK → users.id)
- `joined_at` (timestamptz, default now())
- `role` (enum: 'member' | 'admin', default 'member')
- Constraints: PK; FK league_id → leagues(id); FK user_id → users(id); UNIQUE(league_id, user_id)
- **Trigger**: When a new user is created (in Supabase Auth), automatically insert a row into `league_members` (league_id=1, role='member')

#### `matches`
- `id` (UUID, PK)
- `home_team` (text): team name or code (e.g., "BRA", "ARG")
- `away_team` (text)
- `match_date` (timestamptz): scheduled kick-off time
- `phase` (enum: 'group' | '32nd' | '16th' | '8th' | '4th' | 'semi' | '3rd_place' | 'final')
- `group` (text, nullable): group code if phase='group' (e.g., "A", "B")
- `status` (enum: 'scheduled' | 'live' | 'finished', default 'scheduled')
- `home_score` (integer, nullable): final score if status='finished'
- `away_score` (integer, nullable)
- `created_at` (timestamptz, default now())
- Constraints: PK
- **Note**: Filled with mock data in Foundation; replaced by API-Football data in PRD 3

#### `predictions`
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id)
- `league_id` (UUID, FK → leagues.id)
- `match_id` (UUID, FK → matches.id)
- `predicted_home_score` (integer, nullable): user's prediction for home team score
- `predicted_away_score` (integer, nullable): user's prediction for away team score
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- Constraints: PK; FK user_id → users(id); FK league_id → leagues(id); FK match_id → matches(id); UNIQUE(user_id, league_id, match_id)
- **RLS Policy**: Users can only read/write their own predictions

#### `champion_bets`
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id)
- `league_id` (UUID, FK → leagues.id)
- `champion_team` (text): predicted tournament winner (team code)
- `runner_up_team` (text, nullable): predicted runner-up (team code)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- Constraints: PK; FK user_id → users(id); FK league_id → leagues(id); UNIQUE(user_id, league_id)
- **RLS Policy**: Users can only read/write their own champion bets

#### `scores`
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id)
- `league_id` (UUID, FK → leagues.id)
- `match_id` (UUID, FK → matches.id, nullable): which match this score came from (NULL if from champion bet)
- `points_earned` (integer): total points from this prediction/bet
- `breakdown` (jsonb, nullable): details (e.g., `{exact_match: 10, phase_multiplier: 1}`)
- `created_at` (timestamptz)
- Constraints: PK; FK user_id → users(id); FK league_id → leagues(id); FK match_id → matches(id)
- **RLS Policy**: Users can only read their own scores

---

### 3. Backend API (Minimal)

**What it does**: Provides authenticated endpoints for frontend to query user + league context.

**Why important**: Frontend can't fetch from Supabase client directly in all cases; API provides a trusted layer and response normalization.

**Endpoints**:

#### `GET /api/auth/me`
- **Requires auth**: Yes (Supabase session)
- **Returns**: 
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "avatar_url": "https://...",
      "avatar_color": "#FFC72C"
    },
    "league": {
      "id": "uuid",
      "name": "Test Bolão",
      "access_type": "open",
      "logo_url": null,
      "role": "member"
    }
  }
  ```
- **Purpose**: Single endpoint to bootstrap the app; avoids N+1 queries

#### `POST /api/auth/logout`
- **Requires auth**: Yes
- **Returns**: `{ "ok": true }`
- **Purpose**: Clears Supabase session

#### `GET /api/health`
- **Requires auth**: No
- **Returns**: `{ "status": "ok", "database": "connected" }`
- **Purpose**: Deploy verification; confirms database is reachable

---

### 4. Supabase Configuration

**What it does**: Configures Supabase project with auth, RLS policies, and connection pooling.

**Why important**: Supabase is the source of truth for auth and data; misconfiguration breaks everything downstream.

**Configuration**:
- **Auth providers**: Google OAuth enabled (credentials already provided)
- **Auth settings**: 
  - Redirect URLs: `http://localhost:3000/**` (local dev), `https://bolao-copa.vercel.app/**` (staging)
  - PKCE enabled for security
  - Session timeout: 7 days (default Supabase)
- **Connection pooling**: Enabled (PgBouncer) for scalability
- **RLS (Row-Level Security)**: Enabled globally
  - Each user can only read/write their own data (predictions, scores, champion bets)
  - Leagues are readable by all league members
  - Public leagues are readable by anyone (permission for PRD 2)

---

## User Experience

### Key Personas and Their Goals

| Persona | Goal | Primary Flow |
|---------|------|--------------|
| **End User (World Cup Fan)** | Join bolões and compete | Login → Auto-enroll in Test Bolão → See dashboard (empty) → Wait for PRD 2 |
| **QA Tester** | Verify stack works | Create multiple test accounts → Verify each is in Test Bolão → Query Supabase → Confirm data integrity |
| **Developer (Future PRD)** | Build on stable foundation | Reference schema docs → Write migration scripts for PRD 2 → Use stable API contracts |

### Primary User Flow (Foundation)

1. **Entry**: User visits `https://bolao-copa.vercel.app` (or localhost)
2. **Redirect to Login**: If unauthenticated, redirect to `/login`
3. **Sign in with Google**: Click "Sign in with Google" button
4. **Google OAuth**: Redirected to Google consent screen → user approves → redirected back to app
5. **Session Created**: Supabase creates session; HTTP-only cookie set
6. **Auto-enroll**: Backend trigger automatically adds user to `league_members` (league_id=1)
7. **Redirect to Dashboard**: User is redirected to `/dashboard` or `/api/me` verification page
8. **Success**: User sees their email + "Test Bolão" league name

### UI/UX Considerations

- **Login screen**: Minimal, single button ("Sign in with Google"). No alternatives (no email/password).
- **Post-login page**: Single purpose—display user + league context (e.g., "Welcome, John! You're in Test Bolão."). No navigation yet.
- **Accessibility**: 
  - All text > 14px
  - Button size ≥ 44×44px (mobile)
  - Alt text for any images (flags, logos)
- **Error handling**: If login fails, show clear message ("Google sign-in failed. Please try again."). If database is unreachable, show "System error—contact support."

### Onboarding

No formal onboarding in Foundation. Users land on a success page confirming they're logged in and enrolled in Test Bolão. Detailed onboarding (rules, first prediction) comes in PRD 3.

---

## High-Level Technical Constraints

1. **Language and localization**:
   - **Code language**: All source code, comments, variable names, error messages, and logs must be in Portuguese (PT-BR)
   - **UI text**: Initially in PT-BR; English support can be added in future PRDs if needed
   - **Database content**: All seed data (team names, league names, etc.) in Portuguese where applicable

2. **Required integrations**:
   - **Supabase**: All user data, leagues, predictions, scores (no other database)
   - **Google OAuth**: Only authentication method; credentials pre-configured in Supabase
   - **Vercel**: Deployment target for production; localhost for local development

3. **Data privacy and security**:
   - All user data is encrypted at rest (Supabase default)
   - All API traffic is HTTPS (enforced in production)
   - Session tokens are HTTP-only cookies (CSRF protection)
   - RLS policies enforce row-level access control; users cannot query other users' data

4. **Performance requirements** (user perspective):
   - Login flow completes in < 3 seconds (Google OAuth + session creation + initial data fetch)
   - `/api/auth/me` responds in < 500ms (lightweight query)
   - Page load time after login: < 2 seconds (with Vercel edge caching)

5. **Compliance and regulatory**:
   - GDPR: User data is personal; deletion requests must remove all user records and associated predictions/scores (deletable via Supabase RLS policy or admin action)
   - No third-party tracking (no Google Analytics, Hotjar, etc.) — Foundation is internal only

6. **Scaling considerations**:
   - Database connection pooling (PgBouncer) enabled to handle concurrent users
   - Supabase serverless functions and edge functions available for future optimizations
   - No artificial constraints on concurrent users in Foundation; scale is unlimited within Supabase/Vercel tiers

---

## Non-Goals (Out of Scope)

- **League management**: Creating leagues, inviting users via link/QR, managing members → PRD 2
- **Match predictions**: UI for palpites, filters, blocking logic → PRD 3
- **Scoring and ranking**: Calculate points, display leaderboard → PRD 4
- **Tournament bracket (mata-mata)**: Elimination rounds, phase advancement → PRD 5
- **User profile customization**: Avatar colors, display names beyond email → PRD 5
- **Push notifications**: Reminders before match deadlines → PRD 3+
- **Mobile app**: Foundation supports responsive web only; native iOS/Android apps are future work
- **Analytics and reporting**: User dashboards, league stats → Future PRD
- **Integrations with third-party systems**: Email notifications, Slack bots, etc. → Future work
- **Dark mode or theme customization**: Design system is fixed in Foundation

---

## Phased Rollout Plan

### Phase 1: Foundation (This PRD)

**Core deliverables**:
1. Next.js project setup with TypeScript + Tailwind CSS + Supabase client
2. Supabase project configured with auth, all 7 tables, RLS policies, migrations
3. GitHub repo with CI/CD pipeline (GitHub Actions) for automated testing + deployment
4. Google OAuth login flow working locally and on Vercel
5. Backend API (`/api/auth/me`, `/api/auth/logout`, `/api/health`)
6. Minimal login page (no styling beyond Tailwind defaults; can be basic)
7. Seed data: One hardcoded "Test Bolão" league with mock matches (scaffold for PRD 3)

**Success criteria** (all must be met):
- ✅ A new tester can authenticate via Google and see their user email printed on screen
- ✅ Supabase Studio shows the user in `users` table with correct email
- ✅ Supabase Studio shows the user in `league_members` table (league_id=1)
- ✅ `GET /api/auth/me` returns user + league data (200 OK)
- ✅ App runs locally (`npm run dev`) and on Vercel production deployment
- ✅ All 7 database tables exist with correct schema (verified via `SELECT * FROM information_schema.tables`)
- ✅ Logout endpoint works; session is cleared; user is redirected to login

**Timeline**: ~2 weeks for a team of 1–2 developers

**Handoff to PRD 2**: Once all success criteria are met, PRD 2 authors can assume:
- Users can authenticate and are in a default league
- Database is stable and queryable
- API contracts are documented and won't change

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| **Login success rate** | 100% on first try (no errors) | Tester feedback; logs show no auth exceptions |
| **Session persistence** | Session persists 7 days | Verify in Supabase auth logs; manual browser test |
| **API response time** | `GET /api/auth/me` < 500ms | Network tab in browser DevTools; server logs |
| **Database integrity** | All 7 tables exist; 0 constraint violations | SQL query in Supabase Studio; automated schema test |
| **Deploy success** | Code deploys to Vercel in < 5 min; all health checks pass | Vercel dashboard; `GET /api/health` returns 200 |
| **User coverage** | Each authenticated user is in exactly 1 league (Test Bolão) | Query `SELECT COUNT(*) FROM league_members WHERE league_id = 1; SELECT COUNT(*) FROM users; -- should match` |
| **Code quality** | No TypeScript errors; linter passes (ESLint) | CI/CD pipeline |
| **Documentation** | Schema diagram, API docs, and deployment guide exist | GitHub wiki or README |

---

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| **Google OAuth credentials misconfigured** | Users cannot log in; Foundation fails | Medium | Verify credentials in Supabase dashboard before starting; test locally first; document exact steps in PRD 2 handoff |
| **Supabase connection pooling misconfigured** | Performance issues under load; database connection errors | Medium | Enable PgBouncer in Supabase dashboard; test concurrent connections locally (load test with k6 or similar) |
| **Database migration fails on deploy** | Deploy hangs or rolls back; data loss risk | Low | Use reversible migrations (Supabase CLI); test migrations locally before deploy; keep migration history in git |
| **RLS policies too permissive** | Data leakage (users see other users' predictions) | Medium | Write RLS tests; verify with Supabase Studio row-level test tool; have security review before deploy |
| **Session management broken** | Users logged in but can't fetch data; confusing UX | Low | Verify Supabase middleware is configured in Next.js; test session refresh after 24h; check HTTP-only cookie in browser DevTools |
| **Test users remain after Foundation** | Test league interferes with real leagues in PRD 2 | Low | Document cleanup plan in PRD 2; mark Test Bolão as read-only or archived; add warning in admin dashboard |

---

## Architecture Decision Records

- **[ADR-001: Bootstrapped Default League for Foundation](adrs/adr-001.md)** — New users are automatically enrolled in a hardcoded "Test Bolão" league during migrations to enable end-to-end testing without requiring league creation logic (PRD 2).

---

## Open Questions

1. **Vercel environment variables**: Should Foundation set up a `.env.local` example file or rely on Supabase secrets being injected via Vercel dashboard? (Assume Vercel dashboard; document in deployment guide)
2. **Email verification**: Does Google OAuth require email verification, or is it implicit? (Assume implicit; no separate verification flow needed)
3. **User metadata storage**: Should we store additional user info (phone number, company, language preference) or keep it minimal? (Assume minimal; add in PRD 5 if needed)
4. **Mock matches**: How many matches should be seeded for testing? 1? All 104? (Assume all 104 for PRD 3 API integration testing; scaffold structure in Foundation)
5. **Timezone handling**: All times are UTC in the database; does frontend need localization for display? (Assume UTC for Foundation; add timezone display in PRD 3 if needed)
6. **Admin user distinction**: Should one user be marked as league admin or creator? Or are all users equal until PRD 2? (Assume all equal; add admin role column in PRD 2 when league creation is implemented)
