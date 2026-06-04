/**
 * Unit tests for migration 20260601000023_add_matches_manual_flags.sql.
 * Validates SQL file content without requiring a running database.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const MIGRATION_PATH = join(
  process.cwd(),
  'supabase/migrations/20260601000023_add_matches_manual_flags.sql'
)

describe('migration 20260601000023_add_matches_manual_flags.sql — file content', () => {
  let sql: string

  it('migration file exists', () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true)
    sql = readFileSync(MIGRATION_PATH, 'utf-8')
  })

  it('adds is_manual boolean NOT NULL DEFAULT false', () => {
    sql = sql ?? readFileSync(MIGRATION_PATH, 'utf-8')
    expect(sql).toMatch(
      /ADD COLUMN IF NOT EXISTS\s+is_manual\s+boolean\s+NOT NULL\s+DEFAULT\s+false/i
    )
  })

  it('adds manual_updated_at timestamptz (nullable)', () => {
    sql = sql ?? readFileSync(MIGRATION_PATH, 'utf-8')
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+manual_updated_at\s+timestamptz/i)
    // manual_updated_at must remain nullable: no NOT NULL on that column.
    expect(sql).not.toMatch(/manual_updated_at\s+timestamptz\s+NOT NULL/i)
  })

  it('uses ADD COLUMN IF NOT EXISTS (idempotent / re-runnable)', () => {
    sql = sql ?? readFileSync(MIGRATION_PATH, 'utf-8')
    const idempotentAdds = sql.match(/ADD COLUMN IF NOT EXISTS/gi) ?? []
    expect(idempotentAdds.length).toBeGreaterThanOrEqual(2)
  })

  it('defaults existing rows to is_manual = false (NOT NULL DEFAULT false backfills)', () => {
    sql = sql ?? readFileSync(MIGRATION_PATH, 'utf-8')
    // A NOT NULL column with DEFAULT false causes Postgres to backfill all
    // existing rows with false, preserving automatic control.
    expect(sql).toMatch(/is_manual\s+boolean\s+NOT NULL\s+DEFAULT\s+false/i)
  })

  it('targets public.matches table', () => {
    sql = sql ?? readFileSync(MIGRATION_PATH, 'utf-8')
    expect(sql).toMatch(/ALTER TABLE\s+public\.matches/i)
  })

  it('does not alter predictions / champion_bets / leagues / league_members', () => {
    sql = sql ?? readFileSync(MIGRATION_PATH, 'utf-8')
    expect(sql).not.toMatch(/\b(predictions|champion_bets|leagues|league_members)\b/i)
  })

  it('does not drop the phase CHECK or external_id UNIQUE constraints', () => {
    sql = sql ?? readFileSync(MIGRATION_PATH, 'utf-8')
    expect(sql).not.toMatch(/DROP\s+CONSTRAINT/i)
    expect(sql).not.toMatch(/DROP\s+COLUMN/i)
  })

  it('does not alter existing columns (home_team, away_team, match_date, status)', () => {
    sql = sql ?? readFileSync(MIGRATION_PATH, 'utf-8')
    expect(sql).not.toMatch(/ALTER COLUMN\s+(home_team|away_team|match_date|status|phase)/i)
  })
})
