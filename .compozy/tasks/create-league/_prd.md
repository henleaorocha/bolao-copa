# PRD: Create New League

## Overview

Authenticated users currently land on `/ligas` and see a "Criar nova liga" card that is entirely visual — clicking it does nothing. This PRD covers the end-to-end flow that lets any authenticated user create a new league from that card: a modal collects the required information, the league is persisted, the creator is automatically added as a member, and the user is taken directly to their new league.

The feature is aimed at all authenticated users of the bolão platform who want to organize a private or open prediction group with friends or colleagues.

## Goals

- Enable users to create a league without leaving the `/ligas` page or navigating to a separate route.
- Ensure the creator is an active member of the league the moment it is created.
- Reduce time-to-first-league: a new user should be able to create and land in a league in under 60 seconds.
- Increase the number of leagues created per week by making the entry point discoverable and frictionless.

## User Stories

**As an authenticated user (league creator):**
- I want to click "Criar nova liga" and have a modal open immediately so that I do not leave my current context.
- I want to type a name for my league so that I can identify it among others.
- I want to choose between "Aberta" (anyone can find and join) and "Privada" (invite-only via link) so that I can control who participates.
- I want to optionally declare a prize for the winner so that I can motivate friends to compete seriously.
- I want to be taken directly to my new league after creating it so that I can start inviting people right away.
- I want clear feedback if the creation fails so that I know what to fix and can try again.

**As any league member (secondary persona):**
- I want to see the prize description inside the league so that I understand what I am competing for.

## Core Features

### 1. Creation Modal Trigger
Clicking the "Criar nova liga" card on `/ligas` opens the creation modal. The card currently has no click handler; this feature wires it up.

### 2. League Name Input
- Required field, 2–50 characters.
- Placeholder text: "ex.: Liga da TI".
- Inline validation error shown if submitted empty or out of range.

### 3. Access Type Selector
- Two mutually exclusive options presented as side-by-side selectable cards: **Aberta** and **Privada**.
- **Aberta** (users icon): subtitle "Qualquer um pode encontrar e entrar" — any authenticated user can discover and join.
- **Privada** (lock icon): subtitle "Só entra quem tem o link de convite" — only users with the invite link can join.
- One option must always be selected; "Privada" is pre-selected by default.

### 4. Prize Configuration (optional)
- A checkbox row labelled "Tem prêmio para os campeões?" (with trophy icon and subtitle "Descreva o que está em jogo") toggles the prize section.
- When checked, a resizable text area appears; placeholder: `"ex.: 1º — Almoço pago pela equipe · 2º — Caneca personalizada · 3º — Mousepad"`.
- When unchecked, no prize information is stored.
- The prize description is visible only to league members, not to the general public.

### 5. League Creation and Membership
- Submitting the form creates the league record and simultaneously adds the creator as a member with the `admin` role.
- The creator's active league is set to the newly created league.
- On success, the modal closes and the user is navigated to `/ligas/{newLeagueId}`.

### 6. Error and Loading States
- The "Criar liga" button shows a loading indicator while the request is in flight and is disabled to prevent double-submission.
- If creation fails, a toast error message is displayed and the modal remains open so the user can retry without re-entering data.
- "Cancelar" closes the modal without saving anything.

## User Experience

### Primary Flow
1. User lands on `/ligas` and sees their existing league cards plus the "Criar nova liga" dashed card.
2. User clicks the "Criar nova liga" card.
3. A centered modal appears with backdrop: title "Nova Liga", subtitle "Configure sua liga para começar".
4. User types the league name.
5. User selects "Aberta" or "Privada" (default: Privada).
6. Optionally, user checks the prize checkbox and fills in the description.
7. User clicks "Criar liga".
8. Button enters loading state.
9. On success: modal closes, user is navigated to `/ligas/{newLeagueId}`, which is the standard league detail page.
10. On error: toast notification appears; modal stays open.

### Cancel Flow
- Clicking "Cancelar" or the × button dismisses the modal without any side effects.
- Clicking the backdrop (darkened overlay) outside the modal also dismisses it — consistent with the design reference.

### Visual Design
- Modal is centered with a white rounded card (very rounded corners, `rounded-[36px]` per design reference), backdrop-blurred overlay.
- Access type options displayed as side-by-side selectable cards with icon + label + description; selected card gets teal border + tinted background.
- "Criar liga" button uses the primary yellow (`#FFC72C`) style; "Cancelar" uses the secondary outlined style.
- No league logo is displayed or uploaded during creation; the league shows color-coded initials (existing `LeagueCard` behavior).

## High-Level Technical Constraints

- The feature must work within the existing Next.js application without introducing new routing or page-level changes.
- The prize description must be stored and retrieved only for authenticated members of the league.
- The creation flow must handle concurrent requests gracefully (prevent duplicate league creation on double-tap).
- No file upload or external storage service is required for this release.

## Non-Goals (Out of Scope)

- **Logo upload during creation**: deferred to a future phase; leagues will display initials.
- **League limits per user**: no cap on how many leagues a user can create.
- **Invite link sharing from the modal**: the invite link is accessible from the league settings page after creation.
- **Scoring or draft configuration**: not applicable to this platform's prediction-based format.
- **Social sharing or pre-built league templates**: out of scope for MVP.
- **Prize payment or external rewards integration**: the prize field is descriptive text only.

## Phased Rollout Plan

### MVP (Phase 1) — This PRD
- Wire up the "Criar nova liga" card click handler.
- Implement the creation modal with name, access type, and optional prize fields.
- Connect to the existing `POST /api/leagues` endpoint (extended to accept `prize_pool`).
- Navigate to the new league detail page on success.
- Full error handling and loading states.

**Success criteria to proceed:** Users can successfully create a league and land on its detail page within one session; zero reported double-submission bugs.

### Phase 2 — Logo Upload
- Add league logo upload (file picker + storage) in the creation modal.
- Display the uploaded logo in `LeagueCard` and league detail header.

**Success criteria to proceed:** Logo upload success rate ≥ 95% across device types; logos render correctly across all card sizes.

### Phase 3 — Post-Creation Onboarding
- After creation, display an inline onboarding prompt inside the league page: "Convide seus amigos!" with the invite link pre-copied.
- Add a league description field (separate from prize) for extended context.

## Success Metrics

- **Funnel completion rate**: ≥ 80% of users who open the modal successfully create a league (measures form friction).
- **Time to create**: median time from modal open to landing on the new league page < 45 seconds.
- **Weekly leagues created**: week-over-week growth after the feature ships.
- **Error rate**: < 2% of creation attempts result in a server error shown to the user.
- **Double-submission rate**: 0 duplicate leagues created per user session.

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Users create many low-quality leagues that clutter the hub | Medium | No immediate limit needed; revisit if hub performance or UX degrades (Phase 2 concern). |
| Prize text used for spam or inappropriate content | Low | Visible only to members; no public exposure. Flag for moderation tooling in a future phase if abuse is reported. |
| "Criar nova liga" card click area is too small on mobile | Low | Ensure the entire card is the click target, not just the "+" icon. Validate on real mobile devices. |
| User navigates away from `/ligas` before creation completes | Low | Disable "Criar liga" button while in-flight; modal stays open on error. |

## Architecture Decision Records

- [ADR-001: Single-Step Centered Modal for League Creation](adrs/adr-001.md) — Chose a single-screen modal over a multi-step wizard or inline expansion because the field count is small and the approach matches the design mockup.

## Open Questions

- Should the prize description have a character limit? (Suggested: 300 chars, but not confirmed.)
- When the user lands on `/ligas/{newLeagueId}` after creation, should a success toast or welcome banner appear? Currently unspecified.
