# PRD-3: Login Page Visual Redesign

**Status:** Draft  
**Date:** 2026-05-23  
**Author:** Henrique Rocha

---

## Overview

The current login page is a minimal placeholder: a plain gray background, a white card, and a generic heading. This PRD defines the redesign of the login page to match the approved visual design — a full-screen branded experience with the Bolão Copa identity, a glassmorphism login card, and a hardcoded teaser stats row. The OAuth logic (Google via Supabase) is not changed.

---

## Goals

1. Replace the plain gray login shell with a full-screen branded experience that matches the approved screenshot.
2. Establish visual brand consistency: dark petrol background, yellow/teal palette, bold "BOLÃO" typography, and the Copa 2026 identity.
3. Communicate trustworthiness and excitement at first touch — before the user logs in.
4. Work correctly on both desktop and mobile viewports.

---

## User Stories

- **As a first-time visitor**, I see a visually compelling branded screen that immediately communicates the Bolão Copa 2026 identity, so I feel motivated to log in.
- **As a returning user on mobile**, I see a properly scaled, readable login page that works on my phone without horizontal scroll or cramped elements.
- **As a user who clicked a login link**, I can clearly find and click "Continuar com Google" and proceed to authentication without confusion.
- **As a user who failed authentication**, I see a clear error message within the same visual context, without being redirected to a broken or unstyled page.

---

## Core Features

### F1 — Full-screen branded background
The login page renders a full-screen dark petrol (#244C5A) background with:
- A subtle grid pattern overlay (opacity ~7%, 40px spacing)
- Two radial blur glow accents: one teal/yellow in the top-right, one petrol in the bottom-left
- A large "2026" decorative numeral in the top-right corner (opacity ~4%, non-interactive)

### F2 — Brand header
Centered at the top of the screen:
- A pill-shaped badge: "Copa Mundo · USA · CAN · MEX" with a flame icon, in the primary yellow palette
- A trophy icon (yellow rounded square, rotated -6°) next to the "BOLÃO" wordmark in large white bold type
- Subtitle "BOLÃO DA COPA 2026" in teal (#0097A9), uppercase, wide tracking

### F3 — Glassmorphism login card
A rounded card (border-radius ~36px) with:
- Semi-transparent white background (rgba 8% opacity) and subtle white border
- Backdrop blur applied
- Title: "Entre para jogar 🎯" (white, bold)
- Subtitle: "Use sua conta Google" (white/60 opacity, small)
- The existing Google OAuth button, restyled: white background, `#slate-900` text, Google SVG icon, rounded-2xl, scale hover/active micro-animation
- Footer line with lock icon: "SSO autenticado" (white/40 opacity, 11px)

### F4 — Error state
When `?error=auth_callback_failed` is present in the URL, the error message renders inside or below the login card in the same dark-themed visual context (no broken gray fallback). Style: amber or red tinted pill/banner consistent with the dark background.

### F5 — Hardcoded stats row
Three stat tiles below the login card, in a 3-column grid:
- **48** / SELEÇÕES
- **104** / JOGOS
- **1** / PAIXÃO

Each tile has a semi-transparent white background (5% opacity), the number in primary yellow, and the label in white/50 uppercase tracking.

---

## User Experience

### Layout

```
┌─────────────────────────────────────────────────────┐
│  [ Copa Mundo · USA · CAN · MEX 🔥 ]     "2026"    │
│                                                      │
│        🏆  BOLÃO                                    │
│           BOLÃO DA COPA 2026                         │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  Entre para jogar 🎯                         │   │
│  │  Use sua conta Google                        │   │
│  │                                              │   │
│  │  [ G  Continuar com Google              ]    │   │
│  │                                              │   │
│  │  🔒 SSO autenticado                          │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │    48    │  │   104    │  │    1     │          │
│  │ SELEÇÕES │  │  JOGOS   │  │  PAIXÃO  │          │
│  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────┘
```

### Mobile behavior
- Content container narrows to `max-w-sm` (vs `max-w-lg` on desktop)
- "BOLÃO" heading scales down (e.g., `text-4xl` vs `text-6xl`)
- Stats row remains 3 columns at reduced padding
- Background decorative elements remain but are proportionally scaled

### Interactions
- Google button: `hover:scale-[1.01]` / `active:scale-[0.99]` micro-animation
- No other interactions on this page (it is a single-action screen)

---

## Non-Goals

- Changes to the Google OAuth flow, callback handling, or Supabase auth configuration
- Animated background effects (e.g., animated grid, moving glows)
- A/B testing or multiple layout variants
- Dynamic stats fetched from the database
- A shared design token system or CSS variables (separate PRD)
- New pages or navigation from the login screen

---

## Phased Rollout Plan

**Phase 1 (this PRD):**
- Implement the full redesigned login page: background, brand header, login card, error state, stats row
- Responsive: desktop + mobile
- All values hardcoded; no new APIs

There is no Phase 2 for this PRD. Future design system extraction is out of scope here.

---

## Success Metrics

| Metric | Target |
|---|---|
| Login page matches approved screenshot | 100% visual parity (spot-check by designer) |
| Google OAuth still works | Auth callback completes successfully in E2E test |
| No layout breakage on mobile (375px) | Zero horizontal overflow, all text legible |
| Error message visible when `?error=auth_callback_failed` | Renders within card or immediately below |

---

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Tailwind `backdrop-blur` not supported in older browsers used by some Arkmeds users | Low | Graceful fallback: card renders with slightly higher opacity background if blur is unsupported |
| "2026" and glow decorations cause layout jank on repaint | Low | All decorative elements use `pointer-events-none` and `position: absolute`; no layout impact |
| `InviteRedirectHandler` client component conflicts with new server component structure | Medium | Keep `InviteRedirectHandler` as a separate client subtree at the top of the page, unchanged |

---

## Architecture Decision Records

- [ADR-001: Login Page Visual Redesign Approach](adrs/adr-001.md) — Direct port from design reference chosen over design system or UI library; rationale: fastest delivery, zero new dependencies, design already resolved in reference code.

---

## Open Questions

- Should "Arkmeds.com" in the SSO footer line be a config value or hardcoded? (Currently hardcoded in this PRD; revisit if white-labeling is ever needed.)
- Does the `InviteRedirectHandler` need any style adjustments to work inside the new dark-background layout? (Likely not, as it has no visible UI, but verify during implementation.)
