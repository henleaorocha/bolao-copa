export interface CopaCountdown {
  days: number
  isUnderway: boolean
}

const COPA_START = new Date('2026-06-11T00:00:00Z')

export function getDaysUntilCopa(): CopaCountdown {
  const now = new Date()
  const msRemaining = COPA_START.getTime() - now.getTime()
  const days = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))
  const isUnderway = now >= COPA_START
  return { days, isUnderway }
}
