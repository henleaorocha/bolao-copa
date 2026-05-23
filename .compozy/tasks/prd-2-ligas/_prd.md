# PRD 2: Ligas do Bolão da Copa 2026

## Overview

This PRD defines the Leagues feature for Bolão da Copa 2026 — a social sports pool application for the 2026 FIFA World Cup.

Currently the app forces every user into a single hardcoded default league ("Test Bolão"). This prevents friends, families, and colleague groups from competing in their own private pools, which is the primary social driver of bolão engagement.

**What it solves:** Users cannot create their own leagues, invite others, or discover existing open leagues. All social competition is limited to a single global pool.

**Who it is for:** Any authenticated user who wants to compete with a specific group of people (friends, family, office) in their own customized league, separate from the global pool.

**Why it is valuable:** Leagues are the core social unit of any bolão. Without them, the app is just a prediction tool — with them, it becomes a social game with community stakes and repeat engagement over the tournament's 39 days.

---

## Goals

- Enable users to create a named league and invite others via a shareable link within the first week of the feature launch
- Allow open leagues to be discoverable so users can join community pools without needing an invite
- Give league creators (admins) full control over their league: rename, change access type, remove members, delete
- Deliver a testable end-to-end flow: a user creates a league, shares the link, and a second user joins and appears in the member list
- Unblock PRD 3 (Predictions) by establishing the multi-league context system that predictions are scoped to

---

## User Stories

### League Creator (Admin)

- As a user, I want to create a league with a name and access type (open or private) so that I can set up a pool for my group.
- As a league creator, I want to optionally upload a logo so my league has a recognizable visual identity (or get an auto-generated initial avatar if I skip it).
- As a league admin, I want to copy an invite link so I can share it with people I want to invite.
- As a league admin, I want to rename my league, change its access type, and remove individual members so I can keep the pool organized.
- As a league admin, I want to delete my league so I can remove a pool I no longer need.

### League Member (Regular User)

- As a user, I want to see all leagues I belong to and switch the active one so I can track my performance across different groups.
- As a user, I want to open an invite link and join the corresponding league with one tap so the onboarding is frictionless.
- As a user, I want to browse open leagues and join them without needing an invite so I can participate in public community pools.
- As a user, I want to see the full list of members in a league so I know who I am competing against.

---

## Core Features

### 1. League Hub Screen (Priority: Critical)

A dedicated "Ligas" screen accessible from the bottom navigation. Displays two tabs:

- **My Leagues tab**: Cards for each league the user belongs to, showing league name, logo/avatar, member count, user's role (Admin / Member), and a quick-join CTA for leagues the user hasn't entered yet. Tapping a card sets it as the active league and navigates to the league detail.
- **Discover tab**: Grid or list of leagues with `access_type = open` that the user has not yet joined. Shows league name, logo/avatar, description, and member count. Tapping a card opens a join confirmation before adding the user as a member.

The hub is the single place where all league actions originate.

### 2. League Context Switcher (Priority: Critical)

A persistent league indicator in the topbar (visible on all non-league screens) shows the active league name and the user's role. Tapping it opens a compact league picker (dropdown or bottom sheet) listing the user's leagues, allowing quick context switch. All data on dashboard, predictions, and ranking screens renders for the selected active league.

### 3. League Creation (Priority: Critical)

A "Create League" modal (triggered from the League Hub) with:
- **Name** (required, 2–50 characters)
- **Access type** toggle: Open (anyone with the link or via discovery can join) vs. Private (link required, not discoverable)
- **Logo upload** (optional): supports image file upload; if skipped, the system generates an avatar using the first letter of the league name on a colored background drawn from the design system palette
- **Description** (optional, up to 200 characters)

On submit, the creator becomes the league admin and the league appears in "My Leagues."

### 4. Invite via Link (Priority: Critical)

Within the league detail screen, an "Invite" button generates and displays a unique, shareable invite link for that league. The link encodes the league ID and a secret token. Tapping the button copies the link to the clipboard with a confirmation toast. Anyone who opens the link is directed to the join flow:

- If not authenticated: redirected to login, then back to the join flow.
- If already a member: shown a confirmation that they are already in the league.
- If eligible: prompted to confirm joining, then added as a member.

### 5. League Detail & Member List (Priority: High)

A screen for each league (accessed by tapping a league card) showing:
- League header: logo/avatar, name, description, member count, access type badge
- Member list: avatar, name, role badge (Admin / Member), join date
- Admin-only section: "Settings" button (access to rename, access type change, delete) and per-member "Remove" action

### 6. Admin League Management (Priority: High)

Accessible from the league detail screen by the admin only:
- **Rename league**: inline edit or modal input; updates the league name everywhere
- **Change access type**: toggle between Open and Private; a confirmation prompt warns that changing to Private hides the league from discovery
- **Remove member**: per-member action (with confirmation dialog) that removes the user from the league; their predictions and scores remain in the system but are hidden from the league's ranking
- **Delete league**: destructive action behind a two-step confirmation (type league name to confirm); deletes the league and all associated membership records

---

## User Experience

### Personas

- **Henrique (League Organizer)**: Sets up a private league for his family WhatsApp group, shares the invite link, and wants to manage who is in and out.
- **Ana (Social Joiner)**: Opened an invite link from a friend, wants to join in one tap without reading instructions.
- **Carlos (Discovery User)**: Wants to participate in more than just his friend group; browses open leagues to find community pools worth joining.

### Primary User Flows

**Flow 1 — Create and Invite**
1. User opens "Ligas" from bottom nav → sees My Leagues tab
2. Taps "+ Criar Liga" → modal opens
3. Fills name, chooses Private, optionally uploads logo → taps "Criar"
4. League detail screen appears → taps "Convidar" → link copied to clipboard
5. User pastes link in WhatsApp group → friends tap it, log in, and are added as members

**Flow 2 — Join via Invite Link**
1. User receives link, taps it → browser opens the app's join page
2. If not logged in: redirected to login → returns to join page
3. Sees league card (name, logo, member count) with "Entrar na Liga" button
4. Taps → joined; redirected to the league's detail screen

**Flow 3 — Discover and Join Open League**
1. User opens "Ligas" → taps "Descobrir" tab
2. Browses open league cards → taps one
3. Confirmation dialog: "Entrar em [League Name]?" → confirms
4. User is added as member; league appears in My Leagues; active context switches to it

**Flow 4 — Switch Active League**
1. User is on the Dashboard → sees "Bolão da Família · Member" in topbar
2. Taps topbar indicator → league picker opens
3. Selects "Bolão do Trampo" → picker closes; dashboard refreshes for new league

### UX Considerations

- The invite link join flow must work from a cold start (no app session) — unauthenticated users must be redirected to login and returned to the join page without losing the league context.
- Destructive admin actions (remove member, delete league) must always be gated behind confirmation dialogs with clear, plain-language warnings about what is irreversible.
- A user with no leagues (edge case: left all leagues or account is brand new) lands on an empty state in My Leagues with a prominent "Criar sua primeira liga" CTA.
- Mobile-first: all flows must be completable on a 375px viewport without horizontal scroll.
- The league context switcher must be visible and accessible within one tap from any screen in the app.

---

## High-Level Technical Constraints

- **Language — PT-BR**: All UI text (labels, buttons, messages, confirmations, error states, empty states, and toast notifications) must be written in Brazilian Portuguese. No English strings should appear in the user-facing interface.
- **Design system compliance**: All screens must follow the visual language established in `designReferences/` — specifically `screens-onboarding.jsx` (LeaguesScreen, CreateLeagueModal, InviteModal), `shell.jsx` (topbar, bottom nav, AppFrame), and the design system defined in `designReferences/README.md`. Colors (`#FFC72C`, `#0097A9`, `#244C5A`), typography (Montserrat), border radii (rounded-xl / 2xl / 3xl), and shadow levels must match the reference screens exactly.
- Must integrate with the existing Supabase RLS policies: private leagues must remain invisible to non-members at the data layer, not just the UI.
- The invite link must include a secret token (not just the league UUID) to prevent unauthorized enumeration of private leagues.
- The active league context must persist across browser refreshes for authenticated users.
- All league operations must respect the authenticated user's identity — no unauthenticated mutations.
- The join flow triggered by an invite link must handle the OAuth redirect loop without losing the original invite URL.

---

## Non-Goals (Out of Scope)

- **QR Code generation**: deferred to a future PRD; link sharing only in this release.
- **WhatsApp / social share buttons**: deferred; users copy the link manually.
- **League chat or messaging**: out of scope entirely for this app.
- **Transferring admin role**: admin is always the creator; transfer is deferred.
- **League templates or scoring rule customization**: all leagues use the standard Bolão da Copa scoring scheme.
- **Email invitations**: not in scope; invite is link-only.
- **Notifications** (e.g., "someone joined your league"): deferred to a future PRD.
- **Predictions, rankings, and champion bets**: these screens become league-aware as a side effect of the context switcher, but their own feature logic is defined in PRD 3.
- **Pagination of member lists or discovery results**: out of scope for MVP; assume reasonable league sizes (<200 members).
- **League analytics or admin statistics**: out of scope.

---

## Phased Rollout Plan

### MVP (Phase 1) — This PRD

**Included:**
- League Hub screen (My Leagues + Discover tabs)
- League context switcher in topbar
- League creation modal (name, access type, logo optional with initial fallback)
- Invite via shareable link (copy to clipboard)
- Join via invite link (including cold-start OAuth redirect handling)
- League detail screen with member list
- Admin: rename, change access type, remove member, delete league

**Success criteria to ship:**
- A user can create a private league, copy the invite link, share it, and a second user can join via that link and appear in the member list — all without backend errors or auth failures.
- A user can browse open leagues in the Discover tab and join one via the confirmation flow.
- The active league switcher updates all screens consistently.

### Phase 2 — Enhanced Sharing & Engagement

- QR Code generation for the invite link
- WhatsApp share button (Web Share API fallback)
- Push notification: "Someone joined your league"
- Member list pagination for large leagues (>50 members)

### Phase 3 — Social & Discovery Expansion

- League search by name or short code
- Featured open leagues curated by the platform
- Admin transfer
- League activity feed (recent joins, score updates)

---

## Success Metrics

- **Invite conversion rate**: ≥ 50% of users who open an invite link and are logged in complete the join flow within the same session.
- **League creation rate**: ≥ 30% of registered users create or join at least one non-default league within 7 days of the feature launch.
- **Discovery adoption**: ≥ 10% of league joins come from the Discover tab (not invite links) within the first 2 weeks.
- **Admin retention**: Leagues created by an admin have ≥ 3 members on average within 7 days of creation.
- **Zero data leakage**: No reported case of a private league appearing in discovery or being accessible without a valid invite link.

---

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Invite link is shared publicly, flooding a private league with unwanted members | Medium | Add "block new joins" toggle for admins (Phase 2); for MVP, admin can remove members individually |
| Users don't understand the difference between Open and Private when creating | Medium | Tooltip or inline explanation on the toggle; confirmation when switching from Open to Private |
| Cold-start OAuth redirect loop loses the invite URL | High | Store the invite URL in session storage before the OAuth redirect; restore and process it after callback |
| Users join many open leagues for free points without engagement | Low | Not a problem in MVP; reputation/activity systems are out of scope |
| League context switcher causes confusion when user forgets which league is active | Medium | Always show the active league name prominently in the topbar; dashboard header reinforces the active league name |

---

## Architecture Decision Records

- [ADR-001: Liga as Central Context Hub with Dedicated Screen](adrs/adr-001.md) — Chose a dedicated Leagues hub screen with a global topbar context switcher over modal-first and per-route-per-league alternatives.

---

## Open Questions

1. **Invite link expiry**: Should invite links expire (e.g., 7 days) or be permanent? Permanent links are simpler but cannot be revoked individually. For MVP, assume permanent until admin feedback suggests otherwise.
2. **Max leagues per user**: Should there be a cap on how many leagues a single user can create (e.g., 5) to prevent abuse? No cap enforced in MVP; revisit if abuse is observed.
3. **What happens to a user's predictions and champion bet when removed from a league?** Assume they are hidden from the league's ranking but not deleted — the data layer retains them. Confirm with the data team before implementation.
4. **Discovery tab ordering**: What is the sort order for open leagues in the Discover tab? Proposal: most members first, then most recently created.
