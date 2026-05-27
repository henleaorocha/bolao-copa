# PRD: Pre-Copa Bet Modal — Champion & Vice Selection

## Overview

When a user enters a league for the first time, they are immediately prompted to place their pre-Copa bet: choosing the World Cup champion (+50 points) and vice-champion (+25 points) from all 32 participating nations. The bet is locked after the Copa do Mundo 2026 kick-off (June 11, 2026) and is scoped per league, meaning users in multiple leagues place a separate bet for each.

This feature closes the gap between the existing onboarding modal (which explains scoring) and actual user activation (placing a bet). Users who place this bet have a direct stake in the tournament outcome from day one, driving engagement and retention throughout the Copa.

## Goals

- Drive bet placement rate: at least 80% of league members place their champion/vice bet before the Copa starts.
- Activate users immediately on first league entry — the bet modal appears in the same session as the welcome modal.
- Ensure zero users are blocked: any of the 32 participating nations is selectable, not just featured teams.
- Create urgency: surface the deadline clearly so users understand the window to change their bet is finite.
- Support re-entry: users who join late or skip the modal can still place their bet on subsequent visits until kick-off.

## User Stories

**As a new league member**, I want to be prompted to pick my champion and vice-champion right after joining, so that I'm immediately engaged with the league's most impactful bet.

**As a user who missed the initial modal**, I want the bet prompt to appear again on my next visit to the league (before Copa starts), so that I don't lose the opportunity to place my bet.

**As a user who already placed my bet**, I want to be able to revisit and change my picks before June 11, 2026, so that I can update my prediction if my opinion changes.

**As a user who wants to bet on a less-favored team**, I want access to all 32 Copa nations (not just the 12 featured), so that I'm not restricted in my choice.

**As a user selecting my vice-champion**, I want to clearly see which team I already picked as champion (and have it blocked from selection), so that I don't accidentally pick the same team twice.

## Core Features

### 3-Step Bet Modal

A fullscreen modal that launches sequentially after the existing 4-step LeagueWelcomeModal. It contains three focused steps with a 3-dash progress indicator at the top:

**Step 1 — Champion Selection ("Quem leva a taça?")**
- Crown icon header with "APOSTA PRÉ-COPA · VALE +50 PTS" label in gold.
- Subtitle: "Aposte na seleção que vai vencer a Copa do Mundo 2026."
- Scrollable card containing two sections:
  - **Featured section** (no label required): 12 top-candidate nations in a 4×3 grid with flag + country name.
  - **All nations section** ("Outras seleções"): remaining 20 nations, same grid format, accessible by scrolling within the card.
- "Escolher Vice →" button, enabled only after a champion is selected.

**Step 2 — Vice-Champion Selection ("E o vice-campeão?")**
- Medal icon header with "APOSTA PRÉ-COPA · VALE +25 PTS" label in gold.
- Subtitle: "Quem você acha que vai perder a final?"
- Same scrollable card, but the champion selected in Step 1 is greyed out and labelled "CAMPEÃO" — it cannot be selected as vice.
- Buttons: "← Voltar" + "Revisar aposta →" (enabled only after a vice is selected).

**Step 3 — Confirmation ("Confirma sua aposta?")**
- Sparkle icon header with "APOSTA PRÉ-COPA · VALE MUITO" label in gold.
- Subtitle: "Após o início da Copa, isso não muda mais."
- Summary card with two rows:
  - **Champion row** (highlighted with golden border): Crown icon (yellow background), "CAMPEÃO · +50 PTS" label, flag + country name.
  - **Vice row**: Medal icon (teal background), "VICE · +25 PTS" label, flag + country name.
- Deadline notice (amber background): clock icon + "Fecha em X dias · após 18:00 de 11/jun/2026 (BRT), você não pode mais alterar."
- Buttons: "← Voltar" + "Confirmar aposta" (bright yellow CTA with save icon).

### Country Selection Grid

- All 32 Copa do Mundo 2026 nations are selectable.
- 12 featured teams are highlighted in the first grid section: Brasil, Argentina, França, Espanha, Inglaterra, Portugal, Alemanha, Holanda, Itália, Bélgica, Uruguai, Colômbia.
- Official flag images (SVG) are used, not emoji, to ensure consistent rendering across all Android and iOS devices.
- Each nation card shows: flag (square with rounded corners) + country name below in bold.
- Selected state: card gets a colored border/highlight to confirm the pick.

### Trigger and Visibility Rules

- **First league entry**: modal launches immediately after the 4-step welcome modal completes.
- **Subsequent visits before Copa kick-off**: if the user has no bet placed yet, the bet modal shows on entry to the league.
- **After bet is placed**: modal does not appear unless the user initiates editing (edit flow is out of scope for this PRD phase — see Non-Goals).
- **After Copa kick-off (June 11, 2026, 18:00 BRT)**: modal is permanently suppressed; bet is locked.
- The bet is scoped per league: a user in three leagues places three separate bets, one per league.

### Deadline Communication

- The confirmation step surfaces the exact deadline: "18:00 de 11/jun/2026 (BRT)."
- The "X dias" in "Fecha em X dias" is calculated dynamically from the current date.

## User Experience

**Primary flow (first-time user):**
1. User opens a league for the first time.
2. 4-step LeagueWelcomeModal plays through (existing).
3. On completion of the welcome modal, the 3-step bet modal opens immediately (no gap, no tap required).
4. User selects champion → taps "Escolher Vice →".
5. User selects vice (champion is greyed out) → taps "Revisar aposta →".
6. User reviews summary, reads deadline notice → taps "Confirmar aposta".
7. Bet is saved. Modal closes. User lands on the league page.

**Return flow (user with no bet yet):**
1. User opens the league again (did not complete the bet modal previously).
2. Bet modal opens directly (welcome modal is not shown again).
3. Same 3-step flow.

**Returning user with bet already placed:**
1. User opens the league.
2. No modal shown. User lands directly on the league page.

**Key UX details:**
- The modal occupies the full screen with the same dark teal gradient background as the welcome modal.
- Progress indicator: 3 horizontal dashes at the top. Active dash is yellow; others are dark/muted.
- "Voltar" button is always available on Steps 2 and 3 to allow the user to reconsider earlier picks.
- The modal cannot be dismissed by tapping outside or pressing back — the user must either complete or (if re-entering later) be given the option to skip (see Non-Goals).
- Flags use a 1:1 aspect ratio (square crop with rounded corners) as shown in the reference design.

## High-Level Technical Constraints

- The modal must integrate with the existing `champion_bets` table (per user, per league, unique constraint).
- The bet deadline (June 11, 2026, 18:00 BRT) must be computed server-side or from a fixed constant; client-side date drift cannot be used for enforcement.
- Official SVG flag assets must be sourced from an open-licensed dataset (e.g., flagcdn.com or country-flag-icons) with ISO 3166-1 country codes. The existing `TEAM_FLAGS` emoji map in `designReferences/data.jsx` is not suitable for product UI.
- The 32 Copa 2026 nations and the 12 featured teams must be maintained as a static ordered list in code, not fetched from the database.

## Non-Goals (Out of Scope)

- **Edit flow UI**: A dedicated "edit my bet" button or entry point on the league page is out of scope for this phase. The user can re-trigger the modal by clearing their bet in the DB during development testing, but no product-facing edit UI is included.
- **Admin tools**: No admin panel to view or manage champion bets.
- **Result adjudication**: Awarding the +50/+25 points after the Copa ends is out of scope.
- **Notifications or reminders**: Push or email reminders to place or update bets before the deadline are not in this phase.
- **Sharing**: No social sharing of the user's champion pick.
- **Skip/dismiss option**: The modal has no skip button in this phase — users who don't want to bet now will need to place a bet on re-entry or wait until the deadline.
- **Changing an existing bet**: No UI to edit a confirmed bet is included. The bet can only be changed by placing it again if not yet confirmed (within the same session via "Voltar").
- **League page changes**: The league detail page itself is not modified in this phase.

## Phased Rollout Plan

### MVP (Phase 1) — This PRD

- 3-step fullscreen bet modal (champion → vice → confirm).
- All 32 nations selectable; 12 featured in the top grid section.
- SVG flags.
- Triggered after welcome modal on first league entry; re-shown if bet not placed.
- Bet saved per-league; deadline enforced at June 11, 2026.
- Success criteria: modal renders correctly, bet is persisted to `champion_bets`, modal does not appear after bet is confirmed.

### Phase 2

- "Edit my bet" entry point visible on the league page before Copa kick-off.
- Deadline countdown badge visible on the league page.
- Success criteria: users can successfully update their champion/vice pick before the deadline.

### Phase 3

- Result adjudication: +50/+25 pts awarded automatically when Copa champion and vice are confirmed.
- Leaderboard updated to reflect pre-Copa bet results.
- Success criteria: all bets scored within 24h of Copa final result.

## Success Metrics

- **Bet placement rate**: ≥80% of league members place their champion/vice bet before June 11, 2026.
- **Step completion rate**: ≥90% of users who open Step 1 complete Step 3 (confirm).
- **Return completion**: ≥70% of users who dismiss the modal (app close mid-flow) complete the bet on their next visit.
- **Zero invalid bets**: no instances of champion and vice being the same team stored in the database.
- **Deadline adherence**: no bets accepted after June 11, 2026, 18:00 BRT.

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Users feel 7 steps (4 welcome + 3 bet) is too long on first entry | Both modals are lightweight and visual; keep each step under 5 seconds to complete. Consider showing a "you're almost there" cue after the welcome modal. |
| Users abandon mid-bet (between step 1 and 3) | Modal re-appears on next visit if bet is not confirmed. Progress state (champion already selected) is not persisted — user starts over, but Step 1 is fast. |
| Flag SVG library adds significant bundle weight | Use a CDN-hosted flag library (flagcdn.com) with lazy loading instead of bundling assets. |
| Users in multiple leagues feel the modal is repetitive | Each league modal is triggered once per league. The experience is per-league by design. Copy makes this clear: "Para esta liga." |
| Copa deadline changes (FIFA reschedules) | Deadline is stored as a constant that can be updated in one place without a schema migration. |

## Architecture Decision Records

- [ADR-001: Pre-Copa Bet Modal — 3-Step Fullscreen Modal Flow](adrs/adr-001.md) — Chose a 3-step fullscreen modal over a 2-step combined modal or an inline page, for design fidelity and focused UX.

## Open Questions

- **12 vs 16 featured teams**: The codebase `TOP_CANDIDATES` list has 16 teams, but the reference design grid shows 12 (3 rows × 4 columns). Should the featured section show 12 or 16? If 16, the grid becomes 4 rows. Recommend confirming the exact list with the product owner.
- **Modal skip on re-entry**: Should returning users (who haven't placed a bet) be able to dismiss the modal with a "Pular por agora" option, or is it mandatory every time until completed? Currently scoped as mandatory.
- **Copa kick-off time**: Is 18:00 BRT on June 11, 2026 the confirmed first match time? If FIFA changes the schedule, the deadline must be updated.
- **Team names in Portuguese**: All 32 team names should be confirmed in their official Portuguese form (e.g., "Holanda" vs "Países Baixos", "Alemanha" vs "Deutschland") before finalizing the static list.
