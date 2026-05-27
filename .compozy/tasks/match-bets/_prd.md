# PRD: Match Betting (Palpites) — Copa do Mundo 2026

## Overview

The Match Betting feature lets users in a Bolão league predict the score of every Copa do Mundo 2026 group-stage match before the betting window closes. Upcoming matches pulled from live World Cup data surface on the league panel, where users can tap any game to place or update a score prediction. A dedicated full-page Palpites screen lists all 72 group-stage matches with filtering by date and group. The feature is the core engagement loop of the Bolão: without a way to submit predictions, the league has no scores, no ranking movement, and no reason to return daily.

**Who it is for:** Any authenticated user who is a member of at least one league.

**Why it is valuable:** Betting on match scores is the primary reason users join the Bolão. The league panel becomes a daily touchpoint — users check upcoming matches, place predictions, and see how their bets compare to league averages after the window closes.

---

## Goals

- All league members can submit and update score predictions for every group-stage match before the 1-hour-before-kickoff deadline.
- The league panel surfaces the next 4 upcoming real World Cup matches from live API data within 3 seconds of page load.
- At least 80% of active league members submit predictions for the first matchday.
- Users never lose an unsaved prediction without being warned first.
- The Palpites page gives users a complete view of all 72 group-stage matches with meaningful filters so they can batch-submit predictions efficiently.
- The "Palpites da Liga" distribution panel (visible after deadline) drives users to return to the app after betting closes.

---

## User Stories

### League Member (primary)

- As a league member, I want to see the next 4 upcoming World Cup matches on my league panel so I know which games are coming up and whether I've already predicted them.
- As a league member, I want to tap a match on the panel and open a dedicated bet screen so I can enter my score prediction in a focused, distraction-free view.
- As a league member, I want to see my existing prediction pre-filled when I reopen a bet screen so I can review or adjust my answer without re-entering it.
- As a league member, I want a "Salvar palpite" button that becomes enabled only after I enter a valid score so I can't accidentally save an empty bet.
- As a league member, I want a confirmation modal when I press "Voltar" without saving so I don't lose work I intended to keep.
- As a league member, I want to tap "Ver Todos" on the panel to reach the full Palpites page so I can submit predictions for all upcoming matches in one session.
- As a league member, I want to filter the Palpites page by Hoje/Amanhã and by group (A–L) so I can focus on specific matches without scrolling through all 72.
- As a league member, I want each match row on the Palpites page to show my saved prediction (or "–" if none) so I can see my completion status at a glance.
- As a league member, I want a "Salvar todos" CTA on the Palpites page so I can batch-save all unsaved predictions at once.
- As a league member, I want the betting window for a match to close 1 hour before kickoff, with the match row showing "Fechado" and score inputs disabled after that time.
- As a league member, I want to see the aggregate prediction distribution (% pick for each outcome) on the bet screen after the window closes so I can see how the rest of the league bet.

### League Admin

- As a league admin, I benefit from the same betting experience as a regular member — no admin-specific betting actions exist in this phase.

---

## Core Features

### 1. Upcoming Matches Widget (League Panel)

The league panel displays a "Próximos Jogos" card showing the next 4 scheduled Copa do Mundo 2026 group-stage matches that have not yet kicked off. Each match card shows:
- Home and away team names, codes, and flag images
- Match date and time (localized to user's timezone)
- Group label (e.g., "GRUPO A")
- User's current prediction for that match, or a placeholder ("–") if none
- Status indicator: "ABERTO" (open) or deadline countdown if close

A "Ver Todos" button at the top-right of the card navigates to the full Palpites page. Match data is sourced from real Copa do Mundo 2026 fixture data via a cached external feed; the panel reflects the genuinely upcoming matches, not hard-coded placeholders.

### 2. Match Bet Screen

Tapping any match — from the panel or the Palpites list — opens a full-screen bet page for that specific fixture. The screen includes:

**Hero section (top):**
- Dark gradient background with home and away team flags, names, and codes
- "SEU PALPITE" label above two numeric score input fields separated by an "×"
- "Salvar palpite" button (disabled until both score fields contain a value ≥ 0; enabled once any score is entered)
- Match date, time, venue, and city
- Deadline reminder: "Fecha 1h antes do início"
- Phase badge (e.g., "GRUPO A") and "PALPITES ABERTOS" status badge

**After saving:** The save button shows a confirmation state ("Salvo!") and the hero reflects the saved scores.

**Lower section — two panels:**
- **"Quanto vale acertar"** panel: lists scoring rules — Placar exato +10 pts, Apenas vencedor/empate +5 pts, and the current phase multiplier (1× for group stage).
- **"Palpites da liga"** panel: hidden ("Visto após você palpitar" / locked) until the betting deadline for that match has passed. After deadline: shows aggregate distribution as a bar chart — % of league members who picked each outcome (home win / draw / away win), with no individual member names.

**Navigation:** A "Voltar" chevron at the top-left returns to the previous screen. If the user has made changes to the score inputs that differ from the last saved state, pressing "Voltar" triggers the unsaved-changes modal.

### 3. Unsaved-Changes Modal

When the user presses "Voltar" on the bet screen with unsaved score changes, a modal appears with:
- Title: "Sair sem salvar?"
- Body: "Seu palpite não foi salvo. Você pode voltar e modificar até 1h antes do início do jogo."
- CTA primary: "Salvar e sair" (saves the current input, then navigates back)
- CTA secondary: "Sair sem salvar" (discards changes, navigates back)
- Dismiss: tapping outside or pressing "×" returns to the bet screen without action

### 4. Full Palpites Page

Accessible via "Ver Todos" from the panel or directly from the left sidebar navigation. Displays all 72 Copa do Mundo 2026 group-stage matches.

**Header:**
- Title: "Palpites"
- Subtitle: "Chute os placares antes do início de cada jogo."
- Phase label: "FASE DE GRUPOS · 72 JOGOS"
- "Salvar todos" CTA button (top-right): saves all matches with unsaved score inputs in a single action; shows disabled when no unsaved changes exist.

**Date filter tabs (horizontal pill row):**
- Todos (count)
- Hoje (count)
- Amanhã (count)

**Group filter row (scrollable horizontal chips):**
- TODOS, GRUPO A, GRUPO B, … GRUPO L

**Match list — grouped by date:**
- Section header: "QUARTA · 11 JUN" with match count ("12 jogos")
- Each match row shows: group badge, date/time, home team (flag + name + code), score input fields (or saved prediction), away team (code + name + flag), status badge ("PALPITADO" with checkmark if saved, "ABERTO" if open, "FECHADO" if deadline passed), "Detalhes →" link to the bet screen
- Rows with an unsaved prediction highlight the score inputs
- Rows past the deadline show disabled inputs and a "FECHADO" badge

### 5. Bet Persistence and Editing

- A prediction is tied to the user + league + match combination.
- Users may update their prediction any number of times until the deadline (1 hour before kickoff).
- After the deadline, the score inputs on both the bet screen and the Palpites list are disabled and the match is marked "FECHADO".
- Saving a prediction always replaces the previous value — no versioning or history exposed to the user.

### 6. League Bets Distribution (Post-Deadline)

After the betting deadline passes for a match:
- The "Palpites da liga" panel on the bet screen becomes visible.
- It shows the percentage of league members who predicted each outcome (home win, draw, away win) as a segmented bar chart.
- No individual member predictions are revealed — only aggregate percentages.
- The panel is not visible before the deadline and is not visible on the Palpites list view (only on the bet detail screen).

---

## User Experience

### Key Persona: Daily Bettor

Marco is a league member who checks the app every morning. He opens his league, sees 2 matches coming up today that he hasn't bet on yet, taps the first one, enters "2 × 1", saves, taps back, taps the second match, enters "0 × 0", saves, and closes the app. Total time: under 90 seconds. The panel's "ABERTO" badges make it immediately clear which matches still need attention.

### Key Persona: Batch Bettor

Julia opens the app every few days. She taps "Ver Todos", filters to "Amanhã", sees 4 upcoming matches, enters scores on each row's input fields directly, then hits "Salvar todos". If she navigates away before saving, the modal catches her.

### Primary Flows

**Flow 1 — Panel → Single Bet:**
1. User opens league detail page → sees "Próximos Jogos" card with up to 4 matches
2. Taps a match card → full-screen bet page opens
3. Inputs home score and away score → "Salvar palpite" button enables
4. Taps "Salvar palpite" → button shows "Salvo!" confirmation
5. Taps "Voltar" → returns to league panel (no modal, because bet was saved)

**Flow 2 — Panel → Back Without Saving:**
1. User opens bet screen, changes scores, does not save
2. Taps "Voltar" → unsaved-changes modal appears
3. Taps "Salvar e sair" → bet is saved and user returns to panel
   — OR —
3. Taps "Sair sem salvar" → user returns to panel, changes lost

**Flow 3 — Full Palpites Page Batch Submission:**
1. User taps "Ver Todos" on panel → Palpites page loads
2. Selects "Hoje" tab → sees only today's matches
3. Enters scores in each open row
4. Taps "Salvar todos" → all inputs saved in one operation
5. Each row transitions from "ABERTO" to "PALPITADO"

**Flow 4 — Viewing League Distribution After Deadline:**
1. A match's deadline has passed → bet screen is opened from Palpites list
2. Score inputs are disabled ("FECHADO")
3. "Palpites da liga" panel is now visible with outcome percentages
4. User can see how their prediction compares to the group consensus

### UX Considerations

- Score input fields accept only non-negative integers; no decimals or negative values.
- On mobile, opening the score input should raise a numeric keypad.
- The "PALPITES ABERTOS" / "FECHADO" status must be computed client-side from the match kickoff time minus 1 hour to avoid stale states.
- The Palpites page sidebar navigation item shows a notification dot when the user has unsubmitted predictions for today's matches (not in MVP — Phase 2).
- Flag images use the team codes from `lib/copa-teams.ts` to avoid broken images for all 48 nations.

---

## High-Level Technical Constraints

- Match data must reflect the real Copa do Mundo 2026 schedule; no hard-coded fixture placeholders in production.
- The external match data source must be queried with server-side caching to stay within rate limits. The app must remain functional if the external source is temporarily unavailable (show cached data; never show an error that breaks the page).
- Predictions are scoped to user + league + match: a user in two leagues has independent predictions per league.
- The 1-hour deadline enforcement must be computed server-side to prevent client clock manipulation.
- The Palpites page must load the first visible matches in under 3 seconds on a typical mobile connection.

---

## Non-Goals (Out of Scope)

- **Knockout-stage bets:** This PRD covers only the 72 group-stage matches. Knockout round predictions (round of 32, quarterfinals, semis, final) are a separate feature.
- **Live score updates during matches:** The app will not show real-time goals or score changes during an active match.
- **Individual member bet reveal:** The league distribution panel shows percentages only, never individual names or scores.
- **Bet history or audit log:** Users see their current prediction only; no revision history is exposed.
- **Push notifications for deadlines:** Alerts reminding users of upcoming bet deadlines are not included in this phase.
- **Admin override:** League admins cannot place bets on behalf of other members or extend deadlines.
- **Odds or point predictions:** The app shows fixed point values per outcome (+10/+5/multiplier); no dynamic odds.
- **Group standings table:** Displaying the Copa do Mundo live standings table is a separate feature not included here.

---

## Phased Rollout Plan

### MVP (Phase 1) — Core Betting Loop

- Upcoming Matches Widget on league panel (next 4 real matches from live data)
- Match Bet Screen with score inputs, save button, and "Quanto vale acertar" panel
- Unsaved-changes modal on back navigation
- Full Palpites Page with Todos/Hoje/Amanhã tabs and Grupo A–L filters
- "Salvar todos" batch save on Palpites page
- Bet persistence: save, retrieve, update (until deadline)
- Deadline enforcement: inputs disabled after 1h before kickoff
- "Ver Todos" CTA linking panel to Palpites page

**Success criteria to proceed to Phase 2:** ≥ 70% of active league members submit at least one prediction within the first 48 hours of launch.

### Phase 2 — Distribution and Engagement

- League Palpites distribution panel on bet screen (post-deadline, aggregate percentages only)
- Notification dot on Palpites sidebar item when today's predictions are incomplete
- Palpites page "Amanhã" tab pre-filtered as the default when today has no open matches

**Success criteria to proceed to Phase 3:** Average predictions-per-member-per-matchday ≥ 8 (out of 12 group-stage matches per round).

### Phase 3 — Completion and Polish

- Knockout-stage betting (separate PRD)
- Push notification reminders for upcoming bet deadlines
- Palpites completion progress bar on league panel ("você palpitou 10/12 jogos de hoje")

---

## Success Metrics

- **Prediction submission rate:** % of active league members who submit at least 1 prediction per matchday — target ≥ 80%.
- **Palpites completion rate:** Average % of group-stage matches predicted per active user by end of group stage — target ≥ 60%.
- **Panel → Bet screen conversion:** % of users who tap a match card on the panel and complete a save — target ≥ 70%.
- **Unsaved-changes modal save rate:** % of modal appearances where the user chooses "Salvar e sair" vs. "Sair sem salvar" — monitors whether the modal effectively recovers intent.
- **Page load time:** Palpites page first-contentful paint under 3 seconds on mobile (p75).
- **Zero data loss incidents:** No reports of predictions saved by the user but not persisted.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| External match data API is unavailable on matchday | Users see stale or missing match schedule | Server-side cache of last successful fetch shown as fallback; visible "dados podem estar desatualizados" banner if cache is older than 6h |
| 2026 World Cup schedule changes (kickoff time adjustments) | Users miss betting window or bet on a postponed match | Re-fetch schedule daily; display live kickoff times; if a match is postponed, the deadline extends automatically based on the new time |
| Users confused by disabled inputs after deadline | Frustration, support tickets | Clear "FECHADO" badge and locked visual state on inputs; tooltip on hover/tap explaining the deadline |
| Low first-day adoption | Ranking stays flat, engagement drops | In-app prompt on league panel: "X jogos abertos hoje — palpite agora!" nudge card if user has zero predictions for today's matches |
| Score inputs accepting invalid values (letters, negatives) | Bad data persisted, scoring errors | Input validation enforced on both client (numeric keyboard, min=0) and server (validate on save) |

---

## Architecture Decision Records

- [ADR-001: Dedicated Bet Screen + Full Palpites Page as Primary Betting Experience](adrs/adr-001.md) — Chose a full-screen dedicated bet page (matching design references) over inline panel inputs or single-surface list editing.

---

## Open Questions

- **API Football key ownership:** Who holds the API key and which plan tier will be used for production? The free tier (100 req/day) covers development; a paid plan may be needed for launch depending on user count and polling frequency.
- **Phase multiplier values for knockout rounds:** The design shows "1×" for the group stage. What are the multipliers for round of 32, quarterfinals, semis, and final? Required for the "Quanto vale acertar" panel on future phases.
- **Tie-breaker for equal points in ranking:** If two members have the same points, what is the ranking tiebreaker? This affects scoring logic but is not needed to launch the prediction submission feature.
- **"Palpites da Liga" tab in league detail:** The brief mentions this tab should only appear after the betting window closes. Is this tab scoped to a specific match or to the overall group-stage deadline? Needs clarification for the tab visibility rule implementation.
