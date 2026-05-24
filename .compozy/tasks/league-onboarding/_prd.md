# PRD: League Welcome Onboarding Modal Flow

## Overview

New users entering a league — whether they just created it or joined via an invite link — land directly on the league page with no orientation. They must discover how scoring works, when deadlines fall, and that they can invite friends entirely on their own. This creates confusion, premature churn, and missed viral growth opportunities.

The League Welcome Onboarding Flow is a 4-screen modal sequence that appears automatically the first time a user accesses any league. It covers how the bolão works, time/deadline rules, the scoring system, and an invite prompt. After completing the flow the user lands on the league's main page. The modal is shown **per-league** — each new league a user joins or creates triggers a fresh welcome experience.

## Goals

- **Reduce onboarding confusion**: eliminate the most common first-session drop-offs caused by users not understanding scoring or deadline rules
- **Increase Day-7 retention**: users who complete onboarding and invite at least one friend show 40%+ higher return rates (industry benchmark); target ≥30% of new league members sending an invite during the flow
- **Drive league growth**: make the invite step the default action at moment of highest motivation (right after creation or joining), not a feature buried in league settings
- **Measure onboarding completion**: establish a baseline completion rate (target ≥80% of users reaching Screen 4 CTA)

## User Stories

**League creator:**
- As a league creator, I want to see a guided overview right after I create my league so that I understand how to run it without reading documentation
- As a league creator, I want to share my league link via WhatsApp immediately after creating it so that I can recruit friends while their interest is high
- As a league creator, I want to copy the invite link with one tap so that I can paste it in any chat

**New member (joined via invite):**
- As a new member who just followed an invite link, I want to understand how scoring and deadlines work right away so that I don't miss my first palpite window
- As a new member, I want to invite other friends to the league I just joined so that I can compete against people I know
- As a returning user entering a new league, I want to see the onboarding flow for that specific league so that I have the same orientation regardless of how many leagues I already belong to

## Core Features

### F1 — 4-Screen Modal Wizard

A full-screen modal (overlaying the league page) that guides the user through four ordered screens. Navigation is linear: Próximo advances, Voltar goes back. The user cannot skip the flow but can navigate freely between completed screens. A progress indicator (4 dots, current step highlighted in yellow) is always visible at the top of the modal.

**Screen 1 — Como funciona**
- Icon: spark/lightning (yellow rounded square)
- Label: `COMO FUNCIONA`
- Headline: "Bem-vindo ao [League Name]!"
- Body: "É simples: você palpita placares dos jogos da Copa e ganha pontos por acertos. No final, quem tem mais pontos leva a glória (e talvez um prêmio 👀)."
- CTAs: Próximo →

**Screen 2 — Regras de tempo**
- Icon: clock (yellow rounded square)
- Label: `REGRAS DE TEMPO`
- Headline: "Atenção aos horários"
- Body: "Palpites de Campeão e Vice fecham 1h antes do primeiro jogo da Copa. Cada palpite de partida fecha 1h antes do apito inicial daquele jogo. Depois disso, não tem mais como mexer."
- CTAs: ← Voltar | Próximo →

**Screen 3 — Pontuação**
- Icon: target/bullseye (yellow rounded square)
- Label: `PONTUAÇÃO`
- Headline: "Quanto vale cada acerto"
- Scoring table:

| Icon | Name | Subtitle | Points |
|------|------|----------|--------|
| 👑 | Palpite de Campeão | Acertar quem leva a taça | +50 |
| 🏆 | Palpite de Vice-Campeão | Acertar quem perde a final | +25 |
| 🎯 | Placar Exato (Grupos) | 2x1 = 2x1 | +10 |
| ✓ | Vencedor/Empate (Grupos) | Sem cravar o placar | +5 |
| ↗ | Multiplicador 32 avos | Sobre pontos da partida | 1.5x |

- Footer note: "↗ Eliminatórias valem mais: Oitavas 2x, Quartas 2.5x, Semi 3x, Final 4x."
- CTAs: ← Voltar | Convidar amigos →

**Screen 4 — Convide agora**
- Icon: share/upload (yellow rounded square)
- Label: `CONVIDE AGORA`
- Headline: "Chama a galera pra jogar"
- Body (creator context): "Sua liga foi criada! Bolão fica mais divertido com gente — manda o link pros amigos, família ou o time todo entrarem em **[League Name]**."
- Body (joiner context): "Você entrou em **[League Name]**! Chama mais amigos — bolão é mais divertido com gente que você conhece."
- Invite link display: read-only input showing `{SITE_URL}/join?token={invite_token}` + "Copiar" button (copies to clipboard)
- WhatsApp button: opens `https://wa.me/?text={encoded_message}` — message: "Oi! Entra na minha liga do Bolão da Copa — vamos disputar juntos 🏆 {SITE_URL}/join?token={invite_token}"
- Footer hint: "Você também pode convidar depois pelo botão **Convidar** no topo da liga."
- CTAs: ← Voltar | Pronto, bora jogar! ⚡

### F2 — First-Visit Detection

The modal auto-triggers when a user navigates to a league page and `league_members.onboarded_at` is null for that user+league combination. The flag is set when the user opens Screen 1 (not on final CTA completion), preventing re-triggering if the browser is closed mid-flow.

### F3 — Creation Trigger

After the league creation API returns successfully, the app navigates to the new league's page. Because `onboarded_at` is null for the new creator, the welcome modal fires automatically via the standard first-visit detection — no separate creation-specific trigger is needed.

### F4 — Context-Aware Invite Screen

Screen 4 adapts its body copy based on whether the current user is the league creator (`role === 'admin'`) or a member who joined via invite (`role === 'member'`). All other screens (1–3) are identical for both roles.

### F5 — Share Options on Screen 4

Two share actions only (no QR code, no native share sheet):
1. **Copy link**: copies `{SITE_URL}/join?token={invite_token}` to clipboard; button shows "Copiado!" feedback for 2 seconds
2. **WhatsApp**: opens `https://wa.me/?text={encoded_message}` in a new tab — works on mobile (opens native app) and desktop without requiring contact saving

## User Experience

**Entry points and trigger conditions:**
1. User creates a league → `CreateLeagueModal` navigates to `/ligas/{id}` → `onboarded_at` is null → modal fires
2. User follows `/join?token={token}` → joins league → navigates to `/ligas/{id}` → `onboarded_at` is null → modal fires
3. User visits `/ligas/{id}` for any league where their `onboarded_at` is null → modal fires

**Navigation rules:**
- Screen 1: only Próximo (no Voltar)
- Screens 2–3: Voltar + Próximo
- Screen 3: Voltar + "Convidar amigos" (advances to Screen 4)
- Screen 4: Voltar + "Pronto, bora jogar!" (closes modal, reveals league page)

**Visual design (follows design references exactly):**
- Two-zone layout per screen: top gradient zone (teal → green, contains icon + label + headline) + white content zone below
- Progress dots at top-left of gradient zone; active = yellow filled, inactive = muted grey
- Icons: yellow rounded square background with white/dark icon inside
- Primary CTA: full-width yellow pill button (or right-portion for paired Voltar/CTA layout)
- Secondary CTA (Voltar): ghost/outline button, left-aligned
- Backdrop: league page dimmed behind modal (consistent with existing `ConfigureModal` pattern)
- Modal is not dismissible by clicking the backdrop

**Accessibility:**
- Modal traps focus while open
- Escape key does not dismiss (intentional — user must complete flow)
- Progress indicator has `aria-label="Passo X de 4"`

## High-Level Technical Constraints

- Invite and WhatsApp share URLs must be built from `NEXT_PUBLIC_SITE_URL` — no hardcoded domains
- WhatsApp share must use the `wa.me/?text={encoded}` format (no phone number required, works universally on mobile and desktop)
- `league_members.onboarded_at` must be readable by the league detail page without an additional API round-trip (include in existing member/league fetch)
- The modal overlays after the league page has loaded in the background — it must not block initial page render
- No QR code generation is required

## Non-Goals (Out of Scope)

- QR code or any other sharing channel beyond copy link and WhatsApp
- A skip button or backdrop-click dismissal
- Pretty/slug-based invite URLs (e.g., `/i/{league-slug}`) — current token URL is sufficient
- Re-showing the modal after it has been completed for a league
- Per-screen analytics events (only the `onboarded_at` timestamp is tracked for now)
- A standalone "Rules" or "How it works" page accessible post-onboarding

## Phased Rollout Plan

### MVP (Phase 1) — Full scope

All 4 screens, both trigger paths (creation + first access), database flag, context-aware Screen 4 copy, copy-link and WhatsApp share. This feature is self-contained with no natural phase split — shipping the full scope is the MVP.

**Success criteria to ship:**
- Modal fires correctly on both trigger paths
- `onboarded_at` is set on Screen 1 open (idempotent if re-opened)
- Copy button writes the correct URL to clipboard
- WhatsApp link opens with the pre-filled message and correct invite URL
- Modal closes cleanly after Screen 4 CTA and user lands on the league page
- Completion rate ≥ 80% in the first two weeks post-launch

### Phase 2 — Potential future enhancements

- Per-screen analytics events to measure drop-off by step
- "Replay onboarding" option accessible from league settings
- Localization support if the app expands beyond Portuguese-speaking users

## Success Metrics

| Metric | Target |
|--------|--------|
| Onboarding completion rate (S1 open → S4 CTA click) | ≥ 80% |
| Invite action rate (WhatsApp click or copy on S4) | ≥ 30% |
| Day-7 retention lift vs. pre-onboarding cohort | Positive delta |
| Support questions about scoring/deadlines in week 1 | Decrease (qualitative) |

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| User closes browser on Screen 2–3, re-triggers full flow on next visit | Set `onboarded_at` on Screen 1 open so the modal does not re-trigger even for incomplete flows |
| WhatsApp link fails on some devices or browsers | Test `wa.me` on iOS, Android, and desktop Chrome/Safari before launch |
| Users feel 4 screens is too long and tap away | Each screen body is ≤3 lines; progress dots communicate the end is near; "Pronto, bora jogar!" creates a clear finish line |
| Invite link token leaked via shared screenshots | Invite token is the intended join mechanism; token invalidation on league close is a future concern outside this PRD scope |

## Architecture Decision Records

- [ADR-001: Per-League Welcome Onboarding Flow](adrs/adr-001.md) — Show all 4 screens on first access to each league, tracked by `onboarded_at` on `league_members`; selected over global-once and creator-only variants

## Open Questions

- Should `onboarded_at` be included in the existing `LeagueSummary` API response or fetched via a separate call to keep existing response contracts unchanged?
- If a user leaves and rejoins a league, should the welcome flow re-trigger? Current stance: yes (re-join resets `onboarded_at`) — confirm with team before implementation.
