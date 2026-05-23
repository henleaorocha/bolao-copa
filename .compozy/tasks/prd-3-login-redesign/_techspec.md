# TechSpec: Login Page Visual Redesign (PRD-3)

**Status:** Draft  
**Date:** 2026-05-23  
**PRD:** [PRD-3: Login Page Visual Redesign](_prd.md)

---

## Executive Summary

Two production files change; one package is added. `app/login/page.tsx` is fully rewritten (JSX shell only — auth logic preserved). `components/LoginButton.tsx` gets new Tailwind classes and an updated label. `lucide-react` is installed for three icons (Trophy, Flame, Lock). No new files, no API changes, no database changes, no globals.css changes.

**Primary trade-off:** Inline styles for brand colors (`#244C5A`, `#FFC72C`, `#0097A9`) keep globals.css clean and zero-risk for existing pages, at the cost of color values being co-located only in the login page rather than shared tokens. Acceptable for a single-screen scope.

---

## System Architecture

The login page remains a **Next.js server component**. No client-side state is introduced in the page shell. The `LoginButton` remains an isolated client component — it is the only React island on the page (`'use client'` directive). `InviteRedirectHandler` also stays a client subtree, rendered before the visual shell.

```
app/login/page.tsx          ← Server Component (async)
├── <InviteRedirectHandler />   ← Client (unchanged)
└── <LoginPageShell>            ← inline server JSX
    ├── decorative layer        ← absolute-positioned divs (static)
    ├── brand header            ← static JSX + lucide-react icons
    ├── login card              ← static JSX wrapper
    │   ├── error alert         ← conditional, driven by searchParams
    │   └── <LoginButton />     ← Client Component (restyled)
    └── stats row               ← hardcoded static JSX
```

**Component ownership:**

| File | Type | Change |
|---|---|---|
| `app/login/page.tsx` | Server Component | Full JSX rewrite |
| `components/LoginButton.tsx` | Client Component | Restyle only |
| `components/InviteRedirectHandler.tsx` | Client Component | Unchanged |

---

## Core Interfaces

The `LoginPageProps` type is the only interface involved. It is preserved exactly as-is:

```tsx
// app/login/page.tsx
interface LoginPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // auth check + redirect (unchanged)
  const { error } = await searchParams
  // render new shell
}
```

`LoginButton` takes no props — its signature is unchanged:

```tsx
// components/LoginButton.tsx
export default function LoginButton() { ... }
```

---

## Component Breakdown

### `app/login/page.tsx` — Full rewrite

The file preserves the existing auth check and redirect logic at the top. Only the `return` block changes.

**Root wrapper:**
```tsx
<div
  className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden"
  style={{ background: '#244C5A' }}
>
```

**Decorative layer (all `absolute`, `pointer-events-none`):**

1. Grid pattern overlay — CSS `backgroundImage` with `linear-gradient` for horizontal + vertical lines:
   ```tsx
   <div
     className="absolute inset-0 opacity-[0.07]"
     style={{
       backgroundImage: `linear-gradient(#FFC72C 1px, transparent 1px),
                         linear-gradient(90deg, #FFC72C 1px, transparent 1px)`,
       backgroundSize: '40px 40px',
     }}
   />
   ```

2. Teal glow — top-right radial blur:
   ```tsx
   <div
     className="absolute -top-32 -right-20 w-[500px] h-[500px]
                rounded-full opacity-30 blur-[100px] pointer-events-none"
     style={{ background: '#0097A9' }}
   />
   ```

3. Petrol glow — bottom-left radial blur:
   ```tsx
   <div
     className="absolute -bottom-40 -left-20 w-[600px] h-[600px]
                rounded-full opacity-20 blur-[120px] pointer-events-none"
     style={{ background: '#244C5A' }}
   />
   ```

4. "2026" numeral — top-right, responsive font size:
   ```tsx
   <div
     className="absolute top-10 right-10 font-black opacity-[0.04]
                select-none pointer-events-none
                text-[8rem] md:text-[14rem]"
     style={{ color: '#FFC72C', letterSpacing: '-0.05em', lineHeight: 1 }}
   >
     2026
   </div>
   ```

**Content container** — responsive width, centered, above decorative layer:
```tsx
<div className="relative z-10 w-full max-w-sm md:max-w-lg">
```

**Brand header:**

- Pill badge (Flame icon + text):
  ```tsx
  <div
    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
    style={{ background: 'rgba(255,199,44,0.125)', color: '#FFC72C' }}
  >
    <Flame size={12} />
    <span className="text-[10px] font-black uppercase tracking-[0.25em]">
      Copa Mundo · USA · CAN · MEX
    </span>
  </div>
  ```

- Trophy + BOLÃO wordmark (Trophy rotated -6°, responsive text):
  ```tsx
  <div className="flex items-center justify-center gap-3 mb-2">
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center -rotate-6"
      style={{ background: '#FFC72C' }}
    >
      <Trophy size={32} style={{ color: '#244C5A' }} strokeWidth={2.5} />
    </div>
    <div
      className="text-4xl md:text-6xl font-black text-white leading-none"
      style={{ letterSpacing: '-0.03em' }}
    >
      BOLÃO
    </div>
  </div>
  ```

- Subtitle:
  ```tsx
  <p
    className="text-base md:text-xl font-bold tracking-widest uppercase"
    style={{ color: '#0097A9' }}
  >
    BOLÃO DA COPA 2026
  </p>
  ```

**Login card** (glassmorphism):
```tsx
<div
  className="rounded-[36px] p-8 border backdrop-blur-2xl"
  style={{
    background: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.15)',
  }}
>
```

Inside the card, top-to-bottom:
1. Error alert (conditional on `error === 'auth_callback_failed'`):
   ```tsx
   <div
     role="alert"
     className="mb-4 rounded-2xl px-4 py-3 text-sm"
     style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5' }}
   >
     Erro ao fazer login com Google. Tente novamente.
   </div>
   ```
2. Card title: `<h2>Entre para jogar 🎯</h2>` — `text-white text-lg font-bold mb-1`
3. Card subtitle: `<p>Use sua conta Google da empresa.</p>` — `text-sm mb-6`, color `rgba(255,255,255,0.6)`
4. `<LoginButton />` — renders the restyled Google button
5. SSO footer:
   ```tsx
   <div
     className="mt-4 pt-4 border-t flex items-center justify-center gap-2 text-[11px]"
     style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
   >
     <Lock size={12} />
     <span>SSO autenticado · Arkmeds.com</span>
   </div>
   ```

**Stats row:**
```tsx
<div className="grid grid-cols-3 gap-3 mt-6">
  {[
    { val: '48', label: 'Seleções' },
    { val: '104', label: 'Jogos' },
    { val: '1', label: 'Paixão' },
  ].map((s) => (
    <div
      key={s.label}
      className="text-center p-3 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.05)' }}
    >
      <div className="text-2xl font-black" style={{ color: '#FFC72C' }}>
        {s.val}
      </div>
      <div
        className="text-[10px] uppercase tracking-widest"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        {s.label}
      </div>
    </div>
  ))}
</div>
```

---

### `components/LoginButton.tsx` — Restyle only

OAuth logic (`signInWithOAuth`, `redirectTo`) is unchanged. Only the `<button>` element changes:

**Before:**
```tsx
className="flex min-h-[44px] w-full items-center justify-center gap-3 rounded-lg
           border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700
           transition-colors hover:bg-gray-50 focus-visible:outline ..."
```
Label: `"Entrar com Google"`

**After:**
```tsx
className="w-full bg-white text-slate-900 font-bold py-4 px-6 rounded-2xl
           hover:scale-[1.01] active:scale-[0.99] transition shadow-xl
           flex items-center justify-center gap-3"
```
Label: `"Continuar com Google"`

The inline Google SVG (18×18, four paths with official Google colors) is **unchanged**.

---

## Data Models

No data model changes. All stat values are hardcoded string literals in the JSX. No Supabase queries added.

---

## API Design

No API changes. The existing `/auth/callback` route and `/api/auth/logout` route are untouched.

---

## Development Sequencing

**Build order** (each step depends on the previous unless noted):

1. **Install `lucide-react`**
   ```bash
   npm install lucide-react
   ```
   No dependencies.

2. **Restyle `components/LoginButton.tsx`** (depends on: step 1 is not required, but do this before testing)
   - Replace `className` string on `<button>`
   - Change label text from `"Entrar com Google"` to `"Continuar com Google"`
   - Keep all OAuth logic, Google SVG, and `'use client'` directive

3. **Rewrite `app/login/page.tsx`** (depends on: step 1)
   - Add imports: `{ Trophy, Flame, Lock }` from `lucide-react`
   - Preserve: `getSupabaseServerClient`, auth check, `redirect`, `searchParams` destructuring, `InviteRedirectHandler` import
   - Replace: entire `return` block with new branded shell
   - `LoginButton` import remains as-is

4. **Visual verification** (depends on: steps 2, 3)
   - Run dev server: `npm run dev`
   - Open `/login` — spot-check against approved screenshot
   - Resize to 375px width — verify no horizontal overflow
   - Append `?error=auth_callback_failed` — verify error alert renders correctly
   - Trigger Google OAuth flow — verify callback completes

5. **Run existing tests** (depends on: step 3)
   ```bash
   npm test
   ```
   Auth integration tests (`tests/integration/auth.test.ts`) must still pass.

---

## Testing Strategy

**No new tests are written** (this is a pure visual change with no logic delta).

**Verification checklist:**
- [ ] `/login` renders without runtime errors (Next.js dev overlay is clean)
- [ ] Google OAuth flow: clicking "Continuar com Google" → auth callback → redirect to `/dashboard`
- [ ] `?error=auth_callback_failed` query param → red error alert visible inside card
- [ ] Desktop (≥768px): `max-w-lg` container, `text-6xl` BOLÃO, `text-[14rem]` 2026 numeral
- [ ] Mobile (375px): `max-w-sm` container, `text-4xl` BOLÃO, `text-[8rem]` 2026 numeral, no horizontal overflow
- [ ] `backdrop-blur-2xl` renders (modern Chromium/Safari); card is readable if blur is unavailable (opacity fallback sufficient)
- [ ] Existing `tests/integration/auth.test.ts` suite passes

---

## Architecture Decision Records

- [ADR-001: Login Page Visual Redesign Approach](adrs/adr-001.md) — Direct port from design reference; fastest delivery, zero new abstractions.
- [ADR-002: Icon Library — lucide-react](adrs/adr-002.md) — `lucide-react` chosen over inline SVG or porting the prototype Icon component; tree-shakeable, typed, well-maintained.
- [ADR-003: LoginButton Styling — In-place Replacement](adrs/adr-003.md) — Existing `LoginButton.tsx` restyled in place; no wrapper indirection, no file deletion.
- [ADR-004: Brand Colors — Inline Styles](adrs/adr-004.md) — Hex colors passed via `style={{}}` prop; globals.css remains unchanged, zero risk to other pages.
