/**
 * Unit tests for migration 20260601000026_league_permissions_policies.sql.
 * Validates SQL file content without requiring a running database
 * (PRD league-permissions, task_02; ADR-002, ADR-003, ADR-004).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const MIGRATION_PATH = join(
  process.cwd(),
  'supabase/migrations/20260601000026_league_permissions_policies.sql'
)

const TEST_LEAGUE_UUID = '00000000-0000-0000-0000-000000000001'

describe('migration 20260601000026_league_permissions_policies.sql — file content', () => {
  const sql = existsSync(MIGRATION_PATH) ? readFileSync(MIGRATION_PATH, 'utf-8') : ''

  it('migration file exists', () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true)
  })

  // ── leagues_insert: creation gate ───────────────────────────────────────────

  it('drops and recreates leagues_insert', () => {
    expect(sql).toMatch(/DROP POLICY IF EXISTS\s+leagues_insert\s+ON\s+public\.leagues/i)
    expect(sql).toMatch(/CREATE POLICY\s+leagues_insert\s+ON\s+public\.leagues/i)
  })

  it('leagues_insert requires both created_by and can_create_league = true', () => {
    expect(sql).toMatch(/auth\.uid\(\)\s*=\s*created_by/i)
    expect(sql).toMatch(/FROM\s+public\.users\s+u/i)
    expect(sql).toMatch(/u\.can_create_league\s*=\s*true/i)
  })

  // ── leagues_select_open: hide the test league ───────────────────────────────

  it('drops and recreates leagues_select_open', () => {
    expect(sql).toMatch(/DROP POLICY IF EXISTS\s+"?leagues_select_open"?\s+ON\s+public\.leagues/i)
    expect(sql).toMatch(/CREATE POLICY\s+"?leagues_select_open"?\s+ON\s+public\.leagues/i)
  })

  it('excludes the test-league UUID from the open branch', () => {
    expect(sql).toContain(TEST_LEAGUE_UUID)
    expect(sql).toMatch(
      new RegExp(`access_type\\s*=\\s*'open'\\s+AND\\s+leagues\\.id\\s*<>\\s*'${TEST_LEAGUE_UUID}'`, 'i')
    )
  })

  it('keeps the membership branch with a fully qualified leagues.id (no ambiguous id)', () => {
    // Migration 13 proved an unqualified `id` resolves to league_members.id,
    // hiding leagues from their own members. Must stay qualified.
    expect(sql).toMatch(/lm\.league_id\s*=\s*leagues\.id/i)
    expect(sql).not.toMatch(/lm\.league_id\s*=\s*id\b/i)
  })

  // ── handle_new_user: stop auto-enroll, keep upsert + SECURITY DEFINER ────────

  it('replaces handle_new_user keeping the users upsert with ON CONFLICT DO NOTHING', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION\s+public\.handle_new_user/i)
    expect(sql).toMatch(/INSERT INTO\s+public\.users/i)
    expect(sql).toMatch(/ON CONFLICT\s*\(id\)\s+DO NOTHING/i)
  })

  it('keeps the function SECURITY DEFINER', () => {
    expect(sql).toMatch(/SECURITY DEFINER/i)
  })

  it('removes the auto-enroll INSERT into the test league', () => {
    expect(sql).not.toMatch(/INSERT INTO\s+public\.league_members/i)
  })
})
