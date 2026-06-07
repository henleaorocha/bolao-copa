/**
 * Unit tests for migration 20260601000025_users_can_create_league.sql.
 * Validates SQL file content without requiring a running database
 * (PRD league-permissions, task_01; ADR-001, ADR-004).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const MIGRATION_PATH = join(
  process.cwd(),
  'supabase/migrations/20260601000025_users_can_create_league.sql'
)

describe('migration 20260601000025_users_can_create_league.sql — file content', () => {
  const sql = existsSync(MIGRATION_PATH) ? readFileSync(MIGRATION_PATH, 'utf-8') : ''

  it('migration file exists', () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true)
  })

  it('adds can_create_league column to public.users with IF NOT EXISTS', () => {
    expect(sql).toMatch(/ALTER TABLE\s+public\.users/i)
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+can_create_league\s+BOOLEAN/i)
  })

  it('column is NOT NULL with DEFAULT false', () => {
    expect(sql).toMatch(
      /can_create_league\s+BOOLEAN\s+NOT NULL\s+DEFAULT\s+false/i
    )
  })

  it('grants the capability to both operator e-mails via an UPDATE', () => {
    expect(sql).toMatch(/UPDATE\s+public\.users/i)
    expect(sql).toMatch(/SET\s+can_create_league\s*=\s*true/i)
    expect(sql).toMatch(/hen\.leao\.rocha@gmail\.com/i)
    expect(sql).toMatch(/henrique\.rocha@arkmeds\.com/i)
  })

  it('grant uses an idempotent email IN (...) filter (re-runnable, no error on absent rows)', () => {
    expect(sql).toMatch(/WHERE\s+email\s+IN\s*\(/i)
  })

  it('does not alter any other table, policy, or trigger (scope of task_01)', () => {
    // Test-league hiding, the leagues_insert gate, and handle_new_user() belong to task_02.
    expect(sql).not.toMatch(/CREATE\s+POLICY/i)
    expect(sql).not.toMatch(/DROP\s+POLICY/i)
    expect(sql).not.toMatch(/CREATE\s+(OR REPLACE\s+)?FUNCTION/i)
    expect(sql).not.toMatch(/ALTER TABLE\s+public\.(leagues|league_members|predictions|matches|champion_bets|scores)/i)
  })
})
