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
  { name: 'Itália',     code: 'it' },
  { name: 'Bélgica',    code: 'be' },
  { name: 'Uruguai',    code: 'uy' },
  { name: 'Colômbia',   code: 'co' },
]

// FIFA World Cup 2026 has 48 qualified nations (not 32 as initially stated in PRD)
export const ALL_COPA_TEAMS: CopaTeam[] = [
  ...FEATURED_TEAMS,
  { name: 'México',            code: 'mx' },
  { name: 'EUA',               code: 'us' },
  { name: 'Canadá',            code: 'ca' },
  { name: 'África do Sul',     code: 'za' },
  { name: 'Coreia do Sul',     code: 'kr' },
  { name: 'República Tcheca',  code: 'cz' },
  { name: 'Equador',           code: 'ec' },
  { name: 'Nova Zelândia',     code: 'nz' },
  { name: 'Marrocos',          code: 'ma' },
  { name: 'Haiti',             code: 'ht' },
  { name: 'Escócia',           code: 'gb-sct' },
  { name: 'Senegal',           code: 'sn' },
  { name: 'Uzbequistão',       code: 'uz' },
  { name: 'Catar',             code: 'qa' },
  { name: 'Egito',             code: 'eg' },
  { name: 'Tunísia',           code: 'tn' },
  { name: 'Curaçao',           code: 'cw' },
  { name: 'Áustria',           code: 'at' },
  { name: 'Jamaica',           code: 'jm' },
  { name: 'Suíça',             code: 'ch' },
  { name: 'Camarões',          code: 'cm' },
  { name: 'Bolívia',           code: 'bo' },
  { name: 'Costa do Marfim',   code: 'ci' },
  { name: 'Cabo Verde',        code: 'cv' },
  { name: 'Croácia',           code: 'hr' },
  { name: 'Gana',              code: 'gh' },
  { name: 'Panamá',            code: 'pa' },
  { name: 'Arábia Saudita',    code: 'sa' },
  { name: 'Honduras',          code: 'hn' },
  { name: 'Japão',             code: 'jp' },
  { name: 'Noruega',           code: 'no' },
  { name: 'Jordânia',          code: 'jo' },
  { name: 'Dinamarca',         code: 'dk' },
  { name: 'Austrália',         code: 'au' },
  { name: 'Paraguai',          code: 'py' },
  { name: 'Argélia',           code: 'dz' },
]

export const VALID_TEAM_NAMES = new Set(ALL_COPA_TEAMS.map(t => t.name))

// 2026-06-11T21:00:00Z = June 11, 2026 18:00 BRT (UTC-3)
export const BET_DEADLINE = new Date('2026-06-11T21:00:00.000Z')
