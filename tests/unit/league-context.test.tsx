/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { LeagueProvider, useLeague } from '@/lib/league-context'
import type { LeagueSummary } from '@/lib/api/types'

const mockLeague: LeagueSummary = {
  id: 'league-1',
  name: 'Test League',
  access_type: 'private' as const,
  logo_url: null,
  role: 'admin' as const,
  member_count: 5,
}

const newMockLeague: LeagueSummary = {
  id: 'league-2',
  name: 'New Test League',
  access_type: 'open' as const,
  logo_url: 'https://example.com/logo.png',
  role: 'member' as const,
  member_count: 10,
}

describe('useLeague', () => {
  it('returns the initial league value from LeagueProvider', () => {
    const { result } = renderHook(() => useLeague(), {
      wrapper: ({ children }) => (
        <LeagueProvider initialLeague={mockLeague}>
          {children}
        </LeagueProvider>
      ),
    })

    expect(result.current.league).toEqual(mockLeague)
  })

  it('allows setting a new league via setLeague', () => {
    const { result } = renderHook(() => useLeague(), {
      wrapper: ({ children }) => (
        <LeagueProvider initialLeague={mockLeague}>
          {children}
        </LeagueProvider>
      ),
    })

    act(() => {
      result.current.setLeague(newMockLeague)
    })

    expect(result.current.league).toEqual(newMockLeague)
  })

  it('triggers re-render when setLeague is called', () => {
    let renderCount = 0

    const { result } = renderHook(
      () => {
        renderCount++
        return useLeague()
      },
      {
        wrapper: ({ children }) => (
          <LeagueProvider initialLeague={mockLeague}>
            {children}
          </LeagueProvider>
        ),
      }
    )

    const initialRenderCount = renderCount

    act(() => {
      result.current.setLeague(newMockLeague)
    })

    expect(renderCount).toBeGreaterThan(initialRenderCount)
  })

  it('throws error when called outside LeagueProvider', () => {
    expect(() => {
      renderHook(() => useLeague())
    }).toThrow(
      'useLeague() must be called within a <LeagueProvider>. ' +
      'Ensure your component tree is wrapped with LeagueProvider at the root layout.'
    )
  })

  it('context value is stable across renders without league change', () => {
    const { result, rerender } = renderHook(() => useLeague(), {
      wrapper: ({ children }) => (
        <LeagueProvider initialLeague={mockLeague}>
          {children}
        </LeagueProvider>
      ),
    })

    const firstValue = result.current

    rerender()

    expect(result.current.league).toEqual(firstValue.league)
    expect(result.current.setLeague).toBe(firstValue.setLeague)
  })

  it('preserves all LeagueSummary fields in the context value', () => {
    const { result } = renderHook(() => useLeague(), {
      wrapper: ({ children }) => (
        <LeagueProvider initialLeague={mockLeague}>
          {children}
        </LeagueProvider>
      ),
    })

    const { league } = result.current
    expect(league.id).toBe(mockLeague.id)
    expect(league.name).toBe(mockLeague.name)
    expect(league.access_type).toBe(mockLeague.access_type)
    expect(league.logo_url).toBe(mockLeague.logo_url)
    expect(league.role).toBe(mockLeague.role)
    expect(league.member_count).toBe(mockLeague.member_count)
  })
})

describe('LeagueProvider', () => {
  it('renders children without errors', () => {
    const { result } = renderHook(() => ({ ok: true }), {
      wrapper: ({ children }) => (
        <LeagueProvider initialLeague={mockLeague}>
          {children}
        </LeagueProvider>
      ),
    })

    expect(result.current).toEqual({ ok: true })
  })

  it('provides context value with proper structure', () => {
    const { result } = renderHook(() => useLeague(), {
      wrapper: ({ children }) => (
        <LeagueProvider initialLeague={mockLeague}>
          {children}
        </LeagueProvider>
      ),
    })

    expect(result.current).toHaveProperty('league')
    expect(result.current).toHaveProperty('setLeague')
    expect(typeof result.current.setLeague).toBe('function')
  })

  it('memoizes context value reference to prevent unnecessary updates', () => {
    const values: Array<ReturnType<typeof useLeague>> = []

    const { result, rerender } = renderHook(() => useLeague(), {
      wrapper: ({ children }) => (
        <LeagueProvider initialLeague={mockLeague}>
          {children}
        </LeagueProvider>
      ),
    })

    values.push(result.current)

    rerender()

    values.push(result.current)

    // The context value object should be the same reference (memoized)
    // when the league hasn't changed
    expect(values[0]).toBe(values[1])
  })
})
