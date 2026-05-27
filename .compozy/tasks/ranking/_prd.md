# PRD: League Ranking Screen

## Overview

League members currently have no way to see a full, live ranking of all participants. The panel shows only the top 5, and the "Ranking" navigation items are disabled. This feature delivers a dedicated ranking screen that shows the complete league standings with a visual podium for the top 3, the prize description, the logged-in user's position prominently highlighted, and a tiebreaker algorithm that rewards recent performance. The screen is fully responsive and matches the design reference (`designReferences/screens-extras.jsx`).

**Who it is for:** Any logged-in user who is a member of a league.

**Why it is valuable:** Competition is the core engagement driver of a bolão. Without a full ranking, members cannot track their progress relative to the whole group, reducing motivation to keep predicting. A compelling, always-accessible ranking screen turns passive participants into active competitors.

---

## Goals

- Every league member can see the complete, ordered ranking of all participants at any time.
- The logged-in user's position is immediately visible without scrolling or searching.
- Tiebreaker logic rewards the member who scored an exact prediction most recently, creating late-tournament relevance.
- The screen is fully responsive: identical information architecture on mobile and desktop.
- The "Ranking" navigation slot is activated in both the bottom tab bar (mobile) and the sidebar (desktop).

**Success criteria:**
- 100% of league members appear in the ranking table (no truncation).
- The logged-in user's "Sua posição" card is always visible without scrolling on initial load.
- Tiebreaker order is deterministic and verifiable.

---

## User Stories

### League member (any position)
- As a league member, I want to see a full ranking of all participants so I know exactly where I stand relative to everyone, not just the top 5.
- As a league member, I want my own position highlighted prominently so I can find myself instantly without scanning the whole list.
- As a league member, I want to see who is in the top 3 in a visual podium format so the competition feels exciting and motivating.
- As a league member, I want to see the prize description on the ranking screen so I'm reminded of what I'm competing for.

### League leader (position #1–3)
- As a top-3 member, I want to see my name on the podium with my exact score count so my achievement feels recognized.

### Tied member
- As a member tied on points with another participant, I want the tiebreaker to be based on who scored an exact prediction most recently, so late-tournament performance is rewarded, not just join date.

### Pre-tournament member
- As a member before any matches have been played, I want to see the full member list (sorted alphabetically) instead of a misleading podium with all zeros, so the screen still feels useful.

---

## Core Features

### 1. Top-3 Podium

Visual podium displaying the top 3 ranked members. Layout order is 2nd | 1st | 3rd, as per the design reference.

- 1st place: gold (#FFC72C / `palette.primary`), crown icon above avatar, tallest column.
- 2nd place: silver (#CBD5E1), medium height column.
- 3rd place: bronze (#FB923C), shortest column.
- Each entry shows: colored avatar with initial, first name, family name, rank number, and total points.
- Empty state: when all members have 0 points, the podium area is replaced by an illustrated message — "A pontuação começa quando os jogos rolarem" — and the full member table is displayed sorted alphabetically.
- If the league has fewer than 3 members, the podium renders only the available positions.

### 2. Prize Strip

Conditionally rendered block (only when the league has a prize description set) using the same `PrizesStrip` component as the panel. Appears immediately below the podium.

- Shows the label "Premiação" and the prize text from the league's `prizes` field.
- Yellow-themed visual consistent with the panel display.

### 3. "Sua Posição" Card (Logged-in User Highlight)

A visually distinct card pinned above the classification table showing the logged-in user's current standing.

- Dark background (`palette.dark`, #244C5A), yellow points (#FFC72C).
- Shows: rank number, full name, total points, and exact-score count.
- Always visible without scrolling on initial page load (positioned before the table, not inside it).
- Hidden if the user is not a member of this league.

### 4. Full Classification Table

A scrollable table listing all league members in ranked order.

- Columns on desktop: Position badge, Player (avatar + name + "Você" badge for self), Exact scores, Correct outcomes, Points.
- Columns on mobile: Position badge, Player (avatar + name + "Você" badge, with exact/outcome counts as sub-text), Points.
- Position badge color: gold for 1st, silver for 2nd, bronze for 3rd, neutral for 4th+.
- The logged-in user's row is highlighted with a tinted background (`palette.primary` at 15% opacity / `bg-yellow-50`).
- Empty state (0 pts for all): shows the table sorted alphabetically with 0 pts displayed.

### 5. Tiebreaker Algorithm

When two or more members have equal total points, ranking order is determined by:

1. **Most recent exact score**: the member who achieved an exact score prediction (correct home + away goals) on the match with the latest start date among all matches where they scored exact. The member with a more recent exact prediction ranks higher.
2. **Alphabetical order**: if the most-recent-exact-score match date is also the same (e.g., both scored an exact in the same match), members are sorted A→Z by full name.

This tiebreaker replaces the current `joined_at` tiebreaker used by the API.

### 6. Navigation Activation

- The "Ranking" item in `PainelSidebar` (desktop) is activated with `href="/ligas/[id]/ranking"` and `pointer-events-auto`.
- The "RANKING" tab in `BottomTabBar` (mobile) is activated with the same route.

---

## User Experience

### Entry Point

Users arrive at the ranking screen by tapping/clicking "Ranking" in the bottom tab bar (mobile) or sidebar (desktop). The existing disabled nav slots are activated with the new route.

### Primary Mobile Flow

1. User taps "RANKING" in the bottom tab bar.
2. Screen loads with: mobile top bar (title "Ranking", subtitle "N jogadores"), podium (or empty-state message), prize strip (if applicable), "Sua posição" card, and the full classification table below.
3. User can scroll through the full table; their row in the table is highlighted.
4. The "Sua posição" card remains above the table in the scroll order (not floating/sticky — just positioned before the table in the DOM).

### Primary Desktop Flow

1. User clicks "Ranking" in the left sidebar.
2. Screen loads with: desktop top bar (title "Ranking", subtitle "Sua posição entre N jogadores · Atualizado agora"), podium, prize strip (if applicable), "Sua posição" card, and the full classification table.
3. Desktop table shows additional columns: "Exatos" (exact scores) and "Acertos" (correct outcomes).

### Responsive Behavior

- Mobile (`< lg`): single-column layout, compact podium (smaller avatar and column heights), table with 3 columns (position, player with sub-text, points).
- Desktop (`≥ lg`): wider podium with larger avatars, table with 5 columns.
- No horizontal scrolling; all content fits the viewport at any breakpoint.

### Accessibility

- Position badges and podium columns use color + text labels (not color alone) for rank indication.
- The "Você" badge next to the user's name supplements the row highlight for screen readers.

---

## High-Level Technical Constraints

- The ranking data must come from the same Supabase-based data source used by the existing panel API; no external services.
- The ranking must include all league members, not just the top 5 returned today. The API must be extended to return the full member list with the correct tiebreaker applied.
- The page must use the existing `LeaguePanelContext` for user identity and league data to maintain consistency with other league sub-pages.
- The tiebreaker logic must be deterministic and applied server-side so that all clients see identical ranking orders.
- The `PrizesStrip` component must be reused as-is; no duplicate prize display logic.

---

## Non-Goals (Out of Scope)

- **Filtering by tournament phase or round**: the ranking always shows cumulative total points. Phase- or round-specific views are deferred.
- **Real-time live updates during matches**: the ranking refreshes on page load / manual pull-to-refresh. WebSocket or polling-based live updates are a future enhancement.
- **Pagination or virtual scrolling**: the full member list is rendered at once. For leagues of typical size (20–200 members), this is sufficient.
- **Historical snapshots**: the screen shows the current ranking only, not a point-in-time ranking for a past round.
- **Social sharing of the podium**: sharing the ranking or podium as an image is not in scope.
- **Admin-level ranking management**: league admins have no special controls on this screen.
- **Champion bet sub-ranking**: champion bet points are included in total points but are not broken out separately in the table.

---

## Phased Rollout Plan

### MVP (Phase 1) — This PRD

- Dedicated `/ligas/[id]/ranking` route.
- Top-3 podium with gold/silver/bronze visual treatment.
- Prize strip (conditional on league having a prize).
- "Sua posição" card above the table.
- Full classification table (all members) with correct tiebreaker.
- Empty state for pre-tournament (0-point) scenario.
- Navigation activation in sidebar and bottom tab bar.
- Full responsive support (mobile and desktop).

**Success criteria to proceed:** All league members appear; tiebreaker order is correct; navigation slots activate without breaking other tabs; mobile layout passes the no-horizontal-scroll rule.

### Phase 2 — Live Updates

- Ranking updates automatically during live matches (polling every 60 seconds or WebSocket push).
- Visual indicator ("Atualizado agora" → live dot) when data is fresh.

### Phase 3 — Engagement Enhancements

- Round-by-round or phase-based filter to let users see who performed best in a specific stage.
- Podium sharing as an image card.
- Move notification for significant rank changes ("Você subiu 3 posições!").

---

## Success Metrics

- **Coverage**: 100% of league members visible in the ranking table with no truncation.
- **Navigation adoption**: % of active league sessions that include at least one visit to the ranking screen (target: ≥ 40% within 2 weeks of launch).
- **Self-identification speed**: the "Sua posição" card is visible on initial load without scrolling on all tested device sizes.
- **Tiebreaker correctness**: zero support requests or bug reports about incorrect ranking order after launch.
- **Mobile compliance**: no horizontal overflow detected on 375px and 390px viewport widths.

---

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Users don't understand the tiebreaker | Medium | Add a short tooltip or footnote explaining "Em caso de empate, desempata pelo acerto exato mais recente" |
| Leagues with 1–2 members show a broken podium | Low | Render only available positions; podium gracefully handles 1 or 2 entries |
| Prize field is empty for many leagues | Medium | The prize strip is conditionally rendered — no dead space if no prize is set |
| Ranking feels stale without live updates | Medium | Phase 2 addresses live updates; MVP uses a clear "last updated" timestamp |
| Users confuse "Tabela" (tournament standings) with "Ranking" (bolão standings) | Low | Clear page title "Ranking" vs. "Tabela da Copa" already differentiates the two screens |

---

## Architecture Decision Records

- [ADR-001: Dedicated Ranking Page as a Separate Route](adrs/adr-001.md) — Chose a new `/ligas/[id]/ranking` route (full design-reference layout) over an inline panel expansion or a paginated list.

---

## Open Questions

- **Tiebreaker edge — no exact scores**: if two members are tied on points and neither has scored a single exact prediction, they fall through to alphabetical order. This is intentional per the spec, but should be confirmed as acceptable.
- **Guest / non-member access**: can a user who is not a member of the league view its ranking if the league is "open" (public)? The current spec assumes members only; if public access is desired, auth gating must be scoped accordingly.
- **Avatar display**: members without a custom avatar show a colored square with their initial. Confirm this matches the expected display for all members (current behavior in `RankingCard`).
