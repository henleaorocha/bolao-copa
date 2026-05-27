# PRD: Mata-mata — Knockout Bracket & Tournament Scoring

## Overview

Mata-mata is the knockout-stage screen of the bolão, covering the 2026 World Cup elimination rounds: Round of 32 → Round of 16 → Quarter-finals → Semi-finals → Third-place → Final (6 phases, 32 matches). It gives league members a single place to follow the bracket as it fills in, place higher-value predictions on each knockout match, and see those predictions turn into ranking points.

The screen launches **before any knockout team is known**. The Copa do Mundo 2026 group stage runs June 11–24; the Round of 32 begins June 28. So Mata-mata must be compelling and correct while every slot still reads "A definir", then come alive automatically as real matchups are confirmed. It does this with a fixed bracket skeleton (design-accurate placeholders like "Vencedor 1º Grupo A") whose slots are overwritten with real teams by the existing hourly match-sync routine.

Mata-mata also carries the bolão's headline scoring promise — "a partir das eliminatórias, cada palpite vale mais pontos" — implemented through per-phase multipliers (1.5× in the Round of 32 up to 4× in the Final). Because no scoring is computed anywhere in the product today (ranking and points are hardcoded to zero), this feature establishes the tournament-wide scoring engine that finally makes the ranking real.

Target users: all authenticated members of any bolão league.

## Goals

- Ship a bracket screen that is correct and engaging from day one, while all slots are still "A definir", and that auto-populates real teams within one hour of each matchup being confirmed.
- Let members place a prediction on every knockout match, with betting opening per phase as matchups are confirmed and locking at each match's kickoff.
- Deliver a working tournament-wide scoring engine so the ranking and user stats show real points (group, champion/vice, and multiplier-weighted knockout hits) — replacing today's hardcoded zeros.
- Match the approved desktop design reference and ship a fully responsive, no-horizontal-scroll mobile layout on first release.
- Have all of the above verified and stable before the Round of 32 starts on **June 28, 2026**.

## User Stories

**As a bolão participant**, I want to see the full knockout bracket organized by phase even before the Copa starts, so that I understand the path to the Final and feel the tournament building.

**As a participant during the group stage**, I want each knockout slot to clearly show which group position it depends on ("Vencedor 1º Grupo A"), so that I can reason about who might land there.

**As a participant when a phase unlocks**, I want to be told (via an in-app indicator) that a new round is open for predictions, so that I don't miss my window to bet.

**As a participant on a confirmed match**, I want to predict the score of a knockout match and know its multiplier, so that I can chase the higher points the elimination rounds are worth.

**As a competitive participant**, I want my correct predictions — group, champion/vice, and knockout — to add up into a single ranking, so that I can see where I stand against the league.

**As a mobile user**, I want to switch between phases and read every matchup without horizontal scrolling, and keep the shared bottom tab bar visible, so that the knockout screen is as usable on my phone as on desktop.

**As a participant after a knockout match finishes**, I want my points (base × phase multiplier) credited within about an hour, so that the ranking feels live on match day.

## Core Features

### F1 — Knockout Bracket Screen (`Chaveamento`)

The Mata-mata screen, reachable from the existing (currently disabled) "Mata-mata" sidebar item and the mobile bottom tab bar. It shows:
- Section label "ELIMINATÓRIAS · 6 FASES", title "Chaveamento", subtitle "A partir das eliminatórias, cada palpite vale mais pontos".
- A status banner before/at launch: "Mata-mata começa em 28 de junho — Os confrontos são definidos após a fase de grupos. Você poderá palpitar conforme cada fase libera."
- A phase selector (6 tabs/chips): 32 avos (1.5× · 16 jogos), Oitavas (2× · 8 jogos), Quartas (2.5× · 4 jogos), Semifinal (3× · 2 jogos), 3º Lugar (3.5× · 1 jogo), Final (4× · 1 jogo).
- Match cards for the selected phase, each showing: match label ("1/16 #1"), a status ("A definir" / open for betting / locked / finished), the two slots (placeholder label or real team + flag), the date window, and the phase multiplier badge.

### F2 — Bracket Skeleton with Design-Accurate Placeholders

A fixed 32-match knockout skeleton always exists, so the screen is fully populated and navigable before any team is known. Slots display human-readable dependencies — Round of 32 slots reference group positions ("Vencedor 1º Grupo A", "Vencedor 2º Grupo G"); later rounds reference prior matches ("Vencedor 1/16 #1"). The skeleton mirrors the official 2026 bracket topology.

### F3 — Automatic Matchup Fill (extends existing sync)

The existing hourly match-sync routine is extended to overwrite skeleton slots with real teams and flags as soon as the matchups are officially confirmed. No team is ever invented or inferred by the product — the external feed is the authority on who advances (see [ADR-001](adrs/adr-001.md)). Until a slot is confirmed it keeps its placeholder label. Fill happens within roughly one hour of confirmation; no external call occurs on page load.

### F4 — Per-Phase Knockout Predictions

Members place a score prediction on each confirmed knockout match (standard model — everyone bets the same real bracket, see [ADR-002](adrs/adr-002.md)). A match is open for prediction once both real teams are populated and closes at its kickoff. Slots still showing placeholders are not yet bettable and are clearly marked "A definir". Predictions reuse the same interaction members already know from group-stage palpites.

### F5 — Phase-Unlock Indicator

When a new phase's matchups become available for prediction, members are alerted in-app only: a dot/badge on the Mata-mata nav item (as in the design) plus an on-screen banner (e.g., "32 avos liberado! Faça seus palpites até 28/jun"). No push or email in this scope.

### F6 — Tournament-Wide Scoring Engine

A single scoring engine computes points for every bet type and feeds the existing ranking and user-stats surfaces (replacing hardcoded zeros), per [ADR-003](adrs/adr-003.md):
- Group-stage: +10 exact score, +5 correct outcome.
- Champion: +50; vice-champion: +25.
- Knockout: base hit (+10 exact / +5 outcome) × phase multiplier (1.5× / 2× / 2.5× / 3× / 3.5× / 4×).
Points are (re)computed when match results arrive through the existing result sync, so the ranking reflects finished knockout matches within about an hour.

### F7 — Responsive Mobile Layout

Mobile presents the bracket with the phase selector as a horizontal chip row and match cards stacked in a single column — every matchup readable with **no horizontal page scroll**, and the shared bottom tab bar always visible. The mobile design is produced fresh (no existing prototype) following the project's established mobile patterns (consistent with the Tabela screen's mobile treatment).

## User Experience

### Desktop flow

1. Member opens a league panel → clicks "Mata-mata" in the left sidebar.
2. The `/ligas/[id]/...` knockout page loads with the "Chaveamento" header and the status banner.
3. The phase selector defaults to "32 avos"; the member sees 16 match cards, each "A definir" with placeholder slots before the tournament, or with real teams once confirmed.
4. The member clicks a confirmed, open match to place a score prediction; the multiplier for that phase is shown.
5. The member switches phases via the tabs to view the whole bracket through to the Final.

### Mobile flow

The shared bottom tab bar gains a Mata-mata entry: the existing "Perfil" tab is **replaced** by "Mata-mata", and the bar is reordered to five tabs reading, left → right, **Mata-mata · Tabela · Painel · Palpites · Ranking** (i.e. right → left: Ranking, Palpites, Painel, Tabela, Mata-mata), keeping Painel centered.

1. Member taps "Mata-mata" (leftmost tab) in the bottom tab bar.
2. A horizontal chip row (32 avos … Final) sits below the title; tapping a chip switches the visible phase.
3. Match cards stack full-width in one column; every slot, date, and multiplier is readable without horizontal scroll.
4. Tapping an open match opens the prediction interaction; the bottom tab bar stays visible throughout.

### Onboarding & discoverability

- The previously disabled "Mata-mata" nav item becomes active; the dot/badge signals when a new phase opens.
- The status banner explains, before kickoff, why slots are "A definir" and when betting opens — setting expectations without a separate tutorial.

### Accessibility

- Phase tabs/chips are keyboard- and screen-reader-navigable with a clear active state.
- Placeholder vs. confirmed vs. locked vs. finished states are distinguishable by more than color (label/text), consistent with the rest of the app.

## High-Level Technical Constraints

- Must reuse the existing hourly match-sync routine for matchup fill and result ingestion (no new scheduled infrastructure) and must not make external API calls on the page-load path.
- The external football feed is the sole authority on which teams advance; the product must not compute or guess advancement.
- The scoring scheme is fixed by the already-documented point table; that table is the single source of truth for the scoring engine.
- Mobile: no horizontal page scroll; the shared bottom tab bar must remain visible — consistent with existing project mobile rules.

## Non-Goals (Out of Scope)

- Cascade or hybrid bracket prediction (each user predicting a full personalized bracket) — rejected in [ADR-002](adrs/adr-002.md).
- Computing the bracket/advancement ourselves from local standings (best-third placement logic) — rejected in [ADR-001](adrs/adr-001.md).
- Push notifications or email for phase unlocks — in-app indicator only this scope.
- Predicting advancing teams / "winner" picks separate from score predictions for knockout matches.
- Tie-break/penalty-shootout score modeling beyond what the result feed provides.
- A standalone scoring/ranking redesign screen — this feature feeds the *existing* ranking and stats surfaces, it does not redesign them.

## Phased Rollout Plan

### MVP (Phase 1) — Bracket screen + skeleton + auto-fill

- F1 bracket screen (desktop + F7 mobile), F2 skeleton with placeholders, F3 automatic matchup fill via extended sync.
- Read-only bracket that is correct and fully navigable before the Copa starts and auto-populates real teams.
- **Success criteria to proceed:** screen matches the design reference on desktop and is fully usable on mobile (no horizontal scroll, tab bar visible); a confirmed matchup appears on the screen within one hour of confirmation in a staging test.

### Phase 2 — Per-phase predictions + unlock indicator

- F4 knockout predictions (open on confirmation, lock at kickoff) and F5 phase-unlock in-app indicator.
- **Success criteria to proceed:** members can place and edit a prediction on a confirmed knockout match; predictions lock correctly at kickoff; the unlock indicator appears when a phase opens.

### Phase 3 — Tournament-wide scoring engine

- F6 scoring engine for group, champion/vice, and multiplier-weighted knockout hits, feeding the real ranking and stats.
- **Success criteria (long-term):** ranking and user stats show correct non-zero points for all bet types; knockout points reflect the phase multiplier; points update within about an hour of a result. **All three phases complete and verified before June 28, 2026.**

## Success Metrics

- **Launch readiness:** bracket screen live and correct (placeholders) before June 11, 2026; full feature verified before June 28, 2026.
- **Auto-fill latency:** real matchups appear on the screen within 1 hour of official confirmation.
- **Prediction participation:** ≥ 60% of active league members place at least one Round-of-32 prediction.
- **Scoring correctness:** ranking points match the documented scoring table across group, champion/vice, and knockout bets (validated against known fixtures).
- **Mobile quality:** zero horizontal-scroll defects; bottom tab bar present on every knockout view.

## Risks and Mitigations

- **External feed delays or relabels knockout matchups.** Mitigation: the skeleton always renders with placeholders, so the screen degrades gracefully to "A definir" if the feed is late — nothing breaks.
- **Low return engagement between phase unlocks** (inherent to the standard betting model). Mitigation: in-app dot/badge + on-screen banner when each phase opens.
- **Scoring correctness is high-stakes for trust.** Mitigation: treat the documented point table as the single source of truth and validate thoroughly against known results before the Round of 32 begins.
- **Tight calendar** — full feature (incl. scoring) must land before June 28, 2026. Mitigation: phased rollout lets the bracket ship first, with predictions and scoring as sequenced follow-ups within the same window.

## Architecture Decision Records

- [ADR-001: Knockout Matchup Auto-Fill via Static Skeleton + Sync](adrs/adr-001.md) — Own a placeholder bracket skeleton; the existing hourly sync fills real teams, with the external feed as the authority on advancement.
- [ADR-002: Standard Per-Phase Betting Model](adrs/adr-002.md) — Members bet the real, confirmed matchups as each phase unlocks; no upfront personalized bracket.
- [ADR-003: Mata-mata Establishes the Full-Tournament Scoring Engine](adrs/adr-003.md) — This feature builds the single scoring engine for group, champion/vice, and knockout, feeding the existing ranking.

## Open Questions

- Should the third-place match and the Final share one phase view or remain distinct tabs (the design shows them as separate tabs "3º Lugar" and "Final")? Assumed separate per the reference.
- Exact base-points definition for a knockout score prediction before the multiplier — assumed identical to group (+10 exact / +5 outcome); confirm there is no different knockout base.
- Should a member be able to edit a knockout prediction up until kickoff (assumed yes, matching group-stage behavior), or is there an earlier per-phase deadline?
- When the feed confirms a matchup, should an existing in-app indicator distinguish "new phase opened" from "a single new match within an already-open phase"?
- Mata-mata replaces "Perfil" in the mobile bottom tab bar. Perfil is currently disabled (non-functional) there, so nothing breaks today, but where should mobile profile access live once Perfil is built? (Desktop sidebar keeps Perfil.)
