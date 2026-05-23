# Workflow Memory — prd-2-ligas

## Completed Tasks
- [task_01.md](task_01.md) — DB migrations complete and committed (commit 837b25e)
- [task_02.md](task_02.md) — GET /api/auth/me returns active league; PATCH endpoint updates active_league_id
- [task_03.md](task_03.md) — LeagueProvider + useLeague() hook created, app/layout.tsx integrated, DEFAULT_LEAGUE_ID removed from lib/user-sync.ts
- [task_04.md](task_04.md) — GET /api/leagues, POST /api/leagues, GET /api/leagues/discover routes implemented with full test coverage
- [task_05.md](task_05.md) — GET /api/leagues/[id], PATCH /api/leagues/[id], DELETE /api/leagues/[id] routes implemented
- [task_06.md](task_06.md) — POST /api/leagues/[id]/join, DELETE /api/leagues/[id]/members/[userId], GET /api/leagues/[id]/invite-link routes implemented
- [task_07.md](task_07.md) — League Hub Screen (/ligas) with two tabs, 10 passing tests, all PT-BR text, responsive design
- [task_08.md](task_08.md) — Topbar LeagueSwitcher component with dropdown, context updates, and 9 passing tests
- [task_09.md](task_09.md) — League Detail Screen (/ligas/[id]) with member list, admin actions, 35 unit tests passing
- [task_10.md](task_10.md) — Join Page & OAuth Cold-Start Redirect Preservation: /join?token=<t> page, middleware, sessionStorage restoration, 14 unit tests + integration tests
- [task_11.md](task_11.md) — Dashboard Refactor: Replaced DEFAULT_LEAGUE_ID with dynamic active_league_id; created lib/resolve-active-league.ts shared utility; 9 new tests (5 integration + 4 unit)

## Key Decisions & Learnings
- **LeagueProvider pattern**: Memoized React Context (no new dependencies), server-side initialization via app/layout.tsx
- **Layout design**: Conditionally mounts LeagueProvider only for authenticated users; unauthenticated routes (login) render without provider
- **Server-side league fetch**: Direct Supabase query in app/layout.tsx getActiveLeague(), mirrors /api/auth/me logic (membership check → fallback to first league)
- **DB-driven enrollment**: Removed DEFAULT_LEAGUE_ID from ensureUserSynced(); DB trigger handle_new_user now sole auto-enrollment mechanism
- **Testing**: Unit tests use jsdom environment (@vitest-environment jsdom), integration tests skip without SERVICE_ROLE_KEY
- **Token validation pattern**: Separate SELECT queries for validation (includes token) and response (excludes token) to prevent leakage; TypeScript types enforce safety
- **Admin-only actions**: Check `created_by = auth.uid()` for admin verification; use error codes NOT_ADMIN (403) and CANNOT_REMOVE_ADMIN (400)
- **ADR-003 compliance**: invite_token never exposed in responses; only return full invite URL from GET /api/leagues/[id]/invite-link

## Next Steps
- All 11 tasks complete — PRD implementation finished
- Ready for integration testing and deployment
