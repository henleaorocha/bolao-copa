import { describe, it, expect } from 'vitest'
import {
  groupMatchStatus,
  slotMatchStatus,
  type MatchStatus,
} from '@/components/match/matchStatus'

describe('groupMatchStatus (Palpites / group stage)', () => {
  it("returns 'finished' when status='finished' (even past deadline / with prediction)", () => {
    expect(
      groupMatchStatus({ status: 'finished', is_deadline_passed: true, prediction: { a: 1 } })
    ).toBe<MatchStatus>('finished')
    expect(
      groupMatchStatus({ status: 'finished', is_deadline_passed: false, prediction: null })
    ).toBe('finished')
  })

  it("returns 'locked' when the deadline has passed and the match is not finished", () => {
    expect(
      groupMatchStatus({ status: 'scheduled', is_deadline_passed: true, prediction: null })
    ).toBe('locked')
  })

  it("maps a 'live' (past-deadline, not finished) match to 'locked' — no result shown", () => {
    expect(
      groupMatchStatus({ status: 'live', is_deadline_passed: true, prediction: { home: 1, away: 0 } })
    ).toBe('locked')
  })

  it("returns 'predicted' when open with a saved prediction", () => {
    expect(
      groupMatchStatus({ status: 'scheduled', is_deadline_passed: false, prediction: { home: 2, away: 1 } })
    ).toBe('predicted')
  })

  it("returns 'open' when open with no prediction", () => {
    expect(
      groupMatchStatus({ status: 'scheduled', is_deadline_passed: false, prediction: null })
    ).toBe('open')
  })
})

describe('slotMatchStatus (Mata-mata / knockout)', () => {
  it("turns an 'open' slot with a prediction into 'predicted'", () => {
    expect(slotMatchStatus('open', true)).toBe<MatchStatus>('predicted')
  })

  it("keeps an 'open' slot without a prediction as 'open'", () => {
    expect(slotMatchStatus('open', false)).toBe('open')
  })

  it("passes 'placeholder' through unchanged regardless of prediction flag", () => {
    expect(slotMatchStatus('placeholder', false)).toBe('placeholder')
    expect(slotMatchStatus('placeholder', true)).toBe('placeholder')
  })

  it("passes 'locked' through unchanged regardless of prediction flag", () => {
    expect(slotMatchStatus('locked', false)).toBe('locked')
    expect(slotMatchStatus('locked', true)).toBe('locked')
  })

  it("passes 'finished' through unchanged regardless of prediction flag", () => {
    expect(slotMatchStatus('finished', false)).toBe('finished')
    expect(slotMatchStatus('finished', true)).toBe('finished')
  })
})
