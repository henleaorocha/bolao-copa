#!/usr/bin/env node
// Gerador de snapshots do openfootball para validação manual da ingestão.
//
//   node scripts/gen-mock.mjs <nivel>     (nivel 0..6, default 6)
//
// Simula o torneio inteiro UMA vez de forma determinística (seed fixa) e emite
// um JSON no schema do openfootball revelando o estado só ATÉ o nível pedido —
// imitando como a fonte real vai atualizando o mesmo arquivo conforme as fases
// acontecem. Escreve em ./worldcup.mock.json (consumido por scripts/serve-mock.mjs).
//
// Níveis (cada um "abre" a próxima fase para palpite):
//   L0  tudo agendado, mata-mata em placeholder  -> palpita grupos + campeão
//   L1  grupos finalizados; R32 com times reais    -> palpita R32
//   L2  + R32 finalizado; R16 com times reais       -> palpita R16
//   L3  + R16 finalizado; quartas com times reais   -> palpita quartas
//   L4  + quartas finalizadas; semis com times reais-> palpita semis
//   L5  + semis finalizadas; final/3º com times reais-> palpita final/3º
//   L6  tudo finalizado, campeão/vice definidos
//
// O resultado é determinístico: o campeão é sempre o mesmo (impresso ao final),
// então dá pra apostar campeão no L0 e conferir os pontos no L6.

import { readFileSync, writeFileSync } from 'node:fs'

const FIXTURE = new URL('../tests/fixtures/openfootball-wc2026.json', import.meta.url)
const OUT = new URL('../worldcup.mock.json', import.meta.url)

const level = Number.parseInt(process.argv[2] ?? '6', 10)
if (!Number.isInteger(level) || level < 0 || level > 6) {
  console.error('nivel invalido. use: node scripts/gen-mock.mjs <0..6>')
  process.exit(1)
}

// RNG determinístico (mulberry32) — mesma seed => mesmo torneio sempre.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(20260611)
const goals = () => Math.floor(rng() * 3.3) // 0..3
function decisive() { let h = goals(), a = goals(); if (h === a) { if (rng() < 0.5) h++; else a++ } return [h, a] }

const ROUND_TO_PHASE = {
  'Round of 32': '32nd', 'Round of 16': '16th',
  'Quarter-final': '8th', 'Quarter-finals': '8th',
  'Semi-final': 'semi', 'Semi-finals': 'semi',
  'Match for third place': '3rd_place', '3rd Place': '3rd_place', Final: 'final',
}
const BUCKET = { '32nd': 0, '16th': 1, '8th': 2, semi: 3, '3rd_place': 4, final: 4 }

const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8'))
const matches = fixture.matches
const isGroup = (m) => m.round.startsWith('Matchday')
const phaseOf = (m) => (isGroup(m) ? 'group' : ROUND_TO_PHASE[m.round] ?? 'group')

// ── 1. Grupos: times, placares e classificação ──────────────────────────────
const groups = {} // letra -> Set(times)
const teamSeed = {} // desempate estável por time
for (const m of matches.filter(isGroup)) {
  const g = m.group.replace(/^Group /, '')
  ;(groups[g] ??= new Set()).add(m.team1).add(m.team2)
  for (const t of [m.team1, m.team2]) if (!(t in teamSeed)) teamSeed[t] = rng()
}

const groupScore = new Map() // referência do jogo -> [h,a]
const stat = {} // `${g}|${time}` -> {pts,gf,ga}
const sk = (g, t) => `${g}|${t}`
for (const g of Object.keys(groups)) for (const t of groups[g]) stat[sk(g, t)] = { pts: 0, gf: 0, ga: 0 }

for (const m of matches.filter(isGroup)) {
  const g = m.group.replace(/^Group /, '')
  const [h, a] = [goals(), goals()]
  groupScore.set(m, [h, a])
  const A = stat[sk(g, m.team1)], B = stat[sk(g, m.team2)]
  A.gf += h; A.ga += a; B.gf += a; B.ga += h
  if (h > a) A.pts += 3; else if (a > h) B.pts += 3; else { A.pts++; B.pts++ }
}

const standings = {} // letra -> [1º,2º,3º,4º]
for (const g of Object.keys(groups)) {
  standings[g] = [...groups[g]].sort((x, y) => {
    const X = stat[sk(g, x)], Y = stat[sk(g, y)]
    return (Y.pts - X.pts) || ((Y.gf - Y.ga) - (X.gf - X.ga)) || (Y.gf - X.gf) || (teamSeed[y] - teamSeed[x])
  })
}

// ── 2. Mata-mata: resolução de placeholders + simulação completa ────────────
const usedThird = new Set()
function pickThird(candidates) {
  for (const g of candidates) { const t = standings[g]?.[2]; if (t && !usedThird.has(t)) { usedThird.add(t); return t } }
  for (const g of Object.keys(standings)) { const t = standings[g][2]; if (!usedThird.has(t)) { usedThird.add(t); return t } }
  return standings[candidates[0]][2]
}
const winnerOf = {}, loserOf = {}
function resolve(raw) {
  let m
  if ((m = raw.match(/^([123])([A-L])$/))) return standings[m[2]][Number(m[1]) - 1]
  if ((m = raw.match(/^3([A-L](?:\/[A-L])+)$/))) return pickThird(m[1].split('/'))
  if ((m = raw.match(/^W(\d+)$/))) return winnerOf[m[1]]
  if ((m = raw.match(/^L(\d+)$/))) return loserOf[m[1]]
  return raw
}

// ordem de dependência: 73..102, depois 3º lugar e final
const ko = matches.filter((m) => !isGroup(m))
const keyOf = (m) => (m.num != null ? String(m.num) : phaseOf(m)) // '73'.. | 'final' | '3rd_place'
const ordered = [...ko].sort((x, y) => {
  const rank = (m) => (m.num != null ? m.num : 999) // final/3º por último
  return rank(x) - rank(y)
})
const koTeams = new Map(), koScore = new Map()
for (const m of ordered) {
  const t1 = resolve(m.team1), t2 = resolve(m.team2)
  koTeams.set(m, [t1, t2])
  const [h, a] = decisive()
  koScore.set(m, [h, a])
  const k = keyOf(m)
  if (h > a) { winnerOf[k] = t1; loserOf[k] = t2 } else { winnerOf[k] = t2; loserOf[k] = t1 }
}

// ── 3. Máscara por nível ─────────────────────────────────────────────────────
const cf = Math.max(0, Math.min(5, level - 1)) // fases de mata-mata finalizadas
const cr = Math.max(0, Math.min(5, level)) // fases de mata-mata reveladas
const groupsFinished = level >= 1

const out = matches.map((m) => {
  const base = { ...m }
  if (isGroup(m)) {
    if (groupsFinished) { const [h, a] = groupScore.get(m); base.score = { ft: [h, a] } }
    return base
  }
  const bucket = BUCKET[phaseOf(m)]
  if (bucket < cr) { const [t1, t2] = koTeams.get(m); base.team1 = t1; base.team2 = t2 }
  // bucket >= cr: mantém placeholders originais (team1/team2 do fixture)
  if (bucket < cf) { const [h, a] = koScore.get(m); base.score = { ft: [h, a] } }
  return base
})

writeFileSync(OUT, JSON.stringify({ ...fixture, matches: out }, null, 2))

// ── Resumo ───────────────────────────────────────────────────────────────────
const champ = winnerOf['final'], vice = loserOf['final']
const finishedCount = out.filter((m) => m.score).length
const phaseNames = ['32nd', '16th', '8th', 'semi', 'final/3º']
console.log(`\n✔ worldcup.mock.json gerado — NÍVEL ${level}`)
console.log(`  jogos com placar (finished): ${finishedCount}/104`)
console.log(`  mata-mata revelado até: ${cr === 0 ? 'nenhum (só placeholders)' : phaseNames.slice(0, cr).join(', ')}`)
console.log(`  mata-mata finalizado até: ${cf === 0 ? 'nenhum' : phaseNames.slice(0, cf).join(', ')}`)
console.log(`  campeão (determinístico): ${champ ?? '—'}  |  vice: ${vice ?? '—'}`)
console.log(`  3º lugar: ${winnerOf['3rd_place'] ?? '—'}\n`)
