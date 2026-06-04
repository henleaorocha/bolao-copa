/**
 * Seed-validity checks for the pre-launch validation harness (task_09 / ADR-009).
 *
 * These tests read the three preset-state SQL seeds as text, parse the INSERT
 * tuples, and assert the deterministic guarantees the Playwright run
 * (tests/e2e/validation-run.spec.ts) and the evidence doc depend on:
 *   - exactly one pilot league with two members and deterministic predictions
 *   - knockout rows use external_id = wc2026-<num> with real PT names that pass
 *     isConfirmedMatchup (scenario 7), and placeholders that correctly fail it
 *   - the finished-state predictions tie Ana and Bruno on points, broken by the
 *     "most recent exact" rule → Ana #1, Bruno #2 (scenario 6)
 *
 * Parsing the SQL (rather than re-stating the data here) means a change to a
 * seed that breaks an invariant fails this test.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { computeRanking } from '@/lib/ranking'
import { isConfirmedMatchup } from '@/lib/bracket-skeleton'
import { VALID_TEAM_NAMES } from '@/lib/copa-teams'

const SEEDS_DIR = resolve(__dirname, '../../supabase/seeds')

const PILOT_LEAGUE = 'e2e00000-0000-0000-0000-0000000000c1'
const USER_A = 'e2e00000-0000-0000-0000-0000000000a1' // Ana
const USER_B = 'e2e00000-0000-0000-0000-0000000000a2' // Bruno

function read(file: string): string {
  // Strip full-line SQL comments; some carry apostrophes (e.g. 'group') that
  // would otherwise confuse the quote-aware tuple parser.
  return readFileSync(resolve(SEEDS_DIR, file), 'utf8')
    .split('\n')
    .filter((line) => !/^\s*--/.test(line))
    .join('\n')
}

/**
 * Parse the VALUES tuples of a single `INSERT INTO <table>` statement into rows
 * of raw cell strings (quotes preserved on string literals, NULL/expressions
 * kept verbatim). Quote-aware and depth-aware so commas/parens inside strings
 * or nested calls don't split a cell.
 */
function parseRows(sql: string, table: string): string[][] {
  const at = sql.indexOf(`INSERT INTO ${table}`)
  if (at === -1) return []
  const body = sql.slice(sql.indexOf('VALUES', at) + 'VALUES'.length)
  const rows: string[][] = []
  let depth = 0
  let inStr = false
  let cur = ''
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (inStr) {
      cur += ch
      if (ch === "'" && body[i + 1] === "'") {
        cur += "'"
        i++
      } else if (ch === "'") inStr = false
      continue
    }
    if (ch === "'") {
      inStr = true
      cur += ch
    } else if (ch === '(') {
      if (++depth === 1) cur = ''
      else cur += ch
    } else if (ch === ')') {
      if (--depth === 0) {
        rows.push(splitCells(cur))
        cur = ''
      } else cur += ch
    } else if (ch === ';' && depth === 0) {
      break
    } else if (depth >= 1) cur += ch
  }
  return rows
}

function splitCells(tuple: string): string[] {
  const cells: string[] = []
  let depth = 0
  let inStr = false
  let cur = ''
  for (let i = 0; i < tuple.length; i++) {
    const ch = tuple[i]
    if (inStr) {
      cur += ch
      if (ch === "'" && tuple[i + 1] === "'") {
        cur += "'"
        i++
      } else if (ch === "'") inStr = false
      continue
    }
    if (ch === "'") {
      inStr = true
      cur += ch
    } else if (ch === '(') {
      depth++
      cur += ch
    } else if (ch === ')') {
      depth--
      cur += ch
    } else if (ch === ',' && depth === 0) {
      cells.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim() !== '') cells.push(cur.trim())
  return cells
}

function unquote(cell: string): string {
  const t = cell.trim()
  if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'")
  return t
}

function numOrNull(cell: string): number | null {
  const t = cell.trim()
  return t.toUpperCase() === 'NULL' || t === '' ? null : Number(t)
}

const DAY = 86_400_000
const BASE = Date.parse('2026-07-20T00:00:00Z')

/** Turn `now() ± interval 'N <unit>'` into a sortable synthetic ISO date. */
function intervalToIso(expr: string): string {
  const m = expr.match(/now\(\)\s*([+-])\s*interval\s*'(\d+)\s*(day|hour|minute)s?'/i)
  if (!m) return new Date(BASE).toISOString()
  const sign = m[1] === '-' ? -1 : 1
  const n = Number(m[2])
  const unit = m[3].toLowerCase()
  const ms = unit === 'day' ? n * DAY : unit === 'hour' ? n * 3_600_000 : n * 60_000
  return new Date(BASE + sign * ms).toISOString()
}

// Column order of the matches INSERT in every seed file.
const M = {
  id: 0, external_id: 1, home_team: 2, away_team: 4, match_date: 6,
  phase: 7, status: 11, home_score: 12, away_score: 13,
}

interface MatchRow {
  id: string
  external_id: string
  home_team: string
  away_team: string
  match_date: string
  phase: string
  status: string
  home_score: number | null
  away_score: number | null
}

function matches(sql: string): MatchRow[] {
  return parseRows(sql, 'public.matches').map((c) => ({
    id: unquote(c[M.id]),
    external_id: unquote(c[M.external_id]),
    home_team: unquote(c[M.home_team]),
    away_team: unquote(c[M.away_team]),
    match_date: intervalToIso(c[M.match_date]),
    phase: unquote(c[M.phase]),
    status: unquote(c[M.status]),
    home_score: numOrNull(c[M.home_score]),
    away_score: numOrNull(c[M.away_score]),
  }))
}

const STATES = ['precup', 'live', 'finished'] as const

describe.each(STATES)('state-%s.sql — structural guarantees', (state) => {
  const sql = read(`state-${state}.sql`)

  it('creates the pilot league with exactly two members', () => {
    const members = parseRows(sql, 'public.league_members').filter((r) => r[0].includes('c1'))
    expect(members).toHaveLength(2)
    const userIds = members.map((r) => r[1])
    expect(userIds.some((u) => u.includes('a1'))).toBe(true)
    expect(userIds.some((u) => u.includes('a2'))).toBe(true)
    expect(sql).toContain(PILOT_LEAGUE)
    expect(sql).toContain('val-token-piloto-0001') // deterministic invite token
  })

  it('seeds both participants and deterministic predictions + champion bets', () => {
    expect(sql).toContain('validacao.a@bolao.test')
    expect(sql).toContain('validacao.b@bolao.test')
    const preds = parseRows(sql, 'public.predictions')
    expect(preds.length).toBeGreaterThanOrEqual(2)
    expect(preds.some((r) => r[0].includes('a1'))).toBe(true)
    expect(preds.some((r) => r[0].includes('a2'))).toBe(true)
    const champ = parseRows(sql, 'public.champion_bets')
    expect(champ.length).toBeGreaterThanOrEqual(2)
    for (const row of champ) {
      expect(VALID_TEAM_NAMES.has(unquote(row[2]))).toBe(true) // champion
      expect(VALID_TEAM_NAMES.has(unquote(row[3]))).toBe(true) // runner-up
    }
  })

  it('uses Portuguese roster names for every confirmed match team', () => {
    const rows = matches(sql)
    expect(rows.length).toBeGreaterThan(0)
    for (const m of rows) {
      const placeholder = /^[0-9]/.test(m.home_team) || /^[0-9]/.test(m.away_team)
      if (!placeholder) {
        expect(VALID_TEAM_NAMES.has(m.home_team), `${state}: ${m.home_team}`).toBe(true)
        expect(VALID_TEAM_NAMES.has(m.away_team), `${state}: ${m.away_team}`).toBe(true)
      }
    }
  })

  it('keys knockout rows by external_id = wc2026-<num>/final and confirms real matchups', () => {
    const knockout = matches(sql).filter((m) => m.external_id.startsWith('wc2026-'))
    for (const m of knockout) {
      expect(m.external_id).toMatch(/^wc2026-(\d+|final|3rd)$/)
      const placeholder = /^[0-9]/.test(m.home_team) || /^[0-9]/.test(m.away_team)
      // Placeholder slots (e.g. "2A"/"2B") must FAIL confirmation; real PT
      // matchups must PASS so scenario 7 betting is unblocked.
      expect(isConfirmedMatchup(m.home_team, m.away_team)).toBe(!placeholder)
    }
  })
})

describe('state-finished.sql — deterministic ranking & tiebreaker', () => {
  const sql = read('state-finished.sql')
  const allMatches = matches(sql)
  const finished = allMatches.filter((m) => m.status === 'finished')

  const preds = parseRows(sql, 'public.predictions').map((r) => ({
    user_id: r[0].includes('a1') ? USER_A : USER_B,
    match_id: unquote(r[2]),
    predicted_home_score: Number(r[3]),
    predicted_away_score: Number(r[4]),
  }))
  const champ = parseRows(sql, 'public.champion_bets').map((r) => ({
    user_id: r[0].includes('a1') ? USER_A : USER_B,
    champion_team: unquote(r[2]),
    runner_up_team: unquote(r[3]),
  }))

  const ranking = computeRanking({
    members: [
      { user_id: USER_A, full_name: 'Ana Validação', avatar_color: '#FFC72C', joined_at: '2026-06-01T00:00:00Z' },
      { user_id: USER_B, full_name: 'Bruno Validação', avatar_color: '#2EC4B6', joined_at: '2026-06-01T00:00:00Z' },
    ],
    predictions: preds,
    finishedMatches: finished.map((m) => ({
      id: m.id,
      phase: m.phase,
      home_score: m.home_score,
      away_score: m.away_score,
      match_date: m.match_date,
      home_team: m.home_team,
      away_team: m.away_team,
    })),
    championBets: champ,
  })

  it('ties Ana and Bruno on points', () => {
    expect(ranking[0].points).toBe(ranking[1].points)
  })

  it('breaks the tie by most-recent exact → Ana #1, Bruno #2', () => {
    expect(ranking[0].user_id).toBe(USER_A)
    expect(ranking[1].user_id).toBe(USER_B)
    expect(ranking[0].position).toBe(1)
    expect(ranking[1].position).toBe(2)
  })

  it('gives each participant exactly one exact score', () => {
    expect(ranking[0].exact_scores).toBe(1)
    expect(ranking[1].exact_scores).toBe(1)
  })

  it('totals 135 (60 match + 75 champion) for each — champion bet scored after the final', () => {
    expect(ranking[0].points).toBe(135)
    expect(ranking[1].points).toBe(135)
  })
})
