export interface CopaTeam {
  name: string
  code: string
}

export const FEATURED_TEAMS: CopaTeam[] = [
  { name: 'Brasil',     code: 'br' },
  { name: 'Argentina',  code: 'ar' },
  { name: 'França',     code: 'fr' },
  { name: 'Espanha',    code: 'es' },
  { name: 'Inglaterra', code: 'gb-eng' },
  { name: 'Portugal',   code: 'pt' },
  { name: 'Alemanha',   code: 'de' },
  { name: 'Holanda',    code: 'nl' },
  { name: 'Croácia',    code: 'hr' },
  { name: 'Bélgica',    code: 'be' },
  { name: 'Uruguai',    code: 'uy' },
  { name: 'Colômbia',   code: 'co' },
]

// FIFA World Cup 2026 has 48 qualified nations. Roster reconciled to the real
// draw in seed 020 (...020_seed_real_copa2026_group_stage.sql), the source of
// truth (ADR-003). Names/codes match seed 020 verbatim so VALID_TEAM_NAMES (and
// thus isConfirmedMatchup) and resolveFlag align with the seeded match rows.
export const ALL_COPA_TEAMS: CopaTeam[] = [
  ...FEATURED_TEAMS,
  { name: 'México',                     code: 'mx' },
  { name: 'EUA',                        code: 'us' },
  { name: 'Canadá',                     code: 'ca' },
  { name: 'África do Sul',              code: 'za' },
  { name: 'Coreia do Sul',              code: 'kr' },
  { name: 'República Tcheca',           code: 'cz' },
  { name: 'Equador',                    code: 'ec' },
  { name: 'Nova Zelândia',              code: 'nz' },
  { name: 'Marrocos',                   code: 'ma' },
  { name: 'Haiti',                      code: 'ht' },
  { name: 'Escócia',                    code: 'gb-sct' },
  { name: 'Senegal',                    code: 'sn' },
  { name: 'Uzbequistão',                code: 'uz' },
  { name: 'Catar',                      code: 'qa' },
  { name: 'Egito',                      code: 'eg' },
  { name: 'Tunísia',                    code: 'tn' },
  { name: 'Curaçao',                    code: 'cw' },
  { name: 'Áustria',                    code: 'at' },
  { name: 'Suíça',                      code: 'ch' },
  { name: 'Costa do Marfim',            code: 'ci' },
  { name: 'Cabo Verde',                 code: 'cv' },
  { name: 'Gana',                       code: 'gh' },
  { name: 'Panamá',                     code: 'pa' },
  { name: 'Arábia Saudita',             code: 'sa' },
  { name: 'Japão',                      code: 'jp' },
  { name: 'Noruega',                    code: 'no' },
  { name: 'Jordânia',                   code: 'jo' },
  { name: 'Austrália',                  code: 'au' },
  { name: 'Paraguai',                   code: 'py' },
  { name: 'Argélia',                    code: 'dz' },
  // Real 2026 qualifiers added per seed 020 (ADR-003).
  { name: 'Bósnia e Herzegovina',       code: 'ba' },
  { name: 'Turquia',                    code: 'tr' },
  { name: 'Suécia',                     code: 'se' },
  { name: 'Irã',                        code: 'ir' },
  { name: 'Iraque',                     code: 'iq' },
  { name: 'Rep. Democrática do Congo',  code: 'cd' },
]

export const VALID_TEAM_NAMES = new Set(ALL_COPA_TEAMS.map(t => t.name))

// Total group-stage matches in the 2026 World Cup: 12 groups × 6 matches = 72.
// Used as the fixed denominator for the "palpites · fase de grupos" stat.
export const GROUP_STAGE_MATCH_COUNT = 72

// Opening match (México × África do Sul) kickoff, stored as UTC like matches.match_date.
// 2026-06-11T19:00:00Z = June 11, 2026 16:00 BRT (UTC-3).
export const OPENING_MATCH_KICKOFF = new Date('2026-06-11T19:00:00.000Z')

// Champion bet closes at the opening match kickoff.
export const BET_DEADLINE = OPENING_MATCH_KICKOFF
