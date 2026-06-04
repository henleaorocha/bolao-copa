# PRD: Trustworthy Match Data & Pre-Launch Validation

## Overview

The pool's scoring engine is correct, but the data that feeds it is not: the knockout bracket never fills, group letters and several team names are wrong against real-world data, and the team roster still lists a nation that did not qualify. Before the pool is shared publicly, the owner must be able to **validate the entire participant journey end-to-end** — invite, bet, deadline lock, scoring, ranking, and knockout — and trust that real games will load correctly.

This effort makes match data correct and **free**, and gives the owner a faithful environment to validate against before launch. It is for two audiences: **participants** (who need a correct, fillable tournament) and the **pool operator** (who needs confidence before going public and a way to keep results timely during the tournament).

## Goals

- Pass all seven pre-launch validation scenarios in `docs/VALIDACAO-MANUAL.md` against a faithful tournament simulation.
- Source all game data from a **free** provider with full 2026 coverage (no per-use cost, no quota gate).
- Make the knockout bracket fill correctly and accept predictions; make the group stage show correct groups, teams, and flags.
- Reconcile the team roster to the real 48 qualified nations.
- Give the operator a way to enter or correct any match result so scoring is never blocked waiting on the upstream source.
- Milestone: validation-ready before public launch.

## User Stories

**Participant**
- As a participant, I want every group match to show the correct teams, flags, and group so I can bet confidently.
- As a participant, I want the knockout bracket to fill with the real qualified teams so I can bet on each phase.
- As a participant, I want my points and ranking to update correctly after each finished match.

**Pool operator**
- As the operator, I want to validate the full participant journey in a realistic environment before inviting anyone.
- As the operator, I want to simulate tournament states (pre-Cup, in progress, finished) so I can verify scoring, ranking tiebreakers, and the champion bet.
- As the operator, I want to enter or correct a match result myself when the free source is late or wrong, so scoring stays timely.

## Core Features

**1. Free, correct match-data ingestion (MVP)**
Replaces the paid/limited provider with a free, openly-licensed source that covers 2026. Populates group matches with correct teams, groups, flags, dates, and venues, and the knockout matches in their correct bracket positions. Automatic ingestion runs on a **fixed hourly schedule, every day** — the same mechanism in place today — and is the default refresh path.

**2. Correct 2026 roster (MVP)**
The app reflects the real 48-team roster everywhere teams appear (predictions, flags, champion/runner-up picker, validity checks). Non-qualified teams are removed; real qualifiers are added.

**3. Operator result control (MVP, lean)**
Two named global operators (`hen.leao.rocha@gmail.com`, `henrique.rocha@arkmeds.com`) can enter or override any match's score and status via a **fixed, unlisted URL** they type directly — no link in the participant UI and no change to the current interface. Automatic ingestion is the default; **a match with a manual result entry is protected from automatic overwrite** (the hourly routine skips it), and only a global operator can change it afterward or release it back to automatic control.

**4. Faithful tournament simulation for validation (MVP, lean but kept)**
A simulation environment reproduces the real data faithfully and ships **several preset state snapshots** — **pre-Cup**, **in progress**, and **finished** — so the operator can drive every validation scenario without waiting for real matches. A single finished snapshot is insufficient: deadline lock needs open matches and the in-progress state must be observable. Kept in the repo for future re-validation; not heavily engineered.

**5. Reproducible, self-documenting validation run (MVP)**
A re-executable validation run populates a **pilot league with two participants holding assorted predictions**, drives the simulation across the preset states, walks all seven scenarios end-to-end (invite → bet → lock → per-match scoring → ranking & tiebreakers → knockout → champion), and emits a **written evidence record** that captures each step and its pass/fail outcome. Two bettors with differing predictions are required to observe ranking tiebreakers; the evidence record gives the operator auditable proof before going public, and the run can be re-executed for regressions or a future tournament ([ADR-005](adrs/adr-005.md)).

## User Experience

- **Operator validation flow:** choose a tournament state → open the app as a participant → walk the seven scenarios (invite, public/private visibility, bet saved, deadline lock, per-match scoring, ranking & tiebreakers, knockout betting & scoring) → confirm each behaves correctly.
- **Operator result control flow:** open the fixed unlisted URL → see a match with a missing/wrong result → enter the correct score/status → ranking reflects it, and the hourly routine no longer overwrites that match.
- **Validation-run flow:** select a preset state → run the two-participant pilot league through the seven scenarios → each step is recorded with its pass/fail outcome in the evidence record → re-run any time against the same or another state.
- **Participant flow:** unchanged in shape from today; the difference is the data is now correct and the bracket fills. No new participant-facing screens required for MVP.

## High-Level Technical Constraints

- Game data must be **free** — no per-use cost and no quota that blocks 2026 (see [ADR-002](adrs/adr-002.md)).
- Integrates with a free, openly-licensed external match-data source; the app must tolerate that source's update latency and occasional gaps.
- Matches are **global** (shared by all leagues); result control is therefore a single global-operator responsibility, not per-league.
- The real 2026 roster from the verified seed is authoritative ([ADR-003](adrs/adr-003.md)).
- Operator result control is restricted to two named accounts and reached via an unlisted fixed URL; it must not alter or link from the existing participant UI.
- Automatic ingestion must not overwrite a match that has a manual result entry ([ADR-004](adrs/adr-004.md)).

## Non-Goals (Out of Scope)

- A full admin console / rich operator UI (browse, dashboards, monitoring) — deferred to Phase 2.
- Real-time (sub-minute) live score updates — the free source is not real-time; timeliness is covered by operator override.
- Automated alerting/monitoring of ingestion health — Phase 2.
- Paid data provider integration.
- Any change to the scoring rules, deadline rules, or ranking tiebreakers (already correct and verified).

## Phased Rollout Plan

### MVP (Phase 1)
- Free-source ingestion (groups + knockout correct), roster reconciliation, lean operator result override (with manual-entry precedence), faithful simulation with preset states, and a reproducible two-participant validation run that produces a written evidence record.
- **Success criteria:** all seven validation scenarios pass via the recorded two-participant run across the preset states; the real 2026 schedule loads correctly with the right roster, groups, and fillable bracket.

### Phase 2
- Operator ergonomics (a simple results screen that highlights manually-controlled matches), tuned automatic-pull behavior, basic ingestion health visibility.
- **Success criteria:** an operator can manage results comfortably during a live test without developer help.

### Phase 3
- Ingestion monitoring/alerting and any resilience hardening proven necessary by live use.

## Success Metrics

- 7/7 validation scenarios pass before launch, evidenced by the written record from the two-participant validation run.
- The validation run is re-executable end-to-end (re-running it reproduces the evidence record without manual data fixes).
- 100% of group matches show correct team/group/flag; 100% of knockout slots map to the correct bracket position when teams are known.
- Roster matches the real 48 qualifiers (0 non-qualified teams listed).
- Data cost: **$0**.
- Time for an operator to correct a wrong/missing result: under a few minutes, and the correction survives the next hourly run.

## Risks and Mitigations

- **Free source publishes results late during the Cup** → operator manual override as a first-class path; scheduled hourly pulls as default.
- **Hourly routine reverts an operator correction** → manual-entry precedence: automation skips manually-controlled matches ([ADR-004](adrs/adr-004.md)).
- **Upstream format or availability changes** → pin captured samples for validation; ingest defensively (flag unmapped values instead of failing silently).
- **Roster seed itself has an error** → cross-check against the free source's 2026 team list during implementation.
- **Operator sets a match early and forgets it, ignoring a later official value** → operators can release a match back to automatic control; Phase 2 results screen highlights manually-controlled matches.
- **Knockout still won't accept predictions during validation (PT-name limitation)** → the finished-state snapshot must use real Portuguese team names so knockout betting and scoring validate; otherwise Scenario 7 stays blocked (see `docs/VALIDACAO-MANUAL.md` §1.6 and [ADR-005](adrs/adr-005.md)).

## Architecture Decision Records

- [ADR-001: Lean validation-first delivery approach](adrs/adr-001.md) — MVP scoped to passing the seven validation scenarios; polish deferred.
- [ADR-002: Adopt openfootball as the free match-data source, with global-operator override](adrs/adr-002.md) — free 2026 data; api-sports and the internal arkmeds site rejected.
- [ADR-003: Seed 020 is the source of truth for the 2026 team roster](adrs/adr-003.md) — reconcile `copa-teams.ts` to the real 48.
- [ADR-004: Manual result entry locks a match from automatic overwrite](adrs/adr-004.md) — manual entries survive hourly runs; operators can still edit or release.
- [ADR-005: Validation ships a reproducible, self-documenting two-user simulation across preset states](adrs/adr-005.md) — several preset snapshots; a re-runnable two-participant run walks the seven scenarios and emits an evidence record.

## Open Questions

- ~~For the validation pass, should the simulation environment ship with one canonical "finished tournament" snapshot, or several preset state snapshots?~~ **Resolved:** several preset state snapshots (pre-Cup, in-progress, finished) — see [ADR-005](adrs/adr-005.md).
- For Phase 2, is a minimal results screen enough, or will operators want bulk actions?
