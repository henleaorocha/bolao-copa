# PRD: Leagues Hub Screen (Tela de Ligas)

## Overview

After a successful Google login, users are redirected directly to the Leagues Hub — a single, unified screen that shows every league available to them and lets them enter one with a single tap. Today the app sends users to `/dashboard` after login, and the `/ligas` page splits discovery across two tabs, creating unnecessary friction before the user can place a prediction.

This PRD replaces the current `/ligas` page with the new Leagues Hub design and updates the post-login redirect accordingly. The result is a branded, personalized landing experience that surfaces all leagues immediately and reminds users how close the 2026 World Cup is.

**Who it is for:** Every authenticated user — from first-time visitors who have never joined a league to returning users who manage multiple private leagues.

**Why it is valuable:** Reaching the correct league is the prerequisite for every user action (predictions, rankings, chat). Reducing that path to a single, visually clear screen increases the chance the user places their first prediction in each session.

---

## Goals

- Every authenticated user lands on the Leagues Hub immediately after login, with zero extra navigation steps.
- All available leagues (public + user's private memberships) are visible on a single screen without filters or tabs.
- The universal league "Test Bolao" is always discoverable as the first, highlighted entry — ensuring no user starts a session without a league context.
- The Copa 2026 countdown creates a sense of urgency that drives daily engagement in the weeks before June 11, 2026. 
- The "Criar nova liga" entry point is visible from day one, planting the seed for a future league-creation flow without blocking this MVP.

**Success indicators (qualitative, to be made measurable in TechSpec):**
- Time from login to first league entry drops significantly vs. the current two-tap flow.
- Bounce rate on `/ligas` decreases (users no longer leave before entering a league).
- "Test Bolao" member count grows as more users default to the universal league.

---

## User Stories

### Authenticated user — first visit after login
- As a user who just logged in with Google, I want to land on a screen that immediately shows me available leagues so that I can start predicting without hunting for a league entry point.
- As a first-time user, I want to see a personalized greeting with my Google account name so that the app feels tailored to me from the first screen.

### Returning user — daily session
- As a returning user, I want to see my private leagues alongside all public leagues so that I can pick where to predict today without toggling between tabs.
- As a returning user, I want to know how many days are left until the Cup starts so that I feel a sense of urgency to keep my predictions up to date.

### User interested in creating a league
- As a user, I want to see a "Criar nova liga" option on this screen so that I know the feature exists and remember to use it when I want to play with my own group.

### Admin / power user
- As a league admin, I want to see the "Test Bolao" (main universal league) clearly distinguished so that I can orient newcomers to join it first.

---

## Core Features

### 1. Post-login redirect to `/ligas`
The authentication callback redirects users to `/ligas` instead of `/dashboard`. This is the only redirect change; deep links and direct navigation to other routes are unaffected.

### 2. Branded header bar
Persistent top bar on the Leagues Hub containing:
- **Left**: Bolão Copa 2026 logo (trophy icon + wordmark).
- **Right**: "Sair" (logout) link with an arrow-right icon. Tapping it signs the user out and returns to `/login`.

### 3. Personalized greeting section
Dark-background hero section at the top of the page:
- **Greeting line**: "E aí, [first name from Google account] 👋"
- **Main heading**: "Suas ligas te esperam" (white + yellow accent on "te esperam")
- **Subtitle**: "Escolha uma liga para palpitar ou crie uma nova com sua galera."

The first name is derived from the authenticated user's Google account display name.

### 4. Unified league card grid
Below the hero, a responsive card grid displays every league the user has access to. Each card shows:
- **Colored shield icon** (background color generated from the league name's first character, using the project palette: `#FFC72C`, `#0097A9`, `#244C5A`, `#7E4FE3`, `#16A34A`, `#FB923C`)
- **League name** (bold)
- **Member count** (real-time value from the database, e.g., "87 participantes")
- **"ENTRAR →" call-to-action** that navigates to `/ligas/[id]`

No role label (Admin / Membro) is shown on cards.

**Card ordering:**
1. "Test Bolao" (universal public league) — always first, with a "PRINCIPAL" badge.
2. User's private leagues (leagues with `access_type='private'` where the user is a member) — sorted by most recently joined.
3. Remaining public leagues (all other `access_type='open'` leagues the user is not a member of) — sorted by member count descending.

Leagues where the user is already a member and the league is public appear once, in their membership position (not duplicated in the public section).

### 5. "Criar nova liga" visual card
A card with a dashed border, a teal `+` icon, the label "Criar nova liga", and the subtitle "Convide amigos de fora também". This card appears after all league cards in the grid. It is visual-only in this phase — tapping it has no action.

### 6. Copa 2026 countdown banner
A warm-toned banner at the bottom of the page containing:
- **Icon**: football (⚽) emoji or SVG icon.

**Before June 11, 2026:**
- **Primary text**: "A Copa começa em X dias" where X = calendar days from the current date to June 11, 2026.
- **Secondary text**: "Não esqueça: palpite de Campeão fecha 1h antes do 1º jogo!"

**On or after June 11, 2026 (Cup is underway):**
- **Primary text**: "A Copa está acontecendo."
- **Secondary text**: "Não se esqueça: palpites encerram 1h antes de cada jogo!"

The day count is calculated server-side at render time. The banner is always visible — it switches to the "underway" variant the moment the current date reaches June 11, 2026.

---

## User Experience

### Primary flow — daily session
1. User opens the app URL.
2. App checks auth → if not authenticated, redirect to `/login`.
3. User completes Google OAuth → auth callback redirects to `/ligas`.
4. User sees the Leagues Hub: greeting with their name, league cards, countdown banner.
5. User taps "ENTRAR" on a league → navigates to `/ligas/[id]`.

### Primary flow — first-time user
1. Same as above through step 4.
2. If the user has no private leagues, they see: "Test Bolao" (PRINCIPAL), all other public leagues, and the "Criar nova liga" card.
3. They tap "ENTRAR" on "Test Bolao" to start predicting immediately.

### Layout reference
The screen matches the design captured in `designReferences/screenshots/tela-ligas.png`:
- Dark petrol-blue (`#244C5A`) header occupying roughly the top third of the viewport.
- White card area for the league grid below the fold line.
- Warm cream (`#FFF9E6` or similar) countdown banner at the bottom.
- Cards arranged in a 3-column grid on desktop; single column on mobile.

### Accessibility
- Logout link and "ENTRAR" buttons are keyboard-navigable.
- Color is not the sole indicator for the "PRINCIPAL" badge — text label is always present.
- Countdown banner text is readable at WCAG AA contrast ratios against its background.

---

## High-Level Technical Constraints

- Member counts must be sourced from the database at page load — no hardcoded or mocked values.
- The page requires an authenticated session; unauthenticated requests redirect to `/login`.
- The Copa countdown date is fixed: June 11, 2026 (first match of the 2026 World Cup). The calculation is always `floor((June 11 2026 00:00 UTC) - (today 00:00 local)) days`.
- The "Test Bolao" league must be identifiable at the data layer (by slug, name match, or a dedicated flag) to guarantee it always appears first with the PRINCIPAL badge.
- The unified leagues list must not require two separate user-visible loading states — a single loading indicator covers the full grid.

---

## Non-Goals (Out of Scope)

- **League creation flow**: The "Criar nova liga" card is visual-only. The actual creation modal, form validation, and API call are deferred to a future PRD.
- **League filtering and search**: No filter bar, search input, or category tabs in this phase.
- **Pagination**: All leagues are shown in a single scroll without pagination or "load more".
- **League invitations from this screen**: Invite links and QR codes belong to the league detail page.
- **Push notifications or badges**: Unread prediction counts or notification dots on cards are out of scope.
- **Role display**: The user's role (Admin / Membro) is not shown on cards.
- **Private league discovery**: Users cannot discover private leagues they are not already a member of from this screen.

---

## Phased Rollout Plan

### MVP (Phase 1) — This PRD
- Post-login redirect updated to `/ligas`.
- Full page redesign: header, greeting, unified card grid, visual "Criar nova liga" card, countdown banner.
- "Test Bolao" pinned first with PRINCIPAL badge.
- All public leagues + user's private leagues shown, member counts from DB.
- "ENTRAR" navigates to `/ligas/[id]`.

**Success criteria to proceed:** Users can log in and enter any league in one tap. No regressions in auth flow or league detail page.

### Phase 2 — League creation
- "Criar nova liga" card becomes interactive, opening a creation flow.
- Covered in a separate PRD.

### Phase 3 — Personalization and filtering
- Filter bar by league type or size.
- Highlight leagues with pending predictions.
- Possibly: pinning favorite leagues.

---

## Success Metrics

- **Time-to-first-league-entry**: Average seconds from auth callback to `/ligas/[id]` load decreases vs. baseline.
- **Test Bolao member count**: Grows week-over-week in the run-up to June 11, 2026 — a proxy for successful discovery.
- **Leagues Hub bounce rate**: Percentage of sessions that land on `/ligas` but never navigate to a league drops below 10%.
- **Logout accessibility**: Support tickets about "can't log out" reach zero (logout is always one tap away).

---

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Auth redirect change causes login loop | Low | Test all OAuth callback edge cases (first login, re-login, expired session) before release |
| "Test Bolao" not identifiable if name changes | Medium | Agree on a stable identifier (slug or `is_main` flag) at the data layer before implementation |
| Countdown banner shows negative days after June 11 | Low | Hide or replace banner with a neutral message once the date passes |
| Users with many private leagues see a very long card list | Low | No pagination needed in MVP given expected user counts; revisit in Phase 3 |
| "Criar nova liga" card raises user expectations before Phase 2 | Medium | Card subtitle sets context ("Convide amigos de fora também") without implying immediate availability; no CTA label that suggests the action is live |

---

## Architecture Decision Records

- [ADR-001: League Hub as Full /ligas Page Redesign](adrs/adr-001.md) — Chosen to replace the current two-tab design at the canonical `/ligas` route; new `/home` route and tab adaptation were rejected.

---

## Open Questions

1. **"Test Bolao" identifier**: How should the data layer mark this league as the universal one? Options: a hardcoded league `id` in config, a `slug = 'test-bolao'` convention, or an `is_main boolean` column. This must be resolved before TechSpec.
2. **Empty state for zero leagues**: If a user somehow has no memberships and there are no other public leagues (e.g., local dev), what does the grid show? Probably just "Test Bolao" + "Criar nova liga", but confirm.
3. **Session timeout behavior**: If the user's session expires while on the Leagues Hub, should the page silently redirect to `/login` or show an inline error?
4. **"Criar nova liga" hover/tap state**: Should the card show any hover effect or remain completely static in this phase?
