/**
 * Unit tests for migration 20260525000018_add_matches_external_id.sql.
 * Validates SQL file content without requiring a running database.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const MIGRATION_PATH = join(
  process.cwd(),
  'supabase/migrations/20260525000018_add_matches_external_id.sql'
)

describe('migration 20260525000018_add_matches_external_id.sql — file content', () => {
  let sql: string

  it('migration file exists', () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true)
    sql = readFileSync(MIGRATION_PATH, 'utf-8')
  })

  it('adds external_id column with IF NOT EXISTS', () => {
    sql = sql ?? readFileSync(MIGRATION_PATH, 'utf-8')
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+external_id\s+TEXT/i)
  })

  it('adds venue column', () => {
    sql = sql ?? readFileSync(MIGRATION_PATH, 'utf-8')
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+venue\s+TEXT/i)
  })

  it('adds city column', () => {
    sql = sql ?? readFileSync(MIGRATION_PATH, 'utf-8')
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+city\s+TEXT/i)
  })

  it('adds home_flag column', () => {
    sql = sql ?? readFileSync(MIGRATION_PATH, 'utf-8')
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+home_flag\s+TEXT/i)
  })

  it('adds away_flag column', () => {
    sql = sql ?? readFileSync(MIGRATION_PATH, 'utf-8')
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+away_flag\s+TEXT/i)
  })

  it('creates idx_matches_external_id index', () => {
    sql = sql ?? readFileSync(MIGRATION_PATH, 'utf-8')
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS\s+idx_matches_external_id/i)
  })

  it('creates idx_matches_phase_status index', () => {
    sql = sql ?? readFileSync(MIGRATION_PATH, 'utf-8')
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS\s+idx_matches_phase_status/i)
  })

  it('adds UNIQUE constraint on external_id', () => {
    sql = sql ?? readFileSync(MIGRATION_PATH, 'utf-8')
    expect(sql).toMatch(/matches_external_id_key.*UNIQUE|UNIQUE.*matches_external_id_key/i)
  })

  it('targets public.matches table', () => {
    sql = sql ?? readFileSync(MIGRATION_PATH, 'utf-8')
    expect(sql).toMatch(/public\.matches/i)
  })

  it('does not alter existing columns (home_team, away_team, match_date not in ALTER)', () => {
    sql = sql ?? readFileSync(MIGRATION_PATH, 'utf-8')
    // Should not contain ALTER COLUMN for existing columns
    expect(sql).not.toMatch(/ALTER COLUMN\s+(home_team|away_team|match_date)/i)
  })
})
