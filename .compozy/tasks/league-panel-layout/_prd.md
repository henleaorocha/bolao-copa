# PRD: League Panel — Open League Dashboard

## Overview

The League Panel ("Painel") is the main dashboard screen that authenticated league members land on after entering their league. It gives each member a complete, at-a-glance picture of the league: their current standing, the champion bet deadline, prizes on the line, upcoming matches, their champion/vice bet, the full ranking, and the scoring scheme. The current league detail page (`/ligas/[id]`) shows only a header and members list — the Painel replaces this with a rich, data-connected dashboard that mirrors the approved design reference. The primary users are league members (regular participants) and league admins.

## Goals

- Deliver a dashboard that lets any member understand their position, points, and what's at stake within 5 seconds of arriving at the page.
- Surface the champion bet deadline prominently to drive bet completion before the Copa starts.
- Increase invite conversion by enabling one-tap WhatsApp sharing and clipboard copy from the sidebar invite button (desktop) and top-bar share button (mobile).
- Establish the visual shell for all future tab PRDs (Palpites, Tabela, Mata-mata, Ranking) to plug into the navigation (sidebar on desktop, bottom tab bar on mobile).

**Success signals:**
- Champion bet completion rate increases week-over-week until the Copa deadline.
- Members visit the Painel at least once per matchday.
- Invite link is used (copied or WhatsApp-shared) by at least 30% of leagues in the first week.

## User Stories

**As a league member,** I want to see my position, total points, number of guesses, and exact scores at a glance so that I know how I'm doing without digging through multiple screens.

**As a league member,** I want to see the champion bet deadline banner so that I don't miss the window to place (or revise) my champion and vice champion pick.

**As a league member,** I want to see the league ranking (top 5) directly on the Painel so that I know where I stand relative to my peers immediately.

**As a league member,** I want to understand the full scoring scheme — including all phase multipliers — so that I can make informed guesses as the tournament progresses.

**As a league member,** I want to share the league invite link via WhatsApp with one tap so that I can easily bring friends in without leaving the app.

**As a league member,** I want a clear way to navigate back to my leagues list so that I can switch between leagues easily.

**As a first-time visitor (pre-bet),** I want the champion banner to guide me to place my first bet with a clear CTA so that I don't miss the pre-Copa incentive.

## Core Features

### 1. Navigation Shell — Desktop (Sidebar)
A persistent left sidebar matching the design reference. Contains: league logo + name at the top, navigation items (Painel — active, Palpites, Tabela, Mata-mata, Ranking, Ligas, Perfil), an "CONVIDAR" button at the bottom, and the current user's avatar + name. All nav items except Painel are visually rendered but functionally inert in this phase. The "CONVIDAR" button triggers the invite share flow (see Feature 12).

### 2. Navigation Shell — Mobile (Top Bar + Bottom Tab Bar)
On mobile, the sidebar is replaced by two navigation elements:

**Top bar:** Displays the league logo/trophy icon + "BOLÃO / [League Name]" on the left. On the right: a share icon button that triggers the invite share flow. The league name area also acts as the **back to leagues list** CTA (tapping it navigates to `/ligas`).

**Bottom tab bar:** Fixed at the bottom of the viewport with five tabs — PAINEL (active, trophy icon), PALPITES, TABELA, RANKING, PERFIL. All tabs except PAINEL are visually rendered but functionally inert in this phase. The tab bar is the primary navigation mechanism on mobile.

### 3. Page Header
**Desktop:** Breadcrumb (trophy icon + league name) above a personalized greeting: "Olá, [first name]! 👋" with sub-line "Bora pra mais uma rodada de palpites?"

**Mobile:** Greeting "Olá, [first name]!" and sub-line displayed in the scrollable content area, below the top bar. No 👋 emoji on mobile (matches design reference).

### 4. Back to Leagues List CTA
**Desktop:** The "Ligas" item in the sidebar nav (inert in this phase) serves as the visual affordance. A back arrow or breadcrumb in the page header also navigates to `/ligas`.

**Mobile:** Tapping the league name / logo area in the top bar navigates back to `/ligas`.

### 5. Champion Bet Deadline Banner
A dark, full-width attention banner displayed until the Copa begins (June 11, 2026 21:00 UTC). Contains:
- Label: "ATENÇÃO · PALPITE DE CAMPEÃO FECHA EM"
- Live countdown: days and hours remaining
- Date/time of the first match: "México × África do Sul · 11/6 · 16:00"
- CTA button: **"Apostar Agora"** if the user has no champion bet placed; **"Revisar Aposta"** if they do. Both open the `PreCopaBetModal`.

The banner disappears once the Copa starts (after `BET_DEADLINE`).

### 6. League Prizes Strip
A compact horizontal strip. Contains:
- Left: medal icon + label "PRÊMIOS DA LIGA" + subtitle "O que está em jogo"
- Right: the prizes text as entered by the league creator (plain text — e.g., "R$ 500 pro 1º / Almoço pro 2º")

No expand, no modal. All content visible inline in the strip.

### 7. User Stats Row/Grid
Four stat cards showing the user's performance:
1. **Sua Posição** — current rank in the league (e.g., "4º" / "de 87")
2. **Pontos** — total accumulated points (highlighted/dark card)
3. **Palpites** — guesses made vs. total available (e.g., "0/72" / "fase de grupos")
4. **Acertos Exatos** — exact scores cravado

**Desktop:** 4-column horizontal row.
**Mobile:** 2×2 grid (Posição + Pontos on top row; Palpites + Acertos Exatos on bottom row).

Values show 0 when the tournament has not started or no guesses are made yet.

### 8. "Your Bet" Card — Champion & Vice
A card displaying the user's champion and vice champion picks. Only rendered after the user has placed a champion bet (`has_champion_bet` is true — hidden otherwise). Shows:
- Country flag + team name for Champion (with crown icon)
- Country flag + team name for Vice (with runner-up icon)
- "+50 PTS" badge (top right)
- If the deadline has not passed: "Alterar aposta · X dias restantes" button that opens `PreCopaBetModal`

**Desktop:** Left column in a 3-column lower row, alongside Upcoming Games.
**Mobile:** Full-width card, stacked below the stats grid.

### 9. Upcoming Games Stub
A visual placeholder section labeled "Próximos jogos / Palpite antes do prazo" in a card. No real match data is integrated in this phase. Shows a clearly labeled stub state (e.g., skeleton rows or "Em breve" badge) that reserves the layout space for the Palpites PRD to populate.

**Desktop:** Right 2 columns in the 3-column lower row.
**Mobile:** Full-width card, stacked below the "Your Bet" card.

### 10. Ranking — Top 5
Shows the top 5 members of the league ranked by points. Each row: position badge (gold for 1st, silver for 2nd, bronze for 3rd), avatar (initials + color), full name, points. The current user's row is highlighted. A "Ver tudo →" link at the top right navigates to the Ranking tab (inert in this phase, wired in the Ranking tab PRD).

**Desktop:** Left column in a 2-column bottom row, alongside the Scoring Scheme card.
**Mobile:** Full-width card, stacked below the Upcoming Games stub.

### 11. Scoring Scheme Card
A yellow/amber gradient card showing how points are earned, with all phase multipliers. Rows:
- **Palpite de Campeão** — Acertar quem leva a taça → +50 pts
- **Palpite de Vice-Campeão** — Acertar quem perde a final → +25 pts
- **Placar Exato (Grupos)** — 2x1 = 2x1 → +10 pts
- **Vencedor/Empate (Grupos)** — Sem cravar o placar → +5 pts
- **Multiplicador 32 avos** — Sobre pontos da partida → 1.5x
- Footer note: "Eliminatórias valem mais: Oitavas 2x, Quartas 2.5x, Semi 3x, Final 4x."

**Desktop:** Right column in the 2-column bottom row.
**Mobile:** Full-width card, stacked at the bottom of the scroll.

### 12. Invite Share Flow
Triggered by "CONVIDAR" button (desktop sidebar) or the share icon (mobile top bar). Presents two actions:
- **Copiar link** — copies the full invite URL (`{SITE_URL}/join?token={invite_token}`) to clipboard with a success toast.
- **Compartilhar no WhatsApp** — opens a WhatsApp deep link pre-filled with the invite URL and a short message. Works on mobile (opens the WhatsApp app) and desktop (opens web.whatsapp.com).

## User Experience

**Primary flow — returning member (desktop):**
1. Member opens `/ligas/[id]`. Sidebar renders with Painel active.
2. If Copa has not started: champion bet banner is the first content element above the fold.
3. Stats row immediately follows — member knows their position and points without scrolling.
4. If champion bet placed: "Your Bet" card shows picks alongside the Upcoming Games stub.
5. Scrolling down reveals Ranking top 5 and Scoring Scheme side by side.

**Primary flow — returning member (mobile):**
1. Member opens `/ligas/[id]`. Top bar shows league name + share icon. Bottom tab bar shows PAINEL active.
2. Champion banner is the first visible element below the greeting.
3. 2×2 stats grid follows.
4. "Your Bet" card (if bet placed), Upcoming Games stub, Ranking, and Scoring Scheme stack vertically.
5. Bottom tab bar remains fixed throughout scrolling.

**First-time member (no bet placed):**
1. "Your Bet" card is hidden.
2. Banner CTA reads "Apostar Agora" — opens `PreCopaBetModal`.
3. After completing the modal, banner CTA switches to "Revisar Aposta" and the "Your Bet" card appears in the layout.

**Back to leagues:**
- Desktop: click breadcrumb / "Ligas" nav item → `/ligas`
- Mobile: tap league name / logo in top bar → `/ligas`

**Invite flow:**
1. Member taps "CONVIDAR" (desktop) or share icon (mobile).
2. Two options appear: copy link / WhatsApp.
3. Copy: success toast confirms. WhatsApp: deep link opens external app or web.whatsapp.com.

**Accessibility:**
- All interactive elements meet WCAG AA color contrast.
- Champion bet countdown is readable via text (not color-only).
- Invite actions are keyboard-accessible on desktop.
- Bottom tab bar items have accessible labels.
- Mobile top bar tap targets ≥ 44×44px.

## High-Level Technical Constraints

- The Painel must consume the existing `GET /api/leagues/[id]` endpoint. Fields for user stats (position, points, guesses made, total guesses, exact scores) must be added to the existing response — no new page-level endpoints.
- `PreCopaBetModal` is already built and must be reused without modification.
- Invite URL is generated by the existing `GET /api/leagues/[id]/invite-link` endpoint.
- WhatsApp sharing must use URL scheme (no server-side component).
- `BET_DEADLINE` constant in `lib/copa-teams.ts` is the single source of truth for banner visibility.
- The page must render without errors when tournament data is absent (pre-Copa state).
- Responsive breakpoint (sidebar collapse) to be defined in TechSpec.

## Non-Goals (Out of Scope)

- Functional side nav links and bottom tab destinations (each is a future PRD).
- Real match data in "Próximos Jogos" — stub only in this PRD.
- Admin-specific features (configure league, remove members, delete league).
- Functional "Ver tudo" link for ranking — wired in the Ranking tab PRD.
- Push notifications or email reminders about the bet deadline.
- Leaderboard animations or real-time score updates.
- Post-Copa banner state (after June 11, 2026).

## Phased Rollout Plan

### MVP (Phase 1) — This PRD
All 12 features above, covering both desktop and mobile responsive layouts. Champion banner with dynamic CTA. Invite copy + WhatsApp. Back to leagues CTA. Upcoming Games as visual stub.

**Success criteria:** All sections render correctly for both states (pre-bet, post-bet). Banner disappears after `BET_DEADLINE`. Back to leagues navigates to `/ligas`. Invite copy and WhatsApp share both work on desktop and mobile.

### Phase 2 — Future PRDs
- Palpites tab: Upcoming Games stub populated with real match data + betting UI.
- Ranking tab: full ranking list accessible via "Ver tudo" link.
- Tabela and Mata-mata tabs: remaining nav destinations wired.

### Phase 3 — Post-tournament
Post-Copa state: champion banner area shows contextual message or is removed; "Your Bet" card reflects final result; stats show final standings.

## Success Metrics

- **Champion bet completion rate**: % of league members with a champion bet placed per league, measured daily until June 11. Target: >60% by deadline.
- **Invite link usage**: % of leagues where at least one member uses "CONVIDAR" (copy or WhatsApp) within 7 days of launch.
- **Painel visits per matchday**: Average unique member visits on days with scheduled matches. Baseline: 0 (new feature).
- **Back navigation usage**: % of sessions where "back to ligas" CTA is used, indicating multi-league engagement.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Stats data (position, points, exact scores) not yet returned by the API | Stub with 0/dash values; add required fields in TechSpec as API extension |
| Upcoming Games stub may look "broken" | Add "Em breve" label or skeleton rows with a clearly locked state |
| WhatsApp deep link behavior differs across browsers/OS | Test on iOS Safari, Android Chrome, and desktop; fall back to clipboard copy with instructions |
| Bottom tab bar inert links may confuse users expecting full navigation | Visual treatment (muted opacity, no pointer cursor) signals inactive state |
| Champion banner disappear logic edge cases at exact Copa start time | Use `BET_DEADLINE` from `lib/copa-teams.ts` as the single boolean gate |
| Mobile top bar "back" tap target too small | Ensure touch target ≥ 44×44px per iOS HIG / Material guidelines |

## Architecture Decision Records

- [ADR-001: League Panel Layout Approach](adrs/adr-001.md) — Single-scroll design-faithful layout selected over progressive disclosure or hero-only approaches.

## Open Questions

- **Stats endpoint fields**: Which specific fields need to be added to `GET /api/leagues/[id]` for `user_position`, `user_points`, `user_guesses_made`, `user_guesses_total`, `user_exact_scores`? To be resolved in TechSpec.
- **Upcoming Games stub visual**: Skeleton rows vs. lock icon vs. "Em breve" badge — final treatment to be decided in TechSpec.
- **WhatsApp share message copy**: Exact Portuguese pre-filled text (e.g., "Entre no meu bolão da Copa! 🏆 [link]") — needs product sign-off.
- **Back to leagues on desktop**: Breadcrumb only, or also a dedicated back arrow in the page header? To be decided in TechSpec.
