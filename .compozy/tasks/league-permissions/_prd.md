# PRD: League Permissions & Test-League Hiding

## Overview

The bolão currently treats every authenticated user the same: anyone can create a
league, and a seeded test league is visible to everyone and silently joined by every
new account. This creates two problems for the operator:

1. The internal **test league** (`00000000-0000-0000-0000-000000000001`, "Test Bolão")
   appears in public discovery and is auto-joined by new users — mixing test data into
   the real user experience.
2. **League creation is unrestricted**, so any user can spin up leagues, which the
   operator does not want during the controlled launch.

This effort makes league creation a **gated capability** granted only to trusted
operator accounts, and turns the test league into a **reserved, invisible** league used
only by testers. It is for the product operator (the user running the bolão) and the
end users of the pool. Its value is operational control and a clean experience: real
users only ever see real leagues, and only authorized people can create new ones.

## Goals

- Only explicitly authorized accounts can create leagues; all others cannot — both in
  the UI and through any direct request.
- The two operator accounts (`hen.leao.rocha@gmail.com`, `henrique.rocha@arkmeds.com`)
  start with creation permission; every other account (existing and future) starts
  without it.
- The test league never appears to any user in any listing or discovery surface.
- New users are no longer auto-enrolled into the test league.
- Permission is managed by the operator directly in the database — no admin screen
  needed.
- Zero disruption to already-created leagues.

## User Stories

**Operator (league owner / admin)**
- As the operator, I want only my trusted accounts to be able to create leagues, so the
  set of leagues stays under my control during launch.
- As the operator, I want to grant or revoke "can create leagues" for any account
  directly in the database, so I don't depend on an admin UI.
- As the operator, I want my test league to be invisible to real users, so my testing
  never leaks into their experience.
- As the operator, I want to keep using the test league with my tester accounts, so my
  validation flows keep working.

**Authorized creator**
- As an authorized user, I want to see and use the "create league" action normally, so
  I can set up leagues as before.

**Regular user (no creation permission)**
- As a regular user, I want a clean interface without a create-league action I can't
  use, so the app isn't confusing.
- As a regular user, I want to join existing leagues (open or by invite), so I can still
  participate in the bolão.

**New user**
- As a newly registered user, I want to land in a real, relevant state (not a hidden
  test league), so my first experience reflects the actual product.

## Core Features

### 1. League-creation permission (per-user capability) — P0
- A per-user capability that determines whether the account may create leagues.
- Defaults to "not allowed" for every account.
- The two operator e-mails are granted the capability at rollout.
- Enforced in two places:
  - **UI**: the "Criar nova liga" entry point is fully hidden for users without the
    capability.
  - **Server**: any attempt to create a league without the capability is rejected,
    regardless of the UI.
- Managed by the operator via direct database update; no in-app management screen.

### 2. Test-league invisibility — P0
- The test league (`00000000-0000-0000-0000-000000000001`) is excluded from every
  listing and discovery surface, so no user ever sees it.
- It remains a fully functional league for accounts that are members (testers, added
  manually).

### 3. Stop auto-enrolling new users into the test league — P0
- New accounts are no longer automatically added to the test league.
- New users start without an active league and are guided to join or create a real one
  (subject to their permission).

### Interaction between features
- A brand-new user with no creation permission and no auto-enrolled league must reach a
  sensible "no league yet" state that points them to joinable leagues or invites.
- Hiding the test league and stopping auto-enroll are complementary: together they
  ensure new users neither see nor silently belong to test data.

## User Experience

**Authorized creator** — Unchanged: sees the "Criar nova liga" card and creates leagues
as today.

**Regular user (no permission)** — On the leagues screen, the "create league" card/button
is absent. The user sees their leagues (if any) and the list of joinable open leagues,
and can join via invite. Nothing hints at a disabled feature.

**New user (first run)** — After signing up, the user is not dropped into the test
league. With no leagues yet, they land on a "no league" state that guides them to join
an available open league or accept an invite. If they happen to be an authorized
creator, they can also create one.

**Operator** — Grants/revokes the capability and adds testers to the test league through
direct database operations, outside the app. The test league behaves like any other
league for its members but is invisible to everyone else.

Accessibility/clarity: hiding (rather than disabling) the create action keeps the
interface uncluttered and avoids dead controls.

## High-Level Technical Constraints

- The capability must be enforced server-side, not only by hiding UI controls — hiding
  the button alone is not sufficient.
- The test-league exclusion must cover **all** discovery/listing surfaces consistently.
- Existing automated tests and validation tooling depend on the test league existing at
  its fixed UUID and remaining usable by member accounts — it must not be deleted or
  made unusable.
- Granting the operator e-mails must be idempotent and resilient to whether those
  accounts already exist at rollout time.

## Non-Goals (Out of Scope)

- No admin/management UI for granting or revoking the creation permission (done in the
  database).
- No UI to add/remove testers to the test league (done in the database).
- No general-purpose roles/capabilities framework — a single binary capability only.
- No changes to per-league roles (`admin`/`member`) or to how leagues are administered.
- No retroactive action on leagues already created by users who now lack permission —
  they remain intact.
- No changes to invitations or join flows beyond ensuring new users have a sensible
  no-league state.

## Phased Rollout Plan

### MVP (Phase 1) — the entire effort
- Per-user league-creation capability, default off, enforced in UI and server.
- Two operator e-mails granted the capability.
- Test league hidden from all listing/discovery surfaces.
- New users no longer auto-enrolled into the test league; sensible no-league state.
- **Success criteria**: an unauthorized account cannot create a league by any means;
  authorized accounts can; no user sees the test league; new users start without it and
  can still reach a joinable league.

### Phase 2 (only if a real need emerges) — not planned
- Self-service permission management UI.
- Richer roles/capabilities if more than one permission is ever required.

## Success Metrics

- 0 leagues created by unauthorized accounts after rollout.
- 0 appearances of the test league across user-facing listings (verified by review and
  tests).
- 100% of new sign-ups created with the capability off (except the two operator
  e-mails) and not auto-joined to the test league.
- No regressions in existing leagues or in tester usage of the test league.

## Risks and Mitigations

- **Risk**: New users without permission and without an invite have no league and feel
  stuck. **Mitigation**: ensure the no-league state clearly points to joinable open
  leagues and invites.
- **Risk**: Operator forgets the permission is manual and expects an in-app toggle.
  **Mitigation**: document the database grant/revoke procedure alongside the feature.
- **Risk**: The test league is referenced by tooling; hiding it incorrectly could break
  validation runs. **Mitigation**: hide from discovery only, keep the league usable for
  members, and keep tests pointed at the fixed UUID.
- **Risk**: Incomplete enforcement (UI hidden but API open). **Mitigation**: server-side
  enforcement is a hard requirement and an explicit success criterion.

## Architecture Decision Records

- [ADR-001: Per-user boolean flag to gate league creation](adrs/adr-001.md) — Use a
  single per-user capability (default off, granted to two e-mails), enforced in UI and
  server, managed via direct database updates.
- [ADR-002: Hide the test league from discovery and stop auto-enrolling users](adrs/adr-002.md)
  — Reserve the test league: exclude it from all listings and stop auto-enrolling new
  users, while keeping it functional for testers.

## Open Questions

- Should the "no league yet" state for new users receive any copy/visual refresh as
  part of this effort, or is the existing empty state sufficient? (Assumed sufficient
  unless flagged.)
- Are there any tester accounts beyond the two operator e-mails that should be
  pre-added to the test league at rollout, or will testers always be added manually as
  needed? (Assumed manual.)
