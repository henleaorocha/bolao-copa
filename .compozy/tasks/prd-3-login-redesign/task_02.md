---
status: completed
title: Install lucide-react and rewrite login page visual shell
type: frontend
complexity: medium
dependencies: [task_01]
---

# Install lucide-react and rewrite login page visual shell

## Overview

Install `lucide-react` and fully rewrite the JSX `return` block of `app/login/page.tsx` to match the approved visual design. The file's auth check, redirect logic, and `searchParams` destructuring are preserved. The new shell introduces a full-screen dark background, grid + glow decorative layer, "2026" numeral, brand header, glassmorphism login card, responsive stats row, and a dark-themed error alert. All values are hardcoded; no API changes are made.

<critical>
- Read the PRD (F1–F5 and User Experience sections) and TechSpec ("Component Breakdown → app/login/page.tsx") before writing any code.
- The TechSpec provides the complete JSX structure with exact Tailwind classes and inline style values — follow them exactly.
- Do NOT change the auth check (`getSupabaseServerClient`, `supabase.auth.getUser`, `redirect`), the `searchParams` destructuring, or the `InviteRedirectHandler` import/render.
- Do NOT add client-side state, `'use client'`, or `useEffect` to this file — it must remain a server component.
- Do NOT modify `globals.css` — brand colors are inline `style={{}}` props only (ADR-004).
- Minimize code: no helper functions, no extracted sub-components.
- Tests for this task verify the file contains required visual structure and preserved auth logic.
</critical>

<requirements>
1. `lucide-react` MUST be installed as a production dependency (`npm install lucide-react`).
2. `app/login/page.tsx` MUST import `{ Trophy, Flame, Lock }` from `'lucide-react'`.
3. The root wrapper MUST have `min-h-screen relative flex items-center justify-center p-6 overflow-hidden` and `style={{ background: '#244C5A' }}`.
4. The decorative grid overlay MUST use a CSS `backgroundImage` with two `linear-gradient` directives and `backgroundSize: '40px 40px'` at `opacity-[0.07]`.
5. The "2026" decorative numeral MUST be `absolute`, `pointer-events-none`, `select-none`, with responsive font size `text-[8rem] md:text-[14rem]`.
6. The brand pill badge MUST show `<Flame size={12} />` and the text `"Copa Mundo · USA · CAN · MEX"`.
7. The trophy icon container MUST have class `-rotate-6` and render `<Trophy size={32} strokeWidth={2.5} />`.
8. The "BOLÃO" wordmark MUST use responsive classes `text-4xl md:text-6xl font-black text-white`.
9. The subtitle MUST display `"BOLÃO DA COPA 2026"` with `style={{ color: '#0097A9' }}`.
10. The login card MUST have `rounded-[36px] backdrop-blur-2xl` with `background: 'rgba(255,255,255,0.08)'` and `borderColor: 'rgba(255,255,255,0.15)'`.
11. The error alert MUST render only when `error === 'auth_callback_failed'` with `role="alert"` and dark-theme red styling (`rgba(239,68,68,0.2)` background).
12. The card MUST render `<LoginButton />` (imported from `@/components/LoginButton`).
13. The SSO footer MUST include `<Lock size={12} />` and the text `"SSO autenticado · Arkmeds.com"`.
14. The stats row MUST render three tiles with values `"48"` / `"SELEÇÕES"`, `"104"` / `"JOGOS"`, `"1"` / `"PAIXÃO"` using `key={s.label}`.
15. The content container MUST use responsive width `w-full max-w-sm md:max-w-lg`.
16. The existing `getSupabaseServerClient` auth check and `redirect('/dashboard')` MUST be preserved unchanged.
17. `<InviteRedirectHandler />` MUST remain rendered (before the visual shell).
</requirements>

## Subtasks

- [x] Run `npm install lucide-react` and verify it appears in `package.json` dependencies
- [x] Add `import { Trophy, Flame, Lock } from 'lucide-react'` to `app/login/page.tsx`
- [x] Preserve all lines above the `return` statement (auth check, redirect, searchParams) untouched
- [x] Replace the entire `return` block with the new branded shell per TechSpec "Component Breakdown → app/login/page.tsx"
- [x] Verify the `<InviteRedirectHandler />` render is present in the new return block
- [ ] Run the dev server (`npm run dev`) and visually verify `/login` matches the approved screenshot
- [ ] Test responsive layout: resize to 375px and verify no horizontal overflow; resize to 1024px and verify desktop sizing
- [ ] Test error state: navigate to `/login?error=auth_callback_failed` and verify the red alert renders inside the card
- [x] Run `npx tsc --noEmit` and confirm no TypeScript errors

## Implementation Details

**File to modify:** `app/login/page.tsx`

**Package to install:** `lucide-react` (production dependency)

The file remains a server component (`async function`). The auth + redirect block at the top is identical to the current file. Only the `return` block changes.

Brand colors used via `style={{}}` inline props (ADR-004):
- Background: `#244C5A`
- Primary (yellow): `#FFC72C`
- Secondary (teal): `#0097A9`
- All opacity-derived variants: `rgba(255,255,255,0.08)`, `rgba(255,255,255,0.15)`, etc.

See TechSpec "Component Breakdown → app/login/page.tsx" for the complete JSX with exact class strings and style values.

**Screenshot reference:** `designReferences/screenshots/01-login.png`
**Design reference code:** `designReferences/screens-onboarding.jsx` — `LoginScreen` function

### Relevant Files

- `app/login/page.tsx` — file being rewritten
- `components/LoginButton.tsx` — rendered inside the new card (must be task_01-restyled)
- `components/InviteRedirectHandler.tsx` — rendered unchanged at top of return
- `designReferences/screens-onboarding.jsx` — source design reference (LoginScreen component)
- `designReferences/screenshots/01-login.png` — approved visual target

### Dependent Files

- `tests/integration/auth.test.ts` — integration tests that exercise the auth flow starting from `/login`; must continue to pass after this change

### Related ADRs

- [ADR-001: Login Page Visual Redesign Approach](adrs/adr-001.md) — direct port from design reference
- [ADR-002: Icon Library — lucide-react](adrs/adr-002.md) — `lucide-react` chosen for Trophy, Flame, Lock
- [ADR-004: Brand Colors — Inline Styles](adrs/adr-004.md) — brand hex colors via `style={{}}`, no globals.css changes

## Deliverables

- `lucide-react` entry in `package.json` dependencies
- `app/login/page.tsx` fully rewritten with branded visual shell
- No other files created or modified
- TypeScript compilation clean
- `/login` visually matches `designReferences/screenshots/01-login.png`

## Tests

### Unit Tests

- [x] `app/login/page.tsx` contains `import { Trophy, Flame, Lock } from 'lucide-react'`
- [x] `app/login/page.tsx` contains `'#244C5A'` (dark petrol background applied)
- [x] `app/login/page.tsx` contains `'#FFC72C'` (primary yellow used)
- [x] `app/login/page.tsx` contains `'#0097A9'` (secondary teal used)
- [x] `app/login/page.tsx` contains `"BOLÃO DA COPA 2026"` (brand subtitle present)
- [x] `app/login/page.tsx` contains `"Copa Mundo · USA · CAN · MEX"` (pill badge text present)
- [x] `app/login/page.tsx` contains `"Entre para jogar"` (card title present)
- [x] `app/login/page.tsx` contains `"SSO autenticado · Arkmeds.com"` (SSO footer present)
- [x] `app/login/page.tsx` contains `"1"` and `"Paixão"` (custom stat tile present)
- [x] `app/login/page.tsx` contains `error === 'auth_callback_failed'` (error condition preserved)
- [x] `app/login/page.tsx` contains `InviteRedirectHandler` (client subtree preserved)
- [x] `app/login/page.tsx` contains `redirect('/dashboard')` (auth redirect preserved)
- [x] `app/login/page.tsx` contains `backdrop-blur-2xl` (glassmorphism class applied)
- [x] `app/login/page.tsx` contains `pointer-events-none` (decorative elements non-interactive)
- [x] `package.json` contains `"lucide-react"` in `dependencies`

### Integration Tests

- No new integration tests added — OAuth logic unchanged; existing `tests/integration/auth.test.ts` MUST continue to pass after this change.

## Success Criteria

- `npm install lucide-react` completes without errors; `package.json` and `package-lock.json` updated
- All unit test assertions above pass
- `npx tsc --noEmit` exits 0
- `/login` renders without Next.js runtime errors in dev mode
- Visual spot-check against `designReferences/screenshots/01-login.png` confirms parity
- `/login?error=auth_callback_failed` shows the red error alert inside the card
- Desktop (≥768px) and mobile (375px) layouts render correctly with no horizontal overflow
- Existing `tests/integration/auth.test.ts` suite passes
