---
status: completed
title: Navigation shell (`PainelSidebar`, `PainelTopBar`, `InviteShareButton`)
type: frontend
complexity: medium
dependencies:
  - task_02
---

# Task 7: Navigation shell (`PainelSidebar`, `PainelTopBar`, `InviteShareButton`)

## Overview

The navigation shell provides two responsive layouts: a persistent left sidebar on desktop (`≥1024px`) and a top bar on mobile (`<1024px`). Both surfaces expose the `InviteShareButton`, which presents copy-to-clipboard and WhatsApp share actions. Navigation links other than the active "PAINEL" item and the "Ligas" back link are visually rendered but inert. The back CTA navigates to `/ligas`.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. `PainelSidebar` MUST be visible only on `≥lg` screens (`hidden lg:flex` or equivalent).
2. `PainelTopBar` MUST be visible only on `<lg` screens (`flex lg:hidden` or equivalent).
3. `InviteShareButton` MUST construct the invite URL client-side as `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/join?token=${league.invite_token}`.
4. Copy action MUST call `navigator.clipboard.writeText(inviteUrl)` and show a success toast; on failure MUST fall back to `document.execCommand('copy')`.
5. WhatsApp action MUST open `https://api.whatsapp.com/send?text={encodeURIComponent(message)}` where message contains the invite URL.
6. Inert nav items in `PainelSidebar` (Palpites, Tabela, Mata-mata, Ranking, Perfil) MUST have `aria-disabled="true"`, `pointer-events-none`, and `opacity-50`.
7. Back to leagues navigation ("← Minhas Ligas" on desktop breadcrumb; tapping league name/logo in `PainelTopBar` on mobile) MUST use Next.js `<Link href="/ligas">`.
8. All interactive elements MUST have tap targets ≥44×44px on mobile.
</requirements>

## Subtasks

- [x] 7.1 Create `InviteShareButton.tsx` with client-side URL construction, clipboard copy (with fallback), and WhatsApp deep link.
- [x] 7.2 Create `PainelSidebar.tsx` with league logo/name, nav items (PAINEL active, others inert), "CONVIDAR" button (uses `InviteShareButton`), and user avatar/name at the bottom.
- [x] 7.3 Create `PainelTopBar.tsx` with league logo + name (tappable → `/ligas`), share icon button (uses `InviteShareButton`), hidden on `lg:`.
- [x] 7.4 Write unit tests covering invite URL construction, WhatsApp link format, clipboard call, and inert nav accessibility attributes.

## Implementation Details

See TechSpec "Integration Points — WhatsApp deep link and Clipboard API" and ADR-004 for invite URL construction. See PRD "Core Features — 1, 2, 12" for navigation shell visual requirements.

Props for `PainelSidebar` and `PainelTopBar`:
```
leagueName: string
leagueLogoUrl: string | null
inviteToken: string
currentUserName: string | null
currentUserAvatarColor: string
```

`InviteShareButton` props:
```
inviteUrl: string
variant: 'sidebar' | 'topbar'
```

The invite popover/dropdown can be implemented as a simple state-toggled `div` — no external popover library needed.

### Relevant Files

- `lib/api/types.ts` — `LeagueDetail` provides `invite_token`, `name`, `logo_url`
- `components/topbar/LayoutWrapper.tsx` — reference for `hidden`/`flex lg:hidden` responsive pattern
- `components/topbar/Topbar.tsx` — reference for top bar visual structure

### Dependent Files

- `app/ligas/[id]/page.tsx` — task_09 renders both `PainelSidebar` and `PainelTopBar` inside the responsive layout shell

### Related ADRs

- [ADR-004: Invite URL — Client-Side Construction from invite_token](adrs/adr-004.md) — Defines client-side URL construction and the `window.location.origin` fallback

## Deliverables

- `app/ligas/[id]/components/InviteShareButton.tsx`
- `app/ligas/[id]/components/PainelSidebar.tsx`
- `app/ligas/[id]/components/PainelTopBar.tsx`
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for navigation and invite flow **(REQUIRED)**

## Tests

- Unit tests (`@vitest-environment jsdom`):
  - [x] `InviteShareButton` calls `navigator.clipboard.writeText` with `http://localhost:3000/join?token=abc123` when `inviteToken='abc123'` and `NEXT_PUBLIC_SITE_URL='http://localhost:3000'`.
  - [x] `InviteShareButton` WhatsApp anchor `href` contains `api.whatsapp.com/send?text=` and the URL-encoded invite URL.
  - [x] After clicking copy, a success feedback element (toast or checkmark) appears in the DOM.
  - [x] `PainelSidebar` nav item "PALPITES" has `aria-disabled="true"`.
  - [x] `PainelSidebar` nav item "PAINEL" does not have `aria-disabled="true"`.
  - [x] `PainelTopBar` contains a `<Link>` or `<a>` with `href="/ligas"` for the back CTA.
  - [x] `PainelSidebar` renders with a class containing `lg:flex` (visible on desktop).
  - [x] `PainelTopBar` renders with a class containing `lg:hidden` (hidden on desktop).
- Integration tests:
  - [x] Navigating from `/ligas/[id]` to `/ligas` via the back CTA resolves without 404.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Clipboard copy and WhatsApp link work on desktop and mobile
- Inert sidebar links have correct `aria-disabled` attributes
- Back CTA navigates to `/ligas`
