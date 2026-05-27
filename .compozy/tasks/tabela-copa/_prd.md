# PRD: Tabela da Copa — Group Stage Standings Screen

## Overview

The Tabela da Copa screen displays the official Copa do Mundo 2026 group-stage classification for all 12 groups (A–L) and 48 national teams. It gives bolão participants a single, reliable place to check who is winning each group, how many goals have been scored, and which teams are on track to advance — directly inside the league panel they already use for predictions and rankings.

The screen solves the "second-screen problem": right now, users leave the app to check standings on FIFA.com, ESPN, or Google while their bolão is live. Keeping them inside the app during match days increases session depth and makes the bolão product stickier.

Target users: all authenticated members of any bolão league.

## Goals

- Eliminate the need for users to leave the app to check Copa group standings.
- Match the visual quality and data accuracy of official standings sources (FIFA, ESPN).
- Deliver standings within 1 hour of a final whistle with no external API calls on the page load hot path.
- Achieve correct, pixel-faithful desktop layout (matching the approved reference screenshot) and a fully functional, responsive mobile layout on first ship.

## User Stories

**As a bolão participant**, I want to see all 12 Copa 2026 groups and their current standings so that I can track which teams are advancing and assess how my predictions are doing.

**As a mobile user**, I want to quickly jump to a specific group (e.g., Group C for Brasil) so that I don't have to scroll through all 12 groups to find the one I care about.

**As a casual bolão member**, I want standings to load instantly and show accurate data so that I trust the app as my Copa reference source, not a secondary tool.

**As a user watching a live match**, I want standings to reflect scores within the hour after the final whistle so that I'm not seeing outdated tables on match day evening.

## Core Features

### F1 — Group Stage Standings Grid

Displays all 12 groups (A–L) as individual group cards. Each card shows:
- Group header: label ("GRUPO A"), team count badge ("4 SELEÇÕES")
- Column headers: SELEÇÃO · PTS · J · SG · GP
- Full Brazilian standard row data: Position number · Flag · Team name · **Pts** · J · V · E · D · GP · GC · SG
- Teams sorted by Pts → SG (saldo de gols) → GP (gols pró) → team name

Desktop layout: 3-column grid of group cards, all 12 groups visible on one scrollable page (matching approved reference screenshot exactly).

Teams in qualification positions (top 2 per group) are visually distinguished from teams in elimination positions (bottom 2).

### F2 — Mobile Group Navigation (A–L Chip Selector)

On mobile, a horizontal scrollable chip row at the top of the screen shows all 12 group letters (A, B, C … L). Tapping a chip scrolls the page to that group's card. The active chip is highlighted. This replaces the need to scroll the entire page to find a specific group.

### F3 — Responsive Group Card Layout (Mobile)

On mobile screens, group cards stack in a single column. Within each card, the standings table is fully readable without horizontal scroll. The columns GP and GC are hidden on mobile; only SG (saldo de gols) is shown in their place, matching the pattern used by ESPN and Sofascore on narrow viewports. All flag images and team names remain legible.

### F4 — Qualification Zone Highlight

Teams in positions 1–2 (qualifying for Round of 32) receive a visual indicator — a colored left border or subtle row tint — distinct from positions 3–4 (eliminated). This matches the visual language of official standings pages and helps users instantly read who advances.

### F5 — Hourly Data Freshness

Standings are computed from match scores stored in the local database. A background sync job updates match scores from the external football API at most once per hour. No external API call occurs on the page load path. If all matches in a group are `scheduled` (not yet played), all teams show 0 across all columns — the table is visible and correct before the tournament begins.

## User Experience

### Desktop Flow

1. User navigates to any league panel → clicks "Tabela" in the left sidebar.
2. The `/ligas/[id]/tabela` page loads with all 12 group cards in a 3-column responsive grid.
3. The page header reads "Tabela da Copa" with subtitle "Classificação oficial — 12 grupos, 48 seleções" and a "FASE DE GRUPOS" section label above it.
4. Each group card has a dark header (`#1C3A45` background) with the group letter in large type and the team count badge in yellow (`#FFB800`).
5. Below the header, a column labels row (SELEÇÃO, PTS, J, SG, GP) uses uppercase small caps.
6. Each team row shows: position number (1–4) · country flag emoji/image · team name · columns in order.
7. Teams in positions 1–2 have a teal left-border accent or row highlight.
8. Page is scrollable; no pagination.

### Mobile Flow

1. User taps "Tabela" in the bottom tab bar.
2. A horizontal chip row (A … L) appears below the page title. User taps "C" to jump to Group C.
3. The page scrolls smoothly to the Group C card.
4. The card is full-width, stacked. Columns visible: Pos · Seleção · Pts · J · SG (GP/GC hidden).
5. All 4 team rows fit cleanly in portrait orientation without horizontal scroll.
6. User taps "A" chip to jump back to Group A.

### Accessibility

- Flag images include an `alt` text with the country name.
- Column headers have clear labels (not just abbreviations in `title` attributes).
- Color alone is never the sole differentiator for qualification zones — a position number and visual weight also signal position.

### Navigation

The "Tabela" item in `PainelSidebar.tsx` and `BottomTabBar.tsx` currently has `href: null`. This feature sets it to `/ligas/[id]/tabela`.

## High-Level Technical Constraints

- Standings must be derived from the existing `matches` table (`phase = 'group'`, any `status`). No new external data source is introduced on the page load path.
- The external sync job must integrate with the existing `lib/football-api.ts` pattern.
- The screen lives at the route `/ligas/[id]/tabela` inside the existing league panel layout.
- Standings freshness must not require a user page refresh — server-side rendering or server components provide pre-computed data on each request.
- Flag display must use the same flag source already used on the Palpites screen (existing `home_flag` / `away_flag` URL pattern or emoji fallback).
- Mobile layout must be validated against a real device viewport (375px wide) with no horizontal overflow.

## Non-Goals (Out of Scope)

- **Knockout / Mata-mata bracket**: covered by the separate "Mata-mata" screen and its own nav item.
- **Team detail drill-down**: tapping a team row does nothing in MVP; no team profile page.
- **Bolão prediction overlay**: no "my predicted standings" or "pick accuracy" column on this screen.
- **Manual refresh button** or "last updated" timestamp visible to end users.
- **Group stage match list inside the card**: clicking a group card does not expand to show individual fixtures.
- **Share / export**: no PDF or WhatsApp share button for standings in MVP.
- **Form indicators** (W/D/L dots per team): deferred to a future phase.
- **Top scorers / statistics tab**: out of scope for this screen.
- **Admin sync controls**: sync job management belongs in admin tooling, not the user-facing Tabela screen.

## Phased Rollout Plan

### MVP (Phase 1) — This PRD

- All 12 group cards visible on desktop in the approved 3-column grid layout.
- Full Brazilian standard column set (Pos · Seleção · J · V · E · D · GP · GC · SG · Pts).
- Desktop layout pixel-faithful to the approved reference screenshot.
- Mobile layout: single-column cards, A–L chip selector, GP/GC hidden, SG visible.
- Qualification zone highlight (positions 1–2 vs 3–4).
- Hourly background sync wired up to populate match scores.
- "Tabela" nav item activated in sidebar and bottom tab bar.

**Success criteria to ship:** All 12 groups render correctly with seeded data; mobile at 375px shows no horizontal overflow; standings sort correctly for a simulated finished match day.

### Phase 2 — Live Match Awareness

- Teams in a currently live match show provisional standings (in-progress scores counted).
- A subtle "AO VIVO" badge appears on any group card with an ongoing match.
- Data freshness improves to ~5 minutes during active match windows.

### Phase 3 — Enrichment

- Form indicators (last 3 matches: W/D/L colored dots) as the last column.
- Tapping a group card expands to list that group's fixtures with scores.
- Share button: copy standings image to clipboard or share via Web Share API.

## Success Metrics

- **Tabela screen visits per match day** ≥ 40% of active league members visit the Tabela at least once during a Copa match day (measured after Phase 1 launch).
- **Bounce rate** < 20% of Tabela page visits end with the user leaving the app entirely (vs. navigating to another screen).
- **Data accuracy** 0 reported incidents of standings showing incorrect standings 2+ hours after a final whistle.
- **Mobile usability** 0 horizontal overflow or truncation bugs reported on standard mobile viewports (375px, 390px, 414px).
- **Load time** Page renders in < 1.5s on a standard mobile connection (measured as Time to First Contentful Paint).

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| External football API changes its Copa 2026 coverage or rate limits | Medium | Standings are computed locally; API is only hit by background sync, not by users. API failure degrades to slightly stale data, not a broken page. |
| Background sync job silently fails during a high-traffic match day | Medium | Add sync job health monitoring. Surface "last synced" data in admin dashboard (not user-facing). |
| Mobile layout breaks on non-standard devices (foldables, small Android) | Low | Test at 320px, 375px, 390px, 414px breakpoints before ship. Use integration tests to catch overflow regressions. |
| Copa 2026 group composition changes before launch (team withdrawals, replays) | Low | Match data is seeded from official Copa 2026 draw. DB migration can re-seed if FIFA announces changes. |
| Users confuse the official Copa standings with their personal bolão ranking | Low | Clear page header "Classificação oficial" and no bolão-specific data on this screen reduces ambiguity. |

## Architecture Decision Records

- [ADR-001: DB-Computed Standings with Hourly Background Sync](adrs/adr-001.md) — Standings are computed from the local DB; a background sync job updates match scores hourly from API-Football, keeping the page load path external-API-free.

## Open Questions

- **Sync job trigger**: Should the hourly sync be a Supabase Edge Function cron, a Vercel cron route, or a database-level scheduled job? (To be resolved in TechSpec.)
- **Live match handling in MVP**: Should `status = 'live'` matches count their current score toward standings in Phase 1, or only `status = 'finished'` matches? (Recommend: only `finished` for MVP simplicity.)
- **Flag image source**: Confirm whether flag images use the `home_flag` URL already in the DB or a separate emoji/icon system — consistency with the Palpites screen is required.
- **Group ordering on desktop**: Should groups always appear A → L left-to-right, top-to-bottom, or should the grid reflow based on viewport (e.g., 2-col at medium breakpoints)?
