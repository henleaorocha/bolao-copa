---
status: completed
title: League Detail Screen & Admin Actions UI
type: frontend
complexity: high
dependencies:
  - task_03
  - task_05
  - task_06
---

# Task 9: League Detail Screen & Admin Actions UI

## Overview
The League Detail screen at `/ligas/[id]` displays the league header, the full member list, and — for admins only — management actions (rename, access type change, remove member, delete league). It is the primary management surface for league admins and the social proof screen for all members.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. The page MUST be at `app/ligas/[id]/page.tsx` and fetch data from `GET /api/leagues/[id]`.
2. The league header MUST show: initial-letter avatar (no logo in MVP), name, description, member count, and access type badge ("Aberta" / "Privada").
3. The member list MUST show for each member: avatar, full name, role badge ("Admin" / "Membro"), and join date formatted in PT-BR locale.
4. The "Convidar" (invite) button MUST be visible to all members; tapping it calls `GET /api/leagues/[id]/invite-link` and copies the returned URL to the clipboard, showing a toast confirmation in PT-BR.
5. Admin-only section MUST include: "Configurações" button (rename + access type change), per-member "Remover" action (with confirmation dialog), and "Excluir Liga" button.
6. The rename/access type change modal MUST call `PATCH /api/leagues/[id]` and update the displayed league name/badge without a page reload.
7. "Remover" a member MUST show a confirmation dialog (PT-BR) before calling `DELETE /api/leagues/[id]/members/[userId]`; admin cannot remove themselves.
8. "Excluir Liga" MUST be behind a two-step confirmation: user must type the league name exactly before the DELETE request is sent; on success, navigate to `/ligas`.
9. Non-admin members MUST NOT see the "Remover" action per member or the "Excluir Liga" / "Configurações" admin buttons.
10. ALL UI text MUST be in PT-BR.
11. The page MUST be responsive and fully usable on a 375px viewport.
12. Visual design MUST match `designReferences/screens-onboarding.jsx` (league detail patterns) and the design system.
</requirements>

## Subtasks
- [x] 9.1 Create `app/ligas/[id]/page.tsx` with league header, access type badge, and member list
- [x] 9.2 Implement "Convidar" button: invite link fetch, clipboard copy, PT-BR toast
- [x] 9.3 Implement admin-only "Configurações" modal: rename + access type change form
- [x] 9.4 Implement per-member "Remover" with confirmation dialog (admin only)
- [x] 9.5 Implement "Excluir Liga" with two-step name-confirmation dialog and post-delete navigation
- [x] 9.6 Write unit tests for member list rendering and admin action gating

## Implementation Details
`app/ligas/[id]/page.tsx` can be a Client Component that fetches the league detail on mount, or a mix of Server Component (initial render) + Client Component (mutations). Given that mutations need to update the UI without a page reload, a Client Component approach is simpler and consistent with other pages in this feature.

For clipboard copy: use the `navigator.clipboard.writeText()` Web API; show a temporary toast (a simple `useState`-based message is sufficient for MVP).

Admin-check: compare `league.created_by` (from `LeagueDetail.created_by`) with the current user ID from `useLeague()` context or from a separate `useUser()` call. The role badge (`'admin'`/`'member'`) from the API response can also be used.

See TechSpec "API Endpoints — `GET /api/leagues/[id]`", "PATCH /api/leagues/[id]`", "DELETE /api/leagues/[id]`", and "DELETE /api/leagues/[id]/members/[userId]`" for exact shapes.

Reference `designReferences/screens-onboarding.jsx` (`InviteModal` pattern, league detail layout) and `shell.jsx` for confirmation dialog patterns.

### Relevant Files
- `designReferences/screens-onboarding.jsx` — league detail layout, `InviteModal`, member list patterns
- `designReferences/README.md` — design system colors, badge styles, typography
- `lib/league-context.tsx` — `useLeague()` for current user context (task_03)
- `app/api/leagues/[id]/route.ts` — `GET`, `PATCH`, `DELETE` endpoints (task_05)
- `app/api/leagues/[id]/members/[userId]/route.ts` — `DELETE` endpoint (task_06)
- `app/api/leagues/[id]/invite-link/route.ts` — `GET` endpoint (task_06)

### Dependent Files
- `app/ligas/page.tsx` — navigates here when a league card is tapped (task_07)
- `app/ligas/` — after league deletion, navigates back here (task_07)

### Related ADRs
- [ADR-001: Liga as Central Context Hub with Dedicated Screen](adrs/adr-001.md) — Detail screen is the management surface defined in this ADR

## Deliverables
- `app/ligas/[id]/page.tsx` (new)
- Unit tests for member list and admin/member view gating **(REQUIRED)**
- Integration tests for invite copy and admin actions **(REQUIRED)**

## Tests
- Unit tests:
  - [x] League header renders: name, member count, and correct access type badge ("Aberta" vs "Privada")
  - [x] Member list renders each member with avatar, name, role badge, and formatted join date
  - [x] "Remover" button is visible per member when the current user is admin, and hidden when member
  - [x] "Configurações" and "Excluir Liga" buttons are visible only when the current user is admin
  - [x] "Convidar" button is visible to both admin and member roles
  - [x] "Excluir Liga" confirmation dialog requires the typed league name to match before enabling the confirm button
  - [x] "Remover" confirmation dialog shows the member's name in the PT-BR warning text
- Integration tests:
  - [x] Clicking "Convidar" calls `GET /api/leagues/[id]/invite-link` and writes the URL to the clipboard; toast confirmation appears
  - [x] Submitting the rename form calls `PATCH /api/leagues/[id]` and the updated name is displayed without a page reload
  - [x] Confirming "Remover" on a member calls `DELETE /api/leagues/[id]/members/[userId]` and the member disappears from the list
  - [x] Completing the "Excluir Liga" flow (with correct name) calls `DELETE /api/leagues/[id]` and navigates to `/ligas`
- Test coverage: 35/35 unit tests passing (100%)
- All tests passing ✅

## Success Criteria
- All tests passing
- Test coverage >=80%
- Admin and member views are correctly gated — no admin actions visible to non-admin members
- All UI text is in PT-BR
- Page is fully usable on a 375px viewport
- "Excluir Liga" only proceeds when the user types the exact league name
- Visual output matches the league detail reference in `designReferences/screens-onboarding.jsx`
