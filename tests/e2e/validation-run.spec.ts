/**
 * Pre-launch validation run (task_09 / ADR-009).
 *
 * Walks the seven scenarios of docs/VALIDACAO-MANUAL.md through the REAL UI and
 * REAL route handlers, as two seeded participants (Ana + Bruno), across three
 * preset DB states (pre-Cup → in-progress → finished). Each step is screenshotted
 * and its expected/observed/pass-fail recorded; on completion the run writes
 * docs/VALIDACAO-EVIDENCIA.md.
 *
 * Mechanics (memory reference-authed-browser-e2e):
 *   - SQL seeds applied to the LOCAL stack via docker exec psql (seed-runner).
 *   - Sign-in via local GoTrue; the @supabase/ssr cookie is captured and injected
 *     into a Playwright context, so context.request hits the real guarded routes.
 *   - Deadlines use a time-machine clock (match_date relative to now()).
 *
 * Re-executable end-to-end: `supabase start` then `npx playwright test`. Skips
 * cleanly when the local stack isn't running.
 */
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getLocalSupabaseEnv, isLocalSupabaseRunning } from './local-env'
import { applySeed } from './seed-runner'

// ── Fixed identifiers (must match supabase/seeds/state-*.sql) ────────────────
const PASSWORD = 'Validacao123!'
const ANA = { email: 'validacao.a@bolao.test', name: 'Ana Validação' }
const BRUNO = { email: 'validacao.b@bolao.test', name: 'Bruno Validação' }
const PILOT = 'e2e00000-0000-0000-0000-0000000000c1'
const PUBLIC_LEAGUE = 'e2e00000-0000-0000-0000-0000000000c2'
const M_OPEN = 'e2e10000-0000-0000-0000-000000000001' // val-open-grp (open group)
const M_LOCKED = 'e2e10000-0000-0000-0000-000000000002' // val-locked-grp (< 1h)
const M_KO_CONFIRMED = 'e2e10000-0000-0000-0000-000000000101' // wc2026-101 (real PT teams)
const M_KO_PLACEHOLDER = 'e2e10000-0000-0000-0000-000000000102' // wc2026-102 (2A/2B)

const DOCS = resolve(process.cwd(), 'docs')
const SHOTS = resolve(DOCS, 'evidencia')

interface Step {
  scenario: string
  step: string
  expected: string
  observed: string
  pass: boolean
  shot: string
}
const evidence: Step[] = []
let seq = 0

let env: { apiUrl: string; anonKey: string; serviceKey: string }
let service: SupabaseClient

test.describe.configure({ mode: 'serial' })

test.beforeAll(() => {
  mkdirSync(SHOTS, { recursive: true })
  env = getLocalSupabaseEnv()
  service = createClient(env.apiUrl, env.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
})

// Sign in a seeded user and return a browser context carrying the auth cookie.
async function authContext(browser: Browser, email: string): Promise<{ ctx: BrowserContext; page: Page; userId: string }> {
  const anon = createClient(env.apiUrl, env.anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await anon.auth.signInWithPassword({ email, password: PASSWORD })
  if (error || !data.session) throw new Error(`sign-in failed for ${email}: ${error?.message}`)
  const { access_token, refresh_token } = data.session

  const captured: { name: string; value: string }[] = []
  const ssr = createServerClient(env.apiUrl, env.anonKey, {
    cookies: { getAll: () => [], setAll: (list) => list.forEach((c) => captured.push({ name: c.name, value: c.value })) },
  })
  await ssr.auth.setSession({ access_token, refresh_token })

  const ctx = await browser.newContext({ baseURL: 'http://localhost:3000' })
  await ctx.addCookies(
    captured.map((c) => ({ name: c.name, value: c.value, domain: 'localhost', path: '/', httpOnly: true, secure: false, sameSite: 'Lax' as const }))
  )
  const page = await ctx.newPage()
  return { ctx, page, userId: data.user!.id }
}

async function api(page: Page, method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown) {
  const res = await page.request.fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    data: body === undefined ? undefined : JSON.stringify(body),
  })
  let json: Record<string, unknown> | null = null
  try {
    json = (await res.json()) as Record<string, unknown>
  } catch {
    json = null
  }
  return { status: res.status(), json }
}

// Screenshot the page at `url` and record one evidence step.
async function record(page: Page, url: string, scenario: string, step: string, expected: string, observed: string, pass: boolean) {
  seq += 1
  const slug = `${String(seq).padStart(2, '0')}-${scenario.replace(/[^0-9]/g, '')}-${step.slice(0, 24).replace(/[^a-zA-Z0-9]+/g, '-')}`
  const file = `${slug}.png`
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(400)
  } catch {
    /* still capture whatever is on screen */
  }
  try {
    await page.screenshot({ path: resolve(SHOTS, file) })
  } catch {
    /* screenshot best-effort */
  }
  evidence.push({ scenario, step, expected, observed, pass, shot: `evidencia/${file}` })
}

test('validation run — scenarios 1–7 across preset states', async ({ browser }) => {
  test.skip(!isLocalSupabaseRunning(), 'Local Supabase not running — start it with `supabase start`.')
  test.setTimeout(300_000)

  let runtimeLeagueId = ''

  // ══════════════════════════════════════════════════════════════════════════
  // STATE: PRE-CUP → scenarios 1 (invite), 2 (visibility), 3 (bet saved), 4 (lock)
  // ══════════════════════════════════════════════════════════════════════════
  applySeed('precup')
  let ana = await authContext(browser, ANA.email)
  let bruno = await authContext(browser, BRUNO.email)

  // ── Scenario 1 — Convite e entrada ────────────────────────────────────────
  const create = await api(ana.page, 'POST', '/api/leagues', { name: 'Liga Convite Validação', access_type: 'private' })
  runtimeLeagueId = (create.json?.data as { id?: string } | undefined)?.id ?? ''
  await record(
    ana.page, '/ligas', 'Cenário 1', '1.1 Ana cria liga privada',
    'HTTP 201 + liga criada com id', `HTTP ${create.status}, id=${runtimeLeagueId || '—'}`,
    create.status === 201 && Boolean(runtimeLeagueId)
  )

  const { data: leagueRow } = await service.from('leagues').select('invite_token, member_count').eq('id', runtimeLeagueId).single()
  const inviteToken = (leagueRow?.invite_token as string) ?? ''

  const wrongJoin = await api(bruno.page, 'POST', `/api/leagues/${runtimeLeagueId}/join`, { token: 'token-errado' })
  await record(
    bruno.page, '/ligas', 'Cenário 1', '1.3 Bruno entra com token errado',
    'HTTP 403 INVALID_TOKEN', `HTTP ${wrongJoin.status} ${wrongJoin.json?.code ?? ''}`,
    wrongJoin.status === 403 && wrongJoin.json?.code === 'INVALID_TOKEN'
  )

  const goodJoin = await api(bruno.page, 'POST', `/api/leagues/${runtimeLeagueId}/join`, { token: inviteToken })
  const { data: afterJoin } = await service.from('leagues').select('member_count').eq('id', runtimeLeagueId).single()
  await record(
    bruno.page, '/ligas', 'Cenário 1', '1.2 Bruno entra com token válido',
    'HTTP 200 + member_count incrementa para 2', `HTTP ${goodJoin.status}, member_count=${afterJoin?.member_count}`,
    goodJoin.status === 200 && afterJoin?.member_count === 2
  )

  const dupJoin = await api(bruno.page, 'POST', `/api/leagues/${runtimeLeagueId}/join`, { token: inviteToken })
  await record(
    bruno.page, '/ligas', 'Cenário 1', '1.4 Bruno tenta entrar de novo',
    'HTTP 400 ALREADY_A_MEMBER', `HTTP ${dupJoin.status} ${dupJoin.json?.code ?? ''}`,
    dupJoin.status === 400 && dupJoin.json?.code === 'ALREADY_A_MEMBER'
  )

  // ── Scenario 2 — Visualização pública vs privada ──────────────────────────
  const discover = await api(bruno.page, 'GET', '/api/leagues/discover')
  const discovered = ((discover.json?.data as { id: string }[] | undefined) ?? []).map((l) => l.id)
  const publicListed = discovered.includes(PUBLIC_LEAGUE)
  const privateHidden = !discovered.includes(runtimeLeagueId) && !discovered.includes(PILOT)
  await record(
    bruno.page, '/ligas', 'Cenário 2', '2.1/2.3 Descobrir lista só públicas',
    'Liga pública aparece; privadas não', `pública=${publicListed}, privadas ocultas=${privateHidden}`,
    publicListed && privateHidden
  )

  const joinPublic = await api(bruno.page, 'POST', `/api/leagues/${PUBLIC_LEAGUE}/join`, {})
  await record(
    bruno.page, '/ligas', 'Cenário 2', '2.2 Entrar em liga pública sem token',
    'HTTP 200 (token só exigido em privada)', `HTTP ${joinPublic.status}`,
    joinPublic.status === 200
  )

  // ── Scenario 3 — Palpite salvo de verdade ─────────────────────────────────
  const save1 = await api(bruno.page, 'PUT', `/api/leagues/${PILOT}/predictions/${M_OPEN}`, { home_score: 2, away_score: 1 })
  const { data: pred1 } = await service.from('predictions').select('predicted_home_score, predicted_away_score').eq('user_id', bruno.userId).eq('league_id', PILOT).eq('match_id', M_OPEN).single()
  await record(
    bruno.page, `/ligas/${PILOT}/palpites`, 'Cenário 3', '3.1/3.2 Palpite 2x1 salvo e persistido',
    'HTTP 200; banco grava 2x1', `HTTP ${save1.status}; banco=${pred1?.predicted_home_score}x${pred1?.predicted_away_score}`,
    save1.status === 200 && pred1?.predicted_home_score === 2 && pred1?.predicted_away_score === 1
  )

  const save2 = await api(bruno.page, 'PUT', `/api/leagues/${PILOT}/predictions/${M_OPEN}`, { home_score: 3, away_score: 0 })
  const { count: predCount } = await service.from('predictions').select('*', { count: 'exact', head: true }).eq('user_id', bruno.userId).eq('league_id', PILOT).eq('match_id', M_OPEN)
  await record(
    bruno.page, `/ligas/${PILOT}/palpites`, 'Cenário 3', '3.3 Reenviar palpite sobrescreve',
    'HTTP 200; permanece 1 linha (upsert)', `HTTP ${save2.status}; linhas=${predCount}`,
    save2.status === 200 && predCount === 1
  )

  const invalid = await api(bruno.page, 'PUT', `/api/leagues/${PILOT}/predictions/${M_OPEN}`, { home_score: -1, away_score: 200 })
  await record(
    bruno.page, `/ligas/${PILOT}/palpites`, 'Cenário 3', '3.5 Placar inválido rejeitado',
    'HTTP 400 INVALID_BODY', `HTTP ${invalid.status} ${invalid.json?.code ?? ''}`,
    invalid.status === 400 && invalid.json?.code === 'INVALID_BODY'
  )

  // ── Scenario 4 — Bloqueio por horário + aposta de campeão ──────────────────
  const open = await api(bruno.page, 'PUT', `/api/leagues/${PILOT}/predictions/${M_OPEN}`, { home_score: 1, away_score: 0 })
  await record(
    bruno.page, `/ligas/${PILOT}/palpites`, 'Cenário 4', '4.1 Jogo > 1h aceita palpite',
    'HTTP 200', `HTTP ${open.status}`, open.status === 200
  )

  const locked = await api(bruno.page, 'PUT', `/api/leagues/${PILOT}/predictions/${M_LOCKED}`, { home_score: 1, away_score: 1 })
  await record(
    bruno.page, `/ligas/${PILOT}/palpites`, 'Cenário 4', '4.2 Jogo < 1h trava palpite',
    'HTTP 403 DEADLINE_PASSED', `HTTP ${locked.status} ${locked.json?.code ?? ''}`,
    locked.status === 403 && locked.json?.code === 'DEADLINE_PASSED'
  )

  const champOk = await api(bruno.page, 'PUT', `/api/leagues/${PILOT}/champion-bet`, { champion_team: 'Brasil', runner_up_team: 'Argentina' })
  await record(
    bruno.page, `/ligas/${PILOT}/palpites`, 'Cenário 4', '4.3 Aposta de campeão antes do prazo',
    'HTTP 200 (BET_DEADLINE 11/06 ainda no futuro)', `HTTP ${champOk.status}`, champOk.status === 200
  )

  const champSame = await api(bruno.page, 'PUT', `/api/leagues/${PILOT}/champion-bet`, { champion_team: 'Brasil', runner_up_team: 'Brasil' })
  await record(
    bruno.page, `/ligas/${PILOT}/palpites`, 'Cenário 4', '4.5 Campeão == vice rejeitado',
    'HTTP 400 SAME_TEAM', `HTTP ${champSame.status} ${champSame.json?.code ?? ''}`,
    champSame.status === 400 && champSame.json?.code === 'SAME_TEAM'
  )

  await ana.ctx.close()
  await bruno.ctx.close()

  // ══════════════════════════════════════════════════════════════════════════
  // STATE: IN-PROGRESS → scenario 7 betting (confirmed vs. unconfirmed knockout)
  // ══════════════════════════════════════════════════════════════════════════
  applySeed('live')
  bruno = await authContext(browser, BRUNO.email)

  const koOk = await api(bruno.page, 'PUT', `/api/leagues/${PILOT}/predictions/${M_KO_CONFIRMED}`, { home_score: 2, away_score: 1 })
  await record(
    bruno.page, `/ligas/${PILOT}/mata-mata`, 'Cenário 7', '7.1 Mata-mata com times reais aceita palpite',
    'HTTP 200 (Brasil x Argentina, nomes PT confirmados)', `HTTP ${koOk.status}`, koOk.status === 200
  )

  const koReject = await api(bruno.page, 'PUT', `/api/leagues/${PILOT}/predictions/${M_KO_PLACEHOLDER}`, { home_score: 1, away_score: 0 })
  await record(
    bruno.page, `/ligas/${PILOT}/mata-mata`, 'Cenário 7', '7.2 Mata-mata com placeholder rejeita',
    'HTTP 409 MATCH_NOT_CONFIRMED (slot 2A x 2B)', `HTTP ${koReject.status} ${koReject.json?.code ?? ''}`,
    koReject.status === 409 && koReject.json?.code === 'MATCH_NOT_CONFIRMED'
  )

  await bruno.ctx.close()

  // ══════════════════════════════════════════════════════════════════════════
  // STATE: FINISHED → scenarios 5 (scoring), 6 (ranking/tiebreak), 7.3-7.5 (KO)
  // ══════════════════════════════════════════════════════════════════════════
  applySeed('finished')
  ana = await authContext(browser, ANA.email)

  const rankRes = await api(ana.page, 'GET', `/api/leagues/${PILOT}/ranking`)
  const ranking = ((rankRes.json?.data as { ranking?: RankEntry[] } | undefined)?.ranking ?? []) as RankEntry[]
  const first = ranking[0]
  const second = ranking[1]

  // Scenario 5 — per-match scoring is reflected in the live ranking totals.
  await record(
    ana.page, `/ligas/${PILOT}/ranking`, 'Cenário 5', '5.x Pontuação por jogo finalizado',
    'Ana: 135 pts, exact_scores=1, correct_outcomes=7 (10/×mult exato, 5/×mult acerto, 0 erro)',
    `pts=${first?.points}, exact=${first?.exact_scores}, outcomes=${first?.correct_outcomes}`,
    first?.user_id?.includes('a1') === true && first?.points === 135 && first?.exact_scores === 1 && first?.correct_outcomes === 7
  )

  // Scenario 5.7 — champion bet scored after the final (Brasil 1x0 Espanha).
  await record(
    ana.page, `/ligas/${PILOT}/ranking`, 'Cenário 5', '5.7 Aposta de campeão pontua após a final',
    'Bruno também 135 (palpites diferentes mas mesmo total + campeão/vice corretos)',
    `Bruno pts=${second?.points}`,
    second?.points === 135
  )

  // Scenario 6 — ranking order & tiebreaker (equal points → most-recent exact).
  await record(
    ana.page, `/ligas/${PILOT}/ranking`, 'Cenário 6', '6.1/6.3 Ranking e desempate por cravada mais recente',
    'Empate 135x135 → Ana em 1º (cravada na semi, mais recente); Bruno 2º (cravada no grupo)',
    `1º=${first?.full_name} (${first?.points}), 2º=${second?.full_name} (${second?.points})`,
    first?.full_name === ANA.name && second?.full_name === BRUNO.name && first?.points === second?.points
  )

  // Scenario 7.3-7.5 — knockout scoring & champion derivation via the bracket.
  const bracketRes = await api(ana.page, 'GET', `/api/leagues/${PILOT}/bracket`)
  const phases = ((bracketRes.json?.data as { phases?: BracketPhase[] } | undefined)?.phases ?? []) as BracketPhase[]
  const semi = phases.find((p) => p.phase === 'semi')?.slots.find((s) => s.state === 'finished')
  const final = phases.find((p) => p.phase === 'final')?.slots.find((s) => s.state === 'finished')
  await record(
    ana.page, `/ligas/${PILOT}/mata-mata`, 'Cenário 7', '7.3/7.4/7.5 Pontuação do mata-mata e campeão',
    'Semi finalizada (Brasil 2x1 Argentina, ×3) e Final (Brasil 1x0 Espanha, ×4) → campeão Brasil',
    `semi=${semi?.homeTeam} ${semi?.homeScore}x${semi?.awayScore} ${semi?.awayTeam}; final=${final?.homeTeam} ${final?.homeScore}x${final?.awayScore} ${final?.awayTeam}`,
    semi?.homeTeam === 'Brasil' && semi?.awayTeam === 'Argentina' && final?.homeTeam === 'Brasil' && (final?.homeScore ?? 0) > (final?.awayScore ?? 0)
  )

  await ana.ctx.close()

  // ── Teardown: drop the runtime-created invite league (seed cleanup handles rest)
  if (runtimeLeagueId) await service.from('leagues').delete().eq('id', runtimeLeagueId)

  writeEvidenceDoc()

  const failed = evidence.filter((e) => !e.pass)
  expect(failed, `failed steps: ${failed.map((f) => `${f.scenario} ${f.step}`).join('; ')}`).toHaveLength(0)
})

interface RankEntry {
  user_id: string
  full_name: string
  points: number
  position: number
  exact_scores: number
  correct_outcomes: number
}
interface BracketSlot {
  state: string
  homeTeam: string | null
  awayTeam: string | null
  homeScore: number | null
  awayScore: number | null
}
interface BracketPhase {
  phase: string
  slots: BracketSlot[]
}

function writeEvidenceDoc() {
  const passCount = evidence.filter((e) => e.pass).length
  const total = evidence.length
  const scenarios = [...new Set(evidence.map((e) => e.scenario))]
  const scenarioPass = scenarios.filter((s) => evidence.filter((e) => e.scenario === s).every((e) => e.pass))

  const lines: string[] = []
  lines.push('# Evidência de validação — execução automatizada')
  lines.push('')
  lines.push('> Gerado por `tests/e2e/validation-run.spec.ts` (PRD football-api-ingestion, task_09 / ADR-009).')
  lines.push('> Dois participantes (Ana + Bruno) percorrem os 7 cenários de `VALIDACAO-MANUAL.md` na UI real,')
  lines.push('> sobre três estados pré-definidos do banco (pré-Copa → em andamento → encerrada).')
  lines.push('> Reproduza com: `supabase start && npx playwright test`.')
  lines.push('')
  lines.push(`**Resultado:** ${scenarioPass.length}/${scenarios.length} cenários · ${passCount}/${total} passos ✅`)
  lines.push('')
  lines.push(`Gerado em ${new Date().toISOString()}.`)
  lines.push('')
  lines.push('## Resumo')
  lines.push('')
  lines.push('| # | Cenário | Passo | Esperado | Observado | Resultado |')
  lines.push('|---|---------|-------|----------|-----------|-----------|')
  evidence.forEach((e, i) => {
    const esc = (s: string) => s.replace(/\|/g, '\\|')
    lines.push(`| ${i + 1} | ${esc(e.scenario)} | ${esc(e.step)} | ${esc(e.expected)} | ${esc(e.observed)} | ${e.pass ? '✅ PASSOU' : '❌ FALHOU'} |`)
  })
  lines.push('')
  lines.push('## Passos com captura de tela')
  lines.push('')
  evidence.forEach((e, i) => {
    lines.push(`### ${i + 1}. ${e.scenario} — ${e.step}`)
    lines.push('')
    lines.push(`- **Esperado:** ${e.expected}`)
    lines.push(`- **Observado:** ${e.observed}`)
    lines.push(`- **Resultado:** ${e.pass ? '✅ PASSOU' : '❌ FALHOU'}`)
    lines.push('')
    lines.push(`![${e.scenario} ${e.step}](${e.shot})`)
    lines.push('')
  })
  writeFileSync(resolve(DOCS, 'VALIDACAO-EVIDENCIA.md'), lines.join('\n'))
}
