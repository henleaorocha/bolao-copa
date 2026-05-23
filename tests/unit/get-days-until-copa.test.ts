import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getDaysUntilCopa, CopaCountdown } from '@/lib/leagues/get-days-until-copa'

describe('getDaysUntilCopa', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns isUnderway: false and correct day count before June 11 2026', () => {
    vi.setSystemTime(new Date('2026-05-01T00:00:00Z'))
    const result = getDaysUntilCopa()
    expect(result.isUnderway).toBe(false)
    // May 1 to June 11 = 41 days
    expect(result.days).toBe(41)
  })

  it('returns isUnderway: true and days: 0 on June 11 2026', () => {
    vi.setSystemTime(new Date('2026-06-11T00:00:00Z'))
    const result = getDaysUntilCopa()
    expect(result.isUnderway).toBe(true)
    expect(result.days).toBe(0)
  })

  it('returns isUnderway: true and days: 0 after June 11 2026', () => {
    vi.setSystemTime(new Date('2026-06-20T00:00:00Z'))
    const result = getDaysUntilCopa()
    expect(result.isUnderway).toBe(true)
    expect(result.days).toBe(0)
  })

  it('returned object has exactly days and isUnderway fields', () => {
    vi.setSystemTime(new Date('2026-05-01T00:00:00Z'))
    const result: CopaCountdown = getDaysUntilCopa()
    expect(typeof result.days).toBe('number')
    expect(typeof result.isUnderway).toBe('boolean')
    expect(Object.keys(result)).toEqual(['days', 'isUnderway'])
  })
})
