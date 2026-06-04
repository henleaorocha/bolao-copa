/**
 * Guard test (task_08 / ADR-006): asserts the dropped api-sports source leaves
 * no trace in code, env, or docs. It walks the repository (excluding tooling,
 * dependencies, and the Compozy task tracking that documents the migration)
 * and fails if any forbidden symbol, URL, or env key reappears.
 *
 * The patterns are built from fragments so this file does not match itself;
 * the walker also skips this file by name as a second safeguard.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, basename, extname, relative } from 'path'

const REPO_ROOT = process.cwd()
const SELF = basename(__filename)

// Directories that legitimately keep api-sports history or are not source.
const IGNORED_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  '.compozy', // PRD/ADR/task tracking documents the migration away from api-sports
  'coverage',
  'dist',
  'build',
])

const SCANNED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.example',
  '.sql',
])

// Built from fragments so the patterns never match this guard file itself.
const FORBIDDEN: { label: string; re: RegExp }[] = [
  { label: 'API_FOOTBALL_KEY env var', re: new RegExp(['API', 'FOOTBALL', 'KEY'].join('_')) },
  { label: 'api-sports URL', re: new RegExp('v3\\.football\\.' + 'api-sports' + '\\.io') },
  { label: 'ApiFootballFixture type', re: new RegExp('Api' + 'Football' + 'Fixture') },
  { label: 'mapFixtureStatus symbol', re: new RegExp('map' + 'Fixture' + 'Status') },
  { label: 'api-sports reference', re: new RegExp('api' + '-sports', 'i') },
]

function shouldScan(filePath: string): boolean {
  const name = basename(filePath)
  if (name === SELF) return false
  // Skip gitignored, developer-local secret files (e.g. .env.local) — the
  // committed env template under guard is .env.example.
  if (/\.local$/.test(name)) return false
  if (name.startsWith('.env')) return true
  return SCANNED_EXTENSIONS.has(extname(filePath))
}

function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (IGNORED_DIRS.has(entry)) continue
      collectFiles(full, acc)
    } else if (st.isFile() && shouldScan(full)) {
      acc.push(full)
    }
  }
  return acc
}

describe('no api-sports references remain (task_08 / ADR-006)', () => {
  const files = collectFiles(REPO_ROOT)

  it('scans a non-trivial set of source/env/doc files', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  for (const { label, re } of FORBIDDEN) {
    it(`finds no ${label} anywhere in code, env, or docs`, () => {
      const offenders = files.filter(f => re.test(readFileSync(f, 'utf-8')))
      const rel = offenders.map(f => relative(REPO_ROOT, f))
      expect(rel, `Unexpected ${label} in: ${rel.join(', ')}`).toEqual([])
    })
  }
})
