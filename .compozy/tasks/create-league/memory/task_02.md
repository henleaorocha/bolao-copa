# Task Memory: task_02.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Create `tests/unit/CreateLeagueModal.test.tsx` — the component implementation at `components/CreateLeagueModal.tsx` already exists and is complete. No code changes needed to the component itself.

## Important Decisions

- No conflicts found between task spec, techspec, and ADRs.
- Component was pre-created before this task run. Only the test file remains to be written.

## Learnings

Key testable surfaces in the component:
- Trigger card: `data-testid="create-league-card"` (button element, full-card click)
- Backdrop: `data-testid="modal-backdrop"` (outer modal div)
- Close button: `aria-label="Fechar"` (X button)
- Cancel button: text "Cancelar"
- Submit button: text "Criar liga" / "Criando..." when loading
- Name input: `id="league-name"`, label `htmlFor="league-name"` → accessible via `getByLabelText`
- Access buttons: `aria-pressed={form.access === 'open'}` / `aria-pressed={form.access === 'private'}`
- Prize checkbox: single checkbox in modal body
- Prize textarea: only rendered when `hasPrize=true`, identifiable by placeholder text (contains "almoço")
- Error toast: `role="alert"` on `<div>` (global error)
- Name validation error: `role="alert"` on `<p>` (inline name error)
- Validation message: "O nome da liga deve ter pelo menos 2 caracteres."

## Files / Surfaces

- `components/CreateLeagueModal.tsx` — source component (already implemented)
- `tests/unit/CreateLeagueModal.test.tsx` — test file to be created

## Errors / Corrections

## Ready for Next Run
