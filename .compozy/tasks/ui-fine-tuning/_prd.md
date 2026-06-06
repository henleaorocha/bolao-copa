# PRD: Platform Fine-Tuning (Login, Painel, Palpites, Mata-mata)

## Overview

A focused polish release for the Bolão da Copa 2026 platform, bundling five
user-facing refinements across four screens. The goal is to remove confusing or
stale copy, make the platform's progress legible at a glance, and bring the two
prediction screens (group-stage Palpites and knockout Mata-mata) to a single,
consistent experience that always shows the real result of finished matches.

- **Problem**: Login copy references a company context that no longer applies; the
  Painel progress card mixes a personal counter with a fixed group-stage denominator
  and ignores the knockout stage; finished matches don't show their real score on the
  Palpites screen, making it hard to compare prediction vs reality; the Mata-mata
  screen uses a different card layout and the user can't quickly land on the phase that
  is currently in play.
- **Who it's for**: Every league member using the pool during the tournament — both
  casual participants and competitive players tracking their accuracy.
- **Why it's valuable**: Clear, consistent screens reduce friction and build trust;
  showing actual results next to predictions is the core "did I get it right?" moment
  that drives engagement throughout the World Cup.

## Goals

- Replace login copy so it no longer references a company/employer or "Arkmeds.com".
- Turn the Painel progress card into a tournament-wide "games played" indicator out of
  the full 104-match schedule.
- Show the real score of every finished match on both prediction screens, side by side
  with the user's prediction.
- Unify the Mata-mata match card with the Palpites card layout and refresh its
  prediction-status labels.
- Make Mata-mata open on the phase that is currently in play (the earliest phase with
  open matches).
- Ship all five as a single, cohesive release with no regressions on existing flows.

## User Stories

- As a **first-time user on the login screen**, I want neutral copy that simply tells me
  to sign in with my Google account, so that I'm not confused by references to a company
  I may not belong to.
- As a **league member on the Painel**, I want to see how many tournament matches have
  already been played out of 104, so that I understand how far along the Copa is at a glance.
- As a **member reviewing my group-stage palpites**, I want to see the real final score
  next to my prediction for finished matches, so that I can immediately tell how close I was.
- As a **member on the Mata-mata screen**, I want the match cards to look and behave like
  the Palpites cards — including the real result and a clear status — so that the app
  feels consistent and I know whether each match is open, closed, or finished.
- As a **member opening Mata-mata mid-tournament**, I want the screen to land on the phase
  that's currently being played, so that I don't have to scroll past phases that are
  already over.

## Core Features

### 1. Login copy update (P0)

- Replace the description line to read **"Use sua conta Google para logar"** (remove the
  "da empresa" / employer reference).
- Replace the footer badge **"SSO autenticado · Arkmeds.com"** with **"SSO autenticado"**
  only (remove the "Arkmeds.com" portion).
- No behavioral change to the authentication flow.

### 2. Painel "Jogos já realizados" card (P0)

- Repurpose the existing predictions card into a tournament-progress card.
- Title: **"JOGOS JÁ REALIZADOS"**.
- Value: **count of finished matches / 104**, where 104 = 72 group-stage + 32 knockout
  matches.
- Subtitle: **"fase de grupos + mata-mata"**.
- The numerator is **tournament-wide** (same for every member) — it reflects how many of
  the 104 matches have a final result, not a personal prediction count.
- The previous personal "palpites feitos" counter is removed from the Painel (accepted
  trade-off — see ADR-001).

### 3. Real result on the Palpites screen (P0)

- For matches with status `finished`, the card displays the **real final score** in
  addition to the user's locked prediction, so the two can be compared at a glance.
- The display pattern matches the unified card (see Feature 4): real result prominently,
  the user's prediction shown alongside as the comparison reference.
- Open/closed (not-yet-finished) matches are unchanged.

### 4. Unified Mata-mata card + refreshed status (P0)

- The Mata-mata match card adopts the **same visual layout** as the Palpites card.
- Finished knockout matches show the **real result** (this already exists and is preserved).
- The prediction **status** is shown with a clear, consistent vocabulary across both
  screens, covering at least: **Palpitado** (prediction made), **Aberto** (open for
  predictions), **Fechado** (deadline passed / locked), plus the finished state and the
  "not yet defined" placeholder used by the bracket.
- Phase tabs and per-phase scoring multipliers on Mata-mata are preserved.

### 5. Mata-mata opens on the active phase (P1)

- On entering Mata-mata, the screen **auto-selects the earliest phase that still has at
  least one open (non-finished) match**.
- Concretely: if every match in the Round of 32 is finished, the screen opens on the
  next phase; the rule cascades forward, always landing on the first phase that still has
  open matches.
- If the entire knockout stage is finished, the screen opens on the **Final** (the last
  phase).
- The user can still freely navigate to any other phase via the existing tabs.

### Feature interactions

- Features 3 and 4 share one card pattern (per ADR-001); a finished match looks identical
  on both screens.
- Feature 2's denominator (104) and Feature 5's phase logic both depend on the existing
  match `status` (`scheduled`/`live`/`finished`) and phase model — no new data concepts.

## User Experience

- **Login**: Same single "Continuar com Google" flow; only the surrounding copy changes
  to neutral, employer-agnostic wording.
- **Painel**: The progress card now answers "how far along is the Copa?" — a number that
  ticks up as matches finish, capped at 104. It is shared context, identical for all
  members of a league.
- **Palpites & Mata-mata**: A consistent match card. Before a match: prediction inputs (or
  read-only locked prediction once the deadline passes) with a status chip. After a match:
  the real score, with the user's prediction shown next to it for comparison. Status chips
  use one shared vocabulary so the same word means the same thing on both screens.
- **Mata-mata entry**: The screen "follows the tournament" — it opens where the action is,
  reducing taps for the most common mid-tournament visit.
- **Accessibility/clarity**: Status must be conveyed by label text (not color alone);
  predicted-vs-actual must be visually distinguishable without relying solely on position.

## High-Level Technical Constraints

- Built on the existing match data model: status is `scheduled | live | finished`; phases
  follow `32nd → 16th → 8th → semi → 3rd_place → final`. No new tournament concepts are
  introduced.
- The 104 denominator is a fixed constant for the 2026 format (72 group + 32 knockout) and
  must stay consistent with the existing `GROUP_STAGE_MATCH_COUNT = 72`.
- "Finished" everywhere means the match has a final result (status `finished` with both
  scores present), consistent with current scoring/ranking logic.
- No change to authentication, scoring rules, or prediction deadlines.

## Non-Goals (Out of Scope)

- No changes to the scoring algorithm, phase multipliers, or ranking computation.
- No changes to the authentication/SSO mechanism (copy only).
- No new visualizations (no charts, no historical accuracy trends) beyond
  predicted-vs-actual on the card.
- No restoration of the personal "palpites feitos" counter elsewhere in this release.
- No live/in-progress score streaming beyond what the existing `status`/score data provides.
- No redesign of the Painel beyond the single repurposed card.

## Phased Rollout Plan

### MVP (Phase 1) — single release

All five changes ship together (per ADR-001):

1. Login copy update.
2. Painel "Jogos já realizados" card (finished / 104, tournament-wide).
3. Real result on the Palpites screen.
4. Unified Mata-mata card + refreshed status vocabulary.
5. Mata-mata opens on the active phase.

**Success criteria**: All five behave as specified with no regression to existing
prediction, locking, scoring, or ranking flows; the match card renders correctly across
group and knockout, in open / closed / finished / placeholder states, on mobile and desktop.

### Phase 2 (future, not committed)

- Optional surfacing of personal accuracy stats if demand arises.
- Optional hit/miss highlighting (e.g., emphasize exact-score hits) on the unified card.

## Success Metrics

- 0 regressions reported on login, prediction entry, locking, and ranking after release.
- Painel card correctly reflects the live finished-match count (spot-checked against the
  schedule) for 100% of observed states.
- Both prediction screens show the real result for every finished match (100% coverage in
  manual validation).
- Mata-mata opens on the correct active phase across the tournament lifecycle (verified for
  pre-start, mid-knockout, and fully-finished states).
- Qualitative: members can compare prediction vs result without leaving the screen.

## Risks and Mitigations

- **Lost personal counter perceived as a downgrade**: Some users may miss the "palpites
  feitos" number. Mitigation: stakeholder accepted the trade-off; revisit in Phase 2 if
  feedback warrants.
- **Inconsistent status vocabulary** between group and knockout confusing users.
  Mitigation: agree a single shared label set during TechSpec and apply it uniformly.
- **Edge cases in phase auto-advance** (tournament not started, all finished, mixed phases).
  Mitigation: explicit rules in Feature 5; validate each lifecycle state.
- **Regression on the richer Mata-mata screen** while aligning layout. Mitigation: preserve
  existing slot states, locked-prediction display, and multipliers; test each state.

## Architecture Decision Records

- [ADR-001: Single-batch delivery with a unified match-card pattern across Palpites and Mata-mata](adrs/adr-001.md) — Ship all five tweaks as one release and unify the two prediction screens on a shared card pattern rather than splitting waves or aligning ad hoc.

## Open Questions

- **Status vocabulary**: Exact final wording/set of status labels shared across both
  screens (e.g., keep `Palpitado/Aberto/Fechado/Encerrado/A definir`?) — to be finalized in
  TechSpec.
- **Finished-card emphasis**: Should an exact-score hit be visually highlighted on the
  unified card, or is plain predicted-vs-actual enough for this release? (Defaulting to
  plain unless decided otherwise.)
- **Live matches**: How should a match with status `live` be presented on the unified card
  (treated as closed/locked with no result yet)? Assumed locked-without-result for now.
