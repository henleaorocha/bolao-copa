// Shared five-state match-presentation vocabulary (ADR-003).
// Both prediction screens derive this discriminant from their own data shape and
// feed it to StatusBadge, so a finished match looks identical on Palpites and Mata-mata.

export type MatchStatus =
  | 'placeholder' // bracket slot, no confirmed matchup (knockout only)
  | 'open' //        open for prediction, none saved
  | 'predicted' //   open for prediction, prediction saved
  | 'locked' //      deadline passed (incl. live), not finished
  | 'finished' //    real result available

// Group stage (Palpites): derives status from MatchWithPrediction fields.
// A `live` (past-deadline, not finished) match maps to `locked` — no result until finished.
export function groupMatchStatus(m: {
  status: 'scheduled' | 'live' | 'finished'
  is_deadline_passed: boolean
  prediction: unknown | null
}): MatchStatus {
  if (m.status === 'finished') return 'finished'
  if (m.is_deadline_passed) return 'locked'
  return m.prediction ? 'predicted' : 'open'
}

// Knockout (Mata-mata): maps the existing SlotState + prediction presence.
// Only an `open` slot with a saved prediction becomes `predicted`; every other
// slot state (placeholder / locked / finished) passes through unchanged.
export function slotMatchStatus(
  state: 'placeholder' | 'open' | 'locked' | 'finished',
  hasPrediction: boolean
): MatchStatus {
  return state === 'open' && hasPrediction ? 'predicted' : state
}
