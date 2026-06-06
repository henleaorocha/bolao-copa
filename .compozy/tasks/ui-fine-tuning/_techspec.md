# TechSpec: Platform Fine-Tuning (Login, Painel, Palpites, Mata-mata)

## Executive Summary

This is a UI-centric polish release on the existing Next.js app. Four of the five
changes are front-end only; one (the Painel card) needs a small additive change to the
league API response, and one (Mata-mata active phase) extends the pure
`buildBracketResponse` function with a new field. The unifying decision is to extract
shared match-presentation subcomponents (`StatusBadge`, `TeamRow`, `ScoreInputs`,
`FinalResult`) under `components/match/` and compose both `MatchRow` (group) and
`MatchCard` (knockout) from them, behind one five-state status vocabulary (ADR-002,
ADR-003).

The primary trade-off: we accept two outer card layouts and a handful of extra files
(shared subcomponents) instead of a single normalized base card. This minimizes
regression risk on two live screens and respects their genuinely different data shapes
(`MatchWithPrediction` vs `BracketSlotView`) at the cost of not being maximally DRY. No
database migrations, no auth changes, no scoring/ranking changes.

## System Architecture

### Component Overview

**New — `components/match/` (shared presentation)**
- `StatusBadge` — renders one of five states (`A DEFINIR`/`ABERTO`/`PALPITADO`/
  `FECHADO`/`ENCERRADO`) from a single discriminant. Owns colors + test ids.
- `TeamRow` — flag (via existing `flagcdn` `<Image>` pattern) + team/label text;
  supports placeholder (italic, slate, empty flag box).
- `ScoreInputs` — the two numeric inputs + `×`, editable; emits existing
  `input-home-*`/`input-away-*` test ids and `onInputChange(matchId, side, value)`.
- `FinalResult` — finished block: `Resultado: x × y` plus `Palpite: a × b` when a
  prediction exists; emits `final-score`/`finished-prediction` test ids.
- `matchStatus.ts` — pure helper deriving the `MatchStatus` discriminant for each
  screen (group inputs vs bracket slot).

**Modified — screen cards**
- `app/ligas/[id]/palpites/components/MatchRow.tsx` — composes shared pieces; adds a
  finished branch (`ENCERRADO` + `FinalResult`); inputs disabled when not open.
- `app/ligas/[id]/mata-mata/components/MatchCard.tsx` — composes shared pieces; `open`
  now splits into `ABERTO`/`PALPITADO` from `slot.prediction`.

**Modified — Painel**
- `app/ligas/[id]/components/StatsRow.tsx` — the third card becomes "JOGOS JÁ
  REALIZADOS" → `matches_played / 104`, subtitle "fase de grupos + mata-mata".
- `app/api/leagues/[id]/route.ts` — add `matches_played` to the response (count of
  finished matches already loaded).
- `lib/copa-teams.ts` — add `TOTAL_MATCH_COUNT = 104`.
- `lib/api/types.ts` — add `matches_played: number` to `LeagueDetail`; drop now-unused
  `guesses_made`/`guesses_total` from `UserStats` and `StatsRow`.

**Modified — Mata-mata active phase**
- `lib/bracket.ts` — `buildBracketResponse` computes `activePhase`; `BracketResponse`
  gains `activePhase: KnockoutPhase`.
- `app/ligas/[id]/mata-mata/page.tsx` — seed initial `selectedPhase` from `activePhase`
  on first load.

**Modified — Login**
- `app/login/page.tsx` — copy only at the two known lines.

### Data flow

Group: page → `GET /api/leagues/[id]/matches?phase=group` (already returns `status`,
`home_score`, `away_score` via `select('*')`) → `MatchRow`. No API change.
Knockout: page → `GET /api/leagues/[id]/bracket` → `buildBracketResponse` (now also
`activePhase`) → `MatchCard`.
Painel: page → `GET /api/leagues/[id]` (now also `matches_played`) → `StatsRow`.

## Implementation Design

### Core Interfaces

The shared status discriminant that every card and `StatusBadge` depend on:

```ts
// components/match/matchStatus.ts
export type MatchStatus =
  | 'placeholder' // bracket slot, no confirmed matchup (knockout only)
  | 'open'        // open for prediction, none saved
  | 'predicted'   // open for prediction, prediction saved
  | 'locked'      // deadline passed (incl. live), not finished
  | 'finished'    // real result available

// Group stage (Palpites)
export function groupMatchStatus(m: {
  status: 'scheduled' | 'live' | 'finished'
  is_deadline_passed: boolean
  prediction: unknown | null
}): MatchStatus {
  if (m.status === 'finished') return 'finished'
  if (m.is_deadline_passed) return 'locked'
  return m.prediction ? 'predicted' : 'open'
}

// Knockout (Mata-mata): maps existing SlotState + prediction presence
export function slotMatchStatus(
  state: 'placeholder' | 'open' | 'locked' | 'finished',
  hasPrediction: boolean
): MatchStatus {
  return state === 'open' && hasPrediction ? 'predicted' : state
}
```

`StatusBadge` signature: `function StatusBadge({ status }: { status: MatchStatus })`.

### Data Models

`BracketResponse` (in `lib/bracket.ts`) gains one field:

```ts
export interface BracketResponse {
  phases: BracketPhaseView[]
  newlyUnlockedPhase: KnockoutPhase | null
  activePhase: KnockoutPhase // earliest phase with a non-finished slot; else 'final'
}
```

`activePhase` rule (pure, inside `buildBracketResponse`): first phase in `PHASE_ORDER`
whose `slots.some(s => s.state !== 'finished')`; if none, the last phase (`final`).

`LeagueDetail` (in `lib/api/types.ts`) gains `matches_played: number`.
`UserStats` loses `guesses_made` and `guesses_total` (card removed). `lib/copa-teams.ts`
adds `export const TOTAL_MATCH_COUNT = 104` (72 group + 32 knockout). The existing
`GROUP_STAGE_MATCH_COUNT = 72` stays; `104` is asserted consistent with it.

### API Endpoints

No new endpoints. One modified payload:

- `GET /api/leagues/[id]` — response adds `matches_played` (integer). Computed from the
  already-loaded `finishedMatches` rows, counting those with non-null `home_score` and
  `away_score`. The per-user `guesses_made`/`guesses_total` computation is removed.
- `GET /api/leagues/[id]/bracket` — response adds `activePhase` (from
  `buildBracketResponse`). No request change.
- `GET /api/leagues/[id]/matches?phase=group` — unchanged (already carries scores).

## Integration Points

No external services beyond the existing `flagcdn.com` flag images (reused by
`TeamRow`). No auth or third-party API changes.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|----------------------|-----------------|
| `app/login/page.tsx` | modified | Copy at lines 124 & 134; trivial, no logic | Replace two strings |
| `lib/copa-teams.ts` | modified | Add `TOTAL_MATCH_COUNT = 104`; additive, low risk | Add constant |
| `lib/api/types.ts` | modified | `LeagueDetail.matches_played` added; `UserStats` guesses fields removed (compile-time surface) | Update type; fix references |
| `app/api/leagues/[id]/route.ts` | modified | Add `matches_played`; remove `guesses_made` calc; low risk (data already loaded) | Compute count, drop old calc |
| `app/ligas/[id]/components/StatsRow.tsx` | modified | Third card repurposed; medium visual risk | Re-label, swap data source |
| `components/match/*` | new | Shared `StatusBadge`/`TeamRow`/`ScoreInputs`/`FinalResult`/`matchStatus` | Create, preserve test ids |
| `app/ligas/[id]/palpites/components/MatchRow.tsx` | modified | Compose shared pieces; add finished branch; medium regression risk | Refactor, keep test ids |
| `app/ligas/[id]/mata-mata/components/MatchCard.tsx` | modified | Compose shared pieces; add `predicted` state; medium regression risk | Refactor, keep test ids |
| `lib/bracket.ts` | modified | `activePhase` added to pure fn + type; low risk | Compute + expose field |
| `app/ligas/[id]/mata-mata/page.tsx` | modified | Seed initial phase from `activePhase`; guard against overriding user nav | Seed once on load |

## Testing Approach

### Unit Tests

- `buildBracketResponse` `activePhase`: pre-start (→`32nd`), 32nd fully finished
  (→`16th`), mixed phases (earliest non-finished), all finished (→`final`). Inject
  `nowMs` (already supported).
- `matchStatus` helpers: each of the five states for group and knockout, including
  `live` → `locked` and open-with-prediction → `predicted`.
- Painel count: API returns `matches_played` = number of finished matches with non-null
  scores; verify denominator constant `104`.

### Integration Tests

- Reuse existing Playwright/test-id selectors. Verify `MatchRow` finished match renders
  `final-score` + `finished-prediction`; `MatchCard` open-with-prediction renders
  `PALPITADO`. Confirm no regression to save flow (`save-all-btn`, `input-home-*`).
- Mata-mata lands on the correct phase across lifecycle states (drive via seeded
  finished matches, per the project's authed E2E + time-machine seed harness).
- Login renders the new copy strings.

## Development Sequencing

### Build Order

1. **Constants + types** — add `TOTAL_MATCH_COUNT` to `lib/copa-teams.ts`; update
   `lib/api/types.ts` (`LeagueDetail.matches_played`, trim `UserStats`). No dependencies.
2. **Shared subcomponents** — create `components/match/` (`matchStatus.ts`,
   `StatusBadge`, `TeamRow`, `ScoreInputs`, `FinalResult`), porting current markup/test
   ids. Depends on step 1 (`MatchStatus` type lives with the helper; no type import
   needed, but keeps vocabulary aligned).
3. **Login copy** — independent; can land any time. No dependencies.
4. **Painel card** — update `route.ts` (`matches_played`) and `StatsRow.tsx`. Depends on
   step 1.
5. **MatchRow refactor (Palpites)** — compose shared pieces + finished branch. Depends
   on step 2.
6. **MatchCard refactor (Mata-mata)** — compose shared pieces + `predicted` state.
   Depends on step 2.
7. **Active phase** — `activePhase` in `lib/bracket.ts` + seed in mata-mata `page.tsx`.
   Depends on step 6 (page already consumes bracket; field added to same response).
8. **Tests** — unit (steps 2,7) + integration (steps 4,5,6,7). Depends on all above.

### Technical Dependencies

None external. All work is within the existing repo; no infra, migrations, or shared
team deliverables block it.

## Monitoring and Observability

No new metrics. The existing structured request logs on `/api/leagues/[id]` and
`/api/leagues/[id]/bracket` continue unchanged; `matches_played` and `activePhase` ride
in the existing 200 responses. No alerting changes.

## Technical Considerations

### Key Decisions

- **Shared subcomponents over a base card** (ADR-002). Rationale: lowest regression risk
  given divergent data shapes. Trade-off: more files, two outer layouts. Rejected: single
  normalized base card; canonicalizing `MatchCard`.
- **Five-state status vocabulary** (ADR-003). Rationale: meets "same word, same meaning"
  and adds knockout `PALPITADO`. Trade-off: knockout status now reads `prediction`.
  Rejected: visual-only alignment; dropping the `✓`.
- **Server-side pure `activePhase`** (ADR-004). Rationale: unit-testable, single phase
  source. Trade-off: one new response field. Rejected: client-side derivation.
- **No API change for Palpites results.** The matches endpoint already returns `status`
  and scores; only the card renders them now. Avoids touching a working endpoint.
- **Painel count is tournament-wide.** `matches_played` counts all finished matches
  (group + knockout), identical for every member — matches the PRD's repurposed card.

### Known Risks

- **Regression on the two refactored cards** (medium). Mitigation: preserve every
  existing `data-testid`; reuse current markup inside shared pieces; rely on existing
  Playwright coverage.
- **`activePhase` overriding user navigation** (low). Mitigation: seed `selectedPhase`
  once on first successful load, never on subsequent re-renders.
- **`live` match presentation** (low). Decision: `live` (past deadline, not finished)
  maps to `FECHADO` on both screens — no result shown until `finished`.
- **Removing `UserStats` guesses fields** (low). Mitigation: compiler surfaces every
  reference; the only consumer is the repurposed `StatsRow` card.

### Out of scope / deferred

Exact-score "hit" highlighting on the finished card is **not** included (PRD Phase 2);
`FinalResult` shows plain predicted-vs-actual.

## Architecture Decision Records

- [ADR-001: Single-batch delivery with a unified match-card pattern across Palpites and Mata-mata](adrs/adr-001.md) — Ship all five tweaks as one release and unify the two prediction screens.
- [ADR-002: Shared match subcomponents composed per screen](adrs/adr-002.md) — Extract `StatusBadge`/`TeamRow`/`ScoreInputs`/`FinalResult` and compose both cards, instead of one base card.
- [ADR-003: Unified five-state prediction-status vocabulary](adrs/adr-003.md) — One `A DEFINIR`/`ABERTO`/`PALPITADO`/`FECHADO`/`ENCERRADO` set; knockout gains `PALPITADO`.
- [ADR-004: Compute knockout active phase server-side as a pure function](adrs/adr-004.md) — Add `activePhase` to `buildBracketResponse`/`BracketResponse`; page seeds the initial phase from it.
