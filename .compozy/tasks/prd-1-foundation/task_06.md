---
status: completed
title: "Create frontend pages: /login and /dashboard with auth flow integration"
type: frontend
complexity: medium
dependencies:
  - task_05
---

# Create frontend pages: /login and /dashboard with auth flow integration

## Overview

Build two minimal frontend pages: `/login` with a "Sign in with Google" button, and `/dashboard` that fetches and displays authenticated user context (email, display name, league). Pages are unstyled beyond Tailwind CSS defaults—Foundation prioritizes functionality over design. Middleware (task_04) enforces authentication; if a user visits `/dashboard` unauthenticated, they're redirected to `/login`.

<critical>
Read the **TechSpec "User Experience"** section for page flow and requirements. Read **"API Endpoints"** for `/api/auth/me` response structure (what data dashboard will display). Do NOT over-engineer; Foundation UI is minimal and temporary. No custom components or design system yet—Tailwind defaults only. All text in Portuguese (PT-BR). Test unauthenticated redirect and error states.
</critical>

<requirements>

1. MUST create `/login` page (`app/login/page.tsx`):
   - Single "Sign in with Google" button (via Supabase Auth UI or custom link)
   - Minimal styling (Tailwind; no custom CSS)
   - Redirect authenticated users to `/dashboard` (don't show login page if already logged in)
   - Error message if auth callback fails (e.g., "Erro ao fazer login com Google. Tente novamente.")
   - Accessible: Button size ≥ 44×44px, text ≥ 14px, focus visible

2. MUST create `/dashboard` page (`app/dashboard/page.tsx`):
   - Fetch user + league context via `GET /api/auth/me`
   - Display:
     - User email and display name (or "Usuário" if no name)
     - Avatar (if avatar_url available; else placeholder)
     - League name ("Test Bolão")
     - User role ("member")
   - Logout button that calls `POST /api/auth/logout` and redirects to `/login`
   - Error boundary: If `/api/auth/me` fails, show error message ("Erro ao carregar dados. Tente novamente.")
   - Loading state while fetching data

3. MUST implement error handling:
   - `/login`: Catch OAuth errors → show error message (localized PT-BR)
   - `/dashboard`: Catch API errors (401, 500) → show appropriate message or redirect to login
   - Don't expose internal error details to user

4. MUST implement auth state checking:
   - `/login`: If user is authenticated → redirect to `/dashboard` (use next/navigation router)
   - `/dashboard`: If not authenticated → middleware redirects to `/login` (handled by task_04)
   - Both pages check session status on mount

5. MUST be accessible:
   - Button sizes ≥ 44×44px (mobile touch target)
   - Text ≥ 14px (readability)
   - Alt text for images (avatar, logo)
   - ARIA labels for interactive elements
   - Keyboard navigation (Tab through buttons)
   - Focus visible on interactive elements

6. MUST use Next.js App Router best practices:
   - `/dashboard/page.tsx` deve ser um **Server Component assíncrono** que busca dados com `getSupabaseServerClient()` — isso evita round-trip desnecessário e é mais seguro
   - Apenas o **botão de logout** (e outras interações) devem ser extraídos para um Client Component separado (`components/LogoutButton.tsx`) com `'use client'`
   - Use `next/navigation` → `redirect()` para redirects server-side
   - Loading state: usar `app/dashboard/loading.tsx` (Suspense boundary nativo do App Router)
   - **NÃO** usar `useEffect()` para buscar dados — preferir Server Components

7. MUST criar página root `app/page.tsx` para redirecionar usuários:
   - Se autenticado → redirecionar para `/dashboard`
   - Se não autenticado → redirecionar para `/login`
   - O PRD define: *"Entry: User visits `https://bolao-copa.vercel.app`"* — a rota raiz deve funcionar

8. NOTA: A rota `/auth/callback` é criada em task_05. A página `/login` apenas inicia o OAuth; o callback é tratado em `app/auth/callback/route.ts`.

</requirements>

## Subtasks

- [ ] Create `app/login/page.tsx`
  - [ ] Add "Sign in with Google" button
  - [ ] Implement redirect to `/dashboard` if user is authenticated
  - [ ] Add error boundary for auth failures
  - [ ] Style with Tailwind (minimal, button centered, responsive)
- [ ] Create `app/dashboard/page.tsx`
  - [ ] Fetch user data from `/api/auth/me` on mount
  - [ ] Display user email, name, avatar, league name, role
  - [ ] Add logout button that calls `/api/auth/logout` and redirects to login
  - [ ] Add error boundary if fetch fails
  - [ ] Add loading state
- [ ] Create `app/page.tsx` (root page):
  - [ ] Verificar sessão com `getSupabaseServerClient()`
  - [ ] `redirect('/dashboard')` se autenticado; `redirect('/login')` se não
- [ ] Create `components/LogoutButton.tsx` como Client Component ('use client') para o botão de logout interativo
- [ ] Create error boundary: `app/dashboard/error.tsx` (Next.js App Router error boundary)
- [ ] Create loading state: `app/dashboard/loading.tsx` (Suspense boundary nativo)
- [ ] Test locally: `npm run dev` → visit http://localhost:3000
  - [ ] Unauthenticated: Redirected to `/login`
  - [ ] Click "Sign in with Google" → OAuth flow
  - [ ] After auth: Redirected to `/dashboard`
  - [ ] Dashboard shows user email and league
  - [ ] Click logout → Redirected to `/login`, session cleared
  - [ ] Verify accessibility: Tab through buttons, check font sizes

## Implementation Details

**Files to create**:
- `app/page.tsx` — Root redirect (autenticado → /dashboard; não autenticado → /login)
- `app/login/page.tsx` — Login page with Google OAuth button
- `app/dashboard/page.tsx` — Server Component com user + league context
- `app/dashboard/loading.tsx` — Loading state (Suspense)
- `app/dashboard/error.tsx` — Error boundary
- `components/LogoutButton.tsx` — Client Component para o botão de logout

**OAuth button implementation options**:
1. **Supabase Auth UI component** (recommended): 
   - Import `Auth` from `@supabase/auth-ui-react`
   - Use `<Auth supabaseClient={supabase} appearance={{...}} providers={['google']} />`
2. **Custom button**: 
   - Create a link to Supabase OAuth endpoint: `/auth/authorize` (handled by Supabase)
   - Or use `supabase.auth.signInWithOAuth({ provider: 'google' })`

**Data fetching in dashboard** (abordagem definitiva — Server Component):
- `/dashboard/page.tsx` é um Server Component assíncrono
- Buscar dados diretamente com `getSupabaseServerClient()` (sem `fetch('/api/auth/me')`)
- Usar `redirect('/login')` server-side se a sessão não existir
- Extrair botão de logout para `components/LogoutButton.tsx` (`'use client'`) que chama `POST /api/auth/logout` e usa `router.push('/login')`

**Integration points**:
- Login page: Calls Supabase OAuth endpoint (redirects to Google)
- Dashboard: Calls `/api/auth/me` (task_05) to fetch user context
- Logout: Calls `POST /api/auth/logout` (task_05) then redirects to login
- Middleware (task_04): Protects `/dashboard` — if no session, redirect to `/login`

**Reference TechSpec sections**:
- **"User Experience"** → Primary user flow (login → dashboard → logout)
- **"API Endpoints"** → `/api/auth/me` response structure
- **"UI/UX Considerations"** → Accessibility requirements

### Relevant Files

- `app/login/page.tsx` (created here)
- `app/dashboard/page.tsx` (created here)
- `middleware.ts` (task_04) — Enforces auth redirect
- `/api/auth/me` (task_05) — Fetched by dashboard
- `/api/auth/logout` (task_05) — Called by logout button

### Dependent Files

- Integration tests (task_07) — Test login flow, page rendering, error states
- Documentation (task_08) — Screenshot/demo of Foundation app

### Related ADRs

- [[ADR-002]]: Justifies Next.js App Router (Server Components, built-in middleware)

## Deliverables

1. **Root page**: `app/page.tsx` que redireciona para /dashboard (autenticado) ou /login (não autenticado)
2. **Login page**: `/login` with "Sign in with Google" button, error handling, redirect if authenticated
3. **Dashboard page**: `/dashboard` como Server Component com user + league context; logout via Client Component
4. **Loading/Error boundaries**: `app/dashboard/loading.tsx` e `app/dashboard/error.tsx`
5. **Accessibility**: Buttons ≥ 44×44px, text ≥ 14px, ARIA labels, keyboard navigation
6. **Localization**: All UI text in Portuguese (PT-BR)
7. **Responsive design**: Works on mobile (375px) and desktop (1920px)

## Tests

### Unit Tests
- N/A (pages are primarily UI; integration tests cover functionality)

### Integration Tests
- ✅ Visit `/login` unauthenticated: Page renders with "Sign in with Google" button
- ✅ Click OAuth button: Redirected to Google OAuth endpoint
- ✅ Authenticate via Google: Redirected back to app with session
- ✅ Redirected to `/dashboard` after auth
- ✅ Dashboard displays user email, name, avatar, league
- ✅ Click logout button: Session cleared, redirected to `/login`
- ✅ Visit `/dashboard` unauthenticated: Middleware redirects to `/login`
- ✅ `/api/auth/me` returns 401: Dashboard shows error message
- ✅ `/api/auth/me` returns 500: Dashboard shows error message
- ✅ Loading state appears while `/api/auth/me` is fetching
- ✅ All buttons are accessible: Tab navigation, focus visible, size ≥ 44px
- ✅ All text is readable: Font size ≥ 14px
- ✅ All images have alt text
- ✅ Works on mobile (375px width) and desktop (1920px width)

## Success Criteria

- ✅ `app/page.tsx` (root) redireciona para /dashboard se autenticado, /login se não
- ✅ `/login` page renders with "Sign in with Google" button
- ✅ `/dashboard` é um Server Component (não usa useEffect para data fetching)
- ✅ Clicking "Sign in with Google" initiates OAuth flow (redirects to Google)
- ✅ After auth, user is redirected to `/dashboard`
- ✅ Dashboard displays:
  - User email (from `/api/auth/me`)
  - User display name or "Usuário" fallback
  - Avatar (if available) or placeholder
  - League name ("Test Bolão")
  - User role ("member")
- ✅ Logout button clears session and redirects to `/login`
- ✅ Unauthenticated access to `/dashboard` redirects to `/login` (via middleware)
- ✅ All error messages are in Portuguese (PT-BR)
- ✅ Pages are responsive (mobile and desktop)
- ✅ Accessibility: Buttons ≥ 44×44px, text ≥ 14px, ARIA labels, keyboard navigation
- ✅ No TypeScript errors; `npm run build` succeeds
- ✅ Pages load in < 2 seconds after login (Vercel edge caching)
